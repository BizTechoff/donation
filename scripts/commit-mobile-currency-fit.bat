@echo off
setlocal
cd /d %~dp0..

REM Mobile donation form - currency select fits form bounds (+ version)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.16''','2026.11.16.1'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\mobile\quick-donation\steps\donation-form-step\donation-form-step.component.scss src\app\app-version.ts scripts\msg-mobile-currency-fit.txt scripts\commit-mobile-currency-fit.bat
git commit -F scripts\msg-mobile-currency-fit.txt
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
