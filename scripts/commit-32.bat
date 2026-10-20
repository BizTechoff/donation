@echo off
REM commit-32.bat - one commit. Run from anywhere. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

git add src/app/app.component.ts ^
  src/app/route/certificates/certificates.component.ts ^
  src/app/route/donations-list/donations-list.component.ts ^
  src/app/route/donor-gifts-list/donor-gifts-list.component.ts ^
  src/app/route/donor-list/donor-list.component.ts ^
  src/app/route/reminders/reminders.component.ts ^
  src/app/route/reports/reports.component.ts ^
  src/app/services/excel-export.service.ts ^
  scripts/commit-32.bat ^
  scripts/msg-32-last-name-first.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-32-last-name-first.txt" || goto :err
git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
