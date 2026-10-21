@echo off
REM commit-phone-address.bat - two commits by subject. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

REM === [1] fix(address): one source for address display ===
echo [1] fix(address): one source
git add src/shared/entity/place.ts ^
  src/app/common/osm-address-input/osm-address-input.component.ts ^
  src/app/routes/modals/bank-details-modal/bank-details-modal.component.ts ^
  src/app/routes/modals/company-details-modal/company-details-modal.component.ts ^
  src/app/routes/modals/organization-details-modal/organization-details-modal.component.ts ^
  src/app/mobile/quick-donation/steps/donor-details-step/donor-details-step.component.ts ^
  src/app/app.component.ts ^
  scripts/commit-phone-address.bat ^
  scripts/msg-address-one-source.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-address-one-source.txt" || goto :err
echo.

REM === [2] feat(phone): app-phone-input ===
echo [2] feat(phone): control
git add package.json package-lock.json ^
  src/shared/utils/phone-format.ts ^
  src/shared/utils/phone-utils.ts ^
  src/app/common/phone-input ^
  src/app/shared/shared-components.module.ts ^
  src/styles.scss ^
  src/app/routes/modals/donor-details-modal ^
  src/app/route/donor-list/donor-list.component.html ^
  src/app/routes/modals/campaign-donors-modal/campaign-donors-modal.component.html ^
  src/app/routes/modals/campaign-invited-list-modal/campaign-invited-list-modal.component.html ^
  src/app/routes/modals/donor-selection-modal/donor-selection-modal.component.html ^
  scripts/msg-1-phone-control.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-1-phone-control.txt" || goto :err
echo.

git status --short
git log --oneline -4
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
