import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import net from 'net'
import dns from 'dns'

const execFileAsync = promisify(execFile)

const YTDLP_TIMEOUT_MS = 8000
const FORMAT_ID_RE = /^[\w+\-.]{1,64}$/

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

const PLATFORM_EXPIRES: Record<string, number> = {
  'youtube.com': 21600,
  'youtu.be': 21600,
  'tiktok.com': 3600,
  'instagram.com': 3600,
  'twitter.com': 86400,
  'x.com': 86400,
  'reddit.com': 3600,
  'facebook.com': 3600,
  'twitch.tv': 3600,
}

function guessExpiresIn(cdnUrl: string, sourceUrl: string): number {
  // CDN URL의 expire 파라미터 파싱
  const match = cdnUrl.match(/[?&]expires?=(\d+)/i)
  if (match) {
    const expireTs = parseInt(match[1], 10)
    const remaining = expireTs - Math.floor(Date.now() / 1000)
    return Math.max(remaining, 0)
  }
  // 플랫폼별 기본값
  for (const [domain, secs] of Object.entries(PLATFORM_EXPIRES)) {
    if (sourceUrl.includes(domain)) return secs
  }
  return 3600
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
    return NextResponse.json({ error: 'INVALID_REQUEST', message: '유효한 JSON 형식으로 요청해주세요.' }, { status: 400 })
  }

  const url = (body.url as string | undefined)?.trim()
  const audioOnly = Boolean(body.audio_only)
  const formatId = (body.format_id as string | undefined)?.trim() ?? ''

  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: '유효한 URL을 입력해주세요.' }, { status: 400 })
  }
  if (url.length > 2048) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'URL이 너무 깁니다.' }, { status: 400 })
  }

  const safe = await isSsrfSafe(url)
  if (!safe) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: '허용되지 않는 URL입니다.' }, { status: 400 })
  }

  if (!audioOnly) {
    if (!formatId) {
      return NextResponse.json({ error: 'INVALID_REQUEST', message: 'format_id가 필요합니다.' }, { status: 400 })
    }
    if (!FORMAT_ID_RE.test(formatId)) {
      return NextResponse.json({ error: 'INVALID_REQUEST', message: 'format_id 형식이 올바르지 않습니다.' }, { status: 400 })
    }
  }

  const fmtSelector = audioOnly ? 'bestaudio' : formatId
  const ext = audioOnly ? 'm4a' : 'mp4'
  const filename = audioOnly
    ? 'reclip_audio.m4a'
    : `reclip_${formatId.replace(/\+/g, '_')}.mp4`

  try {
    const { stdout } = await execFileAsync(
      'yt-dlp',
      ['--get-url', '--no-warnings', '--quiet', '--no-playlist', '-f', fmtSelector, url],
      { timeout: YTDLP_TIMEOUT_MS }
    )

    const lines = stdout.trim().split('\n').filter(Boolean)
    if (!lines.length) {
      return NextResponse.json({ error: 'EXTRACTION_ERROR', message: '다운로드 URL 추출에 실패했습니다.' }, { status: 500 })
    }

    const downloadUrl = lines[0].trim()
    const expiresIn = guessExpiresIn(downloadUrl, url)

    return NextResponse.json({ download_url: downloadUrl, filename, ext, expires_in: expiresIn })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'killed' in err) {
      return NextResponse.json({ error: 'TIMEOUT', message: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' }, { status: 504 })
    }
    const lower = String(err).toLowerCase()
    if (lower.includes('private') || lower.includes('login')) {
      return NextResponse.json({ error: 'EXTRACTION_FAILED', message: '비공개이거나 접근할 수 없는 영상입니다.' }, { status: 422 })
    }
    return NextResponse.json({ error: 'EXTRACTION_ERROR', message: '다운로드 URL 추출에 실패했습니다.' }, { status: 500 })
  }
}
