@echo off
setlocal
cd /d %~dp0..

REM Stage C 6.2 - global filter by circle and donor level. Run after: npm run build
git add -- src\app\app.component.ts src\app\components\global-filters\global-filters.component.html src\app\components\global-filters\global-filters.component.ts src\app\i18n\terms.en.ts src\app\i18n\terms.he.ts src\app\services\global-filter.service.ts src\shared\controllers\global-filter.controller.ts src\shared\enum\donor-levels.ts scripts\msg-6-2-circle-level-filter.txt scripts\commit-stage-c-6-2.bat
git commit -F scripts\msg-6-2-circle-level-filter.txt
if errorlevel 1 goto fail
echo.
echo DONE - 1 commit created. Nothing pushed.
git log --oneline -1
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
