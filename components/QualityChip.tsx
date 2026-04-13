'use client'

interface QualityChipProps {
  label: string
  subLabel?: string
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}

export default function QualityChip({
  label,
  subLabel,
  isSelected,
  onClick,
  disabled = false,
}: QualityChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex flex-col items-center justify-center',
        'min-w-[60px] h-[44px] px-3 py-1.5',
        'rounded-lg border whitespace-nowrap',
        'text-sm font-medium cursor-pointer',
        'transition-all duration-150',
        disabled
          ? 'border-stone-100 bg-stone-50 text-stone-300 cursor-not-allowed'
          : isSelected
          ? 'border-2 border-[#e85d2a] bg-orange-50 text-[#e85d2a]'
          : 'border-stone-200 bg-[#f4f1eb] text-stone-700 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-800',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="leading-tight">{label}</span>
      {subLabel && (
        <span
          className={[
            'text-[10px] leading-tight',
            isSelected ? 'text-[#e85d2a]/80' : 'text-stone-400',
          ].join(' ')}
        >
          {subLabel}
        </span>
      )}
    </button>
  )
}
