@echo off
REM commit-16.bat - two commits. Run from anywhere. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

git add src/app/common/pipes/amount.pipe.ts ^
  src/app/routes/modals/donor-donations-modal/donor-donations-modal.component.ts ^
  scripts/commit-16.bat ^
  scripts/msg-16-amounts.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-16-amounts.txt" || goto :err
REM === [2] fix(reports): 12, 19 + version ===
echo [2] fix(reports): 12, 19 + version
git add src/app/route/reports/reports.component.html ^
  src/app/route/reports/reports.component.scss ^
  src/app/route/reports/reports.component.ts ^
  src/shared/controllers/report.controller.ts ^
  src/app/app.component.ts ^
  scripts/msg-reports-12-19.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-reports-12-19.txt" || goto :err
echo.

git status --short
git log --oneline -4
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
