@echo off
REM commit-2026-10-20-01.bat - C.A.B.S. Run from anywhere. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

git status --short
echo.

REM === [1] fix(global-filters): hide apply button ===
echo [1] fix(global-filters): hide apply button
git add src/app/components/global-filters/global-filters.component.html
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg-hide-apply-btn.txt" || goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

REM === [2] chore: version 2026.10.20.01 ===
echo [2] chore: version 2026.10.20.01
git add src/app/app.component.ts ^
  scripts/commit-2026-10-20-01.bat ^
  scripts/msg-hide-apply-btn.txt ^
  scripts/msg-version-2026-10-20-01.txt
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg-version-2026-10-20-01.txt" || goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

git status --short
git log --oneline -4
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
