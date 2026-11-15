@echo off
setlocal
cd /d %~dp0..

REM Mobile donor card + PWA install (+ version, now in app-version.ts)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.12','2026.11.15'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\app-version.ts src\app\app.component.ts src\app\mobile src\assets\icons src\manifest.webmanifest src\sw.js src\index.html src\main.ts angular.json src\server\index.ts scripts\msg-mobile-pwa.txt scripts\commit-mobile-pwa.bat
git commit -F scripts\msg-mobile-pwa.txt
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
