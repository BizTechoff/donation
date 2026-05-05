/**
 * fix-places-fks.ts
 *
 * Fixes orphan FK references in target's `places.countryId` and
 * `donor_places.addressTypeId` after a copy from a different DB.
 *
 * Background:
 *   `copy-places.ts` (older version) copied FK UUIDs as-is. But Country and
 *   DonorAddressType have different UUIDs in each DB (created independently
 *   by seed-infrastructure). So the copied rows now have FKs pointing at
 *   non-existent UUIDs in target.
 *
 * Approach:
 *   - Match Country rows by `code`   (IL, US, GB, ...)
 *   - Match DonorAddressType by `name` ("בית", "עבודה", ...)
 *   - Build srcUuid -> tgtUuid maps
 *   - UPDATE target rows accordingly
 *
 * Usage:
 *   tsx scripts/fix-places-fks.ts "<SOURCE_PG_URL>" "<TARGET_PG_URL>" [--verify|--confirm] [--verbose]
 *
 * Modes (priority verify > confirm; default verify):
 *   --verify    Diagnostics only (no writes)
 *   --confirm   Apply UPDATEs in a transaction
 */

import { Client } from 'pg'

const argv = process.argv.slice(2)
const VERIFY  = argv.includes('--verify')
const CONFIRM = argv.includes('--confirm')
const VERBOSE = argv.includes('--verbose')
const positional = argv.filter(a => !a.startsWith('--'))

const [SOURCE_URL, TARGET_URL] = positional

if (!SOURCE_URL || !TARGET_URL) {
  console.error('Usage: tsx scripts/fix-places-fks.ts "<SOURCE_PG_URL>" "<TARGET_PG_URL>" [--verify|--confirm] [--verbose]')
  process.exit(1)
}

const mode: 'verify' | 'confirm' = VERIFY ? 'verify' : CONFIRM ? 'confirm' : 'verify'
const willWrite = mode === 'confirm'

function makeClient(url: string): Client {
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
}

async function buildIdMap(
  source: Client,
  target: Client,
  table: string,
  keyColumn: string,
  label: string,
): Promise<{ map: Map<string, string>; srcOnly: any[]; tgtOnly: any[] }> {
  const srcRes = await source.query(`SELECT "id","${keyColumn}" FROM "${table}"`)
  const tgtRes = await target.query(`SELECT "id","${keyColumn}" FROM "${table}"`)

  const tgtByKey = new Map<string, string>()
  for (const r of tgtRes.rows) {
    if (r[keyColumn]) tgtByKey.set(String(r[keyColumn]).trim().toLowerCase(), r.id)
  }

  const map = new Map<string, string>()
  const srcOnly: any[] = []
  for (const r of srcRes.rows) {
    const k = r[keyColumn] ? String(r[keyColumn]).trim().toLowerCase() : ''
    const tgtId = tgtByKey.get(k)
    if (tgtId && r.id !== tgtId) {
      map.set(r.id, tgtId)
    } else if (!tgtId) {
      srcOnly.push(r)
    }
  }

  const srcKeys = new Set<string>()
  for (const r of srcRes.rows) {
    if (r[keyColumn]) srcKeys.add(String(r[keyColumn]).trim().toLowerCase())
  }
  const tgtOnly = tgtRes.rows.filter(r => {
    const k = r[keyColumn] ? String(r[keyColumn]).trim().toLowerCase() : ''
    return !srcKeys.has(k)
  })

  console.log(`\n[${label}] source rows: ${srcRes.rows.length}  target rows: ${tgtRes.rows.length}`)
  console.log(`[${label}] mappings created (src→tgt, different UUIDs): ${map.size}`)
  console.log(`[${label}] in source but NOT in target (by ${keyColumn}): ${srcOnly.length}`)
  if (srcOnly.length > 0) {
    for (const r of srcOnly.slice(0, 10)) console.log(`    src-only ${keyColumn}='${r[keyColumn]}'  uuid=${r.id}`)
  }
  console.log(`[${label}] in target but NOT in source (by ${keyColumn}): ${tgtOnly.length}`)
  if (tgtOnly.length > 0 && VERBOSE) {
    for (const r of tgtOnly.slice(0, 10)) console.log(`    tgt-only ${keyColumn}='${r[keyColumn]}'  uuid=${r.id}`)
  }

  return { map, srcOnly, tgtOnly }
}

async function diagnoseAffected(
  target: Client,
  table: string,
  fkColumn: string,
  map: Map<string, string>,
  label: string,
): Promise<{ toFix: number; orphan: number }> {
  if (map.size === 0) {
    console.log(`[${label}] no FK mappings to apply.`)
    return { toFix: 0, orphan: 0 }
  }
  const srcUuids = Array.from(map.keys())
  const toFixRes = await target.query(
    `SELECT COUNT(*)::int AS c FROM "${table}" WHERE "${fkColumn}" = ANY($1::text[])`,
    [srcUuids],
  )
  const toFix = toFixRes.rows[0].c

  // orphan = points to UUID not in either source or target
  const orphanRes = await target.query(
    `SELECT COUNT(*)::int AS c
     FROM "${table}" t
     WHERE t."${fkColumn}" IS NOT NULL
       AND t."${fkColumn}" <> ''
       AND NOT EXISTS (SELECT 1 FROM "${label === 'countries' ? 'countries' : 'donor_address_types'}" x WHERE x.id = t."${fkColumn}")`,
  )
  const orphan = orphanRes.rows[0].c

  console.log(`\n[${label}] target rows in "${table}" needing remap (${fkColumn} matches src UUID): ${toFix}`)
  console.log(`[${label}] target rows in "${table}" with TRULY orphan ${fkColumn} (no row in target table): ${orphan}`)
  return { toFix, orphan }
}

async function applyUpdates(
  target: Client,
  table: string,
  fkColumn: string,
  map: Map<string, string>,
  label: string,
): Promise<number> {
  let updated = 0
  for (const [srcId, tgtId] of map) {
    const res = await target.query(
      `UPDATE "${table}" SET "${fkColumn}" = $1 WHERE "${fkColumn}" = $2`,
      [tgtId, srcId],
    )
    if (res.rowCount && res.rowCount > 0) {
      updated += res.rowCount
      if (VERBOSE) console.log(`  [${label}] ${srcId} -> ${tgtId} : ${res.rowCount} rows`)
    }
  }
  console.log(`[${label}] total rows updated in "${table}": ${updated}`)
  return updated
}

async function main() {
  console.log(`[fix-places-fks] mode=${mode}  willWrite=${willWrite}  verbose=${VERBOSE}`)
  console.log(`[fix-places-fks] connecting...`)

  const source = makeClient(SOURCE_URL)
  const target = makeClient(TARGET_URL)
  await source.connect()
  await target.connect()
  console.log(`[fix-places-fks] connected.`)

  try {
    // ──────────────────────────────────────────────────────────────────────
    // Phase 1 — Build FK maps
    // ──────────────────────────────────────────────────────────────────────
    console.log(`\n=== Phase 1: Building FK maps ===`)
    const countryMap = await buildIdMap(source, target, 'countries', 'code', 'countries')
    const addrTypeMap = await buildIdMap(source, target, 'donor_address_types', 'name', 'donor_address_types')

    // ──────────────────────────────────────────────────────────────────────
    // Phase 2 — Diagnose impact on target
    // ──────────────────────────────────────────────────────────────────────
    console.log(`\n=== Phase 2: Diagnosing affected rows in target ===`)
    const placesDx = await diagnoseAffected(target, 'places', 'countryId', countryMap.map, 'countries')
    const dpDx = await diagnoseAffected(target, 'donor_places', 'addressTypeId', addrTypeMap.map, 'donor_address_types')

    if (mode === 'verify') {
      console.log(`\n[verify mode] No writes attempted.`)
      console.log(`To apply updates: re-run with --confirm`)
      return
    }

    // ──────────────────────────────────────────────────────────────────────
    // Phase 3 — Apply UPDATEs in a transaction
    // ──────────────────────────────────────────────────────────────────────
    console.log(`\n=== Phase 3: Applying UPDATEs (mode=confirm) ===`)
    console.log(`Begin transaction on target...`)
    await target.query('BEGIN')
    try {
      const placesUpdated = await applyUpdates(target, 'places', 'countryId', countryMap.map, 'countries')
      const dpUpdated = await applyUpdates(target, 'donor_places', 'addressTypeId', addrTypeMap.map, 'donor_address_types')
      await target.query('COMMIT')
      console.log(`Transaction committed.`)
      console.log(`\n=== FINAL SUMMARY ===`)
      console.log(`places.countryId rows updated:           ${placesUpdated}`)
      console.log(`donor_places.addressTypeId rows updated: ${dpUpdated}`)
    } catch (e) {
      await target.query('ROLLBACK')
      console.error(`Transaction ROLLED BACK due to error.`)
      throw e
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
