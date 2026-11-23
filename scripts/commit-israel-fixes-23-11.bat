@echo off
setlocal
cd /d %~dp0..

REM Israel 23.11 - donations list print/export amount like screen; personal report notes with campaign (+ version)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.22\.03''','2026.11.23'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\route\donations-list\donations-list.component.ts src\shared\utils\donation-utils.ts src\shared\controllers\report.controller.ts src\app\route\reports\reports.component.html src\app\app-version.ts scripts\msg-israel-fixes-23-11.txt scripts\commit-israel-fixes-23-11.bat
git commit -F scripts\msg-israel-fixes-23-11.txt
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
