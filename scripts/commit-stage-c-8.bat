@echo off
setlocal
cd /d %~dp0..

REM Stage C 8 - donation partners on both sides (+ version)
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.5','2026.11.11.6'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\shared\utils\donation-partners.ts src\shared\entity\donation.ts src\shared\controllers\report.controller.ts src\shared\controllers\letter.controller.ts src\app\services\letter.service.ts src\app\common\UIToolsService.ts src\app\route\donations-list src\app\routes\modals\donor-donations-modal src\app\routes\modals\letter-properties-modal\letter-properties-modal.component.ts src\app\app.component.ts scripts\msg-8-donation-partners.txt scripts\commit-stage-c-8.bat
git commit -F scripts\msg-8-donation-partners.txt
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
