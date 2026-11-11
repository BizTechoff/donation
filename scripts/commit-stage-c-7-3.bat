@echo off
setlocal
cd /d %~dp0..

REM Stage C 7.3 - hide past completed reminders (+ version). Run AFTER commit-stage-c-7-2.bat
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.3','2026.11.11.4'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\shared\controllers\reminder.controller.ts src\app\services\reminder.service.ts src\app\route\reminders\reminders.component.html src\app\route\reminders\reminders.component.ts src\app\app.component.ts scripts\msg-7-3-hide-past-reminders.txt scripts\commit-stage-c-7-3.bat
git commit -F scripts\msg-7-3-hide-past-reminders.txt
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
