@echo off
REM commit-by-topic.bat - groups uncommitted changes into thematic commits.
REM Hebrew commit messages live in scripts\msgN-*.txt (UTF-8). Bat is ASCII only.

setlocal
set "SCRIPTDIR=%~dp0"

REM Always run from repo root (parent of scripts/)
cd /d "%SCRIPTDIR%.."

echo.
echo === Commit by Topic (repo root: %CD%) ===
echo.

git status --short
if errorlevel 1 goto :err
echo.

REM === Commit 1: fix(donor-map) ===
echo [1/4] fix(donor-map): SQL JOIN for markers
git add src/shared/controllers/donor-map.controller.ts src/app/route/donors-map/donors-map.component.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg1-donor-map.txt"
  if errorlevel 1 goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

REM === Commit 2: feat(geocode) ===
echo [2/4] feat(geocode): startup background + English country names
git add src/server/api.ts src/server/geocode-places.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg2-geocode.txt"
  if errorlevel 1 goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

REM === Commit 3: fix(seed) ===
echo [3/4] fix(seed): parseAmount + parseBoolean
git add src/server/convert-excel-to-seed.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg3-seed.txt"
  if errorlevel 1 goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

REM === Commit 4: chore(tsconfig) ===
echo [4/4] chore(tsconfig): silence deprecation warnings
git add tsconfig.json
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg4-tsconfig.txt"
  if errorlevel 1 goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

echo === Done ===
git log -5 --oneline
echo.
echo Status:
git status --short
echo.
echo Note: no push was performed.
echo   git push origin master
echo   git push heroku master

endlocal
exit /b 0

:err
echo.
echo [ERROR] git command failed - stopping.
endlocal
exit /b 1
