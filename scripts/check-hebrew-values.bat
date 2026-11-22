@echo off
setlocal
cd /d %~dp0..

REM Read-only: distinct Hebrew values in addresses (PRODUCTION). Nothing is changed.
npx tsx tools/run-sql.ts --prod docs/hebrew-values-distinct.sql > docs\hebrew-values-distinct-result.txt 2>&1
type docs\hebrew-values-distinct-result.txt
endlocal
pause
