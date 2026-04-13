// ── API Request Types ────────────────────────────────────

export interface InfoRequest {
  url: string
}

export interface ExtractRequest {
  url: string
  format_id?: string
  audio_only?: boolean
}

// ── API Response Types ───────────────────────────────────

export interface FormatOption {
  format_id: string
  resolution: string       // e.g. "1080p", "720p"
  ext: string              // "mp4", "webm"
  filesize_approx: number | null  // bytes
  vcodec: string
  acodec: string
}

export interface AudioFormatOption {
  format_id: string
  ext: string              // "m4a", "webm"
  abr: number              // kbps
  filesize_approx: number | null
}

export interface VideoInfo {
  id: string
  title: string
  thumbnail: string
  duration: number         // seconds
  uploader: string
  platform: string
  formats: FormatOption[]
  audio_formats: AudioFormatOption[]
}

export interface ExtractResult {
  download_url: string
  filename: string
  ext: string
  expires_in: number | null  // seconds
}

export interface ApiError {
  error: string
  message: string
}

// ── Client-side Card State ───────────────────────────────

export type CardStatus = 'loading' | 'success' | 'error'

export interface VideoCardState {
  url: string
  status: CardStatus
  data?: VideoInfo
  errorMessage?: string
}
