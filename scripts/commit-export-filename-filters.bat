@echo off
setlocal
cd /d %~dp0..

REM C.A.B.S - two subjects: item 27 export names, email select vs click.
REM Run after: npm run build

git add src/shared/utils/filter-label-utils.ts src/shared/utils/file-name-utils.ts src/app/services/global-filter.service.ts src/app/route src/app/routes/modals/campaign-blessing-book-modal src/app/routes/modals/campaign-invited-list-modal src/app/app.component.ts scripts/msg-export-filename-filters.txt scripts/commit-export-filename-filters.bat
git commit -F scripts/msg-export-filename-filters.txt
if errorlevel 1 goto fail

git add src/app/common/directives/mailto.directive.ts scripts/msg-mailto-select-not-click.txt
git commit -F scripts/msg-mailto-select-not-click.txt
if errorlevel 1 goto fail

echo.
echo DONE - 2 commits created. Nothing pushed.
git log --oneline -2
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
