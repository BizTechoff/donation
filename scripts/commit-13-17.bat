@echo off
REM commit-13-17.bat - one commit. Run from anywhere. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

git add src/app/route/reminders/reminders.component.html ^
  src/app/route/reminders/reminders.component.ts ^
  src/styles.scss ^
  src/app/route/donor-gifts-list/donor-gifts-list.component.html ^
  src/app/route/donor-gifts-list/donor-gifts-list.component.ts ^
  src/app/routes/modals/reminder-details-modal/reminder-details-modal.component.scss ^
  src/app/routes/modals/reminder-details-modal/reminder-details-modal.component.ts ^
  src/app/app.component.ts ^
  scripts/commit-13-17.bat ^
  scripts/msg-13-17-reminders.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-13-17-reminders.txt" || goto :err
git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
