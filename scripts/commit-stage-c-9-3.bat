@echo off
setlocal
cd /d %~dp0..

REM Stage C 9.3 - admin/secretary can also be fundraisers (+ version). Run AFTER commit-stage-c-8.bat
powershell -NoProfile -Command "$f='src\app\app.component.ts'; $t=[IO.File]::ReadAllText($f) -replace '2026\.11\.11\.6','2026.11.11.7'; [IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding $false))"
call npm run build
if errorlevel 1 goto fail
git add -- src\shared\entity\user.ts src\app\users\SignInController.ts src\app\app.component.ts scripts\msg-9-3-admin-fundraiser.txt scripts\commit-stage-c-9-3.bat
git commit -F scripts\msg-9-3-admin-fundraiser.txt
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
