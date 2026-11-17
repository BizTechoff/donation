@echo off
setlocal
cd /d %~dp0..

REM Mobile donation form - donor donations list + edit (+ version)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.16\.2''','2026.11.16.3'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\mobile src\app\app-version.ts scripts\msg-mobile-donor-donations-edit.txt scripts\commit-mobile-donor-donations-edit.bat
git commit -F scripts\msg-mobile-donor-donations-edit.txt
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
