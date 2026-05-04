@echo off
REM run-convert-excel.bat - regenerate src/server/seed-data.ts from Excel files.
REM Run from anywhere - CDs to repo root automatically.

setlocal
cd /d "%~dp0.."

echo.
echo === Convert Excel to seed-data.ts ===
echo Repo: %CD%
echo.

call npm run convert-excel
if errorlevel 1 (
  echo.
  echo [ERROR] convert-excel failed.
  endlocal
  exit /b 1
)

echo.
echo === Done ===
echo.
echo Next steps:
echo   1. Review changes:   git diff src/server/seed-data.ts ^| head
echo   2. Commit:           git add src/server/seed-data.ts ^&^& git commit -m "chore(seed): regenerate seed-data"
echo   3. Push:             git push origin master ^&^& git push railway main
echo   4. On Railway: set RUN_SEED=1 ^& restart, then RUN_SEED=0 after completion.

endlocal
exit /b 0
