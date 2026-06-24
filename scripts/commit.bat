@echo off
REM commit.bat - subject-based commits for the current pending work.
REM Old (already-committed) groups removed - if you need them back, git history
REM still has them. Catch-all at the end picks up anything not in a named group.

setlocal
cd /d "%~dp0.."

echo.
echo === Commit by Subject (repo: %CD%) ===
echo.

git status --short
if errorlevel 1 goto :err
echo.

REM ===== [1] refactor(phone): unified phone column via shared phone-utils helper =====
git add src/shared/utils/phone-utils.ts src/shared/controllers/donor-map.controller.ts src/shared/controllers/report.controller.ts src/app/route/donor-list/donor-list.component.ts src/app/route/donations-list/donations-list.component.ts src/app/route/donor-gifts-list/donor-gifts-list.component.ts src/app/route/certificates/certificates.component.ts src/app/route/reminders/reminders.component.ts src/app/route/reports/reports.component.ts src/app/route/reports/reports.component.html src/app/services/print.service.ts src/app/services/excel-export.service.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next1
echo [1] refactor(phone): unified phone column - shared helper
git commit -m "refactor(phone): unified one-phone-column approach via shared phone-utils helper" -m "Per client refinement: instead of two separate columns (phone + mobile phone) the canonical donor list/donations/reports/exports now have a single column called Phone whose value is the mobile numbers when any exist, otherwise the landlines. New shared module src/shared/utils/phone-utils.ts is the single source of truth for isMobilePhone detection (Israeli 05X plus 9725X, UK 07X plus 447X), selectDisplayPhones picks mobiles over landlines, and formatDisplayPhones joins them newline-separated. All consumers updated: donor-map.controller.ts loadDonorsForExport and loadDonorsMapDataByIds; report.controller.ts loadAllDonorDetails plus PaymentReportData; reports.component.ts blessings report population; five list components and three places in reports.component.ts removed the dedicated mobile column. mobilePhones field removed from DonorExportData, DonorExportDetails, PaymentReportData and BlessingReportData. Print HTML now converts newline to br in generateRowsHtml; Excel cells with newline get wrapText style plus auto-grown row height for legibility. Blessings report UI loses the mobile column too - phone column renders newline-separated with white-space pre-line and direction ltr. Local duplicate isMobilePhone implementations removed everywhere - all paths now route through phone-utils." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next1
echo.

REM ===== [2] fix(place): getCountryLine context parameter - UK letter omits GB =====
git add src/shared/entity/place.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next2
echo [2] fix(place): getCountryLine context parameter
git commit -m "fix(place): getCountryLine accepts context parameter - letter vs display - UK letters omit GB" -m "Per client: British addresses sent as letters should not include GB because British postcodes route uniquely without it. But the country code should still appear in the on-screen table, donor card, Excel and print of donor lists so users can tell at a glance it is a UK address. Solution: getCountryLine(context) defaults to display and returns the code as before; getAddressForLetter passes letter and the UK case alone returns null in that mode. US still returns the code in all contexts; other countries still return the full name. Single place to extend in the future (just add new contexts) - keeps the UK rule next to the other country rules instead of scattered around callers." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next2
echo.

REM ===== [3] catch-all (anything else still uncommitted) =====
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next3
echo [3] catch-all - misc remaining changes
git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next3
echo.

echo === Done ===
git log -5 --oneline
echo.
git status --short
echo.
echo To push (manual, requires your explicit decision):
echo   git push origin master
echo.

endlocal
exit /b 0

:err
echo.
echo [ERROR] git command failed - stopping.
endlocal
exit /b 1
