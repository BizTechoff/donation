@echo off
REM commit.bat - subject-based commits for the current pending work.

setlocal
cd /d "%~dp0.."

echo.
echo === Commit by Subject (repo: %CD%) ===
echo.

git status --short
if errorlevel 1 goto :err
echo.

REM ===== [1] feat(letter): pledge donations show pledgeTotal / paidTotal in Amount field =====
git add src/shared/utils/donation-utils.ts src/app/routes/modals/letter-properties-modal/letter-properties-modal.component.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next1
echo [1] feat(letter): pledge total + paid total in Amount field
git commit -m "feat(letter): pledge donations show pledgeTotal / paidTotal in Amount field" -m "Per client report (Israel Glikson, 30.6.2026 #4): when printing a letter for a pledge donation the Amount field showed only the full commitment number, so the recipient could not see how much had already been paid against the pledge. Fix: the letter's Amount (English template) and תרומה (Hebrew template) fields now render as pledgeTotal / paidTotal for commitment donations - the same numbers already visible in the donations list summary - while regular one-off donations keep their existing single-amount output and standing-orders are untouched (not in scope). Implemented as a shared helper getPledgeSummary(donation, payments) in donation-utils.ts that returns { pledgeTotal, paidTotal, remaining } and reuses the existing calculatePaymentTotals filter (payment.type=התחייבות, isActive) - one source of truth so the list, the letter and any future consumer stay in sync. The Modal fetches the payments through the existing PaymentController.getPaymentsByDonation(donation.id, 'התחייבות') backend method - no new API surface, no duplicated query. No entity fields, business logic, or letter delegate touched." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next1
echo.

REM ===== [2] catch-all (anything else still uncommitted) =====
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next2
echo [2] catch-all - misc remaining changes
git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next2
echo.

echo === Done ===
echo Next: git push origin master
exit /b 0

:err
echo.
echo === ERROR ===
exit /b 1
