# 트러블슈팅

## 자주 발생하는 문제

---

### start.bat 실행 시 한글 깨짐 / 명령어 오류

**원인**: 배치 파일 인코딩 문제로 한글이 명령어로 해석됨.

**해결**: 현재 `start.bat`은 영문만 사용하도록 수정됨. 문제 발생 시 저장소에서 최신 버전으로 교체:
```bash
git pull
```

---

### /api/info 404 오류

**원인**: Next.js 로컬 서버는 `api/*.py` (Vercel Python 서버리스) 파일을 처리하지 못함.

**해결**: `app/api/info/route.ts` 파일이 존재하는지 확인.

```
app/api/
  info/route.ts
  download/route.ts
  cookies/route.ts
  extract/route.ts
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
```

`app/api/download/route.ts`의 `getFfmpegPath()`가 `imageio_ffmpeg` 번들을 자동 탐색함. 별도 설치 불필요.

---

### Twitter/X 타임아웃

**원인 1**: 쿠키 없음 → 로그인 필요 콘텐츠 접근 불가.

**해결**: `docs/cookies-guide.md` 참고하여 쿠키 업로드.

**원인 2**: yt-dlp 8초 타임아웃 초과.

**해결**: `app/api/info/route.ts`의 `YTDLP_TIMEOUT_MS` 값을 `15000`으로 늘려 테스트.

---

### 다운로드 버튼 클릭 후 반응 없음 (긴 대기)

**원인**: `/api/download`가 파일 변환 중 (영상 다운로드 + ffmpeg 병합 + 전송).

**확인**: 브라우저 개발자 도구 → Network 탭 → `/api/download` 요청이 pending 상태인지 확인.

- 카드에 "변환 중" 주황 배너가 뜨는 것이 정상
- 파일 크기에 따라 수십 초 소요 가능

---

### 영상에 소리가 없음

**원인**: `/api/extract` (CDN URL 방식) 호출 시 YouTube 분리 스트림 문제.

**해결**: `VideoCard.tsx`가 `/api/download`를 호출하는지 확인. `/api/download`는 ffmpeg로 자동 병합하므로 소리 없음 문제가 없음.

---

### "유효한 Netscape cookies.txt 형식이 아닙니다"

**원인**: 직접 편집하거나 잘못된 확장 프로그램으로 내보낸 파일.

**해결**: `Get cookies.txt LOCALLY` 확장 프로그램으로 다시 내보내기. 파일 첫 줄이 반드시 `# Netscape HTTP Cookie File`이어야 함. 자세한 내용은 `docs/cookies-guide.md` 참고.

---

### 포트 3131 이미 사용 중

**원인**: 이전 서버가 종료되지 않고 포트를 점유 중.

**해결**:

```bash
# 사용 중인 프로세스 확인 (Windows)
netstat -ano | findstr :3131

# 프로세스 종료
taskkill /PID <PID번호> /F
```

또는 `start.bat`의 `PORT=3131`을 `PORT=3132` 등 다른 포트로 변경.

---

## 로그 확인

```bash
# Next.js 서버 로그
# start.bat 실행 시 같은 창에 출력됨

# yt-dlp 직접 테스트
yt-dlp --dump-json --no-warnings "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# yt-dlp 버전 확인
yt-dlp --version
```
