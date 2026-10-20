@echo off
REM commit-33-user-settings.bat - one commit. Run from anywhere. No push.

setlocal
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%.."

git add src/shared/controllers/user-settings.controller.ts ^
  src/app/services/user-settings.service.ts ^
  src/server/api.ts ^
  src/server/index.ts ^
  src/app/services/global-filter.service.ts ^
  src/app/common/table/table-state.ts ^
  src/app/app.component.ts ^
  src/app/components/global-search/global-search.component.ts ^
  src/app/mobile/route-planner/route-planner.component.ts ^
  src/app/route/donors-map/donors-map.component.ts ^
  src/app/route/reports/reports.component.ts ^
  src/app/route/donor-list/donor-list.component.ts ^
  src/app/route/reminders/reminders.component.ts ^
  scripts/commit-33-user-settings.bat ^
  scripts/msg-33-user-settings.txt
if errorlevel 1 goto :err
git commit -F "%SCRIPTDIR%msg-33-user-settings.txt" || goto :err
git status --short
git log --oneline -3
echo === Done. Push manually. ===
goto :eof

:err
echo [ERROR] stopped.
exit /b 1
