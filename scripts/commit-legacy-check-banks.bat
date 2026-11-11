@echo off
setlocal
cd /d %~dp0..

REM legacy-check-fix: banks, names in conflicts, method fix flag
git add -- tools\legacy-check-fix.ts scripts\msg-legacy-check-banks.txt scripts\commit-legacy-check-banks.bat
git commit -F scripts\msg-legacy-check-banks.txt
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
