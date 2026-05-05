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

REM ===== [4] feat(donor-map): granular performance timings =====
echo [4] feat(donor-map): granular console.time markers
git add src/shared/controllers/donor-map.controller.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat(donor-map): granular console.time markers for hotspot analysis" -m "Adds timing markers to: getIntersectedIds (global+local filter split), buildMarkersFromIds (1.places SELECT, 2.donors SELECT, 3.donations groupBy sum+max, 4.thresholds load, 5.marker+status calc, 6.statusFilter apply), buildStatisticsFromIds (1.donor counts, 2.coord query, 3.PayerService+currencyTypes, 4.donations groupBy by currency, 5.count). Logs intermediate counts (placeRows, high-donor count, after-filter count). Pinpoints time hotspots for legend filters like 'high-donor > 1500'. Logic unchanged - timing only." -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

REM ===== [5] catch-all (anything else still uncommitted) =====
echo [5] catch-all: any remaining changes
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
  if errorlevel 1 goto :err
) else (echo   [SKIP])
echo.

echo === Done ===
git log -6 --oneline
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
