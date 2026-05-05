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

REM ===== [8] catch-all (anything else still uncommitted) =====
echo [8] catch-all: any remaining changes
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

echo === Done ===
git log -9 --oneline
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
