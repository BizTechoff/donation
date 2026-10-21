@echo off
setlocal
cd /d %~dp0..

REM C.A.B.S - three subjects. Run after: npm run build
REM .gitignore is left out on purpose - the /db line is not part of this subject.

git add src/app/common/pipes/phone.pipe.ts src/app/app.module.ts src/shared/utils/phone-utils.ts src/shared/controllers/report.controller.ts src/app/services/donor.service.ts
git commit -F scripts/msg-i1-e-display-format.txt
if errorlevel 1 goto fail

git add src/app/common/phone-input src/app/routes/modals/bank-details-modal src/app/routes/modals/company-details-modal src/app/routes/modals/organization-details-modal src/app/routes/modals/contact-person-selection-modal src/app/routes/modals/donor-details-modal
git commit -F scripts/msg-i1-f-control-everywhere.txt
if errorlevel 1 goto fail

REM Commit messages and round scripts - documentation of what was decided,
REM like the 74 files already tracked under scripts/.
git add scripts/
git commit -m "chore(scripts): I1 - hodaot ha-commit ve-scriptim shel ha-sevev"
if errorlevel 1 goto fail

echo.
echo DONE - 3 commits created. Nothing pushed.
git log --oneline -3
git status --short
goto end

:fail
echo.
echo FAILED - check the output above. Nothing was pushed.

:end
endlocal
