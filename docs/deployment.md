# 배포 가이드

## 로컬 실행 (권장)

다운로드 기능 전체가 동작합니다.

### 사전 요구사항

```bash
node --version   # v18+
python --version # 3.8+
yt-dlp --version # 2026.03+ 권장
ffmpeg           # imageio[ffmpeg]로 대체 가능
```

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install
pip install yt-dlp "imageio[ffmpeg]"

# 2. 개발 서버
npm run dev
# → http://localhost:3000

# 3. 포트 변경 (선택)
npm run dev -- --port 3131
```

---

## Vercel 배포

메타데이터 조회(`/api/info`)만 동작합니다.
실제 파일 다운로드(`/api/download`)는 ffmpeg 부재와 타임아웃으로 제한됩니다.

### 배포 절차

```bash
# 1. GitHub에 push
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/<user>/reclip.git
git push -u origin main

# 2. vercel.com → New Project → GitHub 저장소 선택 → Deploy
```

### 제한 사항

| 기능 | 상태 |
|------|------|
| 메타데이터 조회 (`/api/info`) | 동작 (yt-dlp 설치 시) |
| 파일 다운로드 (`/api/download`) | 타임아웃·ffmpeg 부재로 제한 |
| 쿠키 연동 | 불가 (파일시스템 제한) |

### Vercel에서 다운로드까지 동작하게 하려면

Railway 또는 Render에 Python/Flask 백엔드를 별도 배포하고,
Next.js의 `/api/download` 를 해당 백엔드로 프록시하는 구조로 변경해야 합니다.

---

## Railway 풀스택 배포 (선택)

Railway는 Dockerfile 기반 배포로 ffmpeg + yt-dlp 전체 스택 사용 가능.

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y ffmpeg python3 pip
RUN pip install yt-dlp
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Railway에 GitHub 연결 후 자동 배포.
