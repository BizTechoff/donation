@echo off
setlocal
cd /d %~dp0..

REM version bump 2026.11.11.2. Run after: npm run build
git add -- src\app\app.component.ts scripts\msg-version-2026-11-11-2.txt scripts\commit-version-2026-11-11-2.bat
git commit -F scripts\msg-version-2026-11-11-2.txt
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
