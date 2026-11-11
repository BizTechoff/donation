@echo off
setlocal
cd /d %~dp0..

REM Stage C 5.4 - letters screen, edit / add letter templates (+ version)
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.11','2026.11.11.12'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\app-routing.module.ts src\app\app.module.ts src\app\common\UIToolsService.ts src\app\i18n\terms.en.ts src\app\i18n\terms.he.ts src\app\routes\modals\letter-properties-modal\letter-properties-modal.component.ts src\app\services\file-upload.service.ts src\app\services\letter.service.ts src\app\route\letters src\server\api.ts src\server\docx.ts src\server\s3.ts src\server\docx-options.ts src\server\letter-templates.ts src\shared\controllers\file.controller.ts src\shared\controllers\letter.controller.ts src\shared\entity\file.ts src\shared\entity\index.ts src\shared\entity\custom-letter.ts src\shared\enum\letter.ts src\shared\utils\letter-catalog.ts src\app\app.component.ts scripts\msg-5-4-letters.txt scripts\commit-stage-c-5-4.bat
git commit -F scripts\msg-5-4-letters.txt
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
