@echo off
REM commit.bat - subject-based commits, self-contained.
REM Run from anywhere - CDs to repo root automatically.
REM C.A.B.S = Commit All By Subject. Each group adds, checks, commits.
REM Groups with no pending changes print [SKIP].

setlocal
cd /d "%~dp0.."

echo.
echo === Commit by Subject (repo: %CD%) ===
echo.

git status --short
if errorlevel 1 goto :err
echo.

REM ===== [1] feat(scripts): copy-places + fix-places-fks (Heroku->Railway migration) =====
echo [1] feat(scripts): copy-places + fix-places-fks
git add scripts/copy-places.ts scripts/fix-places-fks.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat(scripts): copy-places + fix-places-fks (Heroku->Railway migration)" -m "copy-places.ts: copies Place + DonorPlace with donor matching by idNumber (LEGACY-*) and FK remap for countries/addressTypes. Modes: --verify (default, diagnostics only), --dry-run, --confirm. Bulk pre-loads + transactional batch INSERT (200/chunk). fix-places-fks.ts: fixes orphan FK references in already-copied data by matching countries on code and donor_address_types on name. Same --verify/--confirm modes, transactional UPDATEs." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [2] feat(scripts): copy-contacts (donor phones + emails) =====
echo [2] feat(scripts): copy-contacts
git add scripts/copy-contacts.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat(scripts): copy-contacts (donor_contacts phones + emails)" -m "Same pattern as copy-places.ts. Modes: --verify/--dry-run/--confirm. Donor matching by idNumber. Dedup key: (donorId, type, value-lowercased-trimmed) where value is phoneNumber or email. Bulk pre-loads + transactional batch INSERT. Skips blank values (cannot dedup safely)." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [3] feat(scripts): compare-dbs (read-only diagnostic) =====
echo [3] feat(scripts): compare-dbs
git add scripts/compare-dbs.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat(scripts): compare-dbs - 3-phase read-only DB comparison" -m "Phase 1: per-table row counts side-by-side with diff and notes. Phase 2: per-donor entity coverage (donations/places/contacts/notes/events/gifts) - shows how many donors have more on each side. Phase 3: donation date drift analysis with per-donor totals + sample comparison for timezone-shift detection. Skips donor_relations (different FK structure: donor1Id/donor2Id). Try/catch around each entity for resilience." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [4] feat(donor-map): granular performance timings (server) =====
echo [4] feat(donor-map): granular console.time markers (server)
git add src/shared/controllers/donor-map.controller.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat(donor-map): granular console.time markers for hotspot analysis (server)" -m "Adds timing markers to: getIntersectedIds (global+local filter split), buildMarkersFromIds (1.places SELECT, 2.donors SELECT, 3.donations groupBy sum+max, 4.thresholds load, 5.marker+status calc, 6.statusFilter apply), buildStatisticsFromIds (1.donor counts, 2.coord query, 3.PayerService+currencyTypes, 4.donations groupBy by currency, 5.count). Logs intermediate counts (placeRows, high-donor count, after-filter count). Pinpoints time hotspots for legend filters like 'high-donor > 1500'. Logic unchanged - timing only." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [5] feat(donors-map): client-side timings in addMarkersToMap =====
echo [5] feat(donors-map): client-side timings (addMarkersToMap)
git add src/app/route/donors-map/donors-map.component.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat(donors-map): client-side console.time markers in addMarkersToMap" -m "Adds timings to: 1.clearMarkers (setMap(null) loop), 2.createMarkers (new google.maps.Marker loop), 3.fitBounds, plus addMarkersToMap TOTAL. Diagnoses why UI loading spinner persists ~60s after server returns in 223ms - suspect: Google Maps Marker creation runs synchronously and blocks main thread when N is large. Logic unchanged - timing only." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [6] fix(modals): remove shimmer animation from headers =====
echo [6] fix(modals): remove shimmer animation from dialog headers
git add src/app/routes/modals/donor-details-modal/donor-details-modal.component.scss src/app/routes/modals/donation-details-modal/donation-details-modal.component.scss src/app/routes/modals/campaign-details-modal/campaign-details-modal.component.scss src/app/routes/modals/reminder-details-modal/reminder-details-modal.component.scss src/app/routes/modals/campaign-invited-list-modal/campaign-invited-list-modal.component.scss src/app/routes/modals/company-details-modal/company-details-modal.component.scss src/app/routes/modals/organization-details-modal/organization-details-modal.component.scss src/app/routes/modals/bank-details-modal/bank-details-modal.component.scss
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix(modals): remove distracting shimmer animation from dialog headers" -m "Per client feedback: the white shimmer/sweep effect (animation: shimmer 3s/4s infinite) on .modal-header::before was visually distracting. Removed the ::before pseudo-element block AND the @keyframes shimmer definition from 8 modal SCSS files: donor-details, donation-details, campaign-details, reminder-details, campaign-invited-list (was 4s + 0.15 alpha), company-details, organization-details, bank-details. Kept .modal-header gradient background + position:relative + overflow:hidden (still needed for layout). Original block recoverable from git history if reverted." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [7] fix(reports): sticky table headers across all reports =====
echo [7] fix(reports): sticky table headers (column headers stay on scroll)
git add src/app/route/reports/reports.component.scss
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix(reports): make table column headers sticky during scroll (all 5 reports)" -m "Per client request: when scrolling table data down, column headers were scrolling away too, leaving rows without column context. Root cause: .report-table had overflow:hidden which created a non-scrolling sticky scope for the thead - the thead's existing position:sticky;top:0 was scoped to the table itself, so it moved with page scroll instead of pinning to the viewport. Fix: minimal @media screen override .reports-container .report-table { overflow: visible } - the thead's sticky scope now walks up to body (the natural page scroll), so it pins to the viewport top while the table is in view. Print mode unaffected (uses default block layout). Trade-off: thead may visually bleed past .report-table's border-radius corners, normally hidden by gradient bg + box-shadow." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [8] fix(reports): currency calculation bugs =====
echo [8] fix(reports): currency calculation bugs
git add src/shared/controllers/report.controller.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix(reports): currency bugs - normalizeCurrencyName whitelist + yearly Hebrew year bucketing" -m "Two distinct bugs caused CHF/CAD donations to disappear or be misclassified: (1) normalizeCurrencyName had a hardcoded whitelist of 4 ISO codes (ILS/USD/EUR/GBP) and silently mapped any other currency (CHF/CAD/etc.) to ILS - so CHF/CAD donations were summed under ILS and never appeared in their own column. Fix: accept any 3-letter ISO code via /^[A-Z]{3}$/ regex; ILS fallback only for truly unknown/empty input. (2) getYearlySummaryReport bucketed donations by Gregorian year (e.g. 2023) but Greg 2023 spans both Tashpa'g (Sep 2022 - Sep 2023) and Tashpa'd (Sep 2023 - Sep 2024). The Hebrew year label was set ONCE per Greg year using whichever donation was processed first - with orderBy donationDate desc, that was the latest 2023 donation (typically in Tashpa'd), so all 2023 donations got the Tashpa'd label. Fix: bucket by Hebrew year number (5783, 5784); display the Greg year that contains MOST months of that Hebrew year (hebrewYearNum - 3760)." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [9] feat(reports): all platform currencies in screen/print/excel =====
echo [9] feat(reports): all platform currencies (PayerService as SSOT)
git add src/app/route/reports/reports.component.ts src/app/route/reports/reports.component.html
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat(reports): show all platform currencies in yearly + donations reports (screen/print/excel)" -m "Yearly summary report and donations currency-summary now display ALL currencies defined in PayerService (single source of truth: ILS/USD/EUR/GBP/CHF/CAD), not just hardcoded ILS/USD/EUR. Coherent across surfaces: screen UI, print output, and Excel export. Currencies with no data render as '-' but the column/row still appears, so users can see at a glance which platform currencies are absent. Component additions: allPlatformCurrencies getter (Object.keys of currencyTypes from PayerService), yearlySummaryActiveCurrencies alias, getCurrencySummaryYearAmount(currency,year) and getCurrencySummaryTotal(currency) lookup helpers. Template changes: yearly summary thead/tbody/tfoot use *ngFor over yearlySummaryActiveCurrencies; donations currency-summary tbody uses *ngFor over allPlatformCurrencies with helper lookups (no longer iterates currencySummaryData directly). Print version (printYearlySummaryReport) and Excel exports (exportYearlySummaryToExcel + donations Sheet 2) generate columns/rows dynamically from allPlatformCurrencies." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [10] fix(donations-list): currency-totals card layout =====
echo [10] fix(donations-list): currency-totals card layout
git add src/app/route/donations-list/donations-list.component.scss
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix(donations-list): currency-totals card - natural width per currency, column-gap only" -m "Per client feedback: with many currencies (6+ in PayerService), the .currency-totals stat card looked crowded - amounts ran into each other (e.g. EUR85,723.67Fr115,525) because each .currency-row had flex:1 forcing equal-width division. Fix: drop flex:1 (now flex:0 0 auto = natural width per currency), add column-gap:1.5rem for consistent horizontal spacing, keep flex-wrap:wrap for overflow to next line. Set row-gap:0 explicitly so wrapped rows stay tight (preserves vertical room for table rows below the card; line-height:1.3 on .amount provides natural row separation). Applies to BOTH 'total donations' and 'total commitments' summary cards (same currency-totals/currency-row classes)." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [11] perf(donors-map): MarkerClusterer for bulk operations =====
echo [11] perf(donors-map): MarkerClusterer (fix 88s clearMarkers bottleneck)
git add package.json package-lock.json src/app/route/donors-map/donors-map.component.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "perf(donors-map): use @googlemaps/markerclusterer for bulk add/clear (fix 88s freeze)" -m "Diagnosed via the new client-side timings: clicking the 'high-donor' filter took 88 seconds, with 88,256ms spent in clearMarkers (calling marker.setMap(null) on each of 3,216 existing markers). Each setMap(null) on the legacy google.maps.Marker triggers internal overlay recalculation - cumulative cost is O(n^2). Asymmetric: removing the filter (351->3,216) is fast because clearing 351 is cheap; adding the filter (3,216->351) is slow because clearing 3,216 is O(3,216^2). Fix: integrate @googlemaps/markerclusterer (Google's official library). The clusterer manages map assignment in bulk via clearMarkers() and addMarkers(arr) - both O(n) instead of O(n^2). Bonus: clusters nearby markers when zoomed out, making the map cleaner with 3K+ donors. Changes: dependency @googlemaps/markerclusterer ^2.5.3; private markerClusterer property initialized after new google.maps.Map(); createGoogleMarker no longer passes map: this.map (clusterer manages it); addMarkersToMap calls clusterer.clearMarkers() then clusterer.addMarkers(newMarkers) instead of looping setMap(null). Existing timings preserved so before/after is measurable - expecting ~300ms vs 88,000ms (~290x faster)." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [12] fix(reports): NG8107 cleanup =====
echo [12] fix(reports): NG8107 cleanup - remove unnecessary ?. on currencyTypes
git add src/app/route/reports/reports.component.html
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix(reports): NG8107 cleanup - remove unnecessary ?. on currencyTypes[cur] in templates" -m "currencyTypes is Record<string, CurrencyType> (non-nullable per type), so the optional chain operator on currencyTypes[cur]?.label / .symbol triggers Angular template warning NG8107. Same pattern as a previous fix for this file. Removed ?. in 5 places: yearly summary thead/tbody/tfoot, donations currency-summary tbody (label + symbol). Logic-equivalent: at runtime currencyTypes[cur] always returns a CurrencyType for the platform's defined codes (PayerService is the SSOT). The ?. in the .ts file remains - NG8107 only checks templates, and the TS-side defensive ?. is actually safer." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [13] catch-all (anything else still uncommitted) =====
echo [13] catch-all: any remaining changes
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

echo === Done ===
git log -14 --oneline
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
