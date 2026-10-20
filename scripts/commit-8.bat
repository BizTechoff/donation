@echo off
REM commit-8.bat - one commit. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

echo [1] fix(family): 8 - relationships
git add src/shared/utils/relationship-utils.ts ^
  src/app/routes/modals/family-relation-details-modal/family-relation-details-modal.component.html ^
  src/app/routes/modals/family-relation-details-modal/family-relation-details-modal.component.ts ^
  src/app/routes/modals/donor-details-modal/donor-details-modal.component.ts ^
  scripts/commit-8.bat ^
  scripts/msg-8-relationships.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-8-relationships.txt" || goto :err
echo.

git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
