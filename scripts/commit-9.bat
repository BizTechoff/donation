@echo off
REM commit-9.bat - one commit. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

echo [1] fix(address): 9 - header address
git add src/app/routes/modals/donor-details-modal/donor-details-modal.component.ts ^
  src/app/mobile/quick-donation/steps/donor-details-step/donor-details-step.component.ts ^
  src/app/mobile/quick-donation/steps/donor-details-step/donor-details-step.component.html ^
  scripts/commit-9.bat ^
  scripts/msg-9-header-address.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-9-header-address.txt" || goto :err
echo.

git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
