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

REM ===== [1] fix(donor.controller): secondary sort on firstName in default order =====
git add src/shared/controllers/donor.controller.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next1
echo [1] fix(donor.controller): secondary sort on firstName in default order
git commit -m "fix(donor.controller): include firstName in the default orderBy so donors sharing a lastName come out alphabetically" -m "Per client (Israel Glikson, 1.7.2026): the donor list rendered by the donor-selection modal (which the reports 'סינון לפי תורם' filter also opens - same component) was showing donors with a shared lastName in database-insertion order, not alphabetical order. Concrete example he sent: 'פעלדמאן דוד משה' appeared AFTER 'פעלדמאן חיים אריה' even though ד < ח. Clicking the fullName column header made the list look correct, and inspection revealed the reason: the click path builds orderBy as { lastName: dir, firstName: dir } while the default path (no sortColumns supplied) built it as { lastName: 'asc' } only - no secondary key. Fix is a one-line change to the initial orderBy so lastName + firstName ascending is the default, matching what the user gets from a manual header click. No entity fields, permissions or callers touched." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next1
echo.

REM ===== [2] feat(donor-selection-modal): enlarge to 95vw/95vh + tighter rows =====
git add src/app/routes/modals/donor-selection-modal/donor-selection-modal.component.ts src/app/routes/modals/donor-selection-modal/donor-selection-modal.component.scss
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next2
echo [2] feat(donor-selection-modal): enlarge modal + tighter rows
git commit -m "feat(donor-selection-modal): enlarge picker to 95vw x 95vh + tighter row spacing" -m "Per client iteration (Israel Glikson, 30.6 → 1.7.2026): the donor picker still felt cramped after the previous round of denser rows. Clients pick donors for campaign audiences from lists of many hundreds and every visible row matters. Widen the DialogConfig from a hard-coded 800px / 90vh to 95vw x 95vh (with explicit width and height matching maxWidth and maxHeight so the modal actually claims that space, not just caps out at it), then tighten the internal shell: .module-container now spans the full 95vh; table body rows drop padding from 6px/10px to 4px/8px with line-height 1.3; sticky thead padding tuned to 6px/10px so column headers still stand out. Result: the same 50-per-page layout, but on a laptop screen the user now sees roughly twice as many donors at once and the scroll bar carries much less of the navigation burden. No behavior or filter logic touched." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next2
echo.

REM ===== [3] catch-all (anything else still uncommitted) =====
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next3
echo [3] catch-all - misc remaining changes
git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next3
echo.

echo === Done ===
echo Next: git push origin master
exit /b 0

:err
echo.
echo === ERROR ===
exit /b 1
