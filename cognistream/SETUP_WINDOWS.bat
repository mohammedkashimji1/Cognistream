@echo off
setlocal
cd /d "%~dp0"
echo CogniStream - first-time installation
echo Keep this window open. Internet is needed only for installation and live AI.
where python >nul 2>nul
if errorlevel 1 goto no_python
where npm >nul 2>nul
if errorlevel 1 goto no_node
python -c "import sys; assert sys.version_info >= (3,10), 'Use Python 3.10 or newer'"
if errorlevel 1 goto failed
if not exist "backend\.venv\Scripts\python.exe" python -m venv "backend\.venv"
if errorlevel 1 goto failed
"backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
if errorlevel 1 goto failed
if not exist "backend\.env" copy "backend\.env.example" "backend\.env" >nul
pushd frontend
call npm ci --no-audit --no-fund
if errorlevel 1 goto npm_failed
popd
node scripts\prepare_assets.mjs
if errorlevel 1 goto failed
echo.
echo Installation finished. Double-click START_WINDOWS.bat next.
pause
exit /b 0
:npm_failed
popd
goto failed
:no_python
echo Python was not found. Install Python 3.12 and select Add Python to PATH.
goto failed
:no_node
echo Node.js was not found. Install Node.js 22 LTS or newer, then reopen this file.
goto failed
:failed
echo.
echo Installation stopped. Read the error above or send a screenshot to ChatGPT.
pause
exit /b 1
