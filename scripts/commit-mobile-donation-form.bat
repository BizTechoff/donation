@echo off
setlocal
cd /d %~dp0..

REM Mobile donation form + donor search (+ version). Run AFTER commit-version-bar-mobile.bat
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.15\.1''','2026.11.16'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\shared\utils\donation-method-fields.ts src\shared\controllers\donation.controller.ts src\app\services\payer.service.ts src\app\mobile\quick-donation src\app\routes\modals\donation-details-modal src\app\app-version.ts scripts\msg-mobile-donation-form.txt scripts\commit-mobile-donation-form.bat
git commit -F scripts\msg-mobile-donation-form.txt
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
