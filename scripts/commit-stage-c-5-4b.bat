@echo off
setlocal
cd /d %~dp0..

REM Stage C 5.4b - letters search like the other screens (+ version)
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.12','2026.11.11.13'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\route\letters src\app\app.component.ts scripts\msg-5-4b-letters-search.txt scripts\commit-stage-c-5-4b.bat
git commit -F scripts\msg-5-4b-letters-search.txt
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
