@echo off
setlocal
cd /d %~dp0..

REM Mobile donation form - local date + donor-country currency (+ version)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.16\.3''','2026.11.17'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\shared\utils\date-only.ts src\shared\utils\donor-currency.ts src\shared\entity\donation.ts src\app\routes\modals\donation-details-modal\donation-details-modal.component.ts src\app\mobile\quick-donation\steps\donation-form-step\donation-form-step.component.ts src\app\app-version.ts scripts\msg-mobile-date-currency.txt scripts\commit-mobile-date-currency.bat
git commit -F scripts\msg-mobile-date-currency.txt
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
