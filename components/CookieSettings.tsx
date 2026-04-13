'use client'

import { useEffect, useRef, useState } from 'react'
import { Cookie, Upload, Trash2, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

type CookieStatus = { exists: boolean; size?: number; updatedAt?: string }

export default function CookieSettings() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<CookieStatus | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/cookies')
      setStatus(await res.json())
    } catch {
      setStatus({ exists: false })
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const form = new FormData()
      form.append('cookies', file)
      const res = await fetch('/api/cookies', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '업로드 실패')
      setMessage({ type: 'ok', text: `쿠키 ${data.cookieCount}개 저장됨` })
      await fetchStatus()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '오류 발생' })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    setMessage(null)
    await fetch('/api/cookies', { method: 'DELETE' })
    setMessage({ type: 'ok', text: '쿠키 파일이 삭제되었습니다.' })
    await fetchStatus()
  }

  const hasCookies = status?.exists ?? false

  return (
    <div className="relative">
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
          hasCookies
            ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50',
        ].join(' ')}
        aria-expanded={open}
        aria-label="쿠키 설정"
      >
        <Cookie size={13} aria-hidden="true" />
        <span>{hasCookies ? '쿠키 적용 중' : '쿠키 설정'}</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* 패널 */}
      {open && (
        <div className="absolute right-0 top-9 z-50 w-80 rounded-xl border border-stone-200 bg-white shadow-lg">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-800">브라우저 쿠키 연동</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-stone-400 hover:text-stone-600"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3 p-4">
            {/* 현재 상태 */}
            <div className={[
              'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
              hasCookies ? 'bg-green-50 text-green-700' : 'bg-stone-50 text-stone-500',
            ].join(' ')}>
              {hasCookies ? (
                <>
                  <CheckCircle size={13} className="shrink-0" aria-hidden="true" />
                  <span>
                    쿠키 활성화 · {status?.size ? `${(status.size / 1024).toFixed(1)}KB` : ''}
                    {status?.updatedAt && (
                      <span className="ml-1 text-green-600">
                        ({new Date(status.updatedAt).toLocaleDateString('ko-KR')})
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} className="shrink-0" aria-hidden="true" />
                  <span>쿠키 없음 — Twitter/X, 로그인 필요 사이트 불가</span>
                </>
              )}
            </div>

            {/* 메시지 */}
            {message && (
              <div className={[
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                message.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600',
              ].join(' ')}>
                {message.type === 'ok'
                  ? <CheckCircle size={12} aria-hidden="true" />
                  : <AlertCircle size={12} aria-hidden="true" />}
                <span>{message.text}</span>
              </div>
            )}

            {/* 업로드 버튼 */}
            <div className="flex gap-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e85d2a] bg-white px-3 py-2 text-xs font-medium text-[#e85d2a] transition hover:bg-[#e85d2a]/5 active:scale-95">
                <Upload size={13} aria-hidden="true" />
                {uploading ? '업로드 중…' : 'cookies.txt 업로드'}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,text/plain"
                  className="sr-only"
                  onChange={handleFile}
                  disabled={uploading}
                />
              </label>

              {hasCookies && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-2 text-xs text-stone-500 transition hover:bg-red-50 hover:border-red-200 hover:text-red-500"
                  aria-label="쿠키 삭제"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* 사용 가이드 토글 */}
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="flex w-full items-center gap-1 text-xs text-stone-400 hover:text-stone-600"
            >
              {showGuide ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              cookies.txt 만드는 방법
            </button>

            {showGuide && (
              <div className="space-y-2 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                <p className="font-medium text-stone-700">Chrome / Edge 기준</p>
                <ol className="space-y-1.5 pl-4 list-decimal">
                  <li>
                    Chrome 웹스토어에서{' '}
                    <a
                      href="https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[#e85d2a] hover:underline"
                    >
                      Get cookies.txt LOCALLY
                      <ExternalLink size={10} />
                    </a>{' '}
                    설치
                  </li>
                  <li>Twitter/X, Instagram 등 로그인 후 해당 사이트에서 확장 아이콘 클릭</li>
                  <li>"Export" 버튼으로 cookies.txt 저장</li>
                  <li>위 업로드 버튼으로 파일 업로드</li>
                </ol>
                <p className="mt-1 text-stone-400">
                  쿠키는 로컬에만 저장됩니다. 외부로 전송되지 않습니다.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
