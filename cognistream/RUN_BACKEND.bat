@echo off
cd /d "%~dp0backend"
echo Keep this window open while using CogniStream. Ctrl+C stops the backend.
".venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
