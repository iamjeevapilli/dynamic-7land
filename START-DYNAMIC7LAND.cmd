@echo off
setlocal
cd /d "%~dp0"
if exist "..\..\Dynamic7land.exe" (
  start "" "..\..\Dynamic7land.exe"
  exit /b 0
)
if not exist "node_modules\electron\dist\electron.exe" (
  call npm.cmd ci --include=optional
  if errorlevel 1 (
    echo Dependency installation failed. Check the message above.
    pause
    exit /b 1
  )
)
call npm.cmd start
pause
