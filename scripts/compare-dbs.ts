/**
 * compare-dbs.ts
 *
 * Read-only diagnostic: compares all public tables between SOURCE (Heroku)
 * and TARGET (Railway) DBs and highlights differences.
 *
 * Includes:
 *   - Phase 1: Per-table row counts (side-by-side)
 *   - Phase 2: Per-donor entity counts for matched donors (donations, places,
 *     contacts) - reveals data missing on either side
 *   - Phase 3: Donation date drift analysis (detects 1-day-off / timezone bugs)
 *
 * Usage:
 *   tsx scripts/compare-dbs.ts "<SOURCE_PG_URL>" "<TARGET_PG_URL>" [--verbose]
 *
 * No --confirm mode. This script never writes.
 */

import { Client } from 'pg'

const argv = process.argv.slice(2)
const VERBOSE = argv.includes('--verbose')
const positional = argv.filter(a => !a.startsWith('--'))
const [SOURCE_URL, TARGET_URL] = positional

if (!SOURCE_URL || !TARGET_URL) {
  console.error('Usage: tsx scripts/compare-dbs.ts "<SOURCE_PG_URL>" "<TARGET_PG_URL>" [--verbose]')
  process.exit(1)
}

function makeClient(url: string): Client {
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
}

function pad(s: any, w: number, right = false): string {
  const str = String(s ?? '')
  if (str.length >= w) return str.slice(0, w)
  const fill = ' '.repeat(w - str.length)
  return right ? fill + str : str + fill
}

async function getTables(client: Client): Promise<string[]> {
  const res = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)
  return res.rows.map(r => r.table_name)
}

async function getColumns(client: Client, table: string): Promise<string[]> {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1
     ORDER BY ordinal_position`,
    [table]
  )
  return res.rows.map(r => r.column_name)
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name=$1`,
    [table]
  )
  return (r.rowCount ?? 0) > 0
}

async function rowCount(client: Client, table: string): Promise<number | null> {
  if (!(await tableExists(client, table))) return null
  const r = await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`)
  return r.rows[0].c
}

async function main() {
  console.log(`[compare-dbs] connecting...`)
  const source = makeClient(SOURCE_URL)
  const target = makeClient(TARGET_URL)
  await source.connect()
  await target.connect()
  console.log(`[compare-dbs] connected.`)

  try {
    // ────────────────────────────────────────────────────────────────────
    // PHASE 1 — Per-table row counts
    // ────────────────────────────────────────────────────────────────────
    console.log(`\n=== Phase 1: Row counts per table ===`)
    const srcTables = await getTables(source)
    const tgtTables = await getTables(target)
    const allTables = Array.from(new Set([...srcTables, ...tgtTables])).sort()

    console.log(`\n  ${pad('TABLE', 32)} | ${pad('SOURCE', 10, true)} | ${pad('TARGET', 10, true)} | ${pad('DIFF', 10, true)} | NOTE`)
    console.log(`  ${'-'.repeat(32)} | ${'-'.repeat(10)} | ${'-'.repeat(10)} | ${'-'.repeat(10)} | ${'-'.repeat(20)}`)

    let mismatch = 0
    for (const t of allTables) {
      const sc = await rowCount(source, t)
      const tc = await rowCount(target, t)
      const scStr = sc === null ? '—' : sc.toLocaleString()
      const tcStr = tc === null ? '—' : tc.toLocaleString()
      let note = ''
      let diffStr = ''
      if (sc === null) note = 'missing in source'
      else if (tc === null) note = 'missing in target'
      else {
        const d = tc - sc
        diffStr = (d > 0 ? '+' : '') + d.toLocaleString()
        if (d !== 0) {
          mismatch++
          note = d > 0 ? 'target has more' : 'target has fewer'
        } else {
          note = 'OK'
        }
      }
      console.log(`  ${pad(t, 32)} | ${pad(scStr, 10, true)} | ${pad(tcStr, 10, true)} | ${pad(diffStr, 10, true)} | ${note}`)
    }
    console.log(`\nTables with row-count mismatch: ${mismatch} / ${allTables.length}`)

    // ────────────────────────────────────────────────────────────────────
    // PHASE 2 — Per-donor entity counts (donations / places / contacts)
    // ────────────────────────────────────────────────────────────────────
    console.log(`\n=== Phase 2: Per-donor entity coverage (matched donors) ===`)
    const srcDonors = await source.query(`SELECT "id","idNumber" FROM "donors" WHERE "idNumber" LIKE 'LEGACY-%'`)
    const tgtDonors = await target.query(`SELECT "id","idNumber" FROM "donors" WHERE "idNumber" LIKE 'LEGACY-%'`)

    const srcByLegacy = new Map<string, string>()
    for (const r of srcDonors.rows) srcByLegacy.set(r.idNumber, r.id)
    const tgtByLegacy = new Map<string, string>()
    for (const r of tgtDonors.rows) tgtByLegacy.set(r.idNumber, r.id)

    const matched: { idNumber: string; srcId: string; tgtId: string }[] = []
    for (const [k, srcId] of srcByLegacy) {
      const tgtId = tgtByLegacy.get(k)
      if (tgtId) matched.push({ idNumber: k, srcId, tgtId })
    }
    console.log(`Matched donors: ${matched.length}`)

    const srcIds = matched.map(m => m.srcId)
    const tgtIds = matched.map(m => m.tgtId)

    async function donorEntityCounts(client: Client, table: string, fk: string, ids: string[]) {
      if (!(await tableExists(client, table))) return null
      const r = await client.query(
        `SELECT "${fk}" AS donor, COUNT(*)::int AS c FROM "${table}" WHERE "${fk}" = ANY($1::text[]) GROUP BY "${fk}"`,
        [ids]
      )
      const map = new Map<string, number>()
      for (const row of r.rows) map.set(row.donor, row.c)
      return { total: r.rows.reduce((s, x) => s + x.c, 0), map }
    }

    const entities = [
      { name: 'donations',      fk: 'donorId' },
      { name: 'donor_places',   fk: 'donorId' },
      { name: 'donor_contacts', fk: 'donorId' },
      { name: 'donor_notes',    fk: 'donorId' },
      { name: 'donor_events',   fk: 'donorId' },
      { name: 'donor_gifts',    fk: 'donorId' },
      // donor_relations skipped - uses donor1Id/donor2Id, not donorId
    ]

    console.log(`\n  ${pad('ENTITY', 22)} | ${pad('SRC TOTAL', 12, true)} | ${pad('TGT TOTAL', 12, true)} | ${pad('DIFF', 10, true)} | DONORS WITH MORE IN SRC | DONORS WITH MORE IN TGT`)
    console.log(`  ${'-'.repeat(22)} | ${'-'.repeat(12)} | ${'-'.repeat(12)} | ${'-'.repeat(10)} | ${'-'.repeat(24)} | ${'-'.repeat(24)}`)

    for (const e of entities) {
      let sc, tc
      try {
        sc = await donorEntityCounts(source, e.name, e.fk, srcIds)
        tc = await donorEntityCounts(target, e.name, e.fk, tgtIds)
      } catch (err: any) {
        console.log(`  ${pad(e.name, 22)} | (skip - ${err.message?.slice(0, 60) || 'error'})`)
        continue
      }
      if (!sc || !tc) {
        console.log(`  ${pad(e.name, 22)} | ${pad(sc ? sc.total : '—', 12, true)} | ${pad(tc ? tc.total : '—', 12, true)} | ${pad('—', 10, true)} | (table missing)`)
        continue
      }
      let donorsMoreSrc = 0
      let donorsMoreTgt = 0
      for (const m of matched) {
        const a = sc.map.get(m.srcId) || 0
        const b = tc.map.get(m.tgtId) || 0
        if (a > b) donorsMoreSrc++
        else if (b > a) donorsMoreTgt++
      }
      const diff = tc.total - sc.total
      const diffStr = (diff > 0 ? '+' : '') + diff.toLocaleString()
      console.log(`  ${pad(e.name, 22)} | ${pad(sc.total.toLocaleString(), 12, true)} | ${pad(tc.total.toLocaleString(), 12, true)} | ${pad(diffStr, 10, true)} | ${pad(donorsMoreSrc, 24, true)} | ${pad(donorsMoreTgt, 24, true)}`)
    }

    // ────────────────────────────────────────────────────────────────────
    // PHASE 3 — Donation date drift analysis
    // ────────────────────────────────────────────────────────────────────
    console.log(`\n=== Phase 3: Donation date drift analysis ===`)
    if (!(await tableExists(source, 'donations')) || !(await tableExists(target, 'donations'))) {
      console.log(`  donations table missing in one of the DBs - skipping`)
    } else {
      const cols = await getColumns(source, 'donations')
      const dateCol = cols.includes('donationDate') ? 'donationDate'
        : cols.includes('date') ? 'date'
        : cols.includes('createdDate') ? 'createdDate'
        : null
      const amountCol = cols.includes('amount') ? 'amount' : null

      if (!dateCol || !amountCol) {
        console.log(`  Could not detect donationDate/amount columns - skipping`)
      } else {
        // Aggregate per-donor donation count, total, and date span
        const srcAgg = await source.query(
          `SELECT "donorId", COUNT(*)::int AS c, COALESCE(SUM("${amountCol}"::numeric),0)::float AS total,
                  MIN("${dateCol}") AS mind, MAX("${dateCol}") AS maxd
           FROM "donations" WHERE "donorId" = ANY($1::text[]) GROUP BY "donorId"`,
          [srcIds]
        )
        const tgtAgg = await target.query(
          `SELECT "donorId", COUNT(*)::int AS c, COALESCE(SUM("${amountCol}"::numeric),0)::float AS total,
                  MIN("${dateCol}") AS mind, MAX("${dateCol}") AS maxd
           FROM "donations" WHERE "donorId" = ANY($1::text[]) GROUP BY "donorId"`,
          [tgtIds]
        )
        const srcMap = new Map<string, any>()
        for (const r of srcAgg.rows) srcMap.set(r.donorId, r)
        const tgtMap = new Map<string, any>()
        for (const r of tgtAgg.rows) tgtMap.set(r.donorId, r)

        let countMatchDonors = 0
        let countDiffDonors = 0
        let totalAmtDiffSamples: any[] = []
        let dateDriftDonors: any[] = []

        for (const m of matched) {
          const a = srcMap.get(m.srcId)
          const b = tgtMap.get(m.tgtId)
          const aCount = a?.c || 0
          const bCount = b?.c || 0
          const aTotal = a?.total || 0
          const bTotal = b?.total || 0
          if (aCount === bCount && Math.abs(aTotal - bTotal) < 0.01) countMatchDonors++
          else countDiffDonors++

          // Date drift detection - compare min dates
          if (a?.mind && b?.mind) {
            const da = new Date(a.mind).getTime()
            const db = new Date(b.mind).getTime()
            const diffDays = Math.round((db - da) / (1000 * 60 * 60 * 24))
            if (diffDays !== 0 && dateDriftDonors.length < 20) {
              dateDriftDonors.push({
                idNumber: m.idNumber,
                srcMin: a.mind, tgtMin: b.mind,
                srcMax: a.maxd, tgtMax: b.maxd,
                diffDays,
              })
            }
          }
          if (Math.abs(aTotal - bTotal) > 0.01 && totalAmtDiffSamples.length < 10) {
            totalAmtDiffSamples.push({
              idNumber: m.idNumber, srcTotal: aTotal, tgtTotal: bTotal, diff: bTotal - aTotal,
            })
          }
        }

        console.log(`Donors with identical donation count + total: ${countMatchDonors}`)
        console.log(`Donors with differences:                       ${countDiffDonors}`)

        if (totalAmtDiffSamples.length > 0) {
          console.log(`\nFirst ${totalAmtDiffSamples.length} donors with total-amount diff:`)
          for (const x of totalAmtDiffSamples) {
            console.log(`  ${x.idNumber}: src=${x.srcTotal.toFixed(2)}  tgt=${x.tgtTotal.toFixed(2)}  diff=${x.diff.toFixed(2)}`)
          }
        }

        if (dateDriftDonors.length > 0) {
          console.log(`\n⚠ Date drift detected on ${dateDriftDonors.length} donors (showing up to 20):`)
          console.log(`  ${pad('idNumber', 14)} | ${pad('src min', 26)} | ${pad('tgt min', 26)} | diffDays`)
          for (const x of dateDriftDonors) {
            console.log(`  ${pad(x.idNumber, 14)} | ${pad(String(x.srcMin), 26)} | ${pad(String(x.tgtMin), 26)} | ${x.diffDays}`)
          }
        } else {
          console.log(`\nNo date drift detected on min-date comparisons.`)
        }

        // Aggregate date diff distribution across ALL donations (sample-based)
        console.log(`\nSampling 200 donations per side to compare exact dates...`)
        const sampleSrc = await source.query(
          `SELECT "donorId", "${dateCol}" AS d, "${amountCol}"::float AS amt
           FROM "donations" WHERE "donorId" = ANY($1::text[]) ORDER BY "donorId", "${dateCol}" LIMIT 200`,
          [srcIds]
        )
        const sampleTgt = await target.query(
          `SELECT "donorId", "${dateCol}" AS d, "${amountCol}"::float AS amt
           FROM "donations" WHERE "donorId" = ANY($1::text[]) ORDER BY "donorId", "${dateCol}" LIMIT 200`,
          [tgtIds]
        )
        // Build src map: tgtDonorId -> array of { d, amt }
        const srcToTgtDonor = new Map<string, string>()
        for (const m of matched) srcToTgtDonor.set(m.srcId, m.tgtId)
        const srcByTgtDonor = new Map<string, { d: any; amt: number }[]>()
        for (const r of sampleSrc.rows) {
          const td = srcToTgtDonor.get(r.donorId)
          if (!td) continue
          if (!srcByTgtDonor.has(td)) srcByTgtDonor.set(td, [])
          srcByTgtDonor.get(td)!.push({ d: r.d, amt: r.amt })
        }
        let exactSame = 0, oneDayBack = 0, oneDayFwd = 0, otherDiff = 0, noMatch = 0
        for (const t of sampleTgt.rows) {
          const arr = srcByTgtDonor.get(t.donorId) || []
          // Find a src row with same amt and closest date
          const candidates = arr.filter(s => Math.abs((s.amt || 0) - (t.amt || 0)) < 0.01)
          if (candidates.length === 0) { noMatch++; continue }
          // closest date diff
          let best = Infinity
          for (const s of candidates) {
            const ds = new Date(s.d).getTime()
            const dt = new Date(t.d).getTime()
            const diffDays = Math.round((dt - ds) / (1000 * 60 * 60 * 24))
            if (Math.abs(diffDays) < Math.abs(best)) best = diffDays
          }
          if (best === 0) exactSame++
          else if (best === -1) oneDayBack++
          else if (best === 1) oneDayFwd++
          else otherDiff++
        }
        console.log(`  Exact same date:    ${exactSame}`)
        console.log(`  Target 1-day back:  ${oneDayBack}   ← classic timezone shift`)
        console.log(`  Target 1-day fwd:   ${oneDayFwd}`)
        console.log(`  Other diff:         ${otherDiff}`)
        console.log(`  No matching amount: ${noMatch}`)
      }
    }

    console.log(`\n=== DONE ===`)
  } finally {
    await source.end()
    await target.end()
  }
}

main().catch(err => {
  console.error(`[FATAL]`, err)
  process.exit(1)
})
