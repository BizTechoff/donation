@echo off
setlocal
cd /d %~dp0..

REM Stage C group 4 (commitments) - one commit per sub-item (C.A.B.S).
REM Each step copies that sub-item's snapshot from scripts\stages and commits it.
REM The last step leaves the tree exactly as it is now. Run after: npm run build

REM ---- 4-1
xcopy /E /Y /I /Q "scripts\stages\4-1\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\app.module.ts src\app\common\commitment-link\commitment-link.component.html src\app\common\commitment-link\commitment-link.component.scss src\app\common\commitment-link\commitment-link.component.ts src\app\route\donations-list\donations-list.component.html src\app\route\donations-list\donations-list.component.ts src\app\routes\modals\donation-details-modal\donation-details-modal.component.html src\app\routes\modals\donor-donations-modal\donor-donations-modal.component.html src\app\routes\modals\donor-donations-modal\donor-donations-modal.component.ts src\server\api.ts src\shared\controllers\commitment.controller.ts src\shared\controllers\donation.controller.ts src\shared\entity\donation.ts src\shared\utils\commitment-utils.ts scripts\msg-4-1-auto-commitment.txt
git commit -F scripts\msg-4-1-auto-commitment.txt
if errorlevel 1 goto fail

REM ---- 4-2
xcopy /E /Y /I /Q "scripts\stages\4-2\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\common\commitment-link\commitment-link.component.html src\app\common\commitment-link\commitment-link.component.scss src\app\common\commitment-link\commitment-link.component.ts scripts\msg-4-2-detach-commitment.txt
git commit -F scripts\msg-4-2-detach-commitment.txt
if errorlevel 1 goto fail

REM ---- 4-3
xcopy /E /Y /I /Q "scripts\stages\4-3\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\common\commitment-link\commitment-link.component.html src\app\common\commitment-link\commitment-link.component.scss src\app\common\commitment-link\commitment-link.component.ts scripts\msg-4-3-choose-commitment.txt
git commit -F scripts\msg-4-3-choose-commitment.txt
if errorlevel 1 goto fail

REM ---- 4-4
xcopy /E /Y /I /Q "scripts\stages\4-4\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\app.module.ts src\app\common\commitment-banner\commitment-banner.component.html src\app\common\commitment-banner\commitment-banner.component.scss src\app\common\commitment-banner\commitment-banner.component.ts src\app\routes\modals\donor-donations-modal\donor-donations-modal.component.html scripts\msg-4-4-commitment-banner.txt
git commit -F scripts\msg-4-4-commitment-banner.txt
if errorlevel 1 goto fail

REM ---- 4-5
xcopy /E /Y /I /Q "scripts\stages\4-5\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\app.component.ts src\app\route\donations-list\donations-list.component.html src\app\route\donations-list\donations-list.component.ts src\app\routes\modals\donor-donations-modal\donor-donations-modal.component.html src\app\routes\modals\donor-donations-modal\donor-donations-modal.component.ts src\styles.scss scripts\msg-4-5-commitment-closed.txt
git commit -F scripts\msg-4-5-commitment-closed.txt
if errorlevel 1 goto fail

REM ---- 4-6
xcopy /E /Y /I /Q "scripts\stages\4-6\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\app.module.ts src\app\common\UIToolsService.ts src\app\common\commitment-donations-button\commitment-donations-button.component.ts src\app\routes\modals\donation-details-modal\donation-details-modal.component.html src\app\routes\modals\donation-details-modal\donation-details-modal.component.ts src\app\routes\modals\donor-donations-modal\donor-donations-modal.component.html src\app\routes\modals\donor-donations-modal\donor-donations-modal.component.ts src\shared\controllers\commitment.controller.ts src\shared\utils\commitment-utils.ts scripts\msg-4-6-related-donations.txt scripts\commit-stage-c-group-4.bat
git commit -F scripts\msg-4-6-related-donations.txt
if errorlevel 1 goto fail

REM ---- 4-7
xcopy /E /Y /I /Q "scripts\stages\4-7\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\common\donation-confirm.ts src\app\route\donations-list\donations-list.component.ts src\app\routes\modals\campaign-donations-modal\campaign-donations-modal.component.ts src\app\routes\modals\donation-details-modal\donation-details-modal.component.ts src\app\routes\modals\donor-donations-modal\donor-donations-modal.component.ts scripts\msg-4-7-delete-question.txt
git commit -F scripts\msg-4-7-delete-question.txt
if errorlevel 1 goto fail

rmdir /s /q scripts\stages
echo.
echo DONE - 7 commits created. Nothing pushed.
git log --oneline -7
git status --short
goto end

:fail
echo.
echo FAILED - check the output above. Snapshots kept in scripts\stages.

:end
endlocal
