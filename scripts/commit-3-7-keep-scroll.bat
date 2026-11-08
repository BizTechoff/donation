@echo off
setlocal
cd /d %~dp0..

REM Stage C 3.7 - lists keep their scroll position after a card edit.
REM Run after: npm run build

git add -- src\app\common\table\table-state.ts src\app\route\donor-list\donor-list.component.ts src\app\route\donations-list\donations-list.component.ts src\app\route\donor-gifts-list\donor-gifts-list.component.ts src\app\route\certificates\certificates.component.ts src\app\route\campaigns-list\campaigns-list.component.ts src\app\app.component.ts scripts\msg-3-7-keep-scroll.txt scripts\commit-3-7-keep-scroll.bat
git commit -F scripts\msg-3-7-keep-scroll.txt
if errorlevel 1 goto fail

echo.
echo DONE - 1 commit created. Nothing pushed.
git log --oneline -1
git status --short
goto end

:fail
echo.
echo FAILED - check the output above.

:end
endlocal
