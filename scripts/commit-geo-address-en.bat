@echo off
setlocal
cd /d %~dp0..

REM geo.ts + place.ts - addresses in English, postal_town, leading comma.
REM Run after: npm run build

git add src/server/geo.ts src/shared/entity/place.ts src/app/app.component.ts scripts/msg-geo-address-en.txt scripts/commit-geo-address-en.bat
git commit -F scripts/msg-geo-address-en.txt
if errorlevel 1 goto fail

echo.
echo DONE - commit created. Nothing pushed.
git log --oneline -1
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
