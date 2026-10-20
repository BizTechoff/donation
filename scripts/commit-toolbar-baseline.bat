@echo off
REM commit-toolbar-baseline.bat - one commit. Run from anywhere. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

git add src/app/app.component.scss .gitignore scripts/commit-toolbar-baseline.bat scripts/msg-toolbar-baseline.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-toolbar-baseline.txt" || goto :err
git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
