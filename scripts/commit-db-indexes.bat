@echo off
setlocal
cd /d %~dp0..

REM DB indexes - created on server start (server only, no version change)
call npm run build
if errorlevel 1 goto fail
git add -- src\server\db-indexes.ts src\server\api.ts scripts\msg-db-indexes.txt scripts\commit-db-indexes.bat
git commit -F scripts\msg-db-indexes.txt
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
