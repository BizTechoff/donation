@echo off
setlocal
cd /d %~dp0..

REM C.A.B.S - three subjects: shared tools lib, item 6 phone type, personal report show/download.
REM Run after: npm run build

git add tools/lib tools/phone-normalize-report.ts tools/alumni-title-report.ts tools/phone-description-report.ts scripts/msg-tools-shared-db.txt
git commit -F scripts/msg-tools-shared-db.txt
if errorlevel 1 goto fail

git add src/shared/enum/phone-type.ts src/shared/utils/phone-utils.ts src/shared/entity/donor.ts src/app/routes/modals/donor-details-modal src/server/google-contacts.ts tools/phone-type-migrate.ts src/app/app.component.ts scripts/msg-phone-type-closed-list.txt scripts/commit-phone-type.bat
git commit -F scripts/msg-phone-type-closed-list.txt
if errorlevel 1 goto fail

git add src/app/route/reports/reports.component.ts src/app/route/reports/reports.component.html src/shared/controllers/report.controller.ts scripts/msg-personal-report-show-download.txt
git commit -F scripts/msg-personal-report-show-download.txt
if errorlevel 1 goto fail

echo.
echo DONE - 3 commits created. Nothing pushed.
git log --oneline -3
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
