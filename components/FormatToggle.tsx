'use client'

import { Film, Music } from 'lucide-react'

export type FormatType = 'mp4' | 'mp3'

interface FormatToggleProps {
  value: FormatType
  onChange: (format: FormatType) => void
}

const OPTIONS: { value: FormatType; label: string; icon: React.ElementType }[] = [
  { value: 'mp4', label: 'MP4', icon: Film },
  { value: 'mp3', label: 'MP3', icon: Music },
]

export default function FormatToggle({ value, onChange }: FormatToggleProps) {
  return (
    <div
      role="group"
      aria-label="다운로드 포맷 선택"
      className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5"
    >
      {OPTIONS.map(({ value: optVal, label, icon: Icon }) => {
        const isSelected = value === optVal
        return (
          <button
            key={optVal}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(optVal)}
            className={[
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
              'transition-all duration-150',
              'min-w-[60px] justify-center',
              isSelected
                ? 'bg-white text-[#e85d2a] shadow-sm ring-1 ring-stone-200'
                : 'text-stone-500 hover:text-stone-700',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Icon size={14} aria-hidden="true" />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
