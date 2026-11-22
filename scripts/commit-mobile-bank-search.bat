@echo off
setlocal
cd /d %~dp0..

REM Mobile donation form - searchable bank / organization lists (+ version)
powershell -NoProfile -Command "$f='src\app\app-version.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.22\.02''','2026.11.22.03'''; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\app\mobile\search-select src\app\mobile\mobile.module.ts src\app\mobile\quick-donation\steps\donation-form-step src\app\app-version.ts scripts\msg-mobile-bank-search.txt scripts\commit-mobile-bank-search.bat
git commit -F scripts\msg-mobile-bank-search.txt
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
