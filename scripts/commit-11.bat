@echo off
REM commit-11.bat - one commit. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

echo [1] feat(letters): 11 - letter file name
git add src/shared/controllers/letter.controller.ts ^
  src/shared/utils/file-name-utils.ts ^
  scripts/commit-11.bat ^
  scripts/msg-11-letter-filename.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-11-letter-filename.txt" || goto :err
echo.

git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
