@echo off
REM C.A.B.S - ארבעה נושאים, ארבעה קומיטים. להריץ אחרי npm run build.
cd /d %~dp0..

git add src/app/routes/modals/donor-details-modal/donor-details-modal.component.ts src/app/routes/modals/donor-details-modal/donor-details-modal.component.html
git commit -F scripts/msg-i1-a-donor-country.txt || goto :fail

git add src/shared/utils/phone-format.ts src/app/common/phone-input/phone-input.component.ts src/app/common/phone-input/phone-input.component.html
git commit -F scripts/msg-i1-b-input-filter.txt || goto :fail

git add src/server/google-contacts.ts src/server/google-contacts-sync.ts
git commit -F scripts/msg-i1-c-google-e164.txt || goto :fail

git add tools/phone-classify.ts tools/phone-normalize-report.ts .gitignore
git commit -F scripts/msg-i1-d-normalize-tools.txt || goto :fail

echo.
echo ארבעת הקומיטים נוצרו. דחיפה רק באישור מפורש.
git log --oneline -4
goto :eof

:fail
echo.
echo נכשל - בדוק את הפלט למעלה. שום דבר לא נדחף.
