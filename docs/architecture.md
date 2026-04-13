# 아키텍처

## 전체 흐름

```
브라우저 (Next.js 프론트엔드)
  │
  ├─ POST /api/info ──────────────────────────────────────┐
  │     yt-dlp --dump-json <URL>                          │
  │     → 제목, 썸네일, 포맷 목록 반환                   │
  │                                                       │
  ├─ POST /api/download ──────────────────────────────────┤
  │     yt-dlp -f <format_id> + ffmpeg 병합               │
  │     → 임시 파일 저장 → Response로 전송 → 파일 삭제   │
  │     (브라우저: Blob URL → 저장 대화상자)              │
  │                                                       │
  └─ GET/POST/DELETE /api/cookies ─────────────────────── ┘
        data/cookies.txt 관리
```

## 왜 "서버 다운로드" 방식인가

YouTube 등은 영상(video)과 음성(audio)이 **분리된 스트림**으로 제공됩니다.
브라우저에서 CDN URL을 직접 받아 다운로드하면:

- 영상만 있고 소리가 없음
- cross-origin `<a download>` 속성이 무시됨 (브라우저 보안 정책)

따라서 서버(yt-dlp + ffmpeg)가 두 스트림을 병합한 후 완성된 파일을 전송합니다.

## 임시 파일 처리

```
요청 수신
  └─ mkdtemp() → /tmp/reclip-XXXXX/
      └─ yt-dlp -o <tmpDir>/<filename>
          └─ 완료 → readFile() → Response 전송
              └─ unlink() (비동기 정리)
```

## 컴포넌트 의존 관계

```
page.tsx
  ├── UrlInput.tsx         (URL 입력, 파싱)
  ├── CookieSettings.tsx   (쿠키 업로드 UI)
  └── VideoCard.tsx
        ├── QualityChip.tsx
        ├── FormatToggle.tsx
        └── SkeletonCard.tsx

lib/
  ├── types.ts    (VideoInfo, FormatOption, VideoCardState)
  ├── utils.ts    (formatDuration, parseUrls, triggerDownload 등)
  └── cookies.ts  (getCookiesPath — 서버 전용)
```

## Vercel 배포 vs 로컬 차이

| 항목 | 로컬 (`npm run dev`) | Vercel |
|------|---------------------|--------|
| API 처리 | Next.js 내장 서버 | Serverless Functions |
| 파일 저장 | 디스크 가능 | `/tmp` 한정 (512MB) |
| 실행 시간 | 제한 없음 | 10초 (무료) / 60초 (Pro) |
| ffmpeg | imageio_ffmpeg 또는 시스템 | 배포 불가 (별도 레이어 필요) |
| 쿠키 연동 | 가능 (`data/cookies.txt`) | 불가 (파일시스템 제한) |

> Vercel 배포는 메타데이터 조회(`/api/info`)만 정상 동작.
> 실제 다운로드는 로컬 서버 또는 별도 백엔드(Railway, Render) 필요.
