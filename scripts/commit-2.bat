@echo off
REM commit-2.bat - one commit. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

echo [1] feat(cities): 2 - duplicate detection (read-only)
git add src/shared/utils/city-matching.ts ^
  src/shared/controllers/place.controller.ts ^
  tools/city-duplicates-report.ts ^
  scripts/commit-2.bat ^
  scripts/msg-2-city-duplicates.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-2-city-duplicates.txt" || goto :err
echo.

git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
