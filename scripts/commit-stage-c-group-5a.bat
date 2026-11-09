@echo off
setlocal
cd /d %~dp0..

REM Stage C group 5 (letters) 5.1-5.3, 5.5 - one commit per sub-item (C.A.B.S).
REM Each step copies that sub-item's snapshot from scripts\stages and commits it.
REM The last step leaves the tree exactly as it is now. Run after: npm run build

REM ---- 5-1
xcopy /E /Y /I /Q "scripts\stages\5-1\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\routes\modals\letter-properties-modal\letter-properties-modal.component.ts src\shared\utils\commitment-utils.ts scripts\msg-5-1-on-account-letter.txt
git commit -F scripts\msg-5-1-on-account-letter.txt
if errorlevel 1 goto fail

REM ---- 5-2
xcopy /E /Y /I /Q "scripts\stages\5-2\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\routes\modals\letter-properties-modal\letter-properties-modal.component.ts src\shared\entity\place.ts src\shared\utils\letter-rules.ts scripts\msg-5-2-auto-letter.txt
git commit -F scripts\msg-5-2-auto-letter.txt
if errorlevel 1 goto fail

REM ---- 5-3
xcopy /E /Y /I /Q "scripts\stages\5-3\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\app.component.ts src\app\routes\modals\letter-properties-modal\letter-properties-modal.component.ts src\shared\enum\letter.ts scripts\msg-5-3-donation-letters-only.txt
git commit -F scripts\msg-5-3-donation-letters-only.txt
if errorlevel 1 goto fail

REM ---- 5-5 (current tree)
git add -- src\server\docx.ts src\app\common\file-utils.ts src\app\services\letter.service.ts scripts\msg-5-5-letter-docx.txt scripts\commit-stage-c-group-5a.bat
git commit -F scripts\msg-5-5-letter-docx.txt
if errorlevel 1 goto fail

rmdir /s /q scripts\stages
echo.
echo DONE - 4 commits created. Nothing pushed.
git log --oneline -4
git status --short
goto end

:fail
echo.
echo FAILED - check the output above. Snapshots kept in scripts\stages.

:end
endlocal
