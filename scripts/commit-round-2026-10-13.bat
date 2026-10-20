@echo off
REM commit-round-2026-10-13.bat - C.A.B.S for this round. Run from anywhere.
REM Hebrew messages in scripts\msg-*.txt (UTF-8). Bat is ASCII only.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

git status --short
if errorlevel 1 goto :err
echo.

REM === [1] fix(global-filters): Z1 panel stays open ===
echo [1] fix(global-filters): Z1 panel stays open
git add src/app/components/global-filters/global-filters.component.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg-z1-global-filters-open.txt" || goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

REM === [2] fix(table): W5 fixed column widths ===
echo [2] fix(table): W5 fixed column widths
git add src/styles.scss ^
  src/app/route/donations-list/donations-list.component.html
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg-w5-column-widths.txt" || goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

REM === [3] feat(app): new version notice ===
echo [3] feat(app): new version notice
git add src/server/index.ts ^
  src/app/services/app-version.service.ts ^
  src/app/app.component.ts ^
  src/app/app.component.html ^
  src/app/app.component.scss
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg-app-version.txt" || goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

REM === [4] chore: gitstatus + msg files ===
echo [4] chore: gitstatus + msg files
git add gitstatus.bat ^
  scripts/commit-round-2026-10-13.bat ^
  scripts/msg-z1-global-filters-open.txt ^
  scripts/msg-w5-column-widths.txt ^
  scripts/msg-app-version.txt ^
  scripts/msg-chore-round-tools.txt
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg-chore-round-tools.txt" || goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

git status --short
git log --oneline -5
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
