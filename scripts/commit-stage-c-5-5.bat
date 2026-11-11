@echo off
setlocal
cd /d %~dp0..

REM Stage C 5.5 - open the letter directly in Word (+ version)
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.13','2026.11.11.14'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\server\letter-open.ts src\server\index.ts src\shared\controllers\letter.controller.ts src\app\services\letter.service.ts src\app\routes\modals\letter-properties-modal src\app\app.component.ts scripts\msg-5-5-open-in-word.txt scripts\commit-stage-c-5-5.bat
git commit -F scripts\msg-5-5-open-in-word.txt
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
