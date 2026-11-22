@echo off
setlocal
cd /d %~dp0..

REM Mobile - donor row (details / donations / new donation), donations screen, new donor (+ / map) (+ version)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.17''','2026.11.22'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\shared\utils\donor-create.ts src\shared\utils\place-from-geo.ts src\app\services\map-new-donor.service.ts src\app\route\donors-map\donors-map.component.ts src\server\geo.ts src\shared\type\place.type.ts src\app\routes\modals\donor-details-modal\donor-details-modal.component.ts src\app\mobile src\app\app.module.ts src\app\shared\shared-components.module.ts src\app\common\osm-address-input src\app\app-version.ts scripts\msg-mobile-new-donor.txt scripts\commit-mobile-new-donor.bat
git commit -F scripts\msg-mobile-new-donor.txt
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
