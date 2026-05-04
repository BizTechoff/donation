@echo off
REM commit.bat - subject-based commits, single self-contained file.
REM Run from anywhere - CDs to repo root automatically.

setlocal
cd /d "%~dp0.."

echo.
echo === Commit by Subject (repo: %CD%) ===
echo.

git status --short
if errorlevel 1 goto :err
echo.

REM ===== [1] feat(seed): RUN_SEED env flag in api.ts =====
echo [1] feat(seed): RUN_SEED env flag handler
git add src/server/api.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat(seed): RUN_SEED=1 env flag triggers full seed on startup" -m "Background runs: seed-infrastructure -> seed-data -> seed-fine-tuning. Set on Railway, restart, watch logs, then unset." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [2] fix(seed): parseAmount enhanced =====
echo [2] fix(seed): parseAmount handles currency, quotes, spaces
git add src/server/convert-excel-to-seed.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix(seed): parseAmount strips all non-numeric chars (currency, quotes, etc)" -m "Recovers donations that were lost as NaN due to formatted strings like $1,800 or quotes." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [3] chore(seed): regenerated seed-data.ts =====
echo [3] chore(seed): regenerated seed-data.ts
git add src/server/seed-data.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "chore(seed): regenerate seed-data.ts with parseAmount + parseBoolean fixes" -m "Now contains 1054 isAnash=true donors and recovers 748 donations previously lost." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [4] fix(build): tsconfig + 2 modal HTMLs =====
echo [4] fix(build): tsconfig + bracket notation
git add tsconfig.json src/app/routes/modals/donor-donations-modal/donor-donations-modal.component.html src/app/routes/modals/payment-list-modal/payment-list-modal.component.html
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix(build): tsconfig ignoreDeprecations 5.0 + bracket notation on currencyTypes" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [4b] fix(build): NG8107 warnings - currencyTypes type + donor-avatar =====
echo [4b] fix(build): NG8107 warnings cleanup
git add src/app/services/payer.service.ts src/app/mobile/quick-donation/steps/donor-details-step/donor-details-step.component.html
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix(build): NG8107 warnings - currencyTypes returns CurrencyType ^| undefined + donor-avatar charAt without optional chain" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [5] chore(scripts): helper bats =====
echo [5] chore(scripts): commit + run helpers
git add scripts/
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "chore(scripts): commit-by-subject and run-convert-excel helpers" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [6] wip(donations-list): leftover changes =====
echo [6] wip(donations-list): list component + package-lock
git add src/app/route/donations-list/ package-lock.json
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "wip(donations-list): updates + package-lock" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [7] catch-all =====
echo [7] catch-all: any remaining changes
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

echo === Done ===
git log -7 --oneline
echo.
git status --short
echo.
echo To deploy:
echo   git push origin master
echo   git push railway main
echo.
echo Then on Railway: set RUN_SEED=1, restart, watch logs, unset RUN_SEED after completion.

endlocal
exit /b 0

:err
echo.
echo [ERROR] git command failed - stopping.
endlocal
exit /b 1
