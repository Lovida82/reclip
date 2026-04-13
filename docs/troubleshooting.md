# 트러블슈팅

## 자주 발생하는 문제

---

### /api/info 404 오류

**원인**: Next.js 로컬 서버는 `api/*.py` (Vercel Python 서버리스) 파일을 처리하지 못함.

**해결**: `app/api/info/route.ts`, `app/api/download/route.ts` 파일이 존재하는지 확인.

```bash
ls app/api/
# info/  download/  cookies/  extract/
```

---

### yt-dlp YouTube 다운로드 실패 (SABR 스트리밍 오류)

**원인**: yt-dlp 구버전 (2025.09 이하)에서 YouTube SABR 스트리밍 미지원.

**해결**:

```bash
pip install -U yt-dlp
yt-dlp --version  # 2026.03.17+
```

---

### ffmpeg not found

**원인**: ffmpeg가 PATH에 없음.

**해결**:

```bash
pip install "imageio[ffmpeg]"
# yt-dlp가 imageio_ffmpeg를 자동으로 탐색
```

또는 시스템 ffmpeg 설치:

```bash
# macOS
brew install ffmpeg

# Windows (winget)
winget install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

---

### Twitter/X 타임아웃

**원인 1**: 쿠키 없음 → 로그인 필요 콘텐츠에 접근 불가.

**해결**: `docs/cookies-guide.md` 참고하여 쿠키 업로드.

**원인 2**: yt-dlp 8초 타임아웃 내에 응답이 없음.

**해결**: `app/api/info/route.ts`의 `YTDLP_TIMEOUT_MS`를 15000으로 늘려 테스트.

---

### 다운로드 버튼 클릭해도 반응 없음

**원인**: `/api/download`가 큰 파일을 처리 중 (영상 변환 + 전송 시간 소요).

**확인**: 브라우저 개발자 도구 → Network 탭에서 `/api/download` 요청 pending 상태인지 확인.

**참고**: 파일 크기에 따라 수십 초 소요 가능. "변환 중" 배너가 표시됩니다.

---

### "유효한 Netscape cookies.txt 형식이 아닙니다"

**원인**: 직접 편집하거나 잘못된 확장 프로그램으로 내보낸 파일.

**해결**: `Get cookies.txt LOCALLY` 확장 프로그램으로 다시 내보내기. 파일 첫 줄이 반드시 `# Netscape HTTP Cookie File`이어야 함.

---

### 영상에 소리가 없음

**원인**: CDN URL 직접 다운로드 방식(구버전 `/api/extract`) 사용 시 영상+음성이 분리된 경우.

**해결**: `/api/download` 엔드포인트가 ffmpeg로 자동 병합하므로 해당 없음. VideoCard가 `/api/extract` 대신 `/api/download`를 호출하는지 확인.

---

### Next.js viewport 경고

```
⚠ Unsupported metadata viewport is configured in metadata export
```

**해결**: `app/layout.tsx`에서 `viewport`를 `metadata`에서 분리하여 별도 export:

```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}
```

---

## 로그 확인

```bash
# Next.js 서버 로그 (터미널에서 확인)
npm run dev

# yt-dlp 직접 테스트
yt-dlp --dump-json --no-warnings "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```
