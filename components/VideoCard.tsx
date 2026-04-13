'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  TriangleAlert,
  CheckCircle,
} from 'lucide-react'
import type { VideoCardState } from '@/lib/types'
import {
  formatDuration,
  formatFilesize,
  formatExpiresIn,
  formatPlatformName,
} from '@/lib/utils'
import FormatToggle, { FormatType } from './FormatToggle'
import QualityChip from './QualityChip'
import SkeletonCard from './SkeletonCard'

interface VideoCardProps {
  card: VideoCardState
  onRetry: (url: string) => void
  onRemove: (url: string) => void
}

type DownloadState = 'idle' | 'loading' | 'done' | 'error'

export default function VideoCard({ card, onRetry, onRemove }: VideoCardProps) {
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('mp4')
  const [selectedQualityId, setSelectedQualityId] = useState<string | null>(null)
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [expiresIn, setExpiresIn] = useState<number | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [thumbnailError, setThumbnailError] = useState(false)

  // ── Loading state ──────────────────────────────────────
  if (card.status === 'loading') {
    return <SkeletonCard />
  }

  // ── Error state ────────────────────────────────────────
  if (card.status === 'error' || !card.data) {
    return (
      <article className="animate-fade-in overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle size={24} className="text-red-500" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-800">
              조회 실패
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {card.errorMessage ?? '영상 정보를 가져오는 데 실패했습니다.'}
            </p>
            <p className="mt-1 font-dm-mono truncate text-xs text-stone-400">
              {card.url}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRetry(card.url)}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-all hover:bg-stone-50 active:scale-95"
            >
              <RefreshCw size={14} aria-hidden="true" />
              재시도
            </button>
            <button
              type="button"
              onClick={() => onRemove(card.url)}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-500 transition-all hover:bg-stone-50 active:scale-95"
            >
              <X size={14} aria-hidden="true" />
              제거
            </button>
          </div>
        </div>
      </article>
    )
  }

  const video = card.data
  const isAudio = selectedFormat === 'mp3'

  // Determine the active format list
  const qualityOptions = isAudio
    ? video.audio_formats.map((f) => ({
        id: f.format_id,
        label: `${f.abr}kbps`,
        subLabel: formatFilesize(f.filesize_approx) || undefined,
        filesize: f.filesize_approx,
      }))
    : video.formats.map((f) => ({
        id: f.format_id,
        label: f.resolution,
        subLabel: formatFilesize(f.filesize_approx) || undefined,
        filesize: f.filesize_approx,
      }))

  // Resolve the current selection
  const effectiveQualityId =
    selectedQualityId && qualityOptions.some((q) => q.id === selectedQualityId)
      ? selectedQualityId
      : qualityOptions[0]?.id ?? null

  const selectedOption = qualityOptions.find((q) => q.id === effectiveQualityId)

  // ── Download handler ───────────────────────────────────
  const handleDownload = async () => {
    if (!effectiveQualityId) return
    setDownloadState('loading')
    setDownloadError(null)

    try {
      const body = isAudio
        ? { url: card.url, audio_only: true, title: video.title }
        : { url: card.url, format_id: effectiveQualityId, audio_only: false, title: video.title }

      // 서버 스트리밍 다운로드: /api/download 가 yt-dlp 출력을 직접 파이핑
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { message?: string }).message ?? '다운로드에 실패했습니다.')
      }

      // Content-Disposition 헤더에서 파일명 추출
      const disposition = res.headers.get('content-disposition') ?? ''
      const nameMatch = disposition.match(/filename="([^"]+)"/)
      const filename = nameMatch ? nameMatch[1] : `reclip.${isAudio ? 'm4a' : 'mp4'}`

      // Blob으로 변환 후 브라우저 다운로드 트리거 (cross-origin 문제 없음)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(objectUrl)
      }, 200)

      setDownloadState('done')
    } catch (err) {
      setDownloadState('error')
      setDownloadError(
        err instanceof Error
          ? err.message
          : '다운로드 중 오류가 발생했습니다.'
      )
    }
  }

  // ── Format switch: reset selection ────────────────────
  const handleFormatChange = (fmt: FormatType) => {
    setSelectedFormat(fmt)
    setSelectedQualityId(null)
    setDownloadState('idle')
    setDownloadError(null)
    setExpiresIn(null)
  }

  return (
    <article className="animate-fade-in overflow-hidden rounded-xl border border-stone-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Thumbnail */}
      <figure className="relative aspect-video w-full overflow-hidden bg-stone-100">
        {!thumbnailError && video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={`${video.title} 썸네일`}
            fill
            className="object-cover"
            onError={() => setThumbnailError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-100">
            <div className="text-stone-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
        )}
        {/* Duration badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-dm-mono text-xs text-white">
            {formatDuration(video.duration)}
          </div>
        )}
      </figure>

      {/* Card body */}
      <div className="space-y-3 p-4">
        {/* Platform badge */}
        <div className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-600">
          {formatPlatformName(video.platform)}
        </div>

        {/* Title */}
        <h2 className="font-instrument-serif line-clamp-2 text-base font-normal leading-snug text-stone-900">
          {video.title}
        </h2>

        {/* Uploader */}
        {video.uploader && (
          <p className="text-xs text-stone-500">{video.uploader}</p>
        )}

        {/* Format toggle */}
        {video.audio_formats.length > 0 && (
          <FormatToggle value={selectedFormat} onChange={handleFormatChange} />
        )}

        {/* Quality chips */}
        {qualityOptions.length > 0 ? (
          <div className="relative">
            <div
              role="radiogroup"
              aria-label="품질 선택"
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
            >
              {qualityOptions.map((opt) => (
                <QualityChip
                  key={opt.id}
                  label={opt.label}
                  subLabel={opt.subLabel}
                  isSelected={opt.id === effectiveQualityId}
                  onClick={() => {
                    setSelectedQualityId(opt.id)
                    setDownloadState('idle')
                    setExpiresIn(null)
                    setDownloadError(null)
                  }}
                  disabled={downloadState === 'loading'}
                />
              ))}
            </div>
            {/* Fade overlay indicating more items */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent" />
          </div>
        ) : (
          <p className="text-xs text-stone-400">포맷 정보 없음</p>
        )}

        {/* Estimated file size */}
        {selectedOption?.subLabel && (
          <p className="text-xs text-stone-400">{selectedOption.subLabel}</p>
        )}

        {/* Expiry warning — 서버 스트리밍 방식이므로 CDN 만료 없음, 대용량 안내만 */}
        {downloadState === 'loading' && (
          <div
            role="status"
            className="animate-slide-down flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800"
          >
            <TriangleAlert
              size={14}
              className="mt-0.5 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <span>
              영상을 변환 중입니다. 파일 크기에 따라 시간이 걸릴 수 있습니다.
            </span>
          </div>
        )}

        {/* Done notice */}
        {downloadState === 'done' && (
          <div className="animate-slide-down flex items-center gap-2 text-xs text-green-700">
            <CheckCircle size={13} aria-hidden="true" />
            <span>다운로드가 시작되었습니다.</span>
          </div>
        )}

        {/* Download error */}
        {downloadState === 'error' && downloadError && (
          <div
            role="alert"
            className="animate-slide-down rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {downloadError}
          </div>
        )}

        {/* Download button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={!effectiveQualityId || downloadState === 'loading'}
          aria-label={
            isAudio
              ? 'MP3 오디오 다운로드'
              : `${selectedOption?.label ?? ''} MP4 다운로드`
          }
          className={[
            'flex h-[48px] w-full items-center justify-center gap-2 rounded-xl',
            'text-sm font-medium text-white transition-all duration-150',
            !effectiveQualityId || downloadState === 'loading'
              ? 'cursor-not-allowed bg-[#e85d2a]/40'
              : downloadState === 'done'
              ? 'bg-green-600 hover:bg-green-700 active:scale-95'
              : 'bg-[#e85d2a] hover:bg-[#d14d1e] active:scale-95',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {downloadState === 'loading' ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              <span>추출 중...</span>
            </>
          ) : downloadState === 'done' ? (
            <>
              <Download size={16} aria-hidden="true" />
              <span>다시 다운로드</span>
            </>
          ) : (
            <>
              <Download size={16} aria-hidden="true" />
              <span>다운로드</span>
            </>
          )}
        </button>
      </div>
    </article>
  )
}
