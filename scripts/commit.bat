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

REM ===== [2] fix(phone-utils audit): route all remaining phone-display sites through formatDisplayPhones =====
git add src/shared/controllers/donor.controller.ts src/shared/controllers/campaign.controller.ts src/app/services/donor.service.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next2
echo [2] fix(phone-utils audit): all phone display sites now use formatDisplayPhones
git commit -m "fix(phone-utils audit): route all remaining phone-display sites through the shared helper" -m "Per client request (Israel Glikson, 30.6.2026 #6): the mobile-first phone rendering already landed for the donor list, reports and exports (Excel/Print) via phone-utils.formatDisplayPhones, but the client asked to make sure every canonical 'phone column' across the platform - including selection modals - obeys the same rule so a donor's mobile is what shows everywhere, falling back to landlines only when no mobile exists. Audit found four call-sites that were still using a first-phone-wins pattern (whichever DonorContact came out of the query first): DonorController.getDonorsForSelectionPage (drives the donor-selection modal and the mobile quick-donation donor lookup), DonorController.buildInvitedRows (drives the campaign invited list / blessing selection), CampaignController.getBlessingBookData (drives the blessing book of a campaign), and DonorService.loadDonorRelatedData (drives reminder-details-modal, campaign-donors-modal and any other consumer). All four now gather ALL phones per donor into a Map first and derive the display string via formatDisplayPhones - same pattern the fixed donor-map controller already uses. Nothing was extracted into a new UI component - business logic is the modular concern, presentation stays inline (per user's philosophy). Excluded on purpose: single-value form fields (donor/company/organization/bank .phone edit inputs), the full per-phone list on mobile donor-details-step (a different UX), getPrimaryPhoneForDonor (business primary-flag concept, not display), and Google Contacts sync (data mapping, not display). Ten files across the platform now import phone-utils - one source of truth for canonical phone rendering." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next2
echo.

REM ===== [3] chore(deps): remove unused puppeteer devDependency (unblocks Railway build) =====
git add package.json package-lock.json
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next3
echo [3] chore(deps): remove unused puppeteer devDependency
git commit -m "chore(deps): remove unused puppeteer devDependency - unblocks Railway build" -m "Railway (nixpacks) auto-detects puppeteer in the dependency tree and injects a hard-coded list of Chromium apt packages into the build image, including gconf-service and libappindicator1 which have been removed from current Debian / Ubuntu repositories. apt-get install fails, the entire image build aborts, and no version of the app ever reaches the deploy step - the v2026.07.01 build reported 'Failed to build an image' during apt install. Root cause is that puppeteer was pulled in as a devDependency at some point but is not referenced anywhere in src/, scripts/ or any *.ts across the repo (checked before removal). Karma still runs its own headless browser via karma-chrome-launcher, so removing puppeteer does not break the test setup either. Package removed via 'npm uninstall puppeteer' so both package.json and package-lock.json stay in sync; local 'npm run build' verified green before commit." -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next3
echo.

REM ===== [4] catch-all (anything else still uncommitted) =====
git add -A
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next4
echo [4] catch-all - misc remaining changes
git commit -m "wip: misc remaining changes" -m "BizTechoff(TM)"
if errorlevel 1 goto :err
:next4
echo.

echo === Done ===
echo Next: git push origin master
exit /b 0

:err
echo.
echo === ERROR ===
exit /b 1
