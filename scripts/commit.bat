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

REM ===== [1] fix(entities/perm): grant Roles.secretary delete permission on 16 operational entities =====
git add src/shared/entity/donation.ts src/shared/entity/donor.ts src/shared/entity/payment.ts src/shared/entity/certificate.ts src/shared/entity/donor-gift.ts src/shared/entity/donor-relation.ts src/shared/entity/target-audience.ts src/shared/entity/event.ts src/shared/entity/campaign.ts src/shared/entity/donation-organization.ts src/shared/entity/donation-partner.ts src/shared/entity/donation-bank.ts src/shared/entity/gift.ts src/shared/entity/file.ts src/shared/entity/organization.ts src/shared/entity/company.ts
if errorlevel 1 goto :err
git diff --cached --quiet
if not errorlevel 1 goto :next1
echo [1] fix(entities/perm): grant secretary delete on 16 operational entities
git commit -m "fix(entities/perm): grant Roles.secretary delete permission on 16 operational entities" -m "Per client report (Israel Glikson, 30.6.2026 #2): 'we can not delete donations that were entered'. Root cause: Donation and 15 other operational entities all restricted allowApiDelete to [Roles.admin]. Israel and Yaakov run day-to-day operations under the 'secretary' role, so every delete call from the UI was silently rejected by the Remult API (the frontend deleteDonation only console.error'd the failure and left the user with no feedback). Fix: allowApiDelete now includes both admin and secretary on the 16 operational entities that the secretariat manages daily - donation, donor, payment, certificate, donor-gift, donor-relation, target-audience, event, campaign, donation-organization, donation-partner, donation-bank, gift, file, organization, company. Deliberately NOT extended (kept admin-only) on 6 system-configuration / lookup entities where an accidental delete would break FKs across the whole platform: country, bank, donation-method, donor-address-type, blessing, blessing-book-type. No entity fields, business logic, saving hooks or role definitions touched." -m "BizTechoff(TM)"
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
