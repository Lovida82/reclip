import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import net from 'net'
import dns from 'dns'
import { getCookiesPath } from '@/lib/cookies'

const execFileAsync = promisify(execFile)

const YTDLP_TIMEOUT_MS = 8000

// SSRF 방어: 내부 IP 차단
function isPrivateIP(ip: string): boolean {
  if (net.isIP(ip) === 0) return true
  const parts = ip.split('.').map(Number)
  if (ip === '127.0.0.1' || ip.startsWith('::1')) return true
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

function sanitizeResolution(height: number | null): string {
  if (!height) return 'unknown'
  if (height >= 2160) return '4K'
  if (height >= 1440) return '1440p'
  if (height >= 1080) return '1080p'
  if (height >= 720) return '720p'
  if (height >= 480) return '480p'
  if (height >= 360) return '360p'
  if (height >= 240) return '240p'
  return `${height}p`
}

function extractFormats(rawFormats: Record<string, unknown>[]) {
  const videoFormats: Record<string, unknown>[] = []
  const audioFormats: Record<string, unknown>[] = []
  const seenResolutions = new Set<string>()

  for (const fmt of rawFormats) {
    const vcodec = (fmt.vcodec as string) || 'none'
    const acodec = (fmt.acodec as string) || 'none'
    const ext = (fmt.ext as string) || ''

    if (vcodec === 'none' && acodec !== 'none') {
      const abr = (fmt.abr as number) || (fmt.tbr as number) || 0
      audioFormats.push({
        format_id: fmt.format_id,
        ext,
        abr: Math.round(abr),
        filesize_approx: fmt.filesize || fmt.filesize_approx || null,
      })
      continue
    }

    if (vcodec === 'none') continue

    const height = fmt.height as number | null
    const resolution = sanitizeResolution(height)

    if (seenResolutions.has(resolution)) {
      const idx = videoFormats.findIndex((v) => v.resolution === resolution)
      if (idx !== -1 && ext === 'mp4' && videoFormats[idx].ext !== 'mp4') {
        const fmtId = fmt.format_id as string
        videoFormats[idx] = {
          format_id: `${fmtId}+bestaudio`,
          resolution,
          ext,
          filesize_approx: fmt.filesize || fmt.filesize_approx || null,
          vcodec,
          acodec: acodec !== 'none' ? acodec : 'mp4a.40.2',
        }
      }
      continue
    }

    seenResolutions.add(resolution)
    const fmtId = fmt.format_id as string
    const combinedId = acodec === 'none' ? `${fmtId}+bestaudio` : fmtId

    videoFormats.push({
      format_id: combinedId,
      resolution,
      ext: ext || 'mp4',
      filesize_approx: fmt.filesize || fmt.filesize_approx || null,
      vcodec,
      acodec: acodec !== 'none' ? acodec : 'mp4a.40.2',
    })
  }

  const order = ['4K', '1440p', '1080p', '720p', '480p', '360p', '240p', 'unknown']
  videoFormats.sort((a, b) => {
    const ai = order.indexOf(a.resolution as string)
    const bi = order.indexOf(b.resolution as string)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  audioFormats.sort((a, b) => ((b.abr as number) || 0) - ((a.abr as number) || 0))

  return { videoFormats, audioFormats }
}

export async function OPTIONS() {
  return new NextResponse(null, {
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
    return NextResponse.json({ error: 'INVALID_URL', message: '유효한 JSON 형식으로 요청해주세요.' }, { status: 400 })
  }

  const url = (body.url as string | undefined)?.trim()
  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'INVALID_URL', message: '유효한 URL을 입력해주세요.' }, { status: 400 })
  }
  if (url.length > 2048) {
    return NextResponse.json({ error: 'INVALID_URL', message: 'URL이 너무 깁니다.' }, { status: 400 })
  }

  const safe = await isSsrfSafe(url)
  if (!safe) {
    return NextResponse.json({ error: 'INVALID_URL', message: '허용되지 않는 URL입니다.' }, { status: 400 })
  }

  try {
    const cookiesPath = await getCookiesPath()
    const cookiesArgs = cookiesPath ? ['--cookies', cookiesPath] : []

    const { stdout, stderr } = await execFileAsync(
      'yt-dlp',
      ['--dump-json', '--no-warnings', '--quiet', '--no-playlist', ...cookiesArgs, url],
      { timeout: YTDLP_TIMEOUT_MS }
    )

    if (!stdout.trim()) {
      const lower = (stderr || '').toLowerCase()
      if (lower.includes('unsupported url') || lower.includes('no suitable')) {
        return NextResponse.json({ error: 'UNSUPPORTED_URL', message: '지원하지 않는 플랫폼입니다.' }, { status: 422 })
      }
      if (lower.includes('private') || lower.includes('login required')) {
        return NextResponse.json({ error: 'PRIVATE_VIDEO', message: '비공개 영상으로 접근할 수 없습니다.' }, { status: 422 })
      }
      return NextResponse.json({ error: 'EXTRACTION_ERROR', message: '영상 정보를 가져오는 데 실패했습니다.' }, { status: 500 })
    }

    const data = JSON.parse(stdout)
    const { videoFormats, audioFormats } = extractFormats(data.formats || [])

    const thumbnails: { width?: number; url?: string }[] = data.thumbnails || []
    let thumbnail = data.thumbnail || ''
    if (thumbnails.length > 0) {
      const best = thumbnails.reduce((a, b) => ((a.width || 0) >= (b.width || 0) ? a : b))
      thumbnail = best.url || thumbnail
    }

    return NextResponse.json({
      id: data.id || '',
      title: data.title || '',
      thumbnail,
      duration: Math.round(data.duration || 0),
      uploader: data.uploader || data.channel || '',
      platform: (data.extractor_key || '').toLowerCase(),
      formats: videoFormats,
      audio_formats: audioFormats,
    })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'killed' in err) {
      return NextResponse.json({ error: 'TIMEOUT', message: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' }, { status: 504 })
    }
    const lower = String(err).toLowerCase()
    if (lower.includes('unsupported url')) {
      return NextResponse.json({ error: 'UNSUPPORTED_URL', message: '지원하지 않는 플랫폼입니다.' }, { status: 422 })
    }
    return NextResponse.json({ error: 'EXTRACTION_ERROR', message: '영상 정보를 가져오는 데 실패했습니다.' }, { status: 500 })
  }
}
