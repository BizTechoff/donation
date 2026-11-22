@echo off
setlocal
cd /d %~dp0..

REM Global filters / selection lists - cities, neighborhoods, countries in English only (+ version)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.22\.01''','2026.11.22.02'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\shared\utils\address-language.ts src\shared\controllers\place.controller.ts src\shared\controllers\country.controller.ts src\app\routes\modals\country-selection-modal\country-selection-modal.component.ts src\app\components\global-filters\global-filters.component.ts src\app\mobile\quick-donation\steps\donor-select-step\donor-select-step.component.ts src\app\mobile\quick-donation\steps\donor-details-step src\app\app-version.ts scripts\msg-english-places.txt scripts\commit-english-places.bat tools\backup-db.ts scripts\check-hebrew-addresses.bat scripts\check-hebrew-values.bat scripts\places-to-english.bat
git commit -F scripts\msg-english-places.txt
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
