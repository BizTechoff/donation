@echo off
REM commit-8-fix.bat - one commit. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

echo [1] fix(family): template closing tags
git add src/app/routes/modals/family-relation-details-modal/family-relation-details-modal.component.html ^
  src/app/app.component.ts ^
  scripts/commit-8-fix.bat ^
  scripts/msg-8-fix-template.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-8-fix-template.txt" || goto :err
echo.

git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
