@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" goto missing
if not exist "frontend\dist\index.html" goto missing
start "CogniStream" cmd /k ""%~dp0RUN_BACKEND.bat""
echo Starting the local app. Keep its terminal window open.
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8000"
exit /b 0
:missing
echo Follow START_HERE.txt to install the Python requirements.
pause
exit /b 1
