@echo off
REM commit.bat - subject-based commits, single self-contained file.
REM Run from anywhere - CDs to repo root automatically.
REM English-only messages (avoids cmd UTF-8 parsing issues with Hebrew).

setlocal
cd /d "%~dp0.."

echo.
echo === Commit by Subject (repo: %CD%) ===
echo.

git status --short
if errorlevel 1 goto :err
echo.

REM ===== [1] fix(build): tsconfig + template type fixes =====
echo [1] fix(build): tsconfig ignoreDeprecations + bracket notation
git add tsconfig.json src/app/routes/modals/donor-donations-modal/donor-donations-modal.component.html src/app/routes/modals/payment-list-modal/payment-list-modal.component.html
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix(build): tsconfig ignoreDeprecations 5.0 + bracket notation on currencyTypes" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP] no staged changes)
echo.

REM ===== [2] chore(scripts): commit helper =====
echo [2] chore(scripts): commit helper bat
git add scripts/
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "chore(scripts): commit-by-subject helper" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP] no staged changes)
echo.

REM ===== [3] wip(donations-list): leftover changes =====
echo [3] wip(donations-list): list component + package-lock
git add src/app/route/donations-list/ package-lock.json
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "wip(donations-list): updates + package-lock" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP] no staged changes)
echo.

REM ===== [4] anything else =====
echo [4] catch-all: any remaining staged changes
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP] no remaining changes)
echo.

echo === Done ===
git log -5 --oneline
echo.
git status --short
echo.
echo Note: no push performed.
echo   git push origin master
echo   git push heroku master

endlocal
exit /b 0

:err
echo.
echo [ERROR] git command failed - stopping.
endlocal
exit /b 1
