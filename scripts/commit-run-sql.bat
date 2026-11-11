@echo off
setlocal
cd /d %~dp0..

REM backup + run-sql tools + the legacy-check-fix SQL that was run
git add -- .gitignore tools\lib\db.ts tools\backup-db.ts scripts\backup-prod-db.bat tools\run-sql.ts scripts\msg-run-sql-tool.txt scripts\commit-run-sql.bat
git commit -F scripts\msg-run-sql-tool.txt
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
