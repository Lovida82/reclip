# ReClip — Vercel Edition

광고 없이. 설치 없이. 1000개+ 플랫폼 영상을 브라우저에서 바로 저장.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/reclip-vercel)

---

## 특징

- YouTube, TikTok, Instagram, Twitter/X, Reddit, Facebook, Vimeo, Twitch 등 1000개+ 지원
- MP4(영상) / MP3·M4A(오디오) 다운로드
- 품질 선택 (해상도별)
- 다중 URL 동시 처리
- 서버에 파일 저장 없음 — 브라우저가 직접 다운로드
- 모바일/PC 반응형

## Vercel 1-click 배포

1. 위 "Deploy with Vercel" 버튼 클릭
2. GitHub 저장소 fork 후 자동 배포
3. 끝. 별도 서버 불필요

## 로컬 실행

```bash
# 의존성 설치
npm install
pip install -r requirements.txt

# ffmpeg 설치 (macOS)
brew install ffmpeg

# 개발 서버 시작
npm run dev
```

`http://localhost:3000` 접속

## 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, lucide-react
- **Backend**: Vercel API Routes (Python serverless) + yt-dlp
- **배포**: Vercel

## 주의사항

개인 사용 목적으로만 사용하세요. 저작권법 및 각 플랫폼의 서비스 약관을 준수하세요.

## 원본

[averygan/reclip](https://github.com/averygan/reclip) 기반으로 Vercel 배포용으로 재구축됨.

## 라이선스

MIT
