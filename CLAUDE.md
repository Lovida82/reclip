# ReClip — CLAUDE.md

## 프로젝트 한 줄 요약
Next.js 14 + Vercel API Routes + yt-dlp 기반 영상 다운로더.
서버가 yt-dlp로 영상을 직접 다운로드해 클라이언트에 스트리밍 전송.

## 핵심 다운로드 흐름

```
사용자 URL 입력
  → POST /api/info  (yt-dlp --dump-json)  → 메타데이터 + 포맷 목록 반환
  → 품질 선택
  → POST /api/download (yt-dlp + ffmpeg 병합) → mp4/m4a 파일 직접 전송
  → 브라우저 Blob URL → 저장 대화상자
```

## API 라우트 역할

| 경로 | 역할 |
|------|------|
| `app/api/info/route.ts` | yt-dlp `--dump-json`으로 메타데이터·포맷 추출 |
| `app/api/download/route.ts` | yt-dlp로 임시 파일 다운로드 → 클라이언트 전송 → 파일 삭제 |
| `app/api/cookies/route.ts` | cookies.txt 업로드·조회·삭제 (GET/POST/DELETE) |
| `app/api/extract/route.ts` | CDN URL만 추출 (현재 미사용, 보조용) |

## 쿠키 연동 구조

- 저장 위치: `data/cookies.txt` (gitignore됨)
- 헬퍼: `lib/cookies.ts` → `getCookiesPath()` — info·download API에서 호출
- yt-dlp 인자: `--cookies <path>` 조건부 추가

## 보안 처리 (필수 유지)

- **SSRF 방어**: `isSsrfSafe()` — 내부 IP·루프백 차단 (info, download, extract 공통)
- **format_id 인젝션**: `FORMAT_ID_RE = /^[\w+\-.]{1,64}$/` allowlist 검증
- **쿠키 유효성**: Netscape 형식 검증 후 저장

## ffmpeg 위치

`imageio_ffmpeg` Python 패키지 번들 사용.
`lib/cookies.ts`가 아닌 `app/api/download/route.ts`의 `getFfmpegPath()`가 동적 탐색.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router), TypeScript
- **스타일**: Tailwind CSS, 커스텀 토큰(`reclip-bg/fg/accent`)
- **아이콘**: lucide-react (텍스트 이모티콘 절대 사용 금지)
- **다운로드 엔진**: yt-dlp + ffmpeg (imageio_ffmpeg)
- **폰트**: Instrument Serif (헤딩), DM Mono (코드·URL)

## 주요 파일 위치

```
app/
  page.tsx              메인 UI (클라이언트 컴포넌트)
  layout.tsx            폰트·메타태그
  api/info/route.ts     메타데이터 API
  api/download/route.ts 다운로드 API (핵심)
  api/cookies/route.ts  쿠키 관리 API
components/
  VideoCard.tsx         영상 카드 + 다운로드 버튼 로직
  CookieSettings.tsx    쿠키 업로드 UI
  UrlInput.tsx          URL 입력 textarea
lib/
  cookies.ts            쿠키 경로 헬퍼
  utils.ts              formatDuration, parseUrls 등
  types.ts              VideoInfo, FormatOption 타입
data/
  cookies.txt           (gitignore) 브라우저 쿠키 저장
docs/                   개발 문서 모음
```

## 로컬 실행

```bash
npm run dev        # http://localhost:3000
```

의존성: Node.js, Python + yt-dlp, imageio-ffmpeg (`pip install imageio[ffmpeg]`)

## 상세 문서

- 아키텍처: `docs/architecture.md`
- API 명세: `docs/api-spec.md`
- 쿠키 설정 가이드: `docs/cookies-guide.md`
- 배포 가이드: `docs/deployment.md`
- 트러블슈팅: `docs/troubleshooting.md`
