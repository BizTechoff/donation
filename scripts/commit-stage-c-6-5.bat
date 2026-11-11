@echo off
setlocal
cd /d %~dp0..

REM Stage C 6.5 - shared gift. Run after: npm run build
git add -- src\app\routes\modals\donor-gift-details-modal\donor-gift-details-modal.component.html src\app\routes\modals\donor-gift-details-modal\donor-gift-details-modal.component.scss src\app\routes\modals\donor-gift-details-modal\donor-gift-details-modal.component.ts src\app\route\donor-gifts-list\donor-gifts-list.component.html src\app\route\donor-gifts-list\donor-gifts-list.component.ts src\styles.scss src\shared\entity\donor-gift.ts src\shared\controllers\donor-gift.controller.ts scripts\msg-6-5-shared-gift.txt scripts\commit-stage-c-6-5.bat
git commit -F scripts\msg-6-5-shared-gift.txt
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
