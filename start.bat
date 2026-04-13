@echo off
title ReClip
set "PORT=3131"
set "URL=http://localhost:%PORT%"
cd /d "%~dp0"

echo.
echo  ================================
echo    ReClip  -  Video Downloader
echo  ================================
echo.

if not exist "node_modules\" (
    echo  [INSTALL] Running npm install...
    call npm install
    echo.
)

echo  [START] Server starting on port %PORT%
echo  [URL]   %URL%
echo  [STOP]  Close this window or press Ctrl+C
echo.

start "" cmd /c "ping -n 4 127.0.0.1 >nul & start %URL%"

npx next dev -p %PORT%

pause
