@echo off
REM commit-3-6-columns.bat - five commits. Run from anywhere. No push.

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
  scripts/msg-done-status.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-done-status.txt" || goto :err
echo.

REM === [4] feat(phones): mobile column + version ===
echo [4] feat(phones): mobile column + version
git add src/app/mobile/quick-donation/steps/donor-select-step/donor-select-step.component.html ^
  src/app/mobile/quick-donation/steps/donor-select-step/donor-select-step.component.ts ^
  src/app/route/certificates/certificates.component.ts ^
  src/app/route/donations-list/donations-list.component.ts ^
  src/app/route/donor-list/donor-list.component.ts ^
  src/app/route/donors-map/donors-map.component.ts ^
  src/app/route/reports/reports.component.ts ^
  src/app/routes/modals/campaign-blessing-book-modal/campaign-blessing-book-modal.component.ts ^
  src/app/routes/modals/campaign-donors-modal/campaign-donors-modal.component.ts ^
  src/app/routes/modals/campaign-invited-list-modal/campaign-invited-list-modal.component.ts ^
  src/app/routes/modals/donor-selection-modal/donor-selection-modal.component.ts ^
  src/app/routes/modals/map-selected-donors-modal/map-selected-donors-modal.component.html ^
  src/app/routes/modals/reminder-details-modal/reminder-details-modal.component.ts ^
  src/app/services/donor.service.ts ^
  src/server/api.ts ^
  src/shared/controllers/donor-map.controller.ts ^
  src/shared/controllers/donor.controller.ts ^
  src/shared/controllers/report.controller.ts ^
  src/shared/entity/donor.ts ^
  src/shared/utils/phone-utils.ts ^
  src/shared/controllers/donor-phone.controller.ts ^
  scripts/msg-18-mobile-column.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-18-mobile-column.txt" || goto :err
echo.

REM === [5] fix(log): concurrent console.time + version ===
echo [5] fix(log): concurrent console.time + version
git add src/app/app.component.ts ^
  src/shared/controllers/global-filter.controller.ts ^
  src/shared/utils/perf-log.ts ^
  scripts/msg-perf-log.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-perf-log.txt" || goto :err
echo.

git status --short
git log --oneline -7
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
