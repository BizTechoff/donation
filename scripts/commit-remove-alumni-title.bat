@echo off
setlocal
cd /d %~dp0..

REM Item 36 - remove the alumni title from the titles list (after the prod migration).
REM Run after: npm run build

git add src/shared/constants/donor-titles.ts src/app/app.component.ts scripts/msg-remove-alumni-title.txt scripts/commit-remove-alumni-title.bat
git commit -F scripts/msg-remove-alumni-title.txt
if errorlevel 1 goto fail

echo.
echo DONE - 1 commit created. Nothing pushed.
git log --oneline -1
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
