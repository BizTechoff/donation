@echo off
REM commit-27-29.bat - two commits by subject (C.A.B.S). No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

REM === [1] feat(reports): 27 - Excel file names + document.title for PDF ===
echo [1] feat(reports): 27 - exports
git add src/app/services/print.service.ts ^
  src/app/route/reports/reports.component.ts ^
  scripts/commit-27-29.bat ^
  scripts/msg-27-exports.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-27-exports.txt" || goto :err
echo.

REM === [2] fix(forms): 29 - number wheel guard ===
echo [2] fix(forms): 29 - number wheel
git add src/app/common/directives/number-wheel-guard.directive.ts ^
  src/app/shared/shared-components.module.ts ^
  scripts/msg-29-number-wheel.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-29-number-wheel.txt" || goto :err
echo.

git status --short
git log --oneline -5
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
