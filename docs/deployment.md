# 배포 가이드

## 로컬 실행 (권장 — 전기능 동작)

### 원클릭 실행

```
start.bat 더블클릭
```

- `node_modules` 없으면 자동으로 `npm install` 실행
- 3초 후 브라우저 자동 오픈 (`http://localhost:3131`)
- 창 닫으면 서버 종료

### 수동 실행

```bash
npx next dev -p 3131
```

### 사전 요구사항 (최초 1회 설치)

```bash
# Node.js v18+
node --version

# Python 의존성
pip install yt-dlp "imageio[ffmpeg]"

# npm 패키지 (start.bat이 자동 처리)
npm install
```

### 동작 확인된 환경

- OS: Windows 11
- Node.js: v24
- Python: 3.13
- yt-dlp: 2026.03.17
- Next.js: 16.2.3

---

## GitHub

저장소: **https://github.com/Lovida82/reclip**

```bash
# 변경사항 push
git add .
git commit -m "변경 내용"
git push
```

---

## Vercel 배포 (제한적)

UI는 배포되지만 **다운로드 기능은 동작하지 않습니다.**

| 기능 | 상태 | 이유 |
|------|------|------|
| UI | 동작 | 정적 프론트엔드 |
| `/api/info` | 불가 | yt-dlp 없음 |
| `/api/download` | 불가 | yt-dlp + ffmpeg 없음, 타임아웃 |
| 쿠키 연동 | 불가 | 파일시스템 영속성 없음 |

### 배포 절차 (UI 확인 목적)

```bash
# vercel.com → New Project → GitHub 저장소(Lovida82/reclip) 선택 → Deploy
```

---

## Railway 풀스택 배포 (외부 접근 필요 시)

Railway는 Docker 기반으로 ffmpeg + yt-dlp 전체 스택 사용 가능.
월 $5 무료 크레딧 제공.

### Dockerfile (프로젝트 루트에 추가)

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y ffmpeg python3 python3-pip
RUN pip install yt-dlp --break-system-packages
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
```

### 배포

1. [railway.app](https://railway.app) → New Project → GitHub 연결
2. `Lovida82/reclip` 저장소 선택
3. Dockerfile 자동 감지 → Deploy
4. 생성된 URL로 접속 (쿠키 연동 제외 전기능 동작)
