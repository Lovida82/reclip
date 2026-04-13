import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, DM_Mono } from 'next/font/google'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ReClip — 영상 다운로더',
  description:
    'YouTube, TikTok, Instagram 등 1000개+ 플랫폼의 영상을 무료로 다운로드하세요. 앱 설치 없이 브라우저에서 바로 사용.',
  keywords: [
    'YouTube 다운로드',
    'TikTok 다운로드',
    '영상 다운로더',
    'MP4',
    'MP3',
    'ReClip',
  ],
  authors: [{ name: 'ReClip' }],
  openGraph: {
    title: 'ReClip — 영상 다운로더',
    description:
      'YouTube, TikTok, Instagram 등 1000개+ 플랫폼의 영상을 무료로 다운로드하세요.',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'ReClip',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReClip — 영상 다운로더',
    description:
      'YouTube, TikTok, Instagram 등 1000개+ 플랫폼의 영상을 무료로 다운로드하세요.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${instrumentSerif.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-reclip-bg text-reclip-fg">
        {children}
      </body>
    </html>
  )
}
