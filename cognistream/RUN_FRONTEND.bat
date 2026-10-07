@echo off
cd /d "%~dp0frontend"
echo Keep this window open while using CogniStream. Ctrl+C stops the frontend.
call npm run dev
pause
