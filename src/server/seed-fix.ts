import path from 'path'
import * as XLSX from 'xlsx'
import { remult, withRemult } from 'remult'
import { createPostgresConnection } from 'remult/postgres'
import { Donation, Donor, Country } from '../shared/entity'
import { Place } from '../shared/entity/place'
import { DonorPlace } from '../shared/entity/donor-place'
import { entities } from './api'

const EXCELS_DIR       = path.join(__dirname, '../assets/excels')
const USA_ID_OFFSET    = 100_000
const SHARED_DONOR_IDS = new Set<number>([1908])

// ─── Currency mappings ────────────────────────────────────────────────────────

const ICON_MATBEA_MAP: Record<string, string> = {
  '₪':   'ILS',
  '$':   'USD',
  '€':   'EUR',
  '£':   'GBP',
  'Fr':  'CHF',
  'CAD': 'CAD',
}

const MATBEA_HEBREW_MAP: Record<string, string> = {
  'שקל':           'ILS',
  'ש"ח':           'ILS',
  'שח':            'ILS',
  'דולר':          'USD',
  'יורו':          'EUR',
  'לירה שטרלינג': 'GBP',
  'פרנק שוויצרי': 'CHF',
  'דולר קנדי':     'CAD',
}

/** country code → default currency (for currency collision fallback) */
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'IL': 'ILS',
  'US': 'USD',
  'GB': 'GBP',
  'CH': 'CHF',
  'CA': 'CAD',
  // Eurozone
  'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
  'BE': 'EUR', 'NL': 'EUR', 'AT': 'EUR', 'PT': 'EUR',
  'GR': 'EUR', 'FI': 'EUR', 'IE': 'EUR', 'LU': 'EUR',
  'SK': 'EUR', 'SI': 'EUR', 'EE': 'EUR', 'LV': 'EUR',
  'LT': 'EUR', 'CY': 'EUR', 'MT': 'EUR',
}

/** Excel Country string → ISO country code */
const EXCEL_COUNTRY_TO_CODE: Record<string, string> = {
  'UK':          'GB',
  'Scotland':    'GB',
  'Israel':      'IL',
  'USA':         'US',
  'Belgium':     'BE',
  'Switzerland': 'CH',
  'Germany':     'DE',
  'France':      'FR',
  'Holland':     'NL',
  'Netherlands': 'NL',
  'Austria':     'AT',
  'Canada':      'CA',
  'Australia':   'AU',
  'Ukraine':     'UA',
  'Chicago':     'US',
}

function mapCurrencyFromExcel(iconMatbea?: string, matbea?: string): string | null {
  if (iconMatbea?.trim()) return ICON_MATBEA_MAP[iconMatbea.trim()] ?? null
  if (matbea?.trim())     return MATBEA_HEBREW_MAP[matbea.trim()] ?? null
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read Excel with raw numeric values (dates as serials, numbers as numbers) */
function readExcel(filename: string): any[] {
  const fp = path.join(EXCELS_DIR, filename)
  const wb = XLSX.readFile(fp)
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true })
}

/**
 * Convert Excel serial date or date string to ISO YYYY-MM-DD.
 * Excel epoch = Dec 30, 1899. Serial 42410 = 2016-02-09.
 */
function excelDateToISO(val: any): string | null {
  if (typeof val === 'number' && val > 0) {
    const excelEpoch = new Date(1899, 11, 30)
    const d = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  }
  if (typeof val === 'string' && val) {
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  return null
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExcelRow {
  excelDonationId: string
  currencyId:      string | null
  reason:          string | null
}

interface MapEntry {
  rows:             ExcelRow[]
  currencyConflict: boolean
  reasonConflict:   boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 0 – Fill excelDonorId from idNumber 'LEGACY-xxx' (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

async function fillExcelDonorIds(): Promise<void> {
  const donors = await remult.repo(Donor).find({ limit: 100_000 })
  let updated = 0
  const examples: string[] = []

  for (const d of donors) {
    if (d.excelDonorId) continue
    const m = d.idNumber?.match(/^LEGACY-(\d+)$/)
    if (m) {
      d.excelDonorId = m[1]
      await remult.repo(Donor).save(d)
      updated++
      if (examples.length < 5) examples.push(`${d.idNumber} → excelDonorId=${m[1]}`)
    }
  }

  console.log(`  Donors scanned:       ${donors.length}`)
  console.log(`  excelDonorId filled:  ${updated}`)
  if (examples.length) examples.forEach(e => console.log('   ', e))
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 – Load TbTromot Excel → composite-key map
//   Key: "donorLegacyId|YYYY-MM-DD|amount"
//   Value: { excelDonationId, currencyId, reason } + conflict flags
// ─────────────────────────────────────────────────────────────────────────────

function loadExcelMaps(): Map<string, MapEntry> {
  const map = new Map<string, MapEntry>()

  const sources = [
    { file: 'TbTromot.xlsx',    isUSA: false },
    { file: 'TbTromotUSA.xlsx', isUSA: true  },
  ]

  for (const { file, isUSA } of sources) {
    const rows = readExcel(file)  // raw: true → Tarich is a numeric serial
    let loaded = 0

    for (const row of rows) {
      const rawDonorId = Number(row['IdName'])
      if (!rawDonorId) continue

      const donorLegacyId = (isUSA && !SHARED_DONOR_IDS.has(rawDonorId))
        ? rawDonorId + USA_ID_OFFSET
        : rawDonorId

      let amount = Number(row['Scom'] || 0)
      if (!amount) amount = Number(row['ScomChiyuv'] || 0)
      if (!amount) continue

      // Convert Excel serial date to ISO string
      const dateStr = excelDateToISO(row['Tarich'])
      if (!dateStr) continue

      const excelDonationId = String(row['Id'] ?? '')
      const currencyId      = mapCurrencyFromExcel(
        typeof row['IconMatbea'] === 'string' ? row['IconMatbea'] : undefined,
        typeof row['matbea']     === 'string' ? row['matbea']     : undefined,
      )
      const reason = typeof row['TromaSiba'] === 'string'
        ? row['TromaSiba'].trim() || null
        : null

      const key    = `${donorLegacyId}|${dateStr}|${amount}`
      const newRow: ExcelRow = { excelDonationId, currencyId, reason }

      const existing = map.get(key)
      if (!existing) {
        map.set(key, { rows: [newRow], currencyConflict: false, reasonConflict: false })
      } else {
        if (currencyId !== existing.rows[0].currencyId) existing.currencyConflict = true
        if (reason     !== existing.rows[0].reason)     existing.reasonConflict   = true
        existing.rows.push(newRow)
      }
      loaded++
    }

    console.log(`  ${file}: ${loaded} rows`)
  }

  return map
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 – Fix country mismatches using TbName.xlsx as ground truth
//   Reads each donor's Excel Country field, maps to ISO code,
//   then fixes their Place.countryId in DB if wrong.
// ─────────────────────────────────────────────────────────────────────────────

async function applyCountryFix(): Promise<void> {
  // Load Excel donor → expected country code
  const tbNameRows = readExcel('TbName.xlsx')
  const legacyToExpectedCode = new Map<string, string>() // legacyId → ISO code

  for (const row of tbNameRows) {
    const legacyId      = String(Number(row['IdName']))
    const excelCountry  = typeof row['Country'] === 'string' ? row['Country'].trim() : ''
    const code          = EXCEL_COUNTRY_TO_CODE[excelCountry]
    if (legacyId && code) legacyToExpectedCode.set(legacyId, code)
  }
  console.log(`  Excel donors with known country: ${legacyToExpectedCode.size}`)

  // Load all DB countries by code
  const allCountries   = await remult.repo(Country).find()
  const countryByCode  = new Map<string, Country>()
  for (const c of allCountries) countryByCode.set(c.code, c)

  // Load donors with excelDonorId set
  const allDonors = await remult.repo(Donor).find({ limit: 100_000 })
  const donorById = new Map<string, Donor>() // donor.id → Donor
  for (const d of allDonors) {
    if (d.excelDonorId) donorById.set(d.id, d)
  }

  // Load all Places and build Place.id → Place map
  const allPlaces     = await remult.repo(Place).find({ limit: 100_000 })
  const placeById     = new Map<string, Place>()
  for (const p of allPlaces) placeById.set(p.id, p)

  // Load all DonorPlaces
  const allDonorPlaces = await remult.repo(DonorPlace).find({ limit: 200_000 })

  let fixed = 0, alreadyCorrect = 0, noExpectedCountry = 0, noPlace = 0
  const examples: string[] = []

  for (const dp of allDonorPlaces) {
    if (!dp.donorId || !dp.isActive) continue

    const donor = donorById.get(dp.donorId)
    if (!donor?.excelDonorId) continue

    const expectedCode = legacyToExpectedCode.get(donor.excelDonorId)
    if (!expectedCode) { noExpectedCountry++; continue }

    const expectedCountry = countryByCode.get(expectedCode)
    if (!expectedCountry) continue

    if (!dp.placeId) { noPlace++; continue }
    const place = placeById.get(dp.placeId)
    if (!place) { noPlace++; continue }

    if (place.countryId === expectedCountry.id) { alreadyCorrect++; continue }

    // Fix: update Place to expected country
    const prevCode = allCountries.find(c => c.id === place.countryId)?.code ?? '?'
    place.countryId = expectedCountry.id
    await remult.repo(Place).save(place)
    fixed++

    if (examples.length < 5)
      examples.push(`excelDonorId=${donor.excelDonorId} city=${place.city}: ${prevCode} → ${expectedCode}`)
  }

  console.log(`  Already correct:      ${alreadyCorrect}`)
  console.log(`  Fixed:                ${fixed}`)
  console.log(`  No expected country:  ${noExpectedCountry}`)
  console.log(`  No place:             ${noPlace}`)
  if (examples.length) {
    console.log('  Examples:')
    examples.forEach(e => console.log('   ', e))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 – Build donor → countryCode map (runs after country fix)
// ─────────────────────────────────────────────────────────────────────────────

async function buildDonorCountryMap(): Promise<Map<string, string>> {
  const allCountries = await remult.repo(Country).find()
  const countryById  = new Map<string, string>()
  for (const c of allCountries) countryById.set(c.id, c.code)

  const allPlaces = await remult.repo(Place).find({ limit: 100_000 })
  const countryByPlaceId = new Map<string, string>()
  for (const p of allPlaces) {
    if (p.countryId) {
      const code = countryById.get(p.countryId)
      if (code) countryByPlaceId.set(p.id, code)
    }
  }

  const allDonorPlaces  = await remult.repo(DonorPlace).find({ limit: 200_000 })
  const donorCountryMap = new Map<string, string>()
  for (const dp of allDonorPlaces) {
    if (!dp.donorId || !dp.isActive) continue
    if (donorCountryMap.has(dp.donorId)) continue
    if (dp.placeId) {
      const code = countryByPlaceId.get(dp.placeId)
      if (code) donorCountryMap.set(dp.donorId, code)
    }
  }

  return donorCountryMap
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 – Apply currency + reason + excelDonationId fixes
// ─────────────────────────────────────────────────────────────────────────────

async function applyDonationFix(
  excelMap:        Map<string, MapEntry>,
  donorCountryMap: Map<string, string>,
): Promise<void> {
  const donorRepo    = remult.repo(Donor)
  const donationRepo = remult.repo(Donation)

  // excelDonorId (string) → donor.id
  const allDonors = await donorRepo.find({ limit: 100_000 })
  const donorByExcelId = new Map<string, string>()
  for (const d of allDonors) {
    if (d.excelDonorId) donorByExcelId.set(d.excelDonorId, d.id)
  }

  // donorId|YYYY-MM-DD|amount → Donation[]
  const allDonations = await donationRepo.find({ limit: 200_000 })
  const donationLookup = new Map<string, Donation[]>()
  for (const d of allDonations) {
    const k = `${d.donorId}|${dateKey(d.donationDate)}|${d.amount}`
    if (!donationLookup.has(k)) donationLookup.set(k, [])
    donationLookup.get(k)!.push(d)
  }

  let updatedCurrency = 0, updatedCurrencyFallback = 0
  let updatedReason   = 0, updatedExcelId = 0
  let noMatch = 0, ambiguous = 0
  let conflictCurrencySkipped = 0, conflictReasonSkipped = 0, noChange = 0

  const currencyExamples: string[] = []
  const fallbackExamples: string[] = []
  const reasonExamples:   string[] = []
  const noMatchExamples:  string[] = []

  for (const [excelKey, entry] of excelMap) {
    const [donorLegacyId, dateStr, amountStr] = excelKey.split('|')

    const donorId = donorByExcelId.get(donorLegacyId)
    if (!donorId) {
      noMatch++
      if (noMatchExamples.length < 5) noMatchExamples.push(`excelDonorId=${donorLegacyId}`)
      continue
    }

    const dbKey    = `${donorId}|${dateStr}|${amountStr}`
    const donations = donationLookup.get(dbKey)
    if (!donations?.length) {
      noMatch++
      if (noMatchExamples.length < 5)
        noMatchExamples.push(`excelDonorId=${donorLegacyId} ${dateStr} ${amountStr}`)
      continue
    }
    if (donations.length > 1) { ambiguous++; continue }

    const donation = donations[0]
    const data     = entry.rows[0]
    let changed = false

    // ── excelDonationId ──
    if (!donation.excelDonationId && data.excelDonationId) {
      donation.excelDonationId = data.excelDonationId
      changed = true
      updatedExcelId++
    }

    // ── Currency ──
    if (!entry.currencyConflict) {
      if (data.currencyId && donation.currencyId !== data.currencyId) {
        const prev = donation.currencyId
        donation.currencyId = data.currencyId
        changed = true
        updatedCurrency++
        if (currencyExamples.length < 5)
          currencyExamples.push(`excelDonorId=${donorLegacyId} ${dateStr}: ${prev} → ${data.currencyId}`)
      }
    } else {
      const countryCode      = donorCountryMap.get(donorId)
      const fallbackCurrency = countryCode ? COUNTRY_CURRENCY_MAP[countryCode] : null

      if (fallbackCurrency && donation.currencyId !== fallbackCurrency) {
        const prev = donation.currencyId
        donation.currencyId = fallbackCurrency
        changed = true
        updatedCurrencyFallback++
        if (fallbackExamples.length < 5)
          fallbackExamples.push(
            `excelDonorId=${donorLegacyId} ${dateStr}: ${prev} → ${fallbackCurrency} (country ${countryCode})`
          )
      } else {
        conflictCurrencySkipped++
      }
    }

    // ── Reason (only fill if currently empty) ──
    if (!entry.reasonConflict) {
      if (data.reason && !donation.reason) {
        donation.reason = data.reason
        changed = true
        updatedReason++
        if (reasonExamples.length < 5)
          reasonExamples.push(`excelDonorId=${donorLegacyId} ${dateStr}: "${data.reason}"`)
      }
    } else {
      conflictReasonSkipped++
    }

    if (changed) await donationRepo.save(donation)
    else noChange++
  }

  console.log(`\n  Excel keys:              ${excelMap.size}`)
  console.log(`  DB donations scanned:    ${allDonations.length}`)
  console.log(`  No match:                ${noMatch}`)
  console.log(`  Ambiguous (skip):        ${ambiguous}`)
  console.log(`  excelDonationId filled:  ${updatedExcelId}`)
  console.log(`  Currency updated:        ${updatedCurrency}`)
  console.log(`  Currency fallback:       ${updatedCurrencyFallback}`)
  console.log(`  Currency conflict skip:  ${conflictCurrencySkipped}`)
  console.log(`  Reason updated:          ${updatedReason}`)
  console.log(`  Reason conflict skip:    ${conflictReasonSkipped}`)
  console.log(`  No change (idempotent):  ${noChange}`)

  if (currencyExamples.length) {
    console.log('\n  Currency samples:')
    currencyExamples.forEach(e => console.log('   ', e))
  }
  if (fallbackExamples.length) {
    console.log('\n  Currency fallback samples:')
    fallbackExamples.forEach(e => console.log('   ', e))
  }
  if (reasonExamples.length) {
    console.log('\n  Reason samples:')
    reasonExamples.forEach(e => console.log('   ', e))
  }
  if (noMatchExamples.length) {
    console.log('\n  No-match samples (first 5):')
    noMatchExamples.forEach(e => console.log('   ', e))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== seed-fix.ts ===\n')

  console.log('[0/4] Filling excelDonorId from idNumber (idempotent)...')
  await fillExcelDonorIds()

  console.log('\n[1/4] Reading Excel TbTromot files...')
  const excelMap = loadExcelMaps()
  console.log(`      Total keys: ${excelMap.size}`)

  console.log('\n[2/4] Country fix (TbName.xlsx as ground truth)...')
  await applyCountryFix()

  console.log('\n[3/4] Building donor→country map...')
  const donorCountryMap = await buildDonorCountryMap()
  console.log(`      Donors with country: ${donorCountryMap.size}`)

  console.log('\n[4/4] Currency + Reason + excelDonationId fix...')
  await applyDonationFix(excelMap, donorCountryMap)

  console.log('\n=== done ===')
}

if (typeof module !== 'undefined' && require.main === module) {
  const dataProvider = createPostgresConnection({
    configuration: 'heroku',
    sslInDev: !(process.env['DEV_MODE'] === 'DEV'),
  })

  withRemult(() => main(), { dataProvider, entities } as any)
    .then(() => process.exit(0))
    .catch(err => { console.error('seed-fix failed:', err); process.exit(1) })
}
