@echo off
setlocal
cd /d %~dp0..

REM cell-phone direction applied everywhere a number is shown.
REM Files are already staged. Run after: npm run build

git commit -F scripts/msg-cell-phone-direction.txt
if errorlevel 1 goto fail

echo.
echo DONE - commit created. Nothing pushed.
git log --oneline -1
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
