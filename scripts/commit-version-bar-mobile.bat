@echo off
setlocal
cd /d %~dp0..

REM New-version bar on mobile too (+ version)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.15''','2026.11.15.1'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\common\UIToolsService.ts src\app\components\new-version-bar src\app\app.component.html src\app\app.component.scss src\app\app.module.ts src\app\mobile\mobile-shell src\app\app-version.ts scripts\msg-version-bar-mobile.txt scripts\commit-version-bar-mobile.bat
git commit -F scripts\msg-version-bar-mobile.txt
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
