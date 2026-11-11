@echo off
setlocal
cd /d %~dp0..

REM Stage C 9.4 - automatic refresh between screens (+ version)
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.9','2026.11.11.10'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\common\entity-changes.ts src\app\common\http src\app\common\table\table-state.ts src\app\services\entity-changed.service.ts src\app\app.module.ts src\app\route src\app\routes\modals\campaign-donations-modal src\app\routes\modals\donor-donations-modal src\app\app.component.ts scripts\msg-9-4-auto-refresh.txt scripts\commit-stage-c-9-4.bat
git commit -F scripts\msg-9-4-auto-refresh.txt
if errorlevel 1 goto fail
echo.
echo DONE - 1 commit created. Nothing pushed.
git log --oneline -1
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
