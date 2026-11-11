@echo off
setlocal
cd /d %~dp0..

REM Stage C 7.4 - reminder types catalog + event rename (+ version)
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.4','2026.11.11.5'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\shared\utils\catalog-name.ts src\shared\entity\reminder-type.ts src\shared\entity\reminder.ts src\shared\entity\event.ts src\shared\entity\index.ts src\shared\enum\reminder-type.ts src\server\reminder-types.ts src\server\api.ts src\app\services\reminder-type.service.ts src\app\components\catalog-name-edit src\app\app.module.ts src\app\common\UITools.ts src\app\common\UIToolsService.ts src\app\route\reminders\reminders.component.ts src\app\route\reminders\reminders.component.html src\app\routes\modals\reminder-details-modal src\app\routes\modals\event-selection-modal src\app\app.component.ts scripts\msg-7-4-reminder-types.txt scripts\commit-stage-c-7-4.bat
git commit -F scripts\msg-7-4-reminder-types.txt
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
