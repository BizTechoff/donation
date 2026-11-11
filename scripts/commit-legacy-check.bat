@echo off
setlocal
cd /d %~dp0..

REM Donation account number + legacy check-fix tool - 2 commits. Run after: npm run build
git add -- src\shared\entity\donation.ts src\app\routes\modals\donation-details-modal\donation-details-modal.component.html scripts\msg-donation-account-number.txt
git commit -F scripts\msg-donation-account-number.txt
if errorlevel 1 goto fail
git add -- docs\migration\TbEzerCharity.xlsx tools\legacy-check-fix.ts tools\lib\excel.ts tools\lib\match.ts scripts\msg-legacy-check-fix-tool.txt scripts\commit-legacy-check.bat
git commit -F scripts\msg-legacy-check-fix-tool.txt
if errorlevel 1 goto fail
echo.
echo DONE - 2 commits created. Nothing pushed.
git log --oneline -2
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
