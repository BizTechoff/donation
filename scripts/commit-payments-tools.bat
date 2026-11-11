@echo off
setlocal
cd /d %~dp0..

REM payments report + conversion tools
git add -- tools\payments-report.ts tools\payments-to-donations.ts scripts\msg-payments-tools.txt scripts\commit-payments-tools.bat
git commit -F scripts\msg-payments-tools.txt
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
