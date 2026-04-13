'use client'

import { useRef, KeyboardEvent } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface UrlInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export default function UrlInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: UrlInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isEmpty = value.trim().length === 0

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!isEmpty && !isLoading) {
        onSubmit()
      }
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            id="url-input"
            aria-label="영상 URL 입력"
            aria-describedby="url-hint"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            inputMode={"url" as any}
            autoComplete="url"
            spellCheck={false}
            placeholder={
              'https://www.youtube.com/watch?v=...\nhttps://www.tiktok.com/@user/video/...\n여러 URL은 줄바꿈이나 쉼표로 구분하세요'
            }
            className={[
              'w-full resize-none rounded-xl border px-4 py-3',
              'font-dm-mono text-sm text-stone-800 placeholder:text-stone-400',
              'min-h-[80px] sm:min-h-[56px]',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#e85d2a]/30',
              isEmpty
                ? 'border-stone-200 bg-white focus:border-[#e85d2a]/60'
                : 'border-stone-300 bg-white focus:border-[#e85d2a]',
              isLoading
                ? 'cursor-not-allowed opacity-60'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isEmpty || isLoading}
          aria-label="영상 정보 조회"
          className={[
            'flex h-[48px] items-center justify-center gap-2 rounded-xl px-6',
            'font-medium text-sm text-white transition-all duration-150',
            'sm:w-auto w-full',
            isEmpty || isLoading
              ? 'cursor-not-allowed bg-[#e85d2a]/40'
              : 'bg-[#e85d2a] hover:bg-[#d14d1e] active:scale-95',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              <span>조회 중...</span>
            </>
          ) : (
            <>
              <Search size={16} aria-hidden="true" />
              <span>조회하기</span>
            </>
          )}
        </button>
      </div>

      {/* Hint text */}
      <p
        id="url-hint"
        className="mt-2 text-xs text-stone-400 sm:hidden"
      >
        Ctrl+Enter 또는 Cmd+Enter로 바로 조회할 수 있습니다
      </p>
    </div>
  )
}
