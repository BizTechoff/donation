@echo off
setlocal
cd /d %~dp0..

REM Disconnect payments from commitments. Run after: npm run build
git add -- src\app\routes\modals\donation-details-modal\donation-details-modal.component.html src\app\routes\modals\donation-details-modal\donation-details-modal.component.ts src\app\routes\modals\letter-properties-modal\letter-properties-modal.component.ts src\shared\controllers\commitment.controller.ts src\shared\controllers\donation.controller.ts src\shared\controllers\donor-map.controller.ts src\shared\controllers\report.controller.ts src\shared\utils\donation-utils.ts scripts\msg-payments-disconnect.txt scripts\commit-payments-disconnect.bat
git commit -F scripts\msg-payments-disconnect.txt
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
