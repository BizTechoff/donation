@echo off
setlocal
cd /d %~dp0..

REM Full backup of the PRODUCTION database into backups\ (not in git).
npx tsx tools/backup-db.ts --prod
endlocal
pause
