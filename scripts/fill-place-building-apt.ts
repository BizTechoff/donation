/**
 * fill-place-building-apt.ts
 *
 * Backfills `places.building` and `places.apartment` from the original Excel
 * files (TbName.xlsx + TbNameUSA.xlsx) into the TARGET database (Railway).
 *
 * Reason: convert-excel-to-seed.ts wrote NameHome to DonorPlace.description
 * (instead of Place.building). This script repairs that gap by matching each
 * Excel home-address row to the donor's correct DB place via address content
 * (street + city + country), then setting building / apartment from Excel.
 *
 * Matching rules:
 *  - Excel row -> donor: by IdName (USA file: IdName + 100000) -> idNumber 'LEGACY-{n}'
 *  - Donor -> place: by normalized (lowercased+trimmed) match on
 *      Place.street == Excel.Address
 *      Place.city   == Excel.City
 *      Country.name == Excel.Country
 *  - Multi-place donors: only the place(s) whose address matches Excel are updated.
 *
 * Safety:
 *  - Only fills EMPTY fields in DB (won't overwrite existing building/apartment).
 *  - Modes: --verify (default, no writes), --dry-run, --confirm (transactional).
 *
 * Usage (run from repo root):
 *   tsx scripts/fill-place-building-apt.ts "<TARGET_PG_URL>" [--verify|--dry-run|--confirm] [--verbose]
 */

import { Client } from 'pg'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

const argv = process.argv.slice(2)
const VERIFY  = argv.includes('--verify')
const DRY_RUN = argv.includes('--dry-run')
const CONFIRM = argv.includes('--confirm')
const VERBOSE = argv.includes('--verbose')
const positional = argv.filter(a => !a.startsWith('--'))
const TARGET_URL = positional[0]

if (!TARGET_URL) {
  console.error('Usage: tsx scripts/fill-place-building-apt.ts "<TARGET_PG_URL>" [--verify|--dry-run|--confirm] [--verbose]')
  process.exit(1)
}

const mode: 'verify' | 'dry-run' | 'confirm' =
  VERIFY ? 'verify' :
  CONFIRM ? 'confirm' :
  DRY_RUN ? 'dry-run' : 'verify'
const willWrite = mode === 'confirm'

// Resolve Excel dir relative to this script file (so it works whether run
// from repo root or from scripts/ subdirectory). __dirname here is the
// directory of fill-place-building-apt.ts, i.e. <repo>/scripts.
const EXCELS_DIR = path.join(__dirname, '..', 'src', 'assets', 'excels')
const REGULAR_FILE = 'TbName.xlsx'
const USA_FILE = 'TbNameUSA.xlsx'
const USA_ID_OFFSET = 100000

interface ExcelRow {
  legacyId: number
  street: string
  city: string
  country: string
  NameHome: string
  Dira: string
}

function readExcelFile(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`  WARN: file not found, skipping: ${filePath}`)
    return []
  }
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' })
}

function norm(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ')
}

// Aliases for Excel country values that don't directly match DB name/code/nameEn.
// Maps the normalized Excel value -> normalized DB code (so 'UK' is recognized
// as GB, 'USA' as US, etc.). Hebrew names from DB.name match directly.
const COUNTRY_ALIASES: Record<string, string> = {
  'uk': 'gb',
  'u.k.': 'gb',
  'england': 'gb',
  'britain': 'gb',
  'great britain': 'gb',
  'united kingdom': 'gb',
  'usa': 'us',
  'u.s.a.': 'us',
  'u.s.': 'us',
  'united states': 'us',
  'united states of america': 'us',
  'israel': 'il',
}

/**
 * Returns true if the Excel country value matches the DB country, using
 * any of: name (Hebrew), nameEn (English), code (ISO), or known alias.
 */
function countryMatches(excelCountry: string, dbName: string | null | undefined,
                        dbNameEn: string | null | undefined,
                        dbCode: string | null | undefined): boolean {
  const ec = norm(excelCountry)
  if (!ec) return !norm(dbName) && !norm(dbCode) // both empty
  const aliased = COUNTRY_ALIASES[ec] || ec
  const dn = norm(dbName)
  const den = norm(dbNameEn)
  const dc = norm(dbCode)
  return ec === dn || ec === den || ec === dc ||
         aliased === dn || aliased === den || aliased === dc
}

function loadExcelRows(): ExcelRow[] {
  const out: ExcelRow[] = []
  const regularPath = path.join(EXCELS_DIR, REGULAR_FILE)
  const usaPath = path.join(EXCELS_DIR, USA_FILE)
  console.log(`[excel] reading ${regularPath}`)
  const regular = readExcelFile(regularPath)
  console.log(`[excel] reading ${usaPath}`)
  const usa = readExcelFile(usaPath)
  console.log(`[excel] regular rows: ${regular.length}, usa rows: ${usa.length}`)

  const collect = (rows: any[], idOffset: number) => {
    let collected = 0
    for (const row of rows) {
      const rawId = parseInt(String(row['IdName'] ?? '0'), 10)
      if (!rawId) continue
      const NameHome = String(row['NameHome'] ?? '').trim()
      const Dira = String(row['Dira'] ?? '').trim()
      // Skip rows with nothing to fill
      if (!NameHome && !Dira) continue
      out.push({
        legacyId: rawId + idOffset,
        street: String(row['Address'] ?? '').trim(),
        city: String(row['City'] ?? '').trim(),
        country: String(row['Country'] ?? '').trim(),
        NameHome,
        Dira,
      })
      collected++
    }
    return collected
  }

  const r = collect(regular, 0)
  const u = collect(usa, USA_ID_OFFSET)
  console.log(`[excel] eligible rows (have NameHome or Dira): regular=${r}, usa=${u}, total=${out.length}`)
  return out
}

async function main() {
  console.log(`[fill-place-building-apt] mode=${mode}  willWrite=${willWrite}  verbose=${VERBOSE}`)

  // 1. Read Excel files
  console.log(`\n=== Phase A: Read Excel files ===`)
  const excelRows = loadExcelRows()
  if (excelRows.length === 0) {
    console.log(`No Excel rows with NameHome or Dira. Nothing to do.`)
    return
  }

  // 2. Connect target DB
  console.log(`\n=== Phase B: Connecting to target ===`)
  const target = new Client({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false } })
  await target.connect()
  console.log(`[db] connected.`)

  try {
    // 3. Load donors -> donorByLegacy map
    console.log(`\n=== Phase C: Load donors + places ===`)
    const donorsRes = await target.query(
      `SELECT "id","idNumber" FROM "donors" WHERE "idNumber" LIKE 'LEGACY-%'`
    )
    const donorByLegacy = new Map<number, string>()
    for (const r of donorsRes.rows as any[]) {
      const m = /^LEGACY-(\d+)$/.exec(r.idNumber || '')
      if (m) donorByLegacy.set(parseInt(m[1], 10), r.id)
    }
    console.log(`[db] donors with LEGACY-* idNumber: ${donorByLegacy.size}`)

    // 4. Load all active places of those donors with country name+code+nameEn
    //    so we can match Excel's country value against ANY representation
    //    (Excel uses 'UK'/'USA'/'Israel'; DB has Hebrew 'בריטניה' as name,
    //    'GB' as code, 'United Kingdom' as nameEn).
    const placesRes = await target.query(
      `SELECT
         dp."donorId",
         p."id"        AS "placeId",
         p."street",
         p."city",
         p."building",
         p."apartment",
         c."name"      AS "countryName",
         c."nameEn"    AS "countryNameEn",
         c."code"      AS "countryCode"
       FROM "donor_places" dp
       JOIN "places"  p ON p."id" = dp."placeId"
       LEFT JOIN "countries" c ON c."id" = p."countryId"
       WHERE dp."isActive" = true`
    )
    const placesByDonor = new Map<string, any[]>()
    for (const r of placesRes.rows as any[]) {
      if (!r.donorId) continue
      const arr = placesByDonor.get(r.donorId) || []
      arr.push(r)
      placesByDonor.set(r.donorId, arr)
    }
    console.log(`[db] active places loaded: ${placesRes.rows.length} (across ${placesByDonor.size} donors)`)

    // 5. Match Excel rows to DB places
    console.log(`\n=== Phase D: Match Excel rows to DB places ===`)
    const updates: { placeId: string; building: string; apartment: string; reason: string }[] = []
    const stats = {
      excelRows: excelRows.length,
      donorNotFound: 0,
      donorNoPlaces: 0,
      noAddressMatch: 0,
      uniqueMatch: 0,
      multiMatch: 0,
      skipExistingValues: 0,
      placesQueuedForUpdate: 0,
    }
    const samplesNoMatch: { legacyId: number; excel: ExcelRow; dbPlaces: number; firstDbPlace?: any }[] = []

    for (const er of excelRows) {
      const donorId = donorByLegacy.get(er.legacyId)
      if (!donorId) { stats.donorNotFound++; continue }

      const places = placesByDonor.get(donorId) || []
      if (places.length === 0) { stats.donorNoPlaces++; continue }

      // Address match: street + city + country (normalized).
      // Country matching tolerates: name (Hebrew), nameEn, code, and aliases
      // like UK->GB, USA->US.
      const erStreet = norm(er.street)
      const erCity = norm(er.city)
      const matches = places.filter(p =>
        norm(p.street) === erStreet &&
        norm(p.city) === erCity &&
        countryMatches(er.country, p.countryName, p.countryNameEn, p.countryCode)
      )

      if (matches.length === 0) {
        stats.noAddressMatch++
        if (samplesNoMatch.length < 10) {
          samplesNoMatch.push({
            legacyId: er.legacyId,
            excel: er,
            dbPlaces: places.length,
            firstDbPlace: places[0],
          })
        }
        continue
      }

      if (matches.length > 1) stats.multiMatch++
      else stats.uniqueMatch++

      for (const m of matches) {
        // Only fill empty fields - don't overwrite existing values
        const fillBuilding = !!er.NameHome && !m.building
        const fillApartment = !!er.Dira && !m.apartment
        if (!fillBuilding && !fillApartment) {
          stats.skipExistingValues++
          continue
        }
        const newBuilding = fillBuilding ? er.NameHome : (m.building || '')
        const newApartment = fillApartment ? er.Dira : (m.apartment || '')
        updates.push({
          placeId: m.placeId,
          building: newBuilding,
          apartment: newApartment,
          reason: `LEGACY-${er.legacyId}; ${fillBuilding ? `building='${newBuilding}'` : 'building kept'}; ${fillApartment ? `apartment='${newApartment}'` : 'apartment kept'}`,
        })
        stats.placesQueuedForUpdate++
      }
    }

    // Print diagnostics
    console.log(`\n=== Diagnostics ===`)
    console.log(`Excel rows (eligible):                     ${stats.excelRows}`)
    console.log(`Donor NOT found by LEGACY-* idNumber:      ${stats.donorNotFound}`)
    console.log(`Donor has 0 active places:                 ${stats.donorNoPlaces}`)
    console.log(`No address match (street+city+country):    ${stats.noAddressMatch}`)
    console.log(`Unique address match:                      ${stats.uniqueMatch}`)
    console.log(`Multi-match (same address on >1 place):    ${stats.multiMatch}`)
    console.log(`Skipped (building+apartment already set):  ${stats.skipExistingValues}`)
    console.log(`Places queued for UPDATE:                  ${stats.placesQueuedForUpdate}`)

    if (samplesNoMatch.length > 0) {
      console.log(`\nFirst ${samplesNoMatch.length} no-match samples:`)
      for (const s of samplesNoMatch) {
        console.log(`  LEGACY-${s.legacyId}:`)
        console.log(`    Excel: street='${s.excel.street}'  city='${s.excel.city}'  country='${s.excel.country}'`)
        console.log(`    DB:    ${s.dbPlaces} places, e.g. street='${s.firstDbPlace?.street || ''}'  city='${s.firstDbPlace?.city || ''}'  country.name='${s.firstDbPlace?.countryName || ''}'  code='${s.firstDbPlace?.countryCode || ''}'  nameEn='${s.firstDbPlace?.countryNameEn || ''}'`)
      }
    }

    if (VERBOSE && updates.length > 0) {
      console.log(`\nFirst 20 updates:`)
      for (const u of updates.slice(0, 20)) console.log(`  ${u.reason}`)
    }

    if (mode === 'verify') {
      console.log(`\n[verify mode] No writes attempted.`)
      console.log(`Next: --dry-run to simulate, --confirm to apply.`)
      return
    }

    if (updates.length === 0) {
      console.log(`\nNothing to update.`)
      return
    }

    // 6. Apply updates in transaction
    console.log(`\n=== Phase E: Applying UPDATEs (mode=${mode}) ===`)
    if (willWrite) {
      console.log(`Begin transaction on target...`)
      await target.query('BEGIN')
    }
    try {
      let done = 0
      for (const u of updates) {
        if (willWrite) {
          await target.query(
            `UPDATE "places" SET "building" = $1, "apartment" = $2 WHERE "id" = $3`,
            [u.building, u.apartment, u.placeId]
          )
        }
        done++
        if (done % 200 === 0 || done === updates.length) {
          console.log(`  ${willWrite ? 'updated' : 'would-update'} ${done}/${updates.length}`)
        }
      }
      if (willWrite) {
        await target.query('COMMIT')
        console.log(`Transaction committed.`)
      }
    } catch (err) {
      if (willWrite) {
        await target.query('ROLLBACK')
        console.error(`Transaction ROLLED BACK due to error.`)
      }
      throw err
    }

    console.log(`\n=== FINAL SUMMARY ===`)
    console.log(`Mode:               ${mode} (writes=${willWrite ? 'YES' : 'NO'})`)
    console.log(`Places updated:     ${updates.length}`)
  } finally {
    await target.end()
  }
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
