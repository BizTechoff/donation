@echo off
REM commit.bat - subject-based commits for the current pending work.

setlocal
cd /d "%~dp0.."

echo.
echo === Commit by Subject (repo: %CD%) ===
echo.

git status --short
if errorlevel 1 goto :err
echo.

REM ===== [1] feat(donations-list): collapsible summary + filters accordion =====
git add src/app/route/donations-list/donations-list.component.html src/app/route/donations-list/donations-list.component.ts src/app/route/donations-list/donations-list.component.scss
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next1
echo [1] feat(donations-list): collapsible summary + filters accordion
git commit -m "feat(donations-list): collapsible summary + filters accordion with active-filter indicator" -m "Per client request (Israel Glikson, 30.6.2026 #1): the top of the donations list showed the four summary cards and the full filters row always expanded, taking up too much vertical space and pushing the actual donations table down. Now each block sits inside its own inline accordion with an expand_more arrow that rotates on toggle - clicking the bar collapses or expands only that block, and the two toggles are fully independent. State is persisted per user in localStorage under accordion.donations-list.summary and accordion.donations-list.filters so the choice survives page reloads. When the filters block is collapsed and any filter is non-empty (search text, from/to date, method, amount, campaign or donation type) a small orange pulsing dot appears next to the 'פילטרים' title so the user still knows results are being narrowed even while the row is hidden - driven by the new hasActiveFilter getter. The accordion HTML+SCSS follows the same visual language as the existing reports.component filters accordion (linear-gradient bar, mat-icon expand_more that rotates, animated max-height content) - deliberately inline for now: shared UI extraction will wait until the whole platform is visually consistent (business logic stays the modular concern for the moment)." -m "BizTechoff(TM)"
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
