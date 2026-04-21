# מיפוי שדות - Excel → DB

מסמך מקיף של מיפוי השדות בין קבצי ה-Excel המקוריים לבין האנטיטי ב-DB. מייצר ע"י `src/server/convert-excel-to-seed.ts`.

---

## קבצי המקור

| קובץ | שורות | משמעות |
|---|---|---|
| `TbName.xlsx` | 2,421 | תורמים - מקור עיקרי/IL |
| `TbNameUSA.xlsx` | 801 | תורמים - USA (IDs מקבלים offset של +100,000) |
| `TbTromot.xlsx` | 10,657 | תרומות - מקור עיקרי/IL |
| `TbTromotUSA.xlsx` | 801 | תרומות - USA (IDs מקבלים offset של +100,000) |

**הערה על ה-offset:** ה-IdName ב-USA מתחיל מרצף נפרד שמתנגש עם הלא-USA (למשל IdName=3317 ב-TbName = מייקל בלאק, ב-TbNameUSA = יעקב עקשטיין - אנשים שונים). לכן מוסיפים 100,000 לכל ה-USA. פרט ל-`SHARED_DONOR_IDS = {1908}` (אותו אדם בשני הקבצים, רשומת USA נזרקת).

---

## Donor (תורם)

### שדות ליבה

| Excel (`TbName*`) | Donor Entity | הערות |
|---|---|---|
| `IdName` | `idNumber` | מאוחסן כ-`"LEGACY-{IdName}"` (משמש גם כמזהה זמני לקישור תרומות בזמן import) |
| `ToarHeb` | `title` | תואר עברית |
| `FirstNameHeb` | `firstName` | שם פרטי עברית |
| `LastNameHeb` | `lastName` | שם משפחה עברית |
| `Siomet` | `suffix` | סיומת (הי"ו, זצ"ל...) |
| `ToarEng` | `titleEnglish` | תואר אנגלית (Mr./Mrs./Rabbi...) |
| `FirstNameEng` | `firstNameEnglish` | שם פרטי אנגלית |
| `LastNameEng` | `lastNameEnglish` | שם משפחה אנגלית |
| `Anash` | `isAnash` | דגל `אנ"ש` |
| `Notes` | `notes` | הערות |
| `TarichRishum` | `createdDate` | תאריך רישום. אם ריק — תאריך נוכחי |
| *(כל הרצה)* | `wantsUpdates = true` | ברירת מחדל קשיחה |

### כתובות - אובייקט `donor.addresses[]` → `Place` + `DonorPlace`

**כתובת בית** (נוצרת אם קיים `Address` | `City` | `Country`):

| Excel | Place / DonorPlace |
|---|---|
| — | `type = 'בית'` |
| `NameHome` | `DonorPlace.description` + `Place.placeName` |
| `Address` | `Place.street` |
| `Home` | `Place.houseNumber` |
| `Dira` | `Place.apartment` |
| `City` | `Place.city` |
| `State` | `Place.state` |
| `Zip` | `Place.postcode` |
| `Zip2` | *(שמור ב-data אך לא ב-entity)* |
| `Shchona` | `Place.neighborhood` |
| `Country` | `Place.countryId` (מפוצל בזמן import לקוד מדינה ב-`Country`) |
| — | `DonorPlace.isPrimary = true` |

**כתובת עבודה / שטיבלך** (נוצרת אם קיים `AddressWork` | `CityWork`):

| Excel | Place / DonorPlace |
|---|---|
| `MsShtibl` | קובע את סוג ה-type: `MsShtibl > 0` → `'שטיבלך'`, אחרת `'עבודה'` |
| `Work` | `DonorPlace.description` (אם שטיבלך, מתווסף `(מס' שטיבלך: {MsShtibl})`) |
| `AddressWork` | `Place.street` |
| `HomeWork` | `Place.houseNumber` |
| `DiraWork` | `Place.apartment` |
| `CityWork` | `Place.city` |
| `StateWork` | `Place.state` |
| `ZipWork` | `Place.postcode` |
| — | `DonorPlace.isPrimary = false` |

**חשוב:** מזהה ייחודי של `Place` שנוצר ב-seed: `placeId = "LEGACY-{donorLegacyId}-{type}"` (למשל `"LEGACY-254-בית"`). זה מה שמבדיל אותם מ-Places של ארגונים/בנקים שנוצרים ב-`seed-infrastructure`.

### אנשי קשר - אובייקט `donor.contacts[]` → `DonorContact`

| Excel | DonorContact |
|---|---|
| `Tel` | `type='phone', label='טלפון', isPrimary=true` |
| `Pel` | `type='phone', label='נייד', isPrimary=!Tel` |
| `TelNosaf` | `type='phone', label='טלפון נוסף', isPrimary=false` |
| `Fax` | `type='phone', label='פקס', isPrimary=false` |
| `Email` | `type='email', label='אימייל', isPrimary=true` (לאחר ניקוי: חלק לפני `#`) |
| `EmailHome` | `type='email', label='אימייל בבית', isPrimary=!Email` |

---

## Donation (תרומה)

| Excel (`TbTromot*`) | Donation Entity | הערות |
|---|---|---|
| `IdName` | `donorId` (דרך `donor: donor`) | מקושר דרך ה-donorMap בזמן import |
| `Scom` \| `ScomChiyuv` | `amount` | קודם Scom; אם ריק/0 → ScomChiyuv. אם שניהם ריקים — **התרומה מדולגת** |
| `matbea` | `currency` | ברירת מחדל `'USD'` אם ריק |
| `Tarich` | `donationDate` | תאריך התרומה. אם ריק — תאריך נוכחי |
| `IdDiner` | `campaignName` *(לא נשמר ישירות ב-entity)* | רק בעיבוד ביניים |
| `Voucher_Co` / `Voucher co` | `voucherNumber` | מנורמל ל-`Voucher_Co` (עם underscore). הקיום שלו → `paymentMethod = 'תשלום עמותה'` + `organizationName` |
| `AccountNo` | `accountNumber` | אם יש ערך ואין `Voucher_Co` → `paymentMethod = 'העברה בנקאית'` |
| `Kabala` | `receiptNumber` | אסמכתא |
| `Notes` | `notes` | הערות |
| `Sort_Code` / `Sort Code` | `bankId` | מנורמל ל-`Sort_Code`. מותאם לשם בנק ב-`banks` ומומר ל-UUID |
| `Hachragtit` | `isExceptional` | תרומה חריגה |
| `Dachuf` | `isUrgent` | דחוף |
| `KabalaMatsa` | `receiptIssued` | הוצאה קבלה |

**Payment Method (לוגיקה נגזרת):**
1. אם `Voucher_Co` — `תשלום עמותה`
2. אחרת אם `AccountNo` — `העברה בנקאית`
3. אחרת — `מזומן` (ברירת מחדל)

**לינק לארגון:** `Voucher_Co` משמש גם כ-`organizationName` ומותאם בזמן import לרשומת `Organization` קיימת לפי שם → UUID.

### חברה של התרומה - `donation.company` → `Company`

נוצר רק ב-USA (`TbTromotUSA`) ורק כאשר `Tro_Work` אינו תואר אישי (Mr/Mrs/Dr/Rabbi/ר'/גב'/וכו').

| Excel | Company |
|---|---|
| `Tro_Work` | `name` |
| `Tro_AddressWork` | `address` |
| `Tro_FullCity` \| `Tro_FullCityWork` | `city` |

---

## שדות ב-Excel שלא ממופים (נתונים שלא נכנסים ל-DB)

### `TbName.xlsx` / `TbNameUSA.xlsx` (53 עמודות לא ממופות)

| עמודה | הסבר | סיבת אי-מיפוי |
|---|---|---|
| `ToarFamily` | תואר משפחה (Mr & Mrs) | לא קיים entity field תואם |
| `KinoyNameHeb` | כינוי | השדה `Donor.nickname` קיים אבל לא מחובר |
| `FatherHeb` / `FullNameAv` | שם אב | אין entity field (יש `KodAv` שכן שמור כ-`fatherLegacyId` במבנה ביניים) |
| `FullNameChoten` | שם חותן | כנ"ל |
| `Company` | חברה | השדה `Donor.companyIds` קיים אבל המיפוי פועל דרך `Tro_Work` בלבד |
| `NameSelect`, `Tafkid`, `BzName`, `NoPail`, `Simon`, `Category`, `Isuk`, `IshKesher` | מטא-דאטא היסטורית | אין ישויות תואמות |
| `Mikum`, `Darga`, `MemoTxt` | מיקום/דרגה/זיכרון | אין ישויות תואמות |
| `AddressNosaf`, `CityNosaf` | כתובת נוספת (מעבר לבית+עבודה+שטיבלך) | המיפוי מטפל רק בשתי כתובות |
| `IdMichtav`, `DiraMichtav` | פרטי מכתב | שייך לזרימת מכתבים, לא לתורם |
| `FullZip` | מיקוד מלא | יש `Zip`+`Zip2` שממופים |
| `Shtibl` | שם שטיבלך | מטופל דרך `MsShtibl` |
| `Hok`, `SugHok`, `ScomHok`, `TarichHok`, `SimonChiyuvHok` | הוראת קבע | לא מיושם עדיין |
| `Sort Code` (בתורמים), `AccountNo` (בתורמים) | פרטי בנק של התורם | שדות בנק רק בתרומה |
| `YizkorMen`, `YizkorWomen` | אזכרות | לא מיושם |
| `KodLevel`, `Level` | רמת תורם | `Donor.level` קיים אבל לא מחובר |
| `Name_Diner`, `Tizkoret_Yamim` | דגלונים | לא מיושמים |
| `Toar_A/B/C/D` | כינויי כבוד | לא מיושמים |
| `Mishpachto`, `ZehoyI`, `MatzavMishpacha` | מצב משפחתי וזיהוי | `Donor.maritalStatus` קיים אבל לא מחובר |
| `Shayachot`, `Tachbivim`, `SidryAdifot`, `ProyectChayim`, `Mekoravim`, `Rigoshim` | שדות הכרה | לא מיושמים |
| `KesherAmota`, `KetegoryTorem`, `NotesTorem` | קטגוריות ורמת קשר | `Donor.isAnash`/`isAlumni` מיפוי חלקי בלבד |
| `SendinEmail` | דגל שליחה במייל | `Donor.preferEmail` קיים אבל לא מחובר |

### `TbTromot.xlsx` / `TbTromotUSA.xlsx` (עמודות לא ממופות)

| עמודה | הסבר | סיבת אי-מיפוי |
|---|---|---|
| `Id` | המזהה הייחודי של התרומה ב-Excel | **לא נשמר** - כל תרומה מקבלת UUID חדש ב-DB |
| `Magbit` | שנת מגבית / קמפיין | לא מקושר ל-Campaign entity |
| `TarichPiraon` | תאריך פירעון | לא מיושם |
| `IconMatbea` | אייקון מטבע | קוסמטי, לא רלוונטי |
| `IdSochen` | מתרים/סוכן | `Donation.fundraiser` לא מחובר דרך seed |
| `Pratim`, `Ofen`, `TromaSiba` | פרטים/אופן/סיבה | לא מיושמים |
| `Michtav`, `TextMichtav`, `TarichMictav`, `MichtavText` | פרטי מכתב | שייך לזרימת certificates |
| `IdSimcha` | אירוע משפחתי | לא מיושם |
| `Sug`, `SimonKabala`, `SimonTrans`, `Avor` | דגלי סימון | לא מיושמים |
| `PaymentNumber` | מספר תשלום | לא מיושם |
| `SugHok`, `Hazar`, `Check_Number` | הוראת קבע / חזרות / צ'קים | לא מיושמים |
| `Diner_UpdatedByNname` | מתעדכן ע"י | לא נשמר |
| `Kabala_Id/Name/Home/Address/City/Zip` | נמען קבלה שונה מהתורם | לא מיושם - מצריך entity נפרד |
| `TromaChariga`, `TeaRoom` | דגלים | לא מיושמים |
| `Toar_A/B/C/D` | תארי כבוד לתרומה | לא מיושמים |
| `Sfile`, `TarichRishum`, `Letter_printed` | מטא-דאטא | לא מיושמים |
| **USA-only:** `Tro_FullNameEng`, `Tro_FullCtovetEng`, `Tro_FullNameHome` | מחרוזות מוכנות של שם+כתובת באנגלית | מיותרות בהינתן שהמיפוי שלנו בונה מחדש |
| **USA-only:** `YeshivaSimon` | סימן ישיבה | לא מיושם |

---

## טיפול מיוחד

### 1. Offset של USA (`USA_ID_OFFSET = 100000`)
לכל שורה בקבצי TbNameUSA / TbTromotUSA, `IdName = IdName + 100000`.
פרט לקבוצת `SHARED_DONOR_IDS = {1908}` (אותו אדם בשני הקבצים) - הרשומה מ-USA נזרקת עבור תורמים, לא מקבלת offset עבור תרומות (כדי שהתרומה תתחבר לתורם היחיד).

### 2. Normalization
- `Voucher co` (רווח, TbTromot) → `Voucher_Co` (underscore)
- `Sort Code` (רווח) → `Sort_Code` (underscore)

### 3. דילוג על תרומות ללא נתונים תקינים
- אין `IdName` → נדלג (לא ידוע לאיזה תורם)
- אין `Scom` ולא `ScomChiyuv` → נדלג (אין סכום)

### 4. ניקוי מייל
`Email = "foo@bar.com#mailto:foo@bar.com#"` → `"foo@bar.com"` (חיתוך ב-`#` הראשון).

### 5. התאמות שנעשות בזמן import (seedLegacyData)
- **מדינה:** שם המדינה מה-Excel מותאם ל-`Country` קיים לפי `name`/`nameEn`/`code` (כולל טיפול מיוחד ב-USA variations).
- **בנק:** `Sort_Code` מותאם ל-`Bank.name` (fuzzy, ללא "Bank" prefix/suffix).
- **ארגון:** `Voucher_Co` מותאם ל-`Organization.name` (fuzzy).
- **שם ריק:** אם `firstName` או `lastName` ריקים, מחליפים בשני או `'לא ידוע'`.

---

## זרימת המיפוי

```
Excel (4 קבצים)
    ↓
readExcelFiles() [איחוד + offset USA]
    ↓
normalizeDonationRow() [Voucher_Co / Sort_Code]
    ↓
processDonors() / processDonations() [טרנספורמציה למבני ביניים]
    ↓
seed-data.ts [נוצר אוטומטית עם JSON.stringify]
    ↓
seedLegacyData() [הכנסה ל-DB:]
    1. TRUNCATE בבטחה (רק LEGACY places, לא תשתית)
    2. צור/מצא AddressTypes + DonationMethods
    3. לכל תורם: Donor → Place × N → DonorPlace × N → DonorContact × M → Company
    4. לכל תרומה: match לתורם (via donorMap) + bank + organization → Donation
    ↓
DB (UUIDs סופיים)
```

---

## מקרים שלא יעברו בלי שימת לב

- **תרומה עם `Scom = 0` וגם `ScomChiyuv = 0` ו/או ריקים:** תדולג. 54 תרומות הוצאו מכלל ההזנה מסיבה זו בהרצה האחרונה.
- **תורם עם `IdName = 1908` ב-TbNameUSA:** רשומה נזרקת (זהה לזו ב-TbName).
- **תרומת USA עם `IdName` שמצביע לתורם שלא קיים:** תדולג ב-seedLegacyData (לוג: `⚠ Skipping donation - donor X not found`).
- **`Tro_Work` שהוא תואר אישי (Mr/Mrs וכו'):** לא נוצרת `Company`.

---

*מסמך זה משקף את מצב הקוד נכון ל-`src/server/convert-excel-to-seed.ts` עם התיקון האחרון של `LEGACY-` places ו-offset של USA.*
