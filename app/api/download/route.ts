import { NextRequest } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, unlink, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import net from 'net'
import dns from 'dns'
import { getCookiesPath } from '@/lib/cookies'

const execFileAsync = promisify(execFile)
const FORMAT_ID_RE = /^[\w+\-.]{1,64}$/

// ffmpeg 경로: imageio_ffmpeg 번들 사용
let FFMPEG_PATH = 'ffmpeg'
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const imageioFfmpeg = require('imageio_ffmpeg') as { get_ffmpeg_exe?: () => string }
  if (imageioFfmpeg.get_ffmpeg_exe) {
    FFMPEG_PATH = imageioFfmpeg.get_ffmpeg_exe()
  }
} catch {
  // 시스템 ffmpeg 사용
}

function isPrivateIP(ip: string): boolean {
  if (net.isIP(ip) === 0) return true
  if (ip === '127.0.0.1' || ip.startsWith('::1')) return true
  const parts = ip.split('.').map(Number)
  if (parts[0] === 10) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  return false
}

async function isSsrfSafe(url: string): Promise<boolean> {
  try {
    const { hostname } = new URL(url)
    return await new Promise((resolve) => {
      dns.lookup(hostname, (err, address) => {
        if (err) return resolve(false)
        resolve(!isPrivateIP(address))
      })
    })
  } catch {
    return false
  }
}

function sanitizeFilename(title: string, ext: string): string {
  const safe = title
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80)
    .replace(/_+$/, '')
  return `${safe || 'reclip'}.${ext}`
}

// ffmpeg 경로 동적으로 찾기
async function getFfmpegPath(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('python', [
      '-c',
      'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())',
    ])
    return stdout.trim()
  } catch {
    return FFMPEG_PATH
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'INVALID_REQUEST', message: '잘못된 요청입니다.' }, { status: 400 })
  }

  const url = (body.url as string | undefined)?.trim()
  const audioOnly = Boolean(body.audio_only)
  const formatId = (body.format_id as string | undefined)?.trim() ?? ''
  const title = ((body.title as string | undefined) ?? 'reclip').trim()

  if (!url || !url.startsWith('http')) {
    return Response.json({ error: 'INVALID_REQUEST', message: '유효한 URL을 입력해주세요.' }, { status: 400 })
  }
  if (url.length > 2048) {
    return Response.json({ error: 'INVALID_REQUEST', message: 'URL이 너무 깁니다.' }, { status: 400 })
  }
  if (!(await isSsrfSafe(url))) {
    return Response.json({ error: 'INVALID_REQUEST', message: '허용되지 않는 URL입니다.' }, { status: 400 })
  }
  if (!audioOnly && (!formatId || !FORMAT_ID_RE.test(formatId))) {
    return Response.json({ error: 'INVALID_REQUEST', message: 'format_id가 올바르지 않습니다.' }, { status: 400 })
  }

  const ext = audioOnly ? 'm4a' : 'mp4'
  const filename = sanitizeFilename(title, ext)
  const mimeType = audioOnly ? 'audio/mp4' : 'video/mp4'
  const fmtSelector = audioOnly ? 'bestaudio[ext=m4a]/bestaudio' : formatId

  // 임시 디렉터리에 다운로드 후 전송
  let tmpDir: string | null = null
  let outPath: string | null = null

  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'reclip-'))
    outPath = join(tmpDir, filename)

    const ffmpegPath = await getFfmpegPath()
    const cookiesPath = await getCookiesPath()
    const cookiesArgs = cookiesPath ? ['--cookies', cookiesPath] : []

    const args = [
      '--no-warnings',
      '--quiet',
      '--no-playlist',
      '-f', fmtSelector,
      '--merge-output-format', ext,
      '--ffmpeg-location', ffmpegPath,
      ...cookiesArgs,
      '-o', outPath,
      url,
    ]

    await execFileAsync('yt-dlp', args, { timeout: 300_000 }) // 5분 타임아웃

    const fileBuffer = await readFile(outPath)
    const encodedFilename = encodeURIComponent(filename)

    // 비동기로 임시 파일 정리
    unlink(outPath).catch(() => {})

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': String(fileBuffer.byteLength),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: unknown) {
    // 임시 파일 정리
    if (outPath) unlink(outPath).catch(() => {})

    const msg = String(err)
    if (msg.includes('private') || msg.includes('login')) {
      return Response.json({ error: 'EXTRACTION_FAILED', message: '비공개이거나 접근할 수 없는 영상입니다.' }, { status: 422 })
    }
    if (msg.includes('timed out') || msg.includes('ETIMEDOUT')) {
      return Response.json({ error: 'TIMEOUT', message: '다운로드 시간이 초과되었습니다.' }, { status: 504 })
    }
    console.error('[download] error:', err)
    return Response.json({ error: 'DOWNLOAD_ERROR', message: '다운로드 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
