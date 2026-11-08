@echo off
setlocal
cd /d %~dp0..

REM Stage C group 2 - one commit per sub-item (C.A.B.S).
REM Each step copies that sub-item's snapshot from scripts\stages and commits it.
REM The last step leaves the tree exactly as it is now. Run after: npm run build

REM ---- 2-1
xcopy /E /Y /I /Q "scripts\stages\2-1\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\app.module.ts src\app\common\directives\field-lang.directive.ts src\app\routes\modals\circle-details-modal\circle-details-modal.component.html src\app\routes\modals\country-details-modal\country-details-modal.component.html src\app\routes\modals\donor-details-modal\donor-details-modal.component.html src\shared\utils\keyboard-layout.ts scripts\msg-2-1-keyboard-layout.txt
git commit -F scripts\msg-2-1-keyboard-layout.txt
if errorlevel 1 goto fail

REM ---- 2-2
xcopy /E /Y /I /Q "scripts\stages\2-2\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\common\directives\field-lang.directive.ts src\shared\utils\text-case.ts scripts\msg-2-2-capitalize.txt
git commit -F scripts\msg-2-2-capitalize.txt
if errorlevel 1 goto fail

REM ---- 2-3
xcopy /E /Y /I /Q "scripts\stages\2-3\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\app.module.ts src\app\common\bilingual-search\bilingual-search.component.html src\app\common\bilingual-search\bilingual-search.component.scss src\app\common\bilingual-search\bilingual-search.component.ts src\app\common\directives\field-lang.directive.ts src\app\route\donations-list\donations-list.component.html src\app\route\donations-list\donations-list.component.ts src\app\route\donor-list\donor-list.component.html src\app\route\donor-list\donor-list.component.ts src\app\routes\modals\donor-selection-modal\donor-selection-modal.component.html src\app\routes\modals\donor-selection-modal\donor-selection-modal.component.ts src\app\routes\modals\target-audience-details-modal\target-audience-details-modal.component.html scripts\msg-2-3-bilingual-search.txt
git commit -F scripts\msg-2-3-bilingual-search.txt
if errorlevel 1 goto fail

REM ---- 2-4
xcopy /E /Y /I /Q "scripts\stages\2-4\src" "src" >nul
if errorlevel 1 goto fail
git add -- src\app\app.component.ts src\app\routes\modals\donor-details-modal\donor-details-modal.component.html src\app\routes\modals\donor-details-modal\donor-details-modal.component.ts src\shared\controllers\donor.controller.ts scripts\msg-2-4-english-names.txt scripts\commit-stage-c-group-2.bat
git commit -F scripts\msg-2-4-english-names.txt
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
