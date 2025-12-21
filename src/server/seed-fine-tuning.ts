import { remult, withRemult } from 'remult'
import { createPostgresConnection } from 'remult/postgres'
import * as XLSX from 'xlsx'
import * as path from 'path'
import {
  Donor,
  Donation,
  Campaign,
  User
} from '../shared/entity'
import { entities } from './api'

/**
 * Fine-tuning existing data
 * מטרה: עיבוד נתונים קיימים ועדכון שדות חסרים
 *
 * שלב 1: יצירת קמפיינים מתוך Magbit ו-IdDiner בתרומות
 * - קורא את נתוני התרומות מאקסל המקורי
 * - מזהה ערכים בשדה Magbit (שנה עברית) ו-IdDiner (קוד קמפיין)
 * - יוצר קמפיין חדש בשם "דינער - [שנה] - [קוד]"
 * - מעדכן את התרומות בפלטפורמת עם ה-campaign.id החדש
 */

interface ExcelDonationRow {
  IdName?: string | number      // מזהה תורם
  Scom?: string | number         // סכום
  ScomChiyuv?: string | number   // סכום חיוב
  Tarich?: string | number       // תאריך
  matbea?: string                // מטבע
  IdDiner?: string | number      // קוד קמפיין
  Magbit?: string | number       // שנה עברית
  Kabala?: string                // אסמכתא
  AccountNo?: string             // מספר חשבון
  Voucher_Co?: string            // מספר שובר
  [key: string]: any
}

interface CampaignInfo {
  year: string        // שנה עברית מ-Magbit
  code: string        // קוד מ-IdDiner
  fullName: string    // "דינער - תשפג - 1181"
}

// פונקציה לקריאת נתוני התרומות מאקסל המקורי
function loadDonationsFromExcel(): ExcelDonationRow[] {
  const excelPath = path.join(__dirname, '..', 'assets', 'excels', 'טבלת תרומות.xlsx')
  console.log(`📖 קורא אקסל מ: ${excelPath}`)

  const workbook = XLSX.readFile(excelPath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // המרה ל-JSON
  const data: ExcelDonationRow[] = XLSX.utils.sheet_to_json(worksheet)

  return data
}

// פונקציה לחילוץ מידע על קמפיינים
function extractCampaignInfo(row: ExcelDonationRow): CampaignInfo | null {
  const magbit = row.Magbit ? String(row.Magbit).trim() : ''
  const idDiner = row.IdDiner ? String(row.IdDiner).trim() : ''

  // אם יש Magbit (שנה עברית) ו-IdDiner (קוד)
  if (magbit && idDiner) {
    return {
      year: magbit,
      code: idDiner,
      fullName: `דינער - ${magbit} - ${idDiner}`
    }
  }

  // אם יש רק IdDiner ללא Magbit
  if (idDiner) {
    return {
      year: '',
      code: idDiner,
      fullName: `דינער - ${idDiner}`
    }
  }

  return null
}

async function fineTuneCampaigns(excelData: ExcelDonationRow[]) {
  console.log('🔧 התחלת fine-tuning של קמפיינים...')

  // Step 1: איסוף כל הקמפיינים הייחודיים
  const campaignInfoMap = new Map<string, CampaignInfo>() // מפה מ-fullName למידע על הקמפיין

  for (const row of excelData) {
    const campaignInfo = extractCampaignInfo(row)
    if (campaignInfo) {
      campaignInfoMap.set(campaignInfo.fullName, campaignInfo)
    }
  }

  console.log(`✅ נמצאו ${campaignInfoMap.size} קמפיינים ייחודיים`)
  console.log('📋 שמות הקמפיינים:')
  Array.from(campaignInfoMap.values())
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .forEach(info => console.log(`   - ${info.fullName}`))

  // Step 2: יצירת קמפיינים חדשים
  const campaignMap = new Map<string, string>() // מפה מ-fullName ל-campaign.id

  for (const campaignInfo of Array.from(campaignInfoMap.values())) {
    // בדיקה אם הקמפיין כבר קיים
    const existingCampaigns = await remult.repo(Campaign).find({
      where: { name: campaignInfo.fullName },
      limit: 1
    })

    if (existingCampaigns.length > 0) {
      const existingCampaign = existingCampaigns[0]
      console.log(`⏭️  קמפיין "${existingCampaign.name}" כבר קיים`)
      campaignMap.set(campaignInfo.fullName, existingCampaign.id)
      continue
    }

    // יצירת קמפיין חדש
    const campaign = remult.repo(Campaign).create()
    campaign.name = campaignInfo.fullName
    campaign.description = `קמפיין דינער ${campaignInfo.year ? `לשנת ${campaignInfo.year}` : ''} קוד ${campaignInfo.code}`.trim()
    campaign.campaignType = 'דינער'
    campaign.isActive = false
    campaign.startDate = new Date()
    campaign.currency = 'ILS'
    campaign.targetAmount = 0
    campaign.raisedAmount = 0
    campaign.createdById = '' // נשאיר ריק

    await campaign.save()
    campaignMap.set(campaignInfo.fullName, campaign.id)

    console.log(`✅ נוצר קמפיין: "${campaign.name}" (ID: ${campaign.id})`)
  }

  console.log(`\n📈 סיכום יצירת קמפיינים:`)
  console.log(`   - נוצרו ${campaignMap.size} קמפיינים`)

  return campaignMap
}

async function updateDonationsWithCampaigns(
  campaignMap: Map<string, string>,
  excelData: ExcelDonationRow[]
) {
  console.log('\n🔧 מעדכן תרומות עם מזהי קמפיינים...')

  let updatedCount = 0
  let skippedCount = 0

  // עבור על כל התרומות בנתונים המקוריים
  for (const row of excelData) {
    const campaignInfo = extractCampaignInfo(row)

    // דלג אם אין מידע על קמפיין
    if (!campaignInfo) {
      skippedCount++
      continue
    }

    const campaignId = campaignMap.get(campaignInfo.fullName)

    if (!campaignId) {
      console.warn(`⚠️  לא נמצא ID קמפיין עבור: ${campaignInfo.fullName}`)
      skippedCount++
      continue
    }

    // חיפוש התרומה במערכת
    const amount = Number(row.Scom || row.ScomChiyuv || 0)

    if (amount === 0) {
      skippedCount++
      continue
    }

    // המרת תאריך
    let donationDate: Date | undefined
    if (row.Tarich) {
      if (typeof row.Tarich === 'number') {
        // תאריך אקסל (מספר ימים מ-1900)
        const parsed = XLSX.SSF.parse_date_code(row.Tarich)
        donationDate = new Date(parsed.y, parsed.m - 1, parsed.d)
      } else {
        donationDate = new Date(row.Tarich)
      }
    }

    // חיפוש התרומה לפי סכום ותאריך (ללא campaignId כבר קיים)
    const whereClause: any = {
      amount: amount
    }

    // רק אם יש תאריך
    if (donationDate) {
      whereClause.donationDate = donationDate
    }

    // רק תרומות ללא קמפיין (כדי לא לעדכן פעמיים)
    whereClause.campaignId = ['', null]

    const donations = await remult.repo(Donation).find({
      where: whereClause,
      limit: 1
    })

    if (donations.length === 0) {
      skippedCount++
      continue
    }

    const donation = donations[0]

    // עדכון התרומה עם ה-campaignId
    donation.campaignId = campaignId
    await donation.save()
    updatedCount++

    if (updatedCount % 50 === 0) {
      console.log(`   ✓ עודכנו ${updatedCount} תרומות...`)
    }
  }

  console.log(`\n📈 סיכום עדכון תרומות:`)
  console.log(`   - עודכנו: ${updatedCount} תרומות`)
  console.log(`   - דולגו: ${skippedCount} תרומות`)

  return updatedCount
}

async function fineTuning() {
  console.log('🚀 התחלת תהליך Fine-Tuning')
  console.log('=' .repeat(50))

  try {
    // קריאת נתוני התרומות מהאקסל המקורי
    console.log('📖 קורא נתוני תרומות מאקסל המקורי...')
    const excelData = loadDonationsFromExcel()
    console.log(`📊 נמצאו ${excelData.length} שורות באקסל\n`)

    // שלב 1: יצירת קמפיינים מ-Magbit ו-IdDiner
    const campaignMap = await fineTuneCampaigns(excelData)

    // שלב 2: עדכון תרומות עם מזהי הקמפיינים
    await updateDonationsWithCampaigns(campaignMap, excelData)

    console.log('\n✅ תהליך Fine-Tuning הסתיים בהצלחה!')
  } catch (error) {
    console.error('❌ שגיאה בתהליך Fine-Tuning:', error)
    if (error instanceof Error) {
      console.error('פרטי השגיאה:', error.message)
    }
    throw error
  }
}

// אם רצים את הקובץ ישירות - רק בסביבת Node.js
if (typeof module !== 'undefined' && require.main === module) {
  const dataProvider = createPostgresConnection({
    // configuration: 'heroku',
    sslInDev: !(process.env['DEV_MODE'] === 'DEV')
  })

  withRemult(async () => {
    await fineTuning()
  }, {
    dataProvider,
    entities
  } as any)
    .then(() => {
      console.log('\nDone!')
      process.exit(0)
    })
    .catch(err => {
      console.error('\nError:', err)
      process.exit(1)
    })
}

export { fineTuning }
