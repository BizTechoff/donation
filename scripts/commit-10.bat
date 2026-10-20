@echo off
REM commit-10.bat - one commit. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

echo [1] fix(donor-card): 10 - email columns
git add src/app/routes/modals/donor-details-modal/donor-details-modal.component.html ^
  scripts/commit-10.bat ^
  scripts/msg-10-email-columns.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-10-email-columns.txt" || goto :err
echo.

git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
