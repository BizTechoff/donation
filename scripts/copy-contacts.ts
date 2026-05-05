/**
 * copy-contacts.ts
 *
 * Copies DonorContact records (phones + emails) from a SOURCE database
 * (e.g., Heroku) to a TARGET database (e.g., Railway).
 *
 * Donor IDs differ between DBs - we MATCH donors by `idNumber` (e.g.,
 * 'LEGACY-1234') which is identical in both DBs since it was generated
 * deterministically from the same Excel data.
 *
 * SAFETY: by default the script runs in --verify mode (diagnostics only).
 * To actually write, pass --confirm explicitly.
 *
 * Modes (mutually exclusive, evaluated in priority):
 *   --verify    Show match diagnostics + counts. NO writes.
 *   --dry-run   Pretend to copy (logs counts). NO writes.
 *   --confirm   Actually write donor_contacts to TARGET.
 *   (none)      Defaults to --verify.
 *
 * Usage:
 *   tsx scripts/copy-contacts.ts "<SOURCE_PG_URL>" "<TARGET_PG_URL>" [--verify|--dry-run|--confirm] [--verbose]
 *
 * Idempotency:
 *   - donor_contact dedup key: (donorId, type, phoneNumber|email-lowercased-trimmed)
 *
 * No FK remap needed - the only FK is donorId which we map via the
 * idNumber-based donor matching.
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
  console.error('Usage: tsx scripts/copy-contacts.ts "<SOURCE_PG_URL>" "<TARGET_PG_URL>" [--verify|--dry-run|--confirm] [--verbose]')
  process.exit(1)
}

const mode: 'verify' | 'dry-run' | 'confirm' =
  VERIFY ? 'verify' :
  CONFIRM ? 'confirm' :
  DRY_RUN ? 'dry-run' : 'verify'

const willWrite = mode === 'confirm'

function makeClient(url: string): Client {
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
}

function pickFullName(row: any): string {
  return [row.title, row.firstName, row.lastName, row.suffix].filter(Boolean).join(' ').trim() || row.idNumber
}

function contactValue(c: any): string {
  const v = c.type === 'phone' ? c.phoneNumber : c.email
  return (v || '').toString().trim().toLowerCase()
}

function contactKey(donorId: string, type: string, value: string): string {
  return `${donorId}|${type}|${value}`
}

async function main() {
  console.log(`[copy-contacts] mode=${mode}  willWrite=${willWrite}  verbose=${VERBOSE}`)
  console.log(`[copy-contacts] connecting...`)

  const source = makeClient(SOURCE_URL)
  const target = makeClient(TARGET_URL)
  await source.connect()
  await target.connect()
  console.log(`[copy-contacts] connected.`)

  try {
    // ──────────────────────────────────────────────────────────────────────
    // PHASE A — Donor matching diagnostics (same as copy-places.ts)
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

    console.log(`Source donors: ${totalSrc} total  (LEGACY-*: ${srcLegacy.length})`)
    console.log(`Target donors: ${totalTgt} total  (LEGACY-*: ${tgtLegacy.length})`)

    const srcByIdNumber = new Map<string, any>()
    for (const d of srcLegacy) srcByIdNumber.set(d.idNumber, d)
    const tgtByIdNumber = new Map<string, any>()
    for (const d of tgtLegacy) tgtByIdNumber.set(d.idNumber, d)

    const matched: { idNumber: string; src: any; tgt: any }[] = []
    for (const [idNumber, src] of srcByIdNumber) {
      const tgt = tgtByIdNumber.get(idNumber)
      if (tgt) matched.push({ idNumber, src, tgt })
    }

    const nameMismatches = matched.filter(m => pickFullName(m.src) !== pickFullName(m.tgt))
    console.log(`Matched (in both DBs):     ${matched.length}`)
    console.log(`Name mismatches:           ${nameMismatches.length}`)

    if (mode !== 'verify' && nameMismatches.length > 0) {
      console.error(`\n[ABORT] Name mismatches found - aborting in non-verify mode for safety.`)
      console.error(`Run with --verify (or copy-places.ts --verify) to inspect.`)
      return
    }

    const donorIdMap = new Map<string, string>()
    for (const m of matched) donorIdMap.set(m.src.id, m.tgt.id)

    // ──────────────────────────────────────────────────────────────────────
    // PHASE B — Copy donor_contacts
    // ──────────────────────────────────────────────────────────────────────
    console.log(`\n=== Phase B: Copying donor_contacts (mode=${mode}, writes=${willWrite ? 'YES' : 'NO'}) ===`)

    // ---- B.1 Load source donor_contacts (only for matched donors) --------
    const srcDonorIds = Array.from(donorIdMap.keys())
    const tgtDonorIds = Array.from(donorIdMap.values())
    const srcContacts = srcDonorIds.length > 0
      ? await source.query(
          `SELECT * FROM "donor_contacts" WHERE "donorId" = ANY($1::text[])`,
          [srcDonorIds]
        )
      : { rows: [] as any[] }

    const srcByType = { phone: 0, email: 0, other: 0 }
    for (const c of srcContacts.rows) {
      if (c.type === 'phone') srcByType.phone++
      else if (c.type === 'email') srcByType.email++
      else srcByType.other++
    }
    console.log(`Source donor_contacts: ${srcContacts.rows.length}  (phone: ${srcByType.phone}, email: ${srcByType.email}, other: ${srcByType.other})`)

    // ---- B.2 Load target donor_contacts for dedup (single bulk query) ----
    const tgtContactsRows = tgtDonorIds.length > 0
      ? await target.query(
          `SELECT "donorId","type","phoneNumber","email" FROM "donor_contacts" WHERE "donorId" = ANY($1::text[])`,
          [tgtDonorIds]
        )
      : { rows: [] as any[] }

    const tgtSet = new Set<string>()
    for (const r of tgtContactsRows.rows) {
      tgtSet.add(contactKey(r.donorId, r.type || '', contactValue(r)))
    }
    const tgtByType = { phone: 0, email: 0, other: 0 }
    for (const r of tgtContactsRows.rows) {
      if (r.type === 'phone') tgtByType.phone++
      else if (r.type === 'email') tgtByType.email++
      else tgtByType.other++
    }
    console.log(`Target donor_contacts (existing): ${tgtContactsRows.rows.length}  (phone: ${tgtByType.phone}, email: ${tgtByType.email}, other: ${tgtByType.other})`)

    // ---- B.3 Decide which contacts to insert -----------------------------
    const toInsert: any[] = []
    let dupSkipped = 0
    let unmappedDonor = 0
    let blankValue = 0

    for (const c of srcContacts.rows) {
      const newDonorId = donorIdMap.get(c.donorId)
      if (!newDonorId) { unmappedDonor++; continue }

      const value = contactValue(c)
      if (!value) {
        blankValue++
        // still copy contacts with blank phone/email if they have meaningful description
        // but we cannot dedup them safely. To be safe, skip blanks.
        continue
      }

      const key = contactKey(newDonorId, c.type || '', value)
      if (tgtSet.has(key)) {
        dupSkipped++
        continue
      }
      tgtSet.add(key) // prevent dup within same batch

      const newC: any = { ...c, id: randomUUID(), donorId: newDonorId }
      toInsert.push(newC)
    }

    const insByType = { phone: 0, email: 0, other: 0 }
    for (const r of toInsert) {
      if (r.type === 'phone') insByType.phone++
      else if (r.type === 'email') insByType.email++
      else insByType.other++
    }
    console.log(`To-create:        ${toInsert.length}  (phone: ${insByType.phone}, email: ${insByType.email}, other: ${insByType.other})`)
    console.log(`Duplicates skipped: ${dupSkipped}`)
    console.log(`Unmapped donor:     ${unmappedDonor}`)
    console.log(`Blank value (skip): ${blankValue}`)

    if (mode === 'verify') {
      console.log(`\n[verify mode] Diagnostics complete. No writes attempted.`)
      console.log(`To dry-run the copy:        --dry-run`)
      console.log(`To actually write to target: --confirm`)
      return
    }

    // ---- B.4 Batch insert helper -----------------------------------------
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

    // ---- B.5 Execute (or simulate) inserts inside a transaction ----------
    if (willWrite) {
      console.log(`\nBegin transaction on target...`)
      await target.query('BEGIN')
    }
    try {
      await bulkInsert('donor_contacts', toInsert)
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

    // ──────────────────────────────────────────────────────────────────────
    // Final summary
    // ──────────────────────────────────────────────────────────────────────
    console.log(`\n=== FINAL SUMMARY ===`)
    console.log(`Mode:                   ${mode} (writes=${willWrite ? 'YES' : 'NO'})`)
    console.log(`Donors matched:         ${donorIdMap.size}`)
    console.log(`Donor_contacts copied:  ${toInsert.length}  (phone: ${insByType.phone}, email: ${insByType.email}, other: ${insByType.other})`)
    console.log(`Duplicates skipped:     ${dupSkipped}`)
    console.log(`Blank value skipped:    ${blankValue}`)

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
