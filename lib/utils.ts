/**
 * Format a duration in seconds to "H:MM:SS" or "M:SS"
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/**
 * Format bytes to human-readable size string
 */
export function formatFilesize(bytes: number | null): string {
  if (bytes === null || bytes === undefined || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `약 ${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

/**
 * Parse a raw input string into an array of unique URLs.
 * Splits on whitespace, commas, and newlines.
 */
export function parseUrls(input: string): string[] {
  if (!input.trim()) return []

  const raw = input
    .split(/[\s,\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Keep only strings that look like URLs
  const urlLike = raw.filter((s) =>
    s.startsWith('http://') || s.startsWith('https://')
  )

  // Deduplicate while preserving order
  return [...new Set(urlLike)]
}

/**
 * Detect iOS Safari — cross-origin CDN URLs cannot use the <a download> trick.
 * iOS Safari opens the URL in browser instead of downloading.
 */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iP(hone|ad|od)/.test(ua) && /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

/**
 * Trigger a browser download for a given URL and filename.
 * - Desktop / Android: uses <a download> attribute (works for cross-origin CDN URLs)
 * - iOS Safari: cross-origin <a download> is silently ignored; open in new tab
 *   so the user can long-press → "Save to Files" or "Save Image"
 *
 * Returns 'download' | 'ios-fallback' so the caller can show an appropriate hint.
 */
export function triggerDownload(url: string, filename: string): 'download' | 'ios-fallback' {
  if (isIosSafari()) {
    // iOS Safari cannot auto-download cross-origin URLs — open in new tab instead
    window.open(url, '_blank', 'noopener,noreferrer')
    return 'ios-fallback'
  }

  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener noreferrer'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
    }, 200)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  return 'download'
}

/**
 * Format an expiry time in seconds to a human-readable string
 */
export function formatExpiresIn(seconds: number): string {
  if (seconds <= 0) return '만료됨'
  if (seconds < 60) return `${seconds}초`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`
  return `${Math.floor(seconds / 3600)}시간`
}

/**
 * Capitalize a platform name for display
 */
export function formatPlatformName(platform: string): string {
  const map: Record<string, string> = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    twitter: 'Twitter/X',
    reddit: 'Reddit',
    facebook: 'Facebook',
    vimeo: 'Vimeo',
    twitch: 'Twitch',
  }
  const key = platform.toLowerCase()
  return map[key] ?? platform.charAt(0).toUpperCase() + platform.slice(1)
}
