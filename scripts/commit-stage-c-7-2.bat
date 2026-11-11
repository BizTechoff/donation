@echo off
setlocal
cd /d %~dp0..

REM Stage C 7.2 - edit reminder donor after save (+ version). Run after: npm run build
git add -- src\app\routes\modals\reminder-details-modal\reminder-details-modal.component.html src\app\routes\modals\reminder-details-modal\reminder-details-modal.component.ts src\app\app.component.ts scripts\msg-7-2-reminder-donor.txt scripts\commit-stage-c-7-2.bat
git commit -F scripts\msg-7-2-reminder-donor.txt
if errorlevel 1 goto fail
echo.
echo DONE - 1 commit created. Nothing pushed.
git log --oneline -1
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
