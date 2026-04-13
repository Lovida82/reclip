# 아키텍처

## 전체 흐름

```
브라우저 (Next.js 프론트엔드)
  │
  ├─ POST /api/info ──────────────────────────────────────┐
  │     yt-dlp --dump-json <URL>                          │
  │     쿠키 있으면 --cookies <path> 추가                 │
  │     → 제목, 썸네일, 포맷 목록 반환                   │
  │                                                       │
  ├─ POST /api/download ──────────────────────────────────┤
  │     yt-dlp -f <format_id> --merge-output-format mp4   │
  │     --ffmpeg-location <imageio_ffmpeg 경로>           │
  │     쿠키 있으면 --cookies <path> 추가                 │
  │     → /tmp/reclip-XXXXX/<title>.mp4 임시 저장         │
  │     → Response(blob) 전송 → 임시 파일 삭제            │
  │     (브라우저: Blob URL → 저장 대화상자)              │
  │                                                       │
  └─ GET/POST/DELETE /api/cookies ────────────────────────┘
        data/cookies.txt 관리 (로컬 전용)
```

## 왜 "서버 다운로드" 방식인가

YouTube 등은 영상(video)과 음성(audio)이 **분리된 스트림**으로 제공됩니다.
브라우저에서 CDN URL을 직접 받아 다운로드하면:

- 영상만 있고 소리가 없음 (분리 스트림)
- cross-origin `<a download>` 속성이 무시됨 (브라우저 보안 정책)

따라서 서버(yt-dlp + ffmpeg)가 두 스트림을 병합 후 완성된 파일을 전송합니다.

## 임시 파일 처리

```
요청 수신
  └─ mkdtemp() → /tmp/reclip-XXXXX/
      └─ yt-dlp -o <tmpDir>/<filename.mp4>  (ffmpeg 병합 포함)
          └─ 완료 → readFile() → Response 전송
              └─ unlink() 비동기 정리
```

## 컴포넌트 의존 관계

```
app/page.tsx (클라이언트)
  ├── UrlInput.tsx         URL 입력·파싱
  ├── CookieSettings.tsx   쿠키 업로드 UI (헤더 우측)
  └── VideoCard.tsx
        ├── QualityChip.tsx   화질 선택 칩
        ├── FormatToggle.tsx  MP4/M4A 토글
        └── SkeletonCard.tsx  로딩 플레이스홀더

lib/ (서버+클라이언트 공용)
  ├── types.ts    VideoInfo, FormatOption, VideoCardState
  ├── utils.ts    formatDuration, parseUrls, formatFilesize 등
  └── cookies.ts  getCookiesPath() — 서버 전용
```

## api/ vs app/api/ 구분

| 위치 | 용도 | 동작 환경 |
|------|------|-----------|
| `api/info.py` | Vercel Python 서버리스 | Vercel 배포 시 |
| `api/extract.py` | Vercel Python 서버리스 | Vercel 배포 시 |
| `app/api/info/route.ts` | Next.js API Route | 로컬 개발 서버 |
| `app/api/download/route.ts` | Next.js API Route | 로컬 개발 서버 |
| `app/api/cookies/route.ts` | Next.js API Route | 로컬 개발 서버 |

현재 로컬에서는 `app/api/` TypeScript 파일이 동작합니다.

## 로컬 vs Vercel 비교

| 항목 | 로컬 (`start.bat`) | Vercel |
|------|-------------------|--------|
| API 처리 | Next.js 내장 서버 | Serverless Functions |
| 파일 저장 | 디스크 자유 | `/tmp` 한정 (512MB) |
| 실행 시간 | 제한 없음 | 10초(무료) / 60초(Pro) |
| yt-dlp | PATH에서 실행 | 없음 (설치 불가) |
| ffmpeg | imageio_ffmpeg | 없음 |
| 쿠키 연동 | `data/cookies.txt` | 불가 |
| **다운로드 가능 여부** | **전체 동작** | **불가** |
