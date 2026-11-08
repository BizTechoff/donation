@echo off
setlocal
cd /d %~dp0..

REM Stage C group 2 follow-up - one height for every field in the filter rows.
REM Run after: npm run build

REM Leftovers from the group 2 run: the staged snapshots and an edit to its bat.
if exist scripts\stages rmdir /s /q scripts\stages
git checkout -- scripts\commit-stage-c-group-2.bat

git add -- src\styles.scss src\app\shared\modern-dual-date-picker\modern-dual-date-picker.component.scss src\app\common\bilingual-search\bilingual-search.component.scss src\app\route\certificates\certificates.component.scss src\app\route\donor-gifts-list\donor-gifts-list.component.scss src\app\route\reminders\reminders.component.scss src\app\route\donations-list\donations-list.component.scss src\app\route\donor-list\donor-list.component.scss scripts\msg-2-5-filter-row-height.txt scripts\commit-filter-row-height.bat
git commit -F scripts\msg-2-5-filter-row-height.txt
if errorlevel 1 goto fail

echo.
echo DONE - 1 commit created. Nothing pushed.
git log --oneline -1
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
