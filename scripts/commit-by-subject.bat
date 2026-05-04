@echo off
REM commit-by-subject.bat - groups uncommitted changes by subject.
REM Run from anywhere - script CDs to repo root automatically.
REM Hebrew commit messages in scripts\msg-*.txt (UTF-8). Bat is ASCII only.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

echo.
echo === Commit by Subject (repo: %CD%) ===
echo.

git status --short
if errorlevel 1 goto :err
echo.

REM === [1] fix(build): build errors after tsconfig change ===
echo [1] fix(build): tsconfig ignoreDeprecations + bracket notation
git add tsconfig.json ^
  src/app/routes/modals/donor-donations-modal/donor-donations-modal.component.html ^
  src/app/routes/modals/payment-list-modal/payment-list-modal.component.html
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg-build-fix.txt" || goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

REM === [2] chore(scripts): helper files ===
echo [2] chore(scripts): commit helper bat + msg files
git add scripts/commit-by-topic.bat scripts/commit-by-subject.bat ^
  scripts/msg1-donor-map.txt scripts/msg2-geocode.txt ^
  scripts/msg3-seed.txt scripts/msg4-tsconfig.txt ^
  scripts/msg-build-fix.txt scripts/msg-scripts-helper.txt ^
  scripts/msg-donations-wip.txt
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg-scripts-helper.txt" || goto :err
) else (
  echo   [SKIP] no staged changes
)
echo.

REM === [3] wip(donations-list): leftover changes ===
echo [3] wip(donations-list): donations-list + package-lock
git add src/app/route/donations-list/donations-list.component.ts ^
  src/app/route/donations-list/donations-list.component.html ^
  package-lock.json
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -F "%SCRIPTDIR%msg-donations-wip.txt" || goto :err
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
