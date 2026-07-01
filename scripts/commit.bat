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

REM ===== [1] fix(donor.controller): apply excludeIds at SQL level =====
git add src/shared/controllers/donor.controller.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next1
echo [1] fix(donor.controller): excludeIds at SQL level
git commit -m "fix(donor.controller): apply excludeIds at SQL level - fix count/paging/select-all mismatch" -m "Before, getDonorsForSelectionPage fetched a page via findFilteredDonors then applied excludeIds as an in-memory .filter(). The parallel countFilteredDonors call did not accept excludeIds, so totalCount stayed at the un-excluded number. Consequence in donor-selection-modal: with a search matching 3222 donors of which 30 were in excludeIds, the footer showed 3222 out of 3222 and computed 65 pages (leftover on the last page), while any accurate 'select all across pages' produced only 3192 - so header (3192) never matched footer (3222). Fix: added a shared private helper DonorController.applyExcludeIdsToWhere(where, excludeIds) that either narrows a pre-existing id.\$in list or attaches a Remult != array filter when no \$in restriction was set yet. findFilteredDonors and countFilteredDonors now accept an optional excludeIds parameter and route through the same helper right before the query runs. getDonorsForSelectionPage forwards excludeIds to both and drops the redundant in-memory .filter(). getAllDonorsForSelection replaces getAllDonorIdsForSelection - returns full Donor[] so the caller can push into selectedDonors without a second round-trip (server already loaded the rows). Business logic, entity fields, GlobalFilter path and search flow all preserved. Result: totalCount, paging and select-all now agree - 3192 out of 3192." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next1
echo.

REM ===== [2] feat(donor-selection-modal): select-all across pages + 50/page + denser =====
git add src/app/routes/modals/donor-selection-modal/donor-selection-modal.component.ts src/app/routes/modals/donor-selection-modal/donor-selection-modal.component.html src/app/routes/modals/donor-selection-modal/donor-selection-modal.component.scss
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next2
echo [2] feat(donor-selection-modal): select-all across pages + 50/page
git commit -m "feat(donor-selection-modal): select-all now spans every page of the current filter + denser 50-per-page layout" -m "Per client request (Israel Glikson, 30.6.2026): the header checkbox in the donor selection modal used to select only the currently visible page - useless when a target audience spans hundreds of donors across many pages. Changes: pageSize raised from 20 to 50. toggleSelectAll became async and makes a single call to DonorController.getAllDonorsForSelection which returns every Donor matching the current search + excludeIds, and pushes them straight into selectedDonorIds + selectedDonors (dedup guarded). New allInCurrentFilterSelected flag keeps the header checkbox 'checked' while the user pages through the results, and is reset by any single un-check or by a search change so the state is never stale. Denser rows (padding 6px 10px, font-size 13px) so more donors fit at a glance. thead is now sticky within the scrollable table body so column headers stay visible while paging 50 rows. Checkbox tooltip updated to make the new semantics explicit ('בחר/בטל הכל - על פני כל הדפים')." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next2
echo.

REM ===== [3] chore(gitignore): exclude internal work docs =====
git add .gitignore
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next3
echo [3] chore(gitignore): exclude /docs
git commit -m "chore(gitignore): exclude /docs - internal work plans and notes" -m "Adds /docs to .gitignore so per-task work plans, HTML briefs and internal notes stay out of the repo. Keeps the tree focused on shippable code without losing the ability to keep those drafts locally." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next3
echo.

REM ===== [4] catch-all (anything else still uncommitted) =====
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next4
echo [4] catch-all - misc remaining changes
git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next4
echo.

echo === Done ===
echo Next: git push origin master
exit /b 0

:err
echo.
echo === ERROR ===
exit /b 1
