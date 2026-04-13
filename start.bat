@echo off
chcp 65001 >nul
title ReClip

echo.
echo  ╔══════════════════════════════════════╗
echo  ║         ReClip  -  영상 다운로더         ║
echo  ╚══════════════════════════════════════╝
echo.

:: ── 경로 설정 ──────────────────────────────────────
set "DIR=%~dp0"
set "PORT=3131"
set "URL=http://localhost:%PORT%"

cd /d "%DIR%"

:: ── node_modules 확인 ──────────────────────────────
if not exist "node_modules\" (
    echo  [설치] npm 패키지를 설치합니다...
    call npm install
    if errorlevel 1 (
        echo.
        echo  [오류] npm install 실패. Node.js가 설치되어 있는지 확인하세요.
        pause
        exit /b 1
    )
    echo  [완료] 설치 완료
    echo.
)

:: ── yt-dlp 업데이트 확인 (선택) ────────────────────
echo  [확인] yt-dlp 버전 확인 중...
yt-dlp --version >nul 2>&1
if errorlevel 1 (
    echo  [설치] yt-dlp를 설치합니다...
    pip install yt-dlp >nul 2>&1
)

:: ── 서버 시작 ──────────────────────────────────────
echo  [시작] 서버를 시작합니다 (포트 %PORT%)...
echo.
echo  접속 주소: %URL%
echo  종료하려면 이 창을 닫거나 Ctrl+C 를 누르세요.
echo.

:: 3초 후 브라우저 자동 오픈 (백그라운드)
start "" cmd /c "timeout /t 3 >nul && start %URL%"

:: Next.js 개발 서버 실행
npm run dev -- --port %PORT%

pause
