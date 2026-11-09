@echo off
setlocal
cd /d %~dp0..

REM Stage C 6.1 - assign a gift to many donors. Run after: npm run build
git add -- src\app\routes\modals\donor-gift-details-modal\donor-gift-details-modal.component.html src\app\routes\modals\donor-gift-details-modal\donor-gift-details-modal.component.scss src\app\routes\modals\donor-gift-details-modal\donor-gift-details-modal.component.ts src\shared\controllers\donor-gift.controller.ts scripts\msg-6-1-bulk-gift.txt scripts\commit-stage-c-6-1.bat
git commit -F scripts\msg-6-1-bulk-gift.txt
if errorlevel 1 goto fail
echo.
echo DONE - 1 commit created. Nothing pushed.
git log --oneline -1
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
