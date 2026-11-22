@echo off
setlocal
cd /d %~dp0..

REM Reports - select several years (+ version)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.22''','2026.11.22.01'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\shared\controllers\report.controller.ts src\app\services\report.service.ts src\app\route\reports src\app\app-version.ts scripts\msg-report-multi-years.txt scripts\commit-report-multi-years.bat
git commit -F scripts\msg-report-multi-years.txt
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
