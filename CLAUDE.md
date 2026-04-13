# ReClip — CLAUDE.md

## 프로젝트 한 줄 요약
Next.js 16 + TypeScript API Routes + yt-dlp 기반 로컬 영상 다운로더.
서버가 yt-dlp + ffmpeg로 영상을 직접 다운로드·병합해 클라이언트에 전송.

## 핵심 다운로드 흐름

```
사용자 URL 입력
  → POST /api/info  (yt-dlp --dump-json)  → 메타데이터 + 포맷 목록 반환
  → 품질 선택
  → POST /api/download (yt-dlp + ffmpeg 병합 → 임시파일 → 전송 → 삭제)
  → 브라우저 Blob URL → 저장 대화상자
```

## API 라우트 역할

| 경로 | 역할 |
|------|------|
| `app/api/info/route.ts` | yt-dlp `--dump-json`으로 메타데이터·포맷 추출 |
| `app/api/download/route.ts` | yt-dlp 임시파일 다운로드 → 클라이언트 전송 → 삭제 (핵심) |
| `app/api/cookies/route.ts` | cookies.txt 업로드·조회·삭제 (GET/POST/DELETE) |
| `app/api/extract/route.ts` | CDN URL만 추출 (현재 미사용, 보조용) |

> `api/info.py`, `api/extract.py` — Vercel Python 서버리스용 (로컬 미사용)

## 쿠키 연동 구조

- 저장 위치: `data/cookies.txt` (gitignore됨)
- 헬퍼: `lib/cookies.ts` → `getCookiesPath()` — info·download API에서 호출
- yt-dlp 인자: `--cookies <path>` 조건부 추가
- UI: 헤더의 `CookieSettings.tsx` 컴포넌트

## 보안 처리 (필수 유지)

- **SSRF 방어**: `isSsrfSafe()` — 내부 IP·루프백 차단 (info, download 공통)
- **format_id 인젝션**: `FORMAT_ID_RE = /^[\w+\-.]{1,64}$/` allowlist 검증
- **쿠키 유효성**: Netscape 형식 (`# Netscape HTTP Cookie File`) 검증 후 저장

## ffmpeg 위치

`imageio_ffmpeg` Python 패키지 번들 사용 (PATH에 없어도 동작).
`app/api/download/route.ts`의 `getFfmpegPath()`가 Python으로 경로 동적 탐색.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router), TypeScript
- **스타일**: Tailwind CSS, 커스텀 토큰 (`reclip-bg` #f4f1eb / `reclip-fg` #3a3a38 / `reclip-accent` #e85d2a)
- **아이콘**: lucide-react (텍스트 이모티콘 절대 사용 금지)
- **다운로드 엔진**: yt-dlp 2026.03+ + ffmpeg (imageio_ffmpeg)
- **폰트**: Instrument Serif (헤딩), DM Mono (코드·URL)

## 주요 파일 위치

```
start.bat             원클릭 실행 (포트 3131, 브라우저 자동 오픈)
app/
  page.tsx            메인 UI (클라이언트 컴포넌트)
  layout.tsx          폰트·메타태그·viewport
  api/
    info/route.ts     메타데이터 API
    download/route.ts 다운로드 API (핵심)
    cookies/route.ts  쿠키 관리 API
    extract/route.ts  CDN URL 추출 (보조)
components/
  VideoCard.tsx       영상 카드 + 다운로드 버튼 로직
  CookieSettings.tsx  쿠키 업로드 UI (헤더 우측)
  UrlInput.tsx        URL 입력 textarea
  QualityChip.tsx     화질 선택 칩
  FormatToggle.tsx    MP4/M4A 토글
  SkeletonCard.tsx    로딩 플레이스홀더
lib/
  cookies.ts          쿠키 경로 헬퍼 (서버 전용)
  utils.ts            formatDuration, parseUrls 등
  types.ts            VideoInfo, FormatOption, VideoCardState
data/
  cookies.txt         (gitignore) 브라우저 쿠키 저장
docs/                 개발 문서 모음
```

## 로컬 실행

```
start.bat 더블클릭 → http://localhost:3131 자동 오픈
```

또는 터미널:
```bash
npx next dev -p 3131
```

## 의존성 (최초 1회)

```bash
npm install
pip install yt-dlp "imageio[ffmpeg]"
```

## GitHub

https://github.com/Lovida82/reclip

## 상세 문서

| 파일 | 내용 |
|------|------|
| `docs/architecture.md` | 전체 흐름·컴포넌트 구조 |
| `docs/api-spec.md` | API 요청/응답 명세 |
| `docs/cookies-guide.md` | 쿠키 설정 방법 |
| `docs/deployment.md` | 로컬·Railway 배포 |
| `docs/troubleshooting.md` | 문제 해결 |
