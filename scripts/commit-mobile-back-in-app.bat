@echo off
setlocal
cd /d %~dp0..

REM Mobile donation form - Back stays inside the app (+ version)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.16\.1''','2026.11.16.2'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\mobile\quick-donation\quick-donation.component.ts src\app\app.component.ts src\app\app-version.ts scripts\msg-mobile-back-in-app.txt scripts\commit-mobile-back-in-app.bat
git commit -F scripts\msg-mobile-back-in-app.txt
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
