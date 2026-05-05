/**
 * copy-places.ts
 *
 * Copies Place + DonorPlace records from a SOURCE database (e.g., Heroku) to
 * a TARGET database (e.g., Railway).
 *
 * The donor IDs (UUIDs) differ between the two DBs, so we MATCH donors by
 * their `idNumber` (e.g., 'LEGACY-1234') which is identical in both DBs since
 * it was generated deterministically from the same Excel data.
 *
 * SAFETY: by default the script runs in --verify mode (diagnostics only).
 * To actually write, pass --confirm explicitly.
 *
 * Modes (mutually exclusive, evaluated in this priority):
 *   --verify    Only show match diagnostics (counts, samples, mismatches). NO writes.
 *   --dry-run   Pretend to copy (logs what would happen). NO writes.
 *   --confirm   Actually write Places and DonorPlaces to TARGET.
 *   (none)      Defaults to --verify.
 *
 * Usage:
 *   tsx scripts/copy-places.ts "<SOURCE_PG_URL>" "<TARGET_PG_URL>" [--verify|--dry-run|--confirm] [--verbose]
 *
 * URLs format:  postgres://user:pass@host:port/dbname?sslmode=require
 *
 * Idempotency:
 *   - Place: matched in target by `placeId` (deterministic 'LEGACY-...' string).
 *   - DonorPlace: matched in target by (donorId, placeId) pair.
 */

import { Client } from 'pg'
import { randomUUID } from 'crypto'

const argv = process.argv.slice(2)
const VERIFY  = argv.includes('--verify')
const DRY_RUN = argv.includes('--dry-run')
const CONFIRM = argv.includes('--confirm')
const VERBOSE = argv.includes('--verbose')
const positional = argv.filter(a => !a.startsWith('--'))

const [SOURCE_URL, TARGET_URL] = positional

if (!SOURCE_URL || !TARGET_URL) {
  console.error('Usage: tsx scripts/copy-places.ts "<SOURCE_PG_URL>" "<TARGET_PG_URL>" [--verify|--dry-run|--confirm] [--verbose]')
  process.exit(1)
}

// Mode resolution: priority verify > confirm > dry-run > default(verify)
const mode: 'verify' | 'dry-run' | 'confirm' =
  VERIFY ? 'verify' :
  CONFIRM ? 'confirm' :
  DRY_RUN ? 'dry-run' : 'verify'

const willWrite = mode === 'confirm'

function makeClient(url: string): Client {
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
}

function pickFullName(row: any): string {
  // donor full name from columns: title firstName lastName suffix
  return [row.title, row.firstName, row.lastName, row.suffix].filter(Boolean).join(' ').trim() || row.idNumber
}

async function main() {
  console.log(`[copy-places] mode=${mode}  willWrite=${willWrite}  verbose=${VERBOSE}`)
  console.log(`[copy-places] connecting...`)

  const source = makeClient(SOURCE_URL)
  const target = makeClient(TARGET_URL)
  await source.connect()
  await target.connect()
  console.log(`[copy-places] connected.`)

  try {
    // ──────────────────────────────────────────────────────────────────────
    // PHASE A — DONOR VERIFICATION (always runs, even in confirm mode)
    // ──────────────────────────────────────────────────────────────────────
    console.log(`\n=== Phase A: Donor matching diagnostics ===`)
    const srcDonors = await source.query(
      `SELECT "id","idNumber","title","firstName","lastName","suffix" FROM "donors"`
    )
    const tgtDonors = await target.query(
      `SELECT "id","idNumber","title","firstName","lastName","suffix" FROM "donors"`
    )

    const totalSrc = srcDonors.rows.length
    const totalTgt = tgtDonors.rows.length
    const srcLegacy = srcDonors.rows.filter(r => (r.idNumber || '').startsWith('LEGACY-'))
    const tgtLegacy = tgtDonors.rows.filter(r => (r.idNumber || '').startsWith('LEGACY-'))
    const srcNonLegacy = totalSrc - srcLegacy.length
    const tgtNonLegacy = totalTgt - tgtLegacy.length

    console.log(`Source donors: ${totalSrc} total  (LEGACY-*: ${srcLegacy.length}, others: ${srcNonLegacy})`)
    console.log(`Target donors: ${totalTgt} total  (LEGACY-*: ${tgtLegacy.length}, others: ${tgtNonLegacy})`)

    // Build maps idNumber -> donor row
    const srcByIdNumber = new Map<string, any>()
    for (const d of srcLegacy) srcByIdNumber.set(d.idNumber, d)
    const tgtByIdNumber = new Map<string, any>()
    for (const d of tgtLegacy) tgtByIdNumber.set(d.idNumber, d)

    // Matched / unmatched
    const matched: { idNumber: string; src: any; tgt: any }[] = []
    const onlyInSource: any[] = []
    const onlyInTarget: any[] = []

    for (const [idNumber, src] of srcByIdNumber) {
      const tgt = tgtByIdNumber.get(idNumber)
      if (tgt) matched.push({ idNumber, src, tgt })
      else onlyInSource.push(src)
    }
    for (const [idNumber, tgt] of tgtByIdNumber) {
      if (!srcByIdNumber.has(idNumber)) onlyInTarget.push(tgt)
    }

    console.log(`\nMatched (in both DBs):     ${matched.length}`)
    console.log(`Only in source (missing target): ${onlyInSource.length}`)
    console.log(`Only in target (missing source): ${onlyInTarget.length}`)

    // Sample matches — verify names align
    console.log(`\nSample matches (first 10) - verify names visually:`)
    console.log(`  ${''.padEnd(15)} | ${'source name'.padEnd(40)} | target name`)
    console.log(`  ${'-'.repeat(15)} | ${'-'.repeat(40)} | ${'-'.repeat(40)}`)
    const sampleSize = Math.min(10, matched.length)
    for (let i = 0; i < sampleSize; i++) {
      const m = matched[i]
      const sn = pickFullName(m.src).slice(0, 40)
      const tn = pickFullName(m.tgt).slice(0, 40)
      const eq = sn === tn ? '✓' : '✗'
      console.log(`  ${m.idNumber.padEnd(15)} | ${sn.padEnd(40)} | ${tn} ${eq}`)
    }

    // Name mismatches — danger sign
    const nameMismatches = matched.filter(m => pickFullName(m.src) !== pickFullName(m.tgt))
    console.log(`\nName mismatches (different person under same idNumber): ${nameMismatches.length}`)
    if (nameMismatches.length > 0) {
      console.log(`  First 5:`)
      for (const m of nameMismatches.slice(0, 5)) {
        console.log(`    ${m.idNumber}: src='${pickFullName(m.src)}' tgt='${pickFullName(m.tgt)}'`)
      }
    }

    // Unmatched samples
    if (onlyInSource.length > 0) {
      console.log(`\nFirst 5 'only in source' (will be skipped):`)
      for (const d of onlyInSource.slice(0, 5)) console.log(`  ${d.idNumber}: ${pickFullName(d)}`)
    }
    if (onlyInTarget.length > 0) {
      console.log(`\nFirst 5 'only in target' (no source data to copy):`)
      for (const d of onlyInTarget.slice(0, 5)) console.log(`  ${d.idNumber}: ${pickFullName(d)}`)
    }

    // Build donor map for next phases
    const donorIdMap = new Map<string, string>()
    for (const m of matched) donorIdMap.set(m.src.id, m.tgt.id)

    if (mode === 'verify') {
      console.log(`\n[verify mode] Diagnostics complete. No writes attempted.`)
      console.log(`To dry-run the copy logic:  --dry-run`)
      console.log(`To actually write to target: --confirm`)
      return
    }

    if (donorIdMap.size === 0) {
      console.error(`\n[ABORT] No donors matched between source and target. Aborting.`)
      return
    }

    if (nameMismatches.length > 0 && mode === 'confirm') {
      console.error(`\n[WARNING] ${nameMismatches.length} idNumbers have different names between DBs.`)
      console.error(`This usually means the same idNumber points to DIFFERENT people on each side.`)
      console.error(`Aborting in --confirm mode for safety. Re-run with --dry-run to inspect, or --verify for full report.`)
      return
    }

    // ──────────────────────────────────────────────────────────────────────
    // PHASE B — Copy places + donor_places (OPTIMIZED with bulk pre-loads)
    // ──────────────────────────────────────────────────────────────────────
    console.log(`\n=== Phase B: Copying data (mode=${mode}, writes=${willWrite ? 'YES' : 'NO'}) ===`)

    // ---- B.0 Build FK remap tables (country/address-type UUIDs differ per DB) ----
    async function buildLocalIdMap(table: string, keyColumn: string): Promise<Map<string, string>> {
      const srcRes = await source.query(`SELECT "id","${keyColumn}" FROM "${table}"`)
      const tgtRes = await target.query(`SELECT "id","${keyColumn}" FROM "${table}"`)
      const tgtByKey = new Map<string, string>()
      for (const r of tgtRes.rows) {
        if (r[keyColumn]) tgtByKey.set(String(r[keyColumn]).trim().toLowerCase(), r.id)
      }
      const map = new Map<string, string>()
      for (const r of srcRes.rows) {
        const k = r[keyColumn] ? String(r[keyColumn]).trim().toLowerCase() : ''
        const tgtId = tgtByKey.get(k)
        if (tgtId && r.id !== tgtId) map.set(r.id, tgtId)
      }
      console.log(`FK remap [${table}.${keyColumn}]: ${map.size} mappings (src→tgt)`)
      return map
    }
    const countryIdMap = await buildLocalIdMap('countries', 'code')
    const addressTypeIdMap = await buildLocalIdMap('donor_address_types', 'name')

    // ---- B.1 Load source donor_places ------------------------------------
    const srcDonorIds = Array.from(donorIdMap.keys())
    const tgtDonorIds = Array.from(donorIdMap.values())
    const srcDonorPlaces = await source.query(
      `SELECT * FROM "donor_places" WHERE "donorId" = ANY($1::text[])`,
      [srcDonorIds]
    )
    console.log(`Source donor_places: ${srcDonorPlaces.rows.length}`)

    // ---- B.2 Load source places (referenced by those donor_places) -------
    const placeIdsRef = [...new Set(srcDonorPlaces.rows.map(dp => dp.placeId).filter(Boolean))] as string[]
    const srcPlaces = placeIdsRef.length > 0
      ? await source.query(`SELECT * FROM "places" WHERE "id" = ANY($1::text[])`, [placeIdsRef])
      : { rows: [] as any[] }
    console.log(`Source places (referenced by donor_places): ${srcPlaces.rows.length}`)

    // ---- B.3 Pre-load target places by placeId (single bulk query) -------
    const sourcePlaceIds = srcPlaces.rows.map(p => p.placeId).filter(Boolean) as string[]
    console.log(`Pre-loading target places by placeId... (${sourcePlaceIds.length} keys)`)
    const tgtPlacesRows = sourcePlaceIds.length > 0
      ? await target.query(
          `SELECT "id","placeId" FROM "places" WHERE "placeId" = ANY($1::text[])`,
          [sourcePlaceIds]
        )
      : { rows: [] as any[] }
    const tgtPlaceByPlaceId = new Map<string, string>()
    for (const r of tgtPlacesRows.rows) tgtPlaceByPlaceId.set(r.placeId, r.id)
    console.log(`Target places already present: ${tgtPlaceByPlaceId.size}`)

    // ---- B.4 Pre-load target donor_places by (donorId, placeId) ----------
    console.log(`Pre-loading target donor_places... (${tgtDonorIds.length} donors)`)
    const tgtDonorPlacesRows = tgtDonorIds.length > 0
      ? await target.query(
          `SELECT "donorId","placeId" FROM "donor_places" WHERE "donorId" = ANY($1::text[])`,
          [tgtDonorIds]
        )
      : { rows: [] as any[] }
    const tgtDpSet = new Set<string>()
    for (const r of tgtDonorPlacesRows.rows) tgtDpSet.add(`${r.donorId}|${r.placeId}`)
    console.log(`Target donor_places already present: ${tgtDpSet.size}`)

    // ---- B.5 Decide which places to create / reuse -----------------------
    const placeIdMap = new Map<string, string>()      // src place uuid -> tgt place uuid
    const placesToInsert: any[] = []
    let placesReused = 0

    for (const p of srcPlaces.rows) {
      let tgtPlaceUuid: string | undefined
      if (p.placeId) tgtPlaceUuid = tgtPlaceByPlaceId.get(p.placeId)

      if (tgtPlaceUuid) {
        placesReused++
      } else {
        tgtPlaceUuid = randomUUID()
        const newPlace: any = { ...p, id: tgtPlaceUuid }
        // Remap countryId (Heroku UUID -> Railway UUID)
        if (newPlace.countryId && countryIdMap.has(newPlace.countryId)) {
          newPlace.countryId = countryIdMap.get(newPlace.countryId)
        }
        placesToInsert.push(newPlace)
      }
      placeIdMap.set(p.id, tgtPlaceUuid)
    }
    console.log(`Places: to-create=${placesToInsert.length}  reused=${placesReused}`)

    // ---- B.6 Decide which donor_places to create -------------------------
    const dpToInsert: any[] = []
    let dpDup = 0
    let dpUnmapped = 0

    for (const dp of srcDonorPlaces.rows) {
      const newDonorId = donorIdMap.get(dp.donorId)
      const newPlaceId = dp.placeId ? placeIdMap.get(dp.placeId) : null
      if (!newDonorId || !newPlaceId) { dpUnmapped++; continue }

      const key = `${newDonorId}|${newPlaceId}`
      if (tgtDpSet.has(key)) { dpDup++; continue }
      tgtDpSet.add(key) // prevent duplicates inside the same batch

      const newDp: any = { ...dp, id: randomUUID(), donorId: newDonorId, placeId: newPlaceId }
      // Remap addressTypeId (Heroku UUID -> Railway UUID)
      if (newDp.addressTypeId && addressTypeIdMap.has(newDp.addressTypeId)) {
        newDp.addressTypeId = addressTypeIdMap.get(newDp.addressTypeId)
      }
      dpToInsert.push(newDp)
    }
    console.log(`Donor_places: to-create=${dpToInsert.length}  duplicates=${dpDup}  unmapped=${dpUnmapped}`)

    // ---- B.7 Batch insert helper -----------------------------------------
    async function bulkInsert(table: string, rows: any[], chunkSize = 200): Promise<void> {
      if (rows.length === 0) return
      const cols = Object.keys(rows[0])
      const colList = cols.map(c => `"${c}"`).join(',')
      let inserted = 0
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)
        const valuesSql: string[] = []
        const params: any[] = []
        let p = 1
        for (const row of chunk) {
          const placeholders = cols.map(() => `$${p++}`).join(',')
          valuesSql.push(`(${placeholders})`)
          for (const c of cols) params.push(row[c] === undefined ? null : row[c])
        }
        const sql = `INSERT INTO "${table}" (${colList}) VALUES ${valuesSql.join(',')}`
        if (willWrite) await target.query(sql, params)
        inserted += chunk.length
        console.log(`  ${willWrite ? 'inserted' : 'would-insert'} ${table}: ${inserted}/${rows.length}`)
      }
    }

    // ---- B.8 Execute (or simulate) inserts inside a single transaction ---
    if (willWrite) {
      console.log(`\nBegin transaction on target...`)
      await target.query('BEGIN')
    }
    try {
      await bulkInsert('places', placesToInsert)
      await bulkInsert('donor_places', dpToInsert)
      if (willWrite) {
        await target.query('COMMIT')
        console.log(`Transaction committed.`)
      }
    } catch (e) {
      if (willWrite) {
        await target.query('ROLLBACK')
        console.error(`Transaction ROLLED BACK due to error.`)
      }
      throw e
    }

    const placesCreated = placesToInsert.length
    const dpCreated = dpToInsert.length

    // ──────────────────────────────────────────────────────────────────────
    // Final summary
    // ──────────────────────────────────────────────────────────────────────
    console.log(`\n=== FINAL SUMMARY ===`)
    console.log(`Mode:                   ${mode} (writes=${willWrite ? 'YES' : 'NO'})`)
    console.log(`Donors matched:         ${donorIdMap.size}`)
    console.log(`Places (new + reused):  ${placesCreated} + ${placesReused}`)
    console.log(`Donor_places copied:    ${dpCreated}`)

    if (!willWrite) {
      console.log(`\nThis was a ${mode.toUpperCase()} run. Nothing was written.`)
      console.log(`To actually copy, re-run with --confirm.`)
    }
  } finally {
    await source.end()
    await target.end()
  }
}

main().catch(err => {
  console.error(`[FATAL]`, err)
  process.exit(1)
})
