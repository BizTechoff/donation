@echo off
setlocal
cd /d %~dp0..

REM legacy-check-fix: excel wins over April bank/org links
git add -- tools\legacy-check-fix.ts scripts\msg-legacy-check-overwrite.txt scripts\commit-legacy-check-overwrite.bat
git commit -F scripts\msg-legacy-check-overwrite.txt
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
