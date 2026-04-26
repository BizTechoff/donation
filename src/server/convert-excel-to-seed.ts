import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// ── הגדרת קבצי המקור ─────────────────────────────────────────────
// קבצי ה-Excel מפוצלים לקבוצות - "רגיל" (מקור IL/העיקרי) ו-USA.
// סיבה: ה-IdName בקבצי ה-USA מתחיל מרצף נפרד שמתנגש עם ה-IdName בקבצים
// הרגילים (למשל IdName=3317 ב-TbName = מייקל בלאק, ב-TbNameUSA = יעקב עקשטיין
// - אנשים שונים). כדי למנוע התנגשות בזמן המיפוי donorMap.set(id, donor):
//   → ל-IdName בקבצי USA מוסיפים USA_ID_OFFSET
//   → פרט ל-IDs ב-SHARED_DONOR_IDS שהם אותו אדם בשני הקבצים (למשל 1908)
//     - אלה לא מקבלים offset; רשומת USA שלהם נזרקת (מי שמוזן הוא הרגיל).
const EXCELS_DIR              = path.join(__dirname, '../assets/excels')
const REGULAR_DONOR_FILES     = ['TbName.xlsx']
const USA_DONOR_FILES         = ['TbNameUSA.xlsx']
const REGULAR_DONATION_FILES  = ['TbTromot.xlsx']
const USA_DONATION_FILES      = ['TbTromotUSA.xlsx']
const USA_ID_OFFSET           = 100000
// IDs שמייצגים אותו אדם בשני הקבצים - לא עושים offset, ולא מזינים פעמיים.
const SHARED_DONOR_IDS        = new Set<number>([1908])

/**
 * Convert Excel files to seed-data.ts
 *
 * Field mappings:
 * Donors Excel -> Database:
 * - IdName -> legacyId (מזהה)
 * - ToarHeb -> title (תואר עברית)
 * - FirstNameHeb -> firstName (שם פרטי עברית)
 * - LastNameHeb -> lastName (שם משפחה עברית)
 * - Siomet -> suffix (סיומת)
 * - ToarEng -> titleEnglish (תואר אנגלית)
 * - FirstNameEng -> firstNameEnglish (שם פרטי אנגלית)
 * - LastNameEng -> lastNameEnglish (שם משפחה אנגלית)
 * - Pel -> mobile (נייד)
 * - TelNosaf -> additionalPhone (טלפון נוסף)
 * - Fax -> fax (פקס)
 * - Address -> address (כתובת)
 * - City -> city (עיר)
 * - Zip -> zip (מיקוד)
 * - Shchona -> neighborhood (שכונה)
 * - Home -> houseNumber (מספר בית)
 * - Country -> country (מדינה)
 * - TarichRishum -> createdDate (תאריך יצירה)
 * - Anash -> isAnash (אנ"ש)
 *
 * Donations Excel -> Database:
 * - Scom (or ScomChiyuv if empty) -> amount
 * - IdName -> donorLegacyId
 * - IdDiner -> campaignName
 * - Tarich -> donationDate
 * - IconMatbea/matbea -> currencyId (mapped to ISO code)
 * - TromaSiba -> reason
 * - Id -> excelDonationId
 * - Kabala -> receiptNumber (אסמכתא)
 * - AccountNo -> accountNumber (מספר חשבון) -> אם יש ערך זה העברה בנקאית
 * - Voucher_Co -> voucherNumber (מספר שובר) -> אם יש ערך זה תשלום עמותה
 * - Notes -> notes (הערות)
 * - Sort_Code -> bankName -> matched to bankId (שם בנק)
 * - Voucher_Co -> organizationName -> matched to organizationId (ארגון)
 * - Payment method: Voucher_Co = תשלום עמותה, AccountNo = העברה בנקאית, אחרת = מזומן (ברירת מחדל)
 */

interface DonorRow {
  [key: string]: any
}

interface DonationRow {
  [key: string]: any
}

function readExcelFile(filePath: string): any[] {
  try {
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' })
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return []
  }
}

// ─── Currency mapping ─────────────────────────────────────────────────────────

const ICON_MATBEA_MAP: Record<string, string> = {
  '₪': 'ILS', '$': 'USD', '€': 'EUR', '£': 'GBP', 'Fr': 'CHF', 'CAD': 'CAD',
}
const MATBEA_HEBREW_MAP: Record<string, string> = {
  'שקל': 'ILS', 'ש"ח': 'ILS', 'שח': 'ILS',
  'דולר': 'USD', 'יורו': 'EUR',
  'לירה שטרלינג': 'GBP', 'פרנק שוויצרי': 'CHF', 'דולר קנדי': 'CAD',
}
function mapCurrencyFromExcel(iconMatbea?: string, matbea?: string): string | null {
  if (iconMatbea?.trim()) return ICON_MATBEA_MAP[iconMatbea.trim()] ?? null
  if (matbea?.trim())     return MATBEA_HEBREW_MAP[matbea.trim()] ?? null
  return null
}

// ─── Country mapping (exact lookup — prevents UK→Ukraine false positive) ──────

const COUNTRY_EXCEL_TO_CODE: Record<string, string> = {
  'UK': 'GB', 'Scotland': 'GB',
  'Israel': 'IL', 'USA': 'US', 'Belgium': 'BE', 'Switzerland': 'CH',
  'Germany': 'DE', 'France': 'FR', 'Holland': 'NL', 'Netherlands': 'NL',
  'Austria': 'AT', 'Canada': 'CA', 'Australia': 'AU',
  'Ukraine': 'UA', 'Chicago': 'US',
}

/**
 * קורא מספר קבצי Excel מתיקיית EXCELS_DIR ומחזיר את כל השורות המאוחדות.
 * מודפס לוג של מספר שורות לכל קובץ לצורך שקיפות.
 */
function readExcelFiles(fileNames: string[]): any[] {
  return fileNames.flatMap(fileName => {
    const fullPath = path.join(EXCELS_DIR, fileName)
    if (!fs.existsSync(fullPath)) {
      console.warn(`  ⚠ File not found, skipping: ${fileName}`)
      return []
    }
    const rows = readExcelFile(fullPath)
    console.log(`  ✓ Read ${rows.length} rows from ${fileName}`)
    return rows
  })
}

/**
 * מנרמל שדות עם שמות אלטרנטיביים (רווח vs underscore וכו').
 * Voucher_Co (TbTromotUSA) vs Voucher co (TbTromot) - שניהם מצביעים על אותו שדה.
 * מבצעים את הנירמול פעם אחת בקריאה ואז כל קוד העיבוד שנמצא למטה רואה שם אחד בלבד.
 */
function normalizeDonationRow(row: any): any {
  if (row['Voucher_Co'] == null && row['Voucher co'] != null) {
    row['Voucher_Co'] = row['Voucher co']
  }
  if (row['Sort_Code'] == null && row['Sort Code'] != null) {
    row['Sort_Code'] = row['Sort Code']
  }
  return row
}

/**
 * מזהיר על כפילויות לפי keyField (ברירת מחדל IdName).
 * לתורמים: IdName (המזהה הראשי). לתרומות: Id (מזהה ייחודי של התרומה, לא של התורם).
 */
function warnDuplicates(rows: any[], label: string, keyField: string = 'IdName'): void {
  const seen = new Map<any, number>()
  for (const r of rows) {
    const id = r?.[keyField]
    if (id == null || id === '') continue
    seen.set(id, (seen.get(id) ?? 0) + 1)
  }
  const dups = [...seen.entries()].filter(([_, count]) => count > 1)
  if (dups.length > 0) {
    const preview = dups.slice(0, 5).map(([id, count]) => `${id}(x${count})`).join(', ')
    console.warn(`  ⚠ ${label}: נמצאו ${dups.length} כפילויות ${keyField} (5 ראשונות: ${preview})`)
  } else {
    console.log(`  ✓ ${label}: ללא כפילויות ${keyField}`)
  }
}

/**
 * מעביר שורת תורם מקובץ USA:
 *   - אם ה-IdName ב-SHARED_DONOR_IDS: מחזיר null (הרשומה נזרקת - יש רשומה זהה בקובץ הרגיל).
 *   - אחרת: מוסיף USA_ID_OFFSET ל-IdName ומחזיר את השורה המעודכנת.
 */
function offsetUsaDonorRow(row: any): any | null {
  const rawId = Number(row['IdName'])
  if (Number.isFinite(rawId) && SHARED_DONOR_IDS.has(rawId)) {
    return null
  }
  if (!Number.isFinite(rawId)) return row
  return { ...row, IdName: rawId + USA_ID_OFFSET }
}

/**
 * מעביר שורת תרומה מקובץ USA:
 *   - אם IdName ב-SHARED_DONOR_IDS: לא מזיזים (התרומה תתחבר לתורם הרגיל).
 *   - אחרת: מוסיפים USA_ID_OFFSET (כדי שתתחבר לתורם ה-USA שקיבל offset).
 */
function offsetUsaDonationRow(row: any): any {
  const rawId = Number(row['IdName'])
  if (!Number.isFinite(rawId)) return row
  if (SHARED_DONOR_IDS.has(rawId)) return row
  return { ...row, IdName: rawId + USA_ID_OFFSET }
}

/**
 * Clean email address - take only the first part before '#'
 * Example: "abingo@juno.com#mailto:abingo@juno.com#" -> "abingo@juno.com"
 */
function cleanEmail(email: string): string {
  if (!email) return ''
  return email.split('#')[0].trim()
}

/**
 * Convert Excel serial date to JavaScript Date
 * Excel stores dates as numbers (days since 1900-01-01)
 */
function excelDateToJSDate(excelDate: any): Date | null {
  // If already a valid date string, parse it
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  }

  // If it's a number (Excel serial date)
  if (typeof excelDate === 'number') {
    // Excel date starts from 1900-01-01, but Excel incorrectly treats 1900 as a leap year
    // So dates after Feb 28, 1900 need adjustment
    const excelEpoch = new Date(1899, 11, 30) // December 30, 1899
    const jsDate = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000)
    return jsDate
  }

  return null
}

function processDonors(rows: DonorRow[]): any[] {
  return rows.map((row, index) => {
    try {
      const donor: any = {
        legacyId: row['IdName'] || index + 1,
        excelDonorId: String(row['IdName'] || ''),
        // Hebrew names
        title: row['ToarHeb'] || '',
        firstName: row['FirstNameHeb'] || '',
        lastName: row['LastNameHeb'] || '',
        suffix: row['Siomet'] || '',
        // English names
        titleEnglish: row['ToarEng'] || '',
        firstNameEnglish: row['FirstNameEng'] || '',
        lastNameEnglish: row['LastNameEng'] || '',
        // Flags
        isAnash: row['Anash'] === true || row['Anash'] === 'true' || row['Anash'] === 1,
        wantsUpdates: true,
        createdDate: row['TarichRishum'] ? (excelDateToJSDate(row['TarichRishum']) || new Date()).toISOString() : new Date().toISOString(),
        notes: row['Notes'] || '',
        // Relationships
        fatherLegacyId: row['KodAv'] || null,
        fatherInLawLegacyId: row['KodChoten'] || null
      }

      // Addresses array
      donor.addresses = []

      // Home address (בית)
      if (row['Address'] || row['City'] || row['Country']) {
        donor.addresses.push({
          type: 'בית',
          description: row['NameHome'] || '',
          street: row['Address'] || '',
          houseNumber: row['Home'] || '',
          apartment: row['Dira'] || '',
          city: row['City'] || '',
          state: row['State'] || '',
          zip: row['Zip'] || '',
          zip2: row['Zip2'] || '',
          neighborhood: row['Shchona'] || '',
          country: row['Country'] || ''
        })
      }

      // Work address (עבודה) or Shtibl (שטיבלך)
      if (row['AddressWork'] || row['CityWork']) {
        const msShtibl = row['MsShtibl'] || 0
        const addressType = msShtibl > 0 ? 'שטיבלך' : 'עבודה'
        const description = row['Work'] || ''
        const fullDescription = msShtibl > 0 ? `${description} (מס' שטיבלך: ${msShtibl})` : description

        donor.addresses.push({
          type: addressType,
          description: fullDescription,
          street: row['AddressWork'] || '',
          houseNumber: row['HomeWork'] || '',
          apartment: row['DiraWork'] || '',
          city: row['CityWork'] || '',
          state: row['StateWork'] || '',
          zip: row['ZipWork'] || '',
          country: ''
        })
      }

      // Contacts array
      donor.contacts = []

      // Phone contacts
      if (row['Tel']) {
        donor.contacts.push({ type: 'phone', value: row['Tel'], label: 'טלפון', isPrimary: true })
      }
      if (row['Pel']) {
        donor.contacts.push({ type: 'phone', value: row['Pel'], label: 'נייד', isPrimary: !row['Tel'] })
      }
      if (row['TelNosaf']) {
        donor.contacts.push({ type: 'phone', value: row['TelNosaf'], label: 'טלפון נוסף', isPrimary: false })
      }
      if (row['Fax']) {
        donor.contacts.push({ type: 'phone', value: row['Fax'], label: 'פקס', isPrimary: false })
      }

      // Email contacts
      if (row['Email']) {
        const cleanedEmail = cleanEmail(row['Email'])
        if (cleanedEmail) {
          donor.contacts.push({ type: 'email', value: cleanedEmail, label: 'אימייל', isPrimary: true })
        }
      }
      if (row['EmailHome']) {
        const cleanedEmailHome = cleanEmail(row['EmailHome'])
        if (cleanedEmailHome) {
          donor.contacts.push({ type: 'email', value: cleanedEmailHome, label: 'אימייל בבית', isPrimary: !row['Email'] })
        }
      }

      // Company information
      if (row['Tro_Work']) {
        donor.company = {
          name: row['Tro_Work'] || '',
          address: row['Tro_AddressWork'] || '',
          cityAndZip: row['Tro_FullCity'] || ''
        }
      }

      return donor
    } catch (error) {
      console.error(`Error processing donor row ${index}:`, error)
      return null
    }
  }).filter(d => d !== null)
}

function processDonations(rows: DonationRow[]): any[] {
  let skippedNoDonor = 0
  let skippedNoAmount = 0
  const result = rows.map((row, index) => {
    try {
      // Get amount from Scom, if amount is 0 or empty, use ScomChiyuv
      let amount = row['Scom'] || 0
      if (amount === 0) {
        amount = row['ScomChiyuv'] || 0
      }

      // Skip if no valid donor ID
      if (!row['IdName'] || row['IdName'] === 0) {
        skippedNoDonor++
        return null
      }

      // Skip if no valid amount (both Scom and ScomChiyuv are 0 or empty)
      if (!amount || amount === 0) {
        skippedNoAmount++
        return null
      }

      // Determine payment method based on Excel fields
      let paymentMethod = 'מזומן' // ברירת מחדל
      if (row['Voucher_Co']) {
        paymentMethod = 'תשלום עמותה'
      } else if (row['AccountNo']) {
        paymentMethod = 'העברה בנקאית'
      }

      const donation: any = {
        donorLegacyId: row['IdName'],
        excelDonationId: String(row['Id'] || ''),
        amount: Number(amount),
        currencyId: mapCurrencyFromExcel(row['IconMatbea'], row['matbea']) ?? 'ILS',
        donationDate: row['Tarich'] ? (excelDateToJSDate(row['Tarich']) || new Date()).toISOString() : new Date().toISOString(),
        campaignName: row['IdDiner'] || '',
        paymentMethod: paymentMethod,
        voucherNumber: row['Voucher_Co'] || '',
        accountNumber: row['AccountNo'] || '',
        receiptNumber: row['Kabala'] || '',
        notes: row['Notes'] || '',
        reason: row['TromaSiba'] || '',
        bankName: row['Sort_Code'] || '',
        organizationName: row['Voucher_Co'] ? (row['Voucher_Co']) : '',
        isExceptional: row['Hachragtit'] === true || row['Hachragtit'] === 1,
        isUrgent: row['Dachuf'] === true || row['Dachuf'] === 1,
        receiptIssued: row['KabalaMatsa'] === true || row['KabalaMatsa'] === 1
      }

      // Company information from donation record
      // Only if Tro_Work is a company name (not a personal title like Mr/Mrs/Rabbi)
      if (row['Tro_Work']) {
        const troWork = String(row['Tro_Work']).trim()
        const personalTitles = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Rabbi', 'Reb', 'הרב', 'הרה"ח', 'ר\'', 'מר', 'גב\'', 'גברת']
        const isPersonalTitle = personalTitles.some(title =>
          troWork.startsWith(title + ' ') ||
          troWork.startsWith(title + '.') ||
          troWork === title
        )

        if (!isPersonalTitle) {
          donation.company = {
            name: troWork,
            address: row['Tro_AddressWork'] || '',
            city: row['Tro_FullCity'] || row['Tro_FullCityWork'] || ''
          }
        }
      }

      return donation
    } catch (error) {
      console.error(`Error processing donation row ${index}:`, error)
      return null
    }
  }).filter(d => d !== null)

  if (skippedNoDonor > 0) {
    console.log(`  ℹ Skipped ${skippedNoDonor} donations without valid donor ID`)
  }
  if (skippedNoAmount > 0) {
    console.log(`  ℹ Skipped ${skippedNoAmount} donations without valid amount (both Scom and ScomChiyuv empty)`)
  }

  return result
}

async function convertExcelToSeed() {
  console.log('Converting Excel files to seed-data.ts...\n')
  console.log(`Source dir: ${EXCELS_DIR}`)

  // ─── Donors (רגיל + USA עם offset) ──────────────────────────────
  console.log(`\nReading donor files (${REGULAR_DONOR_FILES.length + USA_DONOR_FILES.length}):`)
  const regularDonorRows = readExcelFiles(REGULAR_DONOR_FILES)
  const usaDonorRowsRaw  = readExcelFiles(USA_DONOR_FILES)
  const usaDonorRows     = usaDonorRowsRaw.map(offsetUsaDonorRow).filter((r): r is any => r !== null)
  const usaDonorsSkipped = usaDonorRowsRaw.length - usaDonorRows.length
  if (usaDonorsSkipped > 0) {
    console.log(`  ℹ USA donors skipped (shared with regular): ${usaDonorsSkipped}`)
  }
  console.log(`  ℹ USA donors offset by +${USA_ID_OFFSET}: ${usaDonorRows.length}`)
  const donorRows = [...regularDonorRows, ...usaDonorRows]
  console.log(`Total donor rows: ${donorRows.length}`)
  warnDuplicates(donorRows, 'Donors', 'IdName')

  // ─── Donations (רגיל + USA עם offset תואם) ──────────────────────
  console.log(`\nReading donation files (${REGULAR_DONATION_FILES.length + USA_DONATION_FILES.length}):`)
  const regularDonationRows = readExcelFiles(REGULAR_DONATION_FILES)
  const usaDonationRows     = readExcelFiles(USA_DONATION_FILES).map(offsetUsaDonationRow)
  console.log(`  ℹ USA donations offset by +${USA_ID_OFFSET}: ${usaDonationRows.length}`)
  const donationRows = [...regularDonationRows, ...usaDonationRows].map(normalizeDonationRow)
  console.log(`Total donation rows: ${donationRows.length}`)
  // בתרומות - המזהה הייחודי הוא Id (לא IdName, שהוא ה-donorId FK)
  warnDuplicates(donationRows, 'Donations', 'Id')

  // ─── Process data ────────────────────────────────────────────
  console.log('\nProcessing donors...')
  const donors = processDonors(donorRows)
  console.log(`Processed ${donors.length} donors`)

  console.log('\nProcessing donations...')
  const donations = processDonations(donationRows)
  console.log(`Processed ${donations.length} donations`)

  // Generate seed-data.ts content
  const output = `import { remult, withRemult } from 'remult'
import { createPostgresConnection } from 'remult/postgres'
import {
  Donor,
  Donation,
  Campaign,
  DonorPlace,
  DonorContact,
  Place,
  Country,
  DonationMethod,
  DonorAddressType,
  Company,
  User
} from '../shared/entity'
import { entities } from './api'

/**
 * Legacy data imported from Excel files
 * Generated on: ${new Date().toISOString()}
 * Total donors: ${donors.length}
 * Total donations: ${donations.length}
 *
 * Field mappings:
 * Donors Excel -> Database:
 * - IdName -> legacyId (מזהה)
 * - ToarHeb -> title (תואר עברית)
 * - FirstNameHeb -> firstName (שם פרטי עברית)
 * - LastNameHeb -> lastName (שם משפחה עברית)
 * - Siomet -> suffix (סיומת)
 * - ToarEng -> titleEnglish (תואר אנגלית)
 * - FirstNameEng -> firstNameEnglish (שם פרטי אנגלית)
 * - LastNameEng -> lastNameEnglish (שם משפחה אנגלית)
 * - Pel -> mobile (נייד)
 * - TelNosaf -> additionalPhone (טלפון נוסף)
 * - Fax -> fax (פקס)
 * - Address -> address (כתובת)
 * - City -> city (עיר)
 * - Zip -> zip (מיקוד)
 * - Shchona -> neighborhood (שכונה)
 * - Home -> houseNumber (מספר בית)
 * - Country -> country (מדינה)
 * - TarichRishum -> registrationDate (תאריך רישום)
 * - Anash -> isAnash (אנ"ש)
 *
 * Donations Excel -> Database:
 * - Scom (or ScomChiyuv if empty) -> amount
 * - IdName -> donorLegacyId
 * - IdDiner -> campaignName
 * - Tarich -> donationDate
 * - IconMatbea/matbea -> currencyId (mapped to ISO code)
 * - TromaSiba -> reason
 * - Id -> excelDonationId
 * - Kabala -> receiptNumber (אסמכתא)
 * - AccountNo -> accountNumber (מספר חשבון) -> אם יש ערך זה העברה בנקאית
 * - Voucher_Co -> voucherNumber (מספר שובר) -> אם יש ערך זה תשלום עמותה
 * - Payment method: Voucher_Co = תשלום עמותה, AccountNo = העברה בנקאית
 */

// Donors data
const DONORS_DATA = ${JSON.stringify(donors, null, 2)}

// Donations data
const DONATIONS_DATA = ${JSON.stringify(donations, null, 2)}

export async function seedLegacyData() {
  try {
    console.log('Starting legacy data import...')
    console.log(\`Importing \${DONORS_DATA.length} donors and \${DONATIONS_DATA.length} donations\`)

    // Delete existing data in correct order (foreign key constraints)
    console.log('\\nDeleting existing donations...')
    const donationRepo = remult.repo(Donation)
    const existingDonations = await donationRepo.find()
    for (const donation of existingDonations) {
      await donationRepo.delete(donation)
    }
    console.log(\`  ✓ Deleted \${existingDonations.length} existing donations\`)

    console.log('\\nDeleting existing donor contacts...')
    const donorContactRepo = remult.repo(DonorContact)
    const existingContacts = await donorContactRepo.find()
    for (const contact of existingContacts) {
      await donorContactRepo.delete(contact)
    }
    console.log(\`  ✓ Deleted \${existingContacts.length} existing donor contacts\`)

    console.log('\\nDeleting existing donor places...')
    const donorPlaceRepo = remult.repo(DonorPlace)
    const existingPlaces = await donorPlaceRepo.find()
    for (const place of existingPlaces) {
      await donorPlaceRepo.delete(place)
    }
    console.log(\`  ✓ Deleted \${existingPlaces.length} existing donor places\`)

    console.log('\\nDeleting existing legacy places (donor addresses only)...')
    const placeRepo = remult.repo(Place)
    // מוחקים רק Places שנוצרו ב-seed הזה (placeId מתחיל ב-'LEGACY-').
    // לא נוגעים ב-Places של ארגונים/בנקים שנוצרו ע"י seed-infrastructure.
    const allPlaces = await placeRepo.find()
    const legacyPlaces = allPlaces.filter(p => (p.placeId || '').startsWith('LEGACY-'))
    for (const place of legacyPlaces) {
      await placeRepo.delete(place)
    }
    console.log(\`  ✓ Deleted \${legacyPlaces.length} legacy donor places (kept \${allPlaces.length - legacyPlaces.length} infrastructure places)\`)

    console.log('\\nDeleting existing donors...')
    const donorRepo = remult.repo(Donor)
    const existingDonors = await donorRepo.find()
    for (const donor of existingDonors) {
      await donorRepo.delete(donor)
    }
    console.log(\`  ✓ Deleted \${existingDonors.length} existing donors\`)

    console.log('\\nDeleting existing companies...')
    const companyRepo = remult.repo(Company)
    const existingCompanies = await companyRepo.find()
    for (const company of existingCompanies) {
      await companyRepo.delete(company)
    }
    console.log(\`  ✓ Deleted \${existingCompanies.length} existing companies\`)

    // Get or create address types
    console.log('\\nCreating address types...')
    const addressTypeRepo = remult.repo(DonorAddressType)
    const addressTypes = new Map<string, DonorAddressType>()

    for (const typeName of ['בית', 'עבודה', 'שטיבלך']) {
      let addressType = await addressTypeRepo.findFirst({ name: typeName })
      if (!addressType) {
        addressType = addressTypeRepo.create({ name: typeName, isActive: true })
        await addressType.save()
      }
      addressTypes.set(typeName, addressType)
    }
    console.log(\`  ✓ Created/found \${addressTypes.size} address types\`)

    // Import donors
    console.log('\\nImporting donors...')
    const donorMap = new Map<string, Donor>()
    const companyMap = new Map<string, Company>()
    let addressCount = 0
    let contactCount = 0
    let companyCount = 0
    let countryMatchCount = 0

    // Get all countries for matching
    const { Country } = await import('../shared/entity')
    const countryRepo = remult.repo(Country)
    const allCountries = await countryRepo.find()
    console.log(\`  ✓ Found \${allCountries.length} countries for matching\`)

    for (const donorData of DONORS_DATA) {
      try {
        // Handle empty names
        const firstName = donorData.firstName?.trim() || donorData.lastName || 'לא ידוע'
        const lastName = donorData.lastName?.trim() || donorData.firstName || 'לא ידוע'

        // Create donor
        const donor = donorRepo.create({
          legacyId: donorData.legacyId,
          idNumber: \`LEGACY-\${donorData.legacyId}\`,
          excelDonorId: donorData.excelDonorId || '',
          title: donorData.title || '',
          firstName: firstName,
          lastName: lastName,
          suffix: donorData.suffix || '',
          titleEnglish: donorData.titleEnglish || '',
          firstNameEnglish: donorData.firstNameEnglish || '',
          lastNameEnglish: donorData.lastNameEnglish || '',
          isAnash: donorData.isAnash || false,
          wantsUpdates: donorData.wantsUpdates !== false,
          createdDate: new Date(donorData.createdDate),
          notes: donorData.notes || ''
        })
        await donor.save()
        donorMap.set(String(donorData.legacyId), donor)

        // Create addresses (DonorPlace)
        if (donorData.addresses && Array.isArray(donorData.addresses)) {
          for (const addressData of donorData.addresses) {
            if (!addressData.street && !addressData.city && !addressData.country) continue

            const addressType = addressTypes.get(addressData.type)
            if (!addressType) continue

            // Find matching country — lookup table first (prevents UK→Ukraine false positive)
            let matchedCountry = null
            if (addressData.country) {
              const excelCountry  = addressData.country.trim()
              const expectedCode  = COUNTRY_EXCEL_TO_CODE[excelCountry]

              if (expectedCode) {
                // Exact code lookup — no ambiguity
                matchedCountry = allCountries.find(c =>
                  (c.code?.toUpperCase() ?? '') === expectedCode
                )
              } else {
                // Fallback: exact match on Hebrew name, ISO code, or English name
                const countryNameClean = excelCountry.toLowerCase()
                matchedCountry = allCountries.find(country => {
                  const countryToMatch  = country.name.trim().toLowerCase()
                  const codeToMatch     = country.code?.trim().toLowerCase() || ''
                  const nameEnToMatch   = country.nameEn?.trim().toLowerCase() || ''
                  return countryToMatch === countryNameClean ||
                         codeToMatch    === countryNameClean ||
                         nameEnToMatch  === countryNameClean
                })
              }

              if (matchedCountry) {
                countryMatchCount++
              }
            }

            // Create Place first (simplified version - not using Google Places API)
            const placeRepo = remult.repo(Place)
            const place = placeRepo.create({
              placeId: \`LEGACY-\${donorData.legacyId}-\${addressData.type}\`,
              fullAddress: [
                addressData.street,
                addressData.houseNumber,
                addressData.apartment,
                addressData.city,
                addressData.country
              ].filter(x => x).join(', '),
              placeName: addressData.description || '',
              street: addressData.street || '',
              houseNumber: addressData.houseNumber || '',
              apartment: addressData.apartment || '',
              neighborhood: addressData.neighborhood || '',
              city: addressData.city || '',
              state: addressData.state || '',
              postcode: addressData.zip || '',
              countryId: matchedCountry?.id || ''
            })
            await placeRepo.save(place)

            // Create DonorPlace
            const donorPlace = donorPlaceRepo.create({
              donor: donor,
              place: place,
              addressType: addressType,
              description: addressData.description || '',
              isPrimary: addressData.type === 'בית',
              isActive: true
            })
            await donorPlace.save()
            addressCount++
          }
        }

        // Create contacts (DonorContact)
        if (donorData.contacts && Array.isArray(donorData.contacts)) {
          for (const contactData of donorData.contacts) {
            if (!contactData.value) continue

            const contact = donorContactRepo.create({
              donor: donor,
              type: contactData.type,
              phoneNumber: contactData.type === 'phone' ? contactData.value : '',
              email: contactData.type === 'email' ? contactData.value : '',
              description: contactData.label || '',
              isPrimary: contactData.isPrimary || false,
              isActive: true
            })
            await contact.save()
            contactCount++
          }
        }

        // Create company and link to donor
        if (donorData.company && donorData.company.name) {
          const companyData = donorData.company
          const companyKey = \`\${companyData.name}-\${companyData.address}-\${companyData.cityAndZip}\`

          let company = companyMap.get(companyKey)
          if (!company) {
            company = companyRepo.create({
              name: companyData.name,
              address: companyData.address,
              city: companyData.cityAndZip,
              isActive: true
            })
            await company.save()
            companyMap.set(companyKey, company)
            companyCount++
          }

          // Link company to donor
          if (donor.id && company.id) {
            donor.companyIds = [company.id]
            await donor.save()
          }
        }
      } catch (error: any) {
        console.error(\`  ✗ Error importing donor \${donorData.legacyId}:\`, error.message || error)
      }
    }
    console.log(\`  ✓ Imported \${donorMap.size} donors\`)
    console.log(\`  ✓ Matched \${countryMatchCount} addresses to countries\`)
    console.log(\`  ✓ Created \${addressCount} donor addresses\`)
    console.log(\`  ✓ Created \${contactCount} donor contacts\`)
    console.log(\`  ✓ Created \${companyCount} unique companies\`)

    // Import donations and companies
    console.log('\\nImporting donations...')

    // Create or get payment methods
    const donationMethodRepo = remult.repo(DonationMethod)
    const paymentMethods = new Map<string, DonationMethod>()

    const methodNames = ['מזומן', 'תשלום עמותה', 'העברה בנקאית']
    for (const methodName of methodNames) {
      let method = await donationMethodRepo.findFirst({ name: methodName })
      if (!method) {
        method = donationMethodRepo.create({
          name: methodName,
          isActive: true
        })
        await method.save()
      }
      paymentMethods.set(methodName, method)
    }
    console.log(\`  ✓ Created/found \${paymentMethods.size} payment methods\`)

    // Get all banks for matching
    const { Bank } = await import('../shared/entity')
    const bankRepo = remult.repo(Bank)
    const allBanks = await bankRepo.find()
    console.log(\`  ✓ Found \${allBanks.length} banks for matching\`)

    // Get all organizations for matching
    const { Organization } = await import('../shared/entity')
    const organizationRepo = remult.repo(Organization)
    const allOrganizations = await organizationRepo.find()
    console.log(\`  ✓ Found \${allOrganizations.length} organizations for matching\`)

    let donationCount = 0
    let donationCompanyCount = 0
    let bankMatchCount = 0
    let organizationMatchCount = 0

    for (const donationData of DONATIONS_DATA) {
      try {
        const donor = donorMap.get(String(donationData.donorLegacyId))
        if (!donor) {
          console.log(\`  ⚠ Skipping donation - donor \${donationData.donorLegacyId} not found\`)
          continue
        }

        const paymentMethod = paymentMethods.get(donationData.paymentMethod)
        if (!paymentMethod) {
          console.log(\`  ⚠ Skipping donation - payment method '\${donationData.paymentMethod}' not found\`)
          continue
        }

        // Create company if exists in donation data and link to donor
        if (donationData.company && donationData.company.name && donor.id) {
          const companyData = donationData.company
          const companyKey = \`\${companyData.name}-\${companyData.address}-\${companyData.city}\`

          let company = companyMap.get(companyKey)
          if (!company) {
            company = companyRepo.create({
              name: companyData.name,
              address: companyData.address,
              city: companyData.city,
              isActive: true
            })
            await company.save()
            companyMap.set(companyKey, company)
            companyCount++
          }

          // Link company to donor if not already linked
          if (company.id && (!donor.companyIds || !donor.companyIds.includes(company.id))) {
            donor.companyIds = [...(donor.companyIds || []), company.id]
            await donor.save()
            donationCompanyCount++
          }
        }

        // Skip if amount is 0 or empty
        if (!donationData.amount || donationData.amount === 0) {
          console.log(\`  ⚠ Skipping donation - amount is empty or zero\`)
          continue
        }

        // Find matching bank by name (case insensitive, trim, remove "Bank" suffix)
        let matchedBank = null
        if (donationData.bankName) {
          const bankNameClean = donationData.bankName.trim().toLowerCase()
            .replace(/\\s+bank\\s*$/i, '')
            .replace(/^bank\\s+/i, '')
            .trim()

          matchedBank = allBanks.find(bank => {
            const bankNameToMatch = bank.name.trim().toLowerCase()
              .replace(/\\s+bank\\s*$/i, '')
              .replace(/^bank\\s+/i, '')
              .trim()
            return bankNameToMatch === bankNameClean ||
                   bankNameToMatch.includes(bankNameClean) ||
                   bankNameClean.includes(bankNameToMatch)
          })

          if (matchedBank) {
            bankMatchCount++
          }
        }

        // Find matching organization by voucher number or name
        let matchedOrganization = null
        if (donationData.organizationName) {
          const orgNameClean = donationData.organizationName.trim().toLowerCase()
          matchedOrganization = allOrganizations.find(org =>
            org.name.trim().toLowerCase() === orgNameClean ||
            org.name.trim().toLowerCase().includes(orgNameClean) ||
            orgNameClean.includes(org.name.trim().toLowerCase())
          )

          if (matchedOrganization) {
            organizationMatchCount++
          }
        }

        const donation = donationRepo.create({
          donor: donor,
          amount: donationData.amount,
          currencyId: donationData.currencyId || 'ILS',
          excelDonationId: donationData.excelDonationId || '',
          donationDate: new Date(donationData.donationDate),
          donationMethod: paymentMethod,
          receiptNumber: donationData.receiptNumber || '',
          accountNumber: donationData.accountNumber || '',
          voucherNumber: donationData.voucherNumber || '',
          notes: donationData.notes || '',
          reason: donationData.reason || '',
          bankId: matchedBank?.id || '',
          organizationId: matchedOrganization?.id || '',
          isExceptional: donationData.isExceptional || false,
          isUrgent: donationData.isUrgent || false,
          receiptIssued: donationData.receiptIssued || false
        })
        await donation.save()
        donationCount++
      } catch (error: any) {
        console.error(\`  ✗ Error importing donation:\`, error.message || error)
      }
    }
    console.log(\`  ✓ Imported \${donationCount} donations\`)
    console.log(\`  ✓ Linked \${donationCompanyCount} companies to donors from donations\`)
    console.log(\`  ✓ Matched \${bankMatchCount} donations to banks\`)
    console.log(\`  ✓ Matched \${organizationMatchCount} donations to organizations\`)

    console.log('\\nLegacy data import completed successfully!')
    console.log(\`Summary: \${donorMap.size} donors, \${donationCount} donations\`)
  } catch (error) {
    console.error('Error importing legacy data:', error)
    throw error
  }
}

// Run if called directly
if (typeof module !== 'undefined' && require.main === module) {
  const dataProvider = createPostgresConnection({
    configuration: 'heroku',
    sslInDev: !(process.env['DEV_MODE'] === 'DEV')
  })

  withRemult(async () => {
    await seedLegacyData()
  }, {
    dataProvider,
    entities
  })
    .then(() => {
      console.log('\\nDone!')
      process.exit(0)
    })
    .catch(err => {
      console.error('\\nError:', err)
      process.exit(1)
    })
}
`

  // Write to file
  const outputFile = path.join(__dirname, 'seed-data.ts')
  fs.writeFileSync(outputFile, output, 'utf-8')

  console.log(`\n✅ Successfully generated ${outputFile}`)
  console.log(`\nStatistics:`)
  console.log(`- ${donors.length} donors`)
  console.log(`- ${donations.length} donations`)
}

// Run conversion
if (require.main === module) {
  convertExcelToSeed()
    .then(() => {
      console.log('\n✅ Conversion completed!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Conversion failed:', error)
      process.exit(1)
    })
}
