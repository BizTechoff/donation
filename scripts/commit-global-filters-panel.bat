@echo off
setlocal
cd /d %~dp0..

REM C.A.B.S - two subjects: filters panel, then reminders link color.
REM Run after: npm run build

git add src/app/components/global-filters src/app/app.component.ts scripts/msg-global-filters-panel.txt scripts/commit-global-filters-panel.bat
git commit -F scripts/msg-global-filters-panel.txt
if errorlevel 1 goto fail

git add src/app/route/reminders/reminders.component.scss scripts/msg-reminders-donor-link-color.txt
git commit -F scripts/msg-reminders-donor-link-color.txt
if errorlevel 1 goto fail

echo.
echo DONE - 2 commits created. Nothing pushed.
git log --oneline -2
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
