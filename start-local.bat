@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required but was not found.
  echo Please install Node.js first: https://nodejs.org/
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo .env.local was not found.
  echo Please run setup-gemini-env.bat first.
  pause
  exit /b 1
)

echo Starting local note system...
echo Open http://localhost:3000 in your browser.
echo Press Ctrl+C to stop.
echo.
node local-server.js
pause
