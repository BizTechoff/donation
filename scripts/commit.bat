@echo off
REM commit.bat - subject-based commits for the current pending work.
REM Old (already-committed) groups removed - if you need them back, git history
REM still has them. Catch-all at the end picks up anything not in a named group.

setlocal
cd /d "%~dp0.."

echo.
echo === Commit by Subject (repo: %CD%) ===
echo.

git status --short
if errorlevel 1 goto :err
echo.

REM ===== [1] chore(deps): regenerate package-lock.json - sync for Railway Node 22 build =====
git add package-lock.json
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next1
echo [1] chore(deps): regenerate package-lock.json
git commit -m "chore(deps): regenerate package-lock.json - sync with Node 22 for Railway build" -m "Railway build was failing in npm ci with: lock file's @types/node@26.0.0 and undici-types@8.3.0 missing from the lock file. Root cause: local was Node v24.13.1 while Railway runs Node v22.22.3 (default). npm resolves a different set of transitive deps under Node 24 vs Node 22 (newer @types/node etc.), so the lock file produced locally was unusable for npm ci on Railway. Fix: deleted node_modules, .angular and package-lock.json locally, then ran npm install under Node 22 so the regenerated lock matches exactly what Railway will install. No source changes - only the lock file is updated." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next1
echo.

REM ===== [2] catch-all (anything else still uncommitted) =====
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next2
echo [2] catch-all - misc remaining changes
git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next2
echo.

echo === Done ===
echo Next: git push origin master
exit /b 0

:err
echo.
echo === ERROR ===
exit /b 1
