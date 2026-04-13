# 쿠키 설정 가이드

Twitter/X, Instagram(비공개), YouTube(연령제한) 등 로그인이 필요한 사이트에서
영상을 다운로드하려면 브라우저 쿠키를 ReClip에 등록해야 합니다.

---

## 1단계: 확장 프로그램 설치

**Chrome / Edge**

[Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
Chrome 웹스토어에서 설치합니다.

**Firefox**

[cookies.txt](https://addons.mozilla.org/ko/firefox/addon/cookies-txt/) 애드온 설치.

---

## 2단계: 쿠키 내보내기

1. 다운로드하려는 사이트에 **로그인**합니다.
   - Twitter/X → `https://x.com`
   - Instagram → `https://www.instagram.com`
   - YouTube → `https://www.youtube.com`

2. 해당 사이트 탭에서 확장 프로그램 아이콘 클릭

3. **"Export"** 또는 **"현재 사이트"** 버튼 클릭

4. `cookies.txt` 파일로 저장

> 파일 첫 줄이 `# Netscape HTTP Cookie File` 로 시작해야 합니다.

---

## 3단계: ReClip에 업로드

1. `http://localhost:3131` 접속

2. 헤더 우측 **"쿠키 설정"** 버튼 클릭

3. **"cookies.txt 업로드"** 클릭 → 저장한 파일 선택

4. "쿠키 N개 저장됨" 메시지 확인

5. 버튼이 초록색 **"쿠키 적용 중"** 으로 바뀌면 완료

---

## 플랫폼별 주의사항

| 플랫폼 | 비고 |
|--------|------|
| **Twitter/X** | 로그인 후 x.com에서 내보내기. 쿠키 유효기간 약 30일 |
| **Instagram** | 비공개 계정 팔로우 상태여야 함 |
| **YouTube** | 연령제한·멤버십 영상만 쿠키 필요. 일반 영상은 불필요 |
| **Facebook** | 공개 영상은 쿠키 불필요 |

---

## 쿠키 삭제

- "쿠키 설정" 패널 → 휴지통 아이콘 클릭
- 또는 `data/cookies.txt` 파일 직접 삭제

---

## 보안 안내

- 쿠키는 **로컬 서버에만 저장**됩니다 (`data/cookies.txt`)
- 외부 서버로 전송되지 않습니다
- `data/cookies.txt`는 `.gitignore`에 등록되어 Git에 커밋되지 않습니다
- 쿠키에는 로그인 세션 정보가 포함되므로 타인과 공유하지 마세요
- Vercel 배포 시에는 쿠키 파일을 사용할 수 없습니다 (로컬 전용 기능)

---

## 문제 해결

**"유효한 Netscape cookies.txt 형식이 아닙니다" 오류**
→ 확장 프로그램의 Export 기능을 사용했는지 확인. 직접 편집한 파일은 형식이 맞지 않을 수 있습니다.

**업로드 후에도 로그인 필요 오류**
→ 해당 사이트에서 쿠키를 다시 내보내세요. 쿠키가 만료됐을 수 있습니다.

**Twitter/X 타임아웃**
→ yt-dlp 8초 타임아웃 내에 응답이 없는 경우. 잠시 후 재시도하거나 다른 트윗 URL을 테스트해 보세요.
