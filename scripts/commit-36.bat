@echo off
REM commit-36.bat - one commit. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

echo [1] feat(donor-card): 36 - alumni title
git add src/shared/constants/donor-titles.ts ^
  src/shared/entity/donor.ts ^
  src/app/routes/modals/donor-details-modal/donor-details-modal.component.ts ^
  src/app/routes/modals/donor-details-modal/donor-details-modal.component.html ^
  scripts/commit-36.bat ^
  scripts/msg-36-alumni-title.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-36-alumni-title.txt" || goto :err
echo.

git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
