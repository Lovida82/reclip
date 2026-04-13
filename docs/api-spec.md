# API 명세

Base URL: `http://localhost:3131` (로컬) 또는 Vercel 배포 URL

---

## POST /api/info

영상 메타데이터 및 다운로드 가능한 포맷 목록 조회.

### 요청

```json
{ "url": "https://www.youtube.com/watch?v=..." }
```

### 응답 (200)

```json
{
  "id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "thumbnail": "https://...",
  "duration": 213,
  "uploader": "Rick Astley",
  "platform": "youtube",
  "formats": [
    { "format_id": "137+bestaudio", "resolution": "1080p", "ext": "mp4", "filesize_approx": 98765432 }
  ],
  "audio_formats": [
    { "format_id": "140", "ext": "m4a", "abr": 128, "filesize_approx": 3456789 }
  ]
}
```

### 에러 코드

| 코드 | HTTP | 의미 |
|------|------|------|
| `INVALID_URL` | 400 | URL 형식 오류 또는 SSRF 차단 |
| `UNSUPPORTED_URL` | 422 | 지원하지 않는 플랫폼 |
| `PRIVATE_VIDEO` | 422 | 비공개 영상 |
| `TIMEOUT` | 504 | yt-dlp 8초 초과 |
| `EXTRACTION_ERROR` | 500 | 기타 실패 |

---

## POST /api/download

영상 파일 다운로드 (서버에서 직접 병합 후 전송).

### 요청

```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format_id": "137+bestaudio",
  "audio_only": false,
  "title": "영상 제목"
}
```

- `audio_only: true` 시 `format_id` 불필요. `bestaudio` 자동 선택.

### 응답 (200)

```
Content-Type: video/mp4
Content-Disposition: attachment; filename="영상_제목.mp4"
Content-Length: 98765432
[binary mp4 data]
```

### 에러 코드

| 코드 | HTTP | 의미 |
|------|------|------|
| `INVALID_REQUEST` | 400 | 파라미터 오류·SSRF·format_id 인젝션 |
| `EXTRACTION_FAILED` | 422 | 비공개·로그인 필요 |
| `TIMEOUT` | 504 | 다운로드 5분 초과 |
| `DOWNLOAD_ERROR` | 500 | 기타 실패 |

---

## GET /api/cookies

쿠키 파일 존재 여부 확인.

### 응답

```json
{ "exists": true, "size": 12345, "updatedAt": "2026-04-13T00:00:00.000Z" }
// 또는
{ "exists": false }
```

---

## POST /api/cookies

cookies.txt 업로드. `multipart/form-data`로 전송.

### 요청

```
Content-Type: multipart/form-data
[cookies 필드: cookies.txt 파일]
```

### 응답

```json
{ "ok": true, "cookieCount": 42 }
```

### 에러

```json
{ "error": "유효한 Netscape cookies.txt 형식이 아닙니다." }
```

---

## DELETE /api/cookies

저장된 쿠키 파일 삭제.

### 응답

```json
{ "ok": true }
```
