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

REM ===== [1] feat(donation-details): "תנועות" for new commitment + saveDonationCore refactor =====
git add src/app/routes/modals/donation-details-modal/donation-details-modal.component.html src/app/routes/modals/donation-details-modal/donation-details-modal.component.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next1
echo [1] feat(donation-details): "תנועות" button for brand-new commitment + saveDonationCore
git commit -m "feat(donation-details): show תנועות button for brand-new commitment + save-first flow" -m "Per client report (Israel Glikson, 30.6.2026 #3): recording a new commitment donation was a two-round-trip experience - the תנועות button was gated behind !isNewDonation, so users had to save the donation with the top-right Save button (which also closes the details modal), reopen the same donation and only then attach payments. The friction was noticed most in the common flow of entering a pledge with an immediate partial payment. Fix has two parts: (1) the button's *ngIf now shows for any commitment donation - new or existing - while standing-order behavior is untouched (still requires an existing record); (2) openPaymentList now runs the same validation + save path the top-right Save button uses and only then opens the payment list, without closing the details modal - so the user can attach payments and return straight to the same edit surface. To keep the two flows in sync, the validation + persist logic was extracted from saveDonation into a private saveDonationCore that returns a boolean and does NOT touch the dialog. saveDonation now delegates to it and closes the modal on success (unchanged behavior), openPaymentList delegates to it too but stays open. A wasNew flag flips isNewDonation to false once the record has an id so subsequent interactions treat it as existing. No entity fields, permissions or business logic touched." -m "BizTechoff(TM)"
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
