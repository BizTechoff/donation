@echo off
REM commit.bat - subject-based commits, self-contained.
REM Run from anywhere - CDs to repo root automatically.
REM C.A.B.S = Commit All By Subject. Each group adds, checks, commits.
REM Groups with no pending changes print [SKIP].
REM
REM All groups use goto-label structure (no inline if/else with parens) so
REM CMD's parser doesn't choke on commit messages that contain ( ) or :.

setlocal
cd /d "%~dp0.."

echo.
echo === Commit by Subject (repo: %CD%) ===
echo.

git status --short
if errorlevel 1 goto :err
echo.

REM ===== [1] feat(scripts): copy-places + fix-places-fks =====
echo [1] feat(scripts): copy-places + fix-places-fks
git add scripts/copy-places.ts scripts/fix-places-fks.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip1
git commit -m "feat(scripts): copy-places + fix-places-fks (Heroku to Railway migration)" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next1
:skip1
echo   [SKIP]
:next1
echo.

REM ===== [2] feat(scripts): copy-contacts =====
echo [2] feat(scripts): copy-contacts
git add scripts/copy-contacts.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip2
git commit -m "feat(scripts): copy-contacts - donor_contacts phones plus emails" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next2
:skip2
echo   [SKIP]
:next2
echo.

REM ===== [3] feat(scripts): compare-dbs =====
echo [3] feat(scripts): compare-dbs
git add scripts/compare-dbs.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip3
git commit -m "feat(scripts): compare-dbs - 3-phase read-only DB comparison" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next3
:skip3
echo   [SKIP]
:next3
echo.

REM ===== [4] feat(donor-map): granular performance timings (server) =====
echo [4] feat(donor-map): granular console.time markers - server
git add src/shared/controllers/donor-map.controller.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip4
git commit -m "feat(donor-map): granular console.time markers for hotspot analysis - server" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next4
:skip4
echo   [SKIP]
:next4
echo.

REM ===== [5] feat(donors-map): client-side timings in addMarkersToMap =====
echo [5] feat(donors-map): client-side timings - addMarkersToMap
git add src/app/route/donors-map/donors-map.component.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip5
git commit -m "feat(donors-map): client-side console.time markers in addMarkersToMap" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next5
:skip5
echo   [SKIP]
:next5
echo.

REM ===== [6] fix(modals): remove shimmer animation from headers =====
echo [6] fix(modals): remove shimmer animation from dialog headers
git add src/app/routes/modals/donor-details-modal/donor-details-modal.component.scss src/app/routes/modals/donation-details-modal/donation-details-modal.component.scss src/app/routes/modals/campaign-details-modal/campaign-details-modal.component.scss src/app/routes/modals/reminder-details-modal/reminder-details-modal.component.scss src/app/routes/modals/campaign-invited-list-modal/campaign-invited-list-modal.component.scss src/app/routes/modals/company-details-modal/company-details-modal.component.scss src/app/routes/modals/organization-details-modal/organization-details-modal.component.scss src/app/routes/modals/bank-details-modal/bank-details-modal.component.scss
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip6
git commit -m "fix(modals): remove distracting shimmer animation from dialog headers" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next6
:skip6
echo   [SKIP]
:next6
echo.

REM ===== [7] fix(reports): sticky table headers across all reports =====
echo [7] fix(reports): sticky table headers
git add src/app/route/reports/reports.component.scss
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip7
git commit -m "fix(reports): make table column headers sticky during scroll - all 5 reports" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next7
:skip7
echo   [SKIP]
:next7
echo.

REM ===== [8] fix(reports): currency calculation bugs =====
echo [8] fix(reports): currency calculation bugs
git add src/shared/controllers/report.controller.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip8
git commit -m "fix(reports): currency bugs - normalizeCurrencyName whitelist plus yearly Hebrew year bucketing" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next8
:skip8
echo   [SKIP]
:next8
echo.

REM ===== [9] feat(reports): all platform currencies in screen/print/excel =====
echo [9] feat(reports): all platform currencies - PayerService SSOT
git add src/app/route/reports/reports.component.ts src/app/route/reports/reports.component.html
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip9
git commit -m "feat(reports): show all platform currencies in yearly + donations reports - screen print excel" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next9
:skip9
echo   [SKIP]
:next9
echo.

REM ===== [10] fix(donations-list): currency-totals card layout =====
echo [10] fix(donations-list): currency-totals card layout
git add src/app/route/donations-list/donations-list.component.scss
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip10
git commit -m "fix(donations-list): currency-totals card - natural width per currency, column-gap only" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next10
:skip10
echo   [SKIP]
:next10
echo.

REM ===== [11] perf(donors-map): MarkerClusterer for bulk operations =====
echo [11] perf(donors-map): MarkerClusterer - fix 88s clearMarkers bottleneck
git add package.json package-lock.json src/app/route/donors-map/donors-map.component.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip11
git commit -m "perf(donors-map): use googlemaps markerclusterer for bulk add and clear - fix 88s freeze" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next11
:skip11
echo   [SKIP]
:next11
echo.

REM ===== [12] fix(reports): NG8107 cleanup =====
echo [12] fix(reports): NG8107 cleanup
git add src/app/route/reports/reports.component.html
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip12
git commit -m "fix(reports): NG8107 cleanup - remove unnecessary optional chain on currencyTypes in templates" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next12
:skip12
echo   [SKIP]
:next12
echo.

REM ===== [13] fix(donors-export): use getDisplayAddress for print/Excel consistency =====
echo [13] fix(donors-export): use Place.getDisplayAddress in loadDonorsForExport
git add src/shared/controllers/donor-map.controller.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip13
git commit -m "fix(donors-export): print and Excel address now matches the donor list table - getDisplayAddress" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next13
:skip13
echo   [SKIP]
:next13
echo.

REM ===== [14] feat(scripts): fill-place-building-apt =====
echo [14] feat(scripts): fill-place-building-apt
git add scripts/fill-place-building-apt.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip14
git commit -m "feat(scripts): fill-place-building-apt - backfill places.building and apartment from Excel" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next14
:skip14
echo   [SKIP]
:next14
echo.

REM ===== [15] feat(place): getApartmentLine for all countries =====
echo [15] feat(place): getApartmentLine for all countries
git add src/shared/entity/place.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip15
git commit -m "feat(place): getApartmentLine works for all countries not only UK - building and apartment show consistently in table print and Excel" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next15
:skip15
echo   [SKIP]
:next15
echo.

REM ===== [16] fix(search): debounce 800ms + min 2 chars in donor-list and donations-list =====
echo [16] fix(search): debounce 800ms plus min 2 chars
git add src/app/route/donor-list/donor-list.component.ts src/app/route/donations-list/donations-list.component.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip16
git commit -m "fix(search): increase debounce to 800ms and require minimum 2 chars - donor-list and donations-list" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next16
:skip16
echo   [SKIP]
:next16
echo.

REM ===== [17] catch-all (anything else still uncommitted) =====
echo [17] catch-all - any remaining changes
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :skip17
git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
goto :next17
:skip17
echo   [SKIP]
:next17
echo.

echo === Done ===
git log -18 --oneline
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
