@echo off
REM commit-7-27-actions.bat - three commits by subject (C.A.B.S). No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

REM === [1] fix(files): 7 - S3 key / AccessDenied ===
echo [1] fix(files): 7 - S3 key
git add src/shared/utils/file-name-utils.ts ^
  src/shared/controllers/file.controller.ts ^
  src/app/services/file-upload.service.ts ^
  scripts/commit-7-27-actions.bat ^
  scripts/msg-7-s3-key.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-7-s3-key.txt" || goto :err
echo.

REM === [2] feat(reports): 27 - report PDF file name ===
echo [2] feat(reports): 27 - report file name
git add src/app/services/print.service.ts ^
  src/app/route/reports/reports.component.ts ^
  scripts/msg-27-report-filename.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-27-report-filename.txt" || goto :err
echo.

REM === [3] fix(table): actions column overflow in campaigns ===
echo [3] fix(table): actions column
git add src/styles.scss ^
  src/app/route/campaigns-list/campaigns-list.component.html ^
  scripts/msg-actions-column.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-actions-column.txt" || goto :err
echo.

git status --short
git log --oneline -5
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
