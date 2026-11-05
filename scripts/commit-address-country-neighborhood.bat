@echo off
setlocal
cd /d %~dp0..

REM place.ts - country removed from display address, neighborhood match widened.
REM Run after: npm run build

git add src/shared/entity/place.ts src/app/app.component.ts scripts/msg-address-country-neighborhood.txt scripts/commit-address-country-neighborhood.bat
git commit -F scripts/msg-address-country-neighborhood.txt
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
