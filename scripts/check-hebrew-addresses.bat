@echo off
setlocal
cd /d %~dp0..

REM Read-only check: addresses / cities / countries stored in Hebrew (PRODUCTION). Nothing is changed.
npx tsx tools/run-sql.ts --prod docs/hebrew-addresses-check.sql > docs\hebrew-addresses-check-result.txt 2>&1
type docs\hebrew-addresses-check-result.txt
endlocal
pause
