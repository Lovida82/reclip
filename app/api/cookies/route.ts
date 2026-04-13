/**
 * GET  /api/cookies  — 쿠키 파일 존재 여부 확인
 * POST /api/cookies  — cookies.txt 업로드
 * DELETE /api/cookies — 쿠키 파일 삭제
 */
import { NextRequest } from 'next/server'
import { readFile, writeFile, unlink, stat, mkdir } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'data')
const COOKIES_PATH = join(DATA_DIR, 'cookies.txt')
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET() {
  try {
    const s = await stat(COOKIES_PATH)
    return Response.json({ exists: true, size: s.size, updatedAt: s.mtime.toISOString() }, { headers: corsHeaders() })
  } catch {
    return Response.json({ exists: false }, { headers: corsHeaders() })
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? ''

    let text: string

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('cookies') as File | null
      if (!file) return Response.json({ error: 'cookies 필드가 없습니다.' }, { status: 400, headers: corsHeaders() })
      if (file.size > MAX_SIZE) return Response.json({ error: '파일이 너무 큽니다. (최대 5MB)' }, { status: 400, headers: corsHeaders() })
      text = await file.text()
    } else {
      // plain text body
      const buf = await request.arrayBuffer()
      if (buf.byteLength > MAX_SIZE) return Response.json({ error: '파일이 너무 큽니다. (최대 5MB)' }, { status: 400, headers: corsHeaders() })
      text = new TextDecoder().decode(buf)
    }

    // Netscape cookies.txt 형식 기본 검증
    if (!text.includes('# Netscape HTTP Cookie File') && !text.includes('\t')) {
      return Response.json({ error: '유효한 Netscape cookies.txt 형식이 아닙니다.\nGet cookies.txt 확장 프로그램으로 내보낸 파일을 사용하세요.' }, { status: 400, headers: corsHeaders() })
    }

    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(COOKIES_PATH, text, 'utf8')

    // 쿠키 줄 수 계산
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'))
    return Response.json({ ok: true, cookieCount: lines.length }, { headers: corsHeaders() })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders() })
  }
}

export async function DELETE() {
  try {
    await unlink(COOKIES_PATH)
    return Response.json({ ok: true }, { headers: corsHeaders() })
  } catch {
    return Response.json({ ok: true }, { headers: corsHeaders() }) // 없어도 ok
  }
}

/** 다른 API route에서 사용할 쿠키 경로 헬퍼 */
export async function getCookiesPath(): Promise<string | null> {
  try {
    await readFile(COOKIES_PATH)
    return COOKIES_PATH
  } catch {
    return null
  }
}
