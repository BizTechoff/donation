@echo off
REM commit-3-6-columns.bat - three commits. Run from anywhere. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

REM === [1] fix(table): column widths + date X ===
echo [1] fix(table): column widths + date X
git add src/app/route/certificates/certificates.component.html ^
  src/app/route/donations-list/donations-list.component.html ^
  src/app/route/donor-gifts-list/donor-gifts-list.component.ts ^
  src/app/route/donor-list/donor-list.component.html ^
  src/app/route/google-sync/google-sync.component.html ^
  src/app/route/reports/reports.component.html ^
  src/app/routes/modals/audience-selection-modal/audience-selection-modal.component.html ^
  src/app/routes/modals/campaign-blessing-book-modal/campaign-blessing-book-modal.component.html ^
  src/app/routes/modals/campaign-donors-modal/campaign-donors-modal.component.html ^
  src/app/routes/modals/campaign-invited-list-modal/campaign-invited-list-modal.component.html ^
  src/app/routes/modals/donor-donations-modal/donor-donations-modal.component.html ^
  src/app/routes/modals/donor-selection-modal/donor-selection-modal.component.html ^
  src/app/routes/modals/gift-catalog-modal/gift-catalog-modal.component.html ^
  src/app/routes/modals/payment-list-modal/payment-list-modal.component.html ^
  src/app/shared/modern-dual-date-picker/modern-dual-date-picker.component.scss ^
  src/styles.scss ^
  scripts/msg-3-6-columns-datepicker.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-3-6-columns-datepicker.txt" || goto :err
echo.

REM === [2] refactor(table): shared sort/paging + campaigns sort + version ===
echo [2] refactor(table): shared sort/paging + campaigns sort + version
git add src/shared/entity/campaign.ts ^
  src/shared/controllers/campaign.controller.ts ^
  src/shared/utils/campaign-utils.ts ^
  src/shared/utils/table-query.ts ^
  src/shared/controllers/donation.controller.ts ^
  src/app/route/campaigns-list/campaigns-list.component.ts ^
  src/app/route/campaigns-list/campaigns-list.component.html ^
  src/app/routes/modals/campaign-donations-modal/campaign-donations-modal.component.ts ^
  src/app/routes/modals/campaign-donations-modal/campaign-donations-modal.component.html ^
  src/app/routes/modals/donation-selection-modal/donation-selection-modal.component.ts ^
  src/app/routes/modals/donation-selection-modal/donation-selection-modal.component.html ^
  src/app/common/table/table-sort.ts ^
  scripts/msg-campaigns-sort.txt ^
  scripts/commit-3-6-columns.bat
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-campaigns-sort.txt" || goto :err
echo.

REM === [3] feat(lists): done-status column + version ===
echo [3] feat(lists): done-status column + version
git add src/app/common/done-status/done-status.component.ts ^
  src/app/common/done-status/done-status.component.html ^
  src/app/common/done-status/done-status.component.scss ^
  src/app/app.module.ts ^
  src/app/route/donor-gifts-list/donor-gifts-list.component.html ^
  src/app/route/reminders/reminders.component.html ^
  src/app/route/reminders/reminders.component.ts ^
  src/app/app.component.ts ^
  scripts/msg-done-status.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-done-status.txt" || goto :err
echo.

git status --short
git log --oneline -5
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
