@echo off
setlocal

cd /d "%~dp0"

echo Gemini API local setup
echo.
set /p GEMINI_KEY=Paste your GEMINI_API_KEY: 

if "%GEMINI_KEY%"=="" (
  echo.
  echo API Key is required. No file was created.
  pause
  exit /b 1
)

set /p GEMINI_MODEL=Model name [gemini-3.5-flash]: 
if "%GEMINI_MODEL%"=="" set "GEMINI_MODEL=gemini-3.5-flash"

(
  echo GEMINI_API_KEY=%GEMINI_KEY%
  echo GEMINI_MODEL=%GEMINI_MODEL%
) > ".env.local"

echo.
echo Created .env.local successfully.
echo You can now run:
echo   vercel dev
echo.
pause
