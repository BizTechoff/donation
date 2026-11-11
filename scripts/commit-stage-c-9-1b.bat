@echo off
setlocal
cd /d %~dp0..

REM Stage C 9.1b - audit stamp shows dates on older records (+ version)
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.10','2026.11.11.11'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\services\user-name.service.ts src\app\components\audit-stamp src\app\app.component.ts scripts\msg-9-1b-audit-dates.txt scripts\commit-stage-c-9-1b.bat
git commit -F scripts\msg-9-1b-audit-dates.txt
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
