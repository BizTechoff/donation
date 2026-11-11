@echo off
setlocal
cd /d %~dp0..

REM Stage C 3.1 (donations mobile column) + 9.2 (fundraiser global filter) - 2 commits
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.7','2026.11.11.8'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\route\donations-list scripts\msg-3-1-donations-mobile.txt
git commit -F scripts\msg-3-1-donations-mobile.txt
if errorlevel 1 goto fail
git add -- src\app\components\global-filters src\app\i18n\terms.he.ts src\app\i18n\terms.en.ts src\app\services\global-filter.service.ts src\shared\controllers\global-filter.controller.ts src\app\app.component.ts scripts\msg-9-2-fundraiser-filter.txt scripts\commit-stage-c-3-1-9-2.bat
git commit -F scripts\msg-9-2-fundraiser-filter.txt
if errorlevel 1 goto fail
echo.
echo DONE - 2 commits created. Nothing pushed.
git log --oneline -2
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
