@echo off
setlocal
cd /d %~dp0..

REM C.A.B.S - two subjects: item 36 alumni prefix, family picker without global filter.
REM Run after: npm run build

git add src/shared/constants/donor-titles.ts src/app/routes/modals/donor-details-modal/donor-details-modal.component.ts src/app/routes/modals/letter-properties-modal/letter-properties-modal.component.ts tools/alumni-title-report.ts src/app/app.component.ts scripts/msg-alumni-letter-prefix.txt scripts/commit-alumni-letter-prefix.bat
git commit -F scripts/msg-alumni-letter-prefix.txt
if errorlevel 1 goto fail

git add src/shared/controllers/donor.controller.ts src/app/routes/modals/donor-selection-modal/donor-selection-modal.component.ts src/app/routes/modals/family-relation-details-modal/family-relation-details-modal.component.ts scripts/msg-family-picker-no-global-filter.txt
git commit -F scripts/msg-family-picker-no-global-filter.txt
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
