export default function SkeletonCard() {
  return (
    <article
      aria-label="영상 정보 로딩 중"
      aria-busy="true"
      className="overflow-hidden rounded-xl border border-stone-100 bg-white shadow-sm"
    >
      {/* Thumbnail skeleton (16:9) */}
      <div className="aspect-video w-full skeleton-shimmer" />

      {/* Body */}
      <div className="space-y-3 p-4">
        {/* Platform badge */}
        <div className="h-5 w-16 rounded-full skeleton-shimmer" />

        {/* Title */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-3/4 rounded skeleton-shimmer" />
        </div>

        {/* Uploader + duration */}
        <div className="h-3 w-1/2 rounded skeleton-shimmer" />

        {/* Format toggle */}
        <div className="h-8 w-32 rounded-lg skeleton-shimmer" />

        {/* Quality chips */}
        <div className="flex gap-2">
          {[48, 56, 60, 52].map((w, i) => (
            <div
              key={i}
              className="h-[44px] rounded-lg skeleton-shimmer"
              style={{ minWidth: `${w}px` }}
            />
          ))}
        </div>

        {/* File size */}
        <div className="h-3 w-20 rounded skeleton-shimmer" />

        {/* Download button */}
        <div className="h-[48px] w-full rounded-xl skeleton-shimmer" />
      </div>
    </article>
  )
}
