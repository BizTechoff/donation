@echo off
setlocal
cd /d %~dp0..

REM Stage C 9.1 - who created / updated every record (+ version)
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.8','2026.11.11.9'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\shared\utils\audit-fields.ts src\shared\entity src\app\services\user-name.service.ts src\app\components\audit-stamp src\app\app.module.ts src\app\routes\modals src\app\app.component.ts scripts\msg-9-1-audit.txt scripts\commit-stage-c-9-1.bat
git commit -F scripts\msg-9-1-audit.txt
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
