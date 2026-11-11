@echo off
setlocal
cd /d %~dp0..

REM Bank/organization single source. Run after: npm run build
git add -- src\app\routes\modals\donation-details-modal\donation-details-modal.component.html src\app\routes\modals\donation-details-modal\donation-details-modal.component.ts src\shared\controllers\donation.controller.ts src\server\google-contacts-sync.ts scripts\msg-bank-org-single-source.txt scripts\commit-bank-org-single-source.bat
git commit -F scripts\msg-bank-org-single-source.txt
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
