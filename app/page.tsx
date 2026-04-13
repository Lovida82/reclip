'use client'

import { useState, useCallback } from 'react'
import { Github } from 'lucide-react'
import type { VideoCardState, VideoInfo } from '@/lib/types'
import { parseUrls } from '@/lib/utils'
import UrlInput from '@/components/UrlInput'
import VideoCard from '@/components/VideoCard'
import CookieSettings from '@/components/CookieSettings'

export default function HomePage() {
  const [urlInput, setUrlInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cards, setCards] = useState<VideoCardState[]>([])

  // ── Fetch info for a single URL ────────────────────────
  const fetchInfo = useCallback(async (url: string): Promise<VideoCardState> => {
    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data: VideoInfo & { error?: string; message?: string } =
        await res.json()

      if (!res.ok || data.error) {
        return {
          url,
          status: 'error',
          errorMessage: data.message ?? '영상 정보를 가져오는 데 실패했습니다.',
        }
      }

      return {
        url,
        status: 'success',
        data,
      }
    } catch {
      return {
        url,
        status: 'error',
        errorMessage: '네트워크 오류가 발생했습니다. 연결을 확인해주세요.',
      }
    }
  }, [])

  // ── Submit handler ─────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const urls = parseUrls(urlInput)
    if (urls.length === 0) return

    setIsLoading(true)

    // Immediately set all cards to loading state
    const loadingCards: VideoCardState[] = urls.map((url) => ({
      url,
      status: 'loading',
    }))
    setCards(loadingCards)

    // Fetch all URLs in parallel
    const results = await Promise.all(urls.map((url) => fetchInfo(url)))

    setCards(results)
    setIsLoading(false)
  }, [urlInput, fetchInfo])

  // ── Retry single card ──────────────────────────────────
  const handleRetry = useCallback(
    async (url: string) => {
      setCards((prev) =>
        prev.map((c) => (c.url === url ? { ...c, status: 'loading' } : c))
      )
      const result = await fetchInfo(url)
      setCards((prev) =>
        prev.map((c) => (c.url === url ? result : c))
      )
    },
    [fetchInfo]
  )

  // ── Remove single card ─────────────────────────────────
  const handleRemove = useCallback((url: string) => {
    setCards((prev) => prev.filter((c) => c.url !== url))
  }, [])

  const hasCards = cards.length > 0

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-instrument-serif text-3xl font-normal text-reclip-fg sm:text-4xl">
            ReClip
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            1000개+ 플랫폼 영상 다운로더
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CookieSettings />
          <a
            href="https://github.com/averygan/reclip"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub 저장소 방문"
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 transition-all hover:bg-stone-50 hover:text-stone-900"
          >
            <Github size={16} aria-hidden="true" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* ── Hero (shown only when no cards yet) ─────────── */}
      {!hasCards && (
        <div className="mb-8 text-center">
          <p className="text-base text-stone-600 sm:text-lg">
            YouTube, TikTok, Instagram 등의 영상 링크를 붙여넣으세요
          </p>
          <p className="mt-1 text-xs text-stone-400">
            YouTube &middot; TikTok &middot; Instagram &middot; Twitter/X &middot; Reddit &middot; Facebook &middot; Vimeo &middot; Twitch &middot; 그 외 1000개+
          </p>
        </div>
      )}

      {/* ── URL Input ──────────────────────────────────── */}
      <section aria-label="URL 입력 영역" className="mb-8">
        <UrlInput
          value={urlInput}
          onChange={setUrlInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </section>

      {/* ── Results grid ───────────────────────────────── */}
      {hasCards && (
        <section aria-label="영상 목록">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-stone-500">
              {cards.length}개 영상
            </p>
            <button
              type="button"
              onClick={() => {
                setCards([])
              }}
              className="text-xs text-stone-400 underline-offset-2 hover:text-stone-600 hover:underline"
            >
              모두 지우기
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <VideoCard
                key={card.url}
                card={card}
                onRetry={handleRetry}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="mt-16 border-t border-stone-200 pt-8 text-center text-xs text-stone-400">
        <p>
          Powered by{' '}
          <a
            href="https://github.com/yt-dlp/yt-dlp"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            yt-dlp
          </a>{' '}
          &middot; Deployed on{' '}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            Vercel
          </a>
        </p>
        <p className="mt-1">
          개인 학습 목적의 서비스입니다. 저작권에 유의하여 이용해주세요.
        </p>
      </footer>
    </div>
  )
}
