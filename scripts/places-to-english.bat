@echo off
setlocal
cd /d %~dp0..

REM Converts Hebrew address values to English (PRODUCTION). Backup first, then one transaction.
REM Review docs\places-to-english.html and docs\places-to-english.sql before running.
call npx tsx tools/backup-db.ts --prod
if errorlevel 1 goto fail
npx tsx tools/run-sql.ts --prod docs/places-to-english.sql
goto end

:fail
echo.
echo BACKUP FAILED - nothing was changed.

:end
endlocal
pause
