@echo off
setlocal
cd /d %~dp0..

REM Stage C 7.1 - donor contact line in reminders. Run after: npm run build
git add -- src\app\route\reminders\reminders.component.html src\app\route\reminders\reminders.component.scss src\app\route\reminders\reminders.component.ts scripts\msg-7-1-reminder-contact.txt scripts\commit-stage-c-7-1.bat
git commit -F scripts\msg-7-1-reminder-contact.txt
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
