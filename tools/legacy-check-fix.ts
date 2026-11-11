/**
 * תיקון פרטי הצ'ק/וואצ'ר בתרומות שיובאו מהתוכנה הישנה (יעקב, 10.11.2026).
 * קריאה בלבד; עם --sql מדפיס את פקודות העדכון, לא מריץ אותן.
 *
 *   npx tsx tools/legacy-check-fix.ts --prod
 *   npx tsx tools/legacy-check-fix.ts --prod --sql > docs/legacy-check-fix.sql
 *
 * המיפוי (האימייל של יעקב):
 *   AccountNo     -> accountNumber
 *   Check_Number  -> checkNumber, ובתרומה דרך עמותה -> voucherNumber
 *   Voucher_Co    -> מספר העמותה בטבלת העזר -> organizationId
 *   Sort Code     -> בפועל שם הבנק -> bankId
 * הייבוא מאפריל: Check_Number לא יובא, AccountNo נזרק (לא היה שדה), ומספר
 * העמותה נכנס ל"מספר שובר". התאמה לתרומה לפי excelDonationId.
 * ערך קיים ושונה לא נדרס - חוץ ממספר שובר שמכיל את מספר העמותה (השיבוש),
 * ובנק / עמותה: את אלה קבע הייבוא מאפריל בהתאמה חלקית של שמות ("US" נמצא
 * בתוך "Trust", "Citi" בתוך "Citizens", "3" בתוך "DAF giving 360") - שגויים;
 * האקסל הוא המקור.
 *
 * עמותה מטבלת העזר שאין במערכת - נוספת (ב-SQL, לפני העדכונים), עם מספרה
 * בתוכנה הישנה בהערות. טבלת העזר: TbEzerCharity.xlsx של יעקב, אם נשמר
 * ב-docs/migration; אחרת הטבלה הישנה שבריפו.
 * בנק שאין במערכת - נוסף בשמו האחיד (BANK_ALIASES מאחד כתיב ושגיאות הקלדה).
 *
 * --fix-method: תרומת צ'ק מבנק (לא דרך עמותה) שיובאה כ"תשלום עמותה" עוברת
 * לאמצעי התשלום צ'ק - אחרת מספר הצ'ק לא מוצג בכרטיס התרומה. רק בדגל.
 */
import * as fs from 'fs'
import { connectDb, say } from './lib/db'
import { lit, sqlHeader } from './lib/sql'
import { cell, readSheet } from './lib/excel'
import { findByName, normalizeName } from './lib/match'

const DONATION_FILES = ['docs/migration/TbTromotUSA.xlsx', 'docs/migration/TbTromot.xlsx']
const CHARITY_FILES = ['docs/migration/TbEzerCharity.xlsx', 'docs/migration/טבלת שמות ארגוני צדקה.xlsx']

interface Named { id: string; name: string }
interface DbDonation {
  id: string; excelDonationId: string; checkNumber: string; voucherNumber: string
  accountNumber: string; bankId: string; organizationId: string; method: string; donorName: string
}
type Field = 'accountNumber' | 'checkNumber' | 'voucherNumber' | 'bankId' | 'organizationId'
interface Change { donation: DbDonation; set: Partial<Record<Field, string>> }
interface Charity { legacyId: string; name: string; address: string }

/**
 * השם האחיד לכל כתיב של אותו בנק בתוכנה הישנה (אחרי normalizeName).
 * JPMorgan Chase הוא בנק אחד - Chase הוא המותג הקמעונאי שלו.
 */
const BANK_ALIASES: Record<string, string> = {
  chase: 'JPMorgan Chase', jpmorgan: 'JPMorgan Chase', jpmorganchase: 'JPMorgan Chase',
  jpmorganchasebabk: 'JPMorgan Chase', jpmorganchasebankk: 'JPMorgan Chase',
  citi: 'Citibank', santander: 'Santander Bank',
  firstcitizans: 'First Citizens Bank', keybanknationalasspciation: 'KeyBank',
  colombia: 'Columbia Bank', capitalone: 'Capital One', valley: 'Valley Bank'
}
const canonicalBank = (name: string) => BANK_ALIASES[normalizeName(name)] || name.trim()

function loadCharities(): Map<string, Charity> {
  const file = CHARITY_FILES.find(f => fs.existsSync(f))
  if (!file) { say('  לא נמצאה טבלת עמותות ב-docs/migration.'); process.exit(1) }
  say(`  טבלת עמותות: ${file}`)
  const map = new Map<string, Charity>()
  for (const r of readSheet(file)) {
    const [k0, k1, k2] = Object.keys(r)
    const legacyId = cell(r, 'ID_Charity', 'Id', k0)
    const name = cell(r, 'CharityName', 'Name', k1)
    if (legacyId && name) map.set(legacyId, { legacyId, name, address: k2 ? cell(r, k2) : '' })
  }
  return map
}

async function main() {
  const charities = loadCharities()
  const rows = DONATION_FILES.flatMap(f => readSheet(f))
    .filter(r => cell(r, 'AccountNo') || cell(r, 'Check_Number') || cell(r, 'Voucher_Co', 'Voucher co') || cell(r, 'Sort Code', 'Sort_Code'))

  const { client } = await connectDb()
  const ids = rows.map(r => cell(r, 'Id'))
  const { rows: dbRows } = await client.query<DbDonation>(`
    select d."id", d."excelDonationId",
           coalesce(d."checkNumber",'') as "checkNumber", coalesce(d."voucherNumber",'') as "voucherNumber",
           coalesce(to_jsonb(d)->>'accountNumber','') as "accountNumber",
           coalesce(d."bankId",'') as "bankId", coalesce(d."organizationId",'') as "organizationId",
           coalesce(m."name",'') as "method",
           trim(coalesce(n."lastName",'') || ' ' || coalesce(n."firstName",'')) as "donorName"
      from "donations" d
      left join "donation_methods" m on m."id" = d."donationMethodId"
      left join "donors" n on n."id" = d."donorId"
     where d."excelDonationId" = any($1)`, [ids])
  const banks = (await client.query<Named>(`select "id", "name" from "banks"`)).rows
  const checkMethodId = (await client.query<{ id: string }>(`select "id" from "donation_methods" where "type" = 'check' order by "name" limit 1`)).rows[0]?.id || ''
  const orgs = (await client.query<Named>(`select "id", "name" from "organizations"`)).rows
  await client.end()

  // עמותות מטבלת העזר שאין במערכת - מקבלות מזהה כבר עכשיו, כדי שהעדכונים
  // יקשרו אליהן באותו קובץ SQL.
  const newOrgs: (Named & Charity)[] = []
  for (const c of charities.values()) {
    if (!findByName(orgs, c.name, o => o.name)) {
      const org = { ...c, id: `legacy-charity-${c.legacyId}` } // מזהה קבוע - ריצה חוזרת לא תכפיל
      newOrgs.push(org)
      orgs.push(org)
    }
  }

  // בנקים שאין במערכת - בשם האחיד, מזהה קבוע.
  const newBanks: Named[] = []
  for (const r of rows) {
    if (cell(r, 'Voucher_Co', 'Voucher co')) continue
    const raw = cell(r, 'Sort Code', 'Sort_Code')
    if (!raw) continue
    const name = canonicalBank(raw)
    if (!findByName(banks, name, b => b.name) && !findByName(banks, raw, b => b.name)) {
      const bank = { id: `legacy-bank-${normalizeName(name)}`, name }
      newBanks.push(bank)
      banks.push(bank)
    }
  }
  const nameOf = (list: Named[], id: string) => list.find(x => x.id === id)?.name || id
  const fixMethod = process.argv.includes('--fix-method')
  const methodFixes: DbDonation[] = []

  const byExcelId = new Map(dbRows.map(d => [d.excelDonationId, d]))
  const notFound: string[] = []
  const missingBanks = new Map<string, number>()
  const missingOrgs = new Map<string, number>()
  const kept: string[] = []
  const changes: Change[] = []

  for (const r of rows) {
    const d = byExcelId.get(cell(r, 'Id'))
    if (!d) { notFound.push(cell(r, 'Id')); continue }
    const set: Change['set'] = {}
    const want = (field: Field, value: string, overwrite = false) => {
      if (!value || d[field] === value) return
      if (d[field] && !overwrite) {
        const show = (v: string) => field === 'bankId' ? nameOf(banks, v) : field === 'organizationId' ? nameOf(orgs, v) : v
        kept.push(`${d.donorName} (${d.excelDonationId}) ${field}: קיים "${show(d[field])}", באקסל "${show(value)}"`)
        return
      }
      set[field] = value
    }

    const voucherCo = cell(r, 'Voucher_Co', 'Voucher co')
    const checkNo = cell(r, 'Check_Number')
    want('accountNumber', cell(r, 'AccountNo'))

    if (voucherCo) {
      const charityName = charities.get(voucherCo)?.name || voucherCo
      const org = findByName(orgs, charityName, o => o.name)
      if (org) want('organizationId', org.id, true)
      else missingOrgs.set(charityName, (missingOrgs.get(charityName) || 0) + 1)
      // מספר העמותה שנכנס כמספר שובר - השיבוש; מוחלף במספר השובר האמיתי.
      if (checkNo) want('voucherNumber', checkNo, d.voucherNumber === voucherCo)
      else if (d.voucherNumber === voucherCo) set.voucherNumber = ''
    } else {
      want('checkNumber', checkNo)
      const bankName = cell(r, 'Sort Code', 'Sort_Code')
      if (bankName) {
        const bank = findByName(banks, bankName, b => b.name) || findByName(banks, canonicalBank(bankName), b => b.name)
        if (bank) want('bankId', bank.id, true)
        else missingBanks.set(bankName, (missingBanks.get(bankName) || 0) + 1)
      }
    }
    // צ'ק מבנק שיובא כ"תשלום עמותה" - בדגל בלבד.
    if (!voucherCo && checkNo && d.method === 'תשלום עמותה' && checkMethodId) methodFixes.push(d)
    if (Object.keys(set).length) changes.push({ donation: d, set })
  }

  const count = (f: Field) => changes.filter(c => f in c.set).length
  say('==================================================================')
  say('  פרטי צ\'ק/וואצ\'ר בתרומות מהתוכנה הישנה. קריאה בלבד.')
  say('==================================================================')
  say(`  שורות באקסל עם פרטים: ${rows.length}, נמצאו במערכת: ${rows.length - notFound.length}, לא נמצאו: ${notFound.length}`)
  say(`  עמותות בטבלת העזר: ${charities.size}, חדשות שיתווספו: ${newOrgs.length}${newOrgs.length ? ' - ' + newOrgs.map(o => `${o.legacyId} ${o.name}`).join(', ') : ''}`)
  say(`  בנקים חדשים שיתווספו: ${newBanks.length}${newBanks.length ? ' - ' + newBanks.map(b => b.name).join(', ') : ''}`)
  say(`  תרומות לעדכון: ${changes.length}`)
  say(`    מספר חשבון ${count('accountNumber')} · מספר צ'ק ${count('checkNumber')} · מספר שובר ${count('voucherNumber')} · בנק ${count('bankId')} · עמותה ${count('organizationId')}`)
  const methods = new Map<string, number>()
  for (const c of changes) methods.set(c.donation.method || '(ללא)', (methods.get(c.donation.method || '(ללא)') || 0) + 1)
  say(`  אמצעי התשלום בתרומות האלה: ${[...methods].map(([m, n]) => `${m} ${n}`).join(' · ')}`)
  say(`  צ'קים מבנק שיובאו כ"תשלום עמותה": ${methodFixes.length} - ${fixMethod ? 'יעברו לצ\'ק (--fix-method)' : 'לא ישתנו (להעברה לצ\'ק: --fix-method)'}`)
  if (missingBanks.size) say(`\n  בנקים שאין במערכת (${missingBanks.size}) - לא יקושרו:\n${[...missingBanks].map(([b, n]) => `    ${String(n).padStart(3)}  ${b}`).join('\n')}`)
  if (missingOrgs.size) say(`\n  עמותות שאין במערכת (${missingOrgs.size}) - לא יקושרו:\n${[...missingOrgs].map(([o, n]) => `    ${String(n).padStart(3)}  ${o}`).join('\n')}`)
  if (kept.length) say(`\n  ערך קיים שונה - לא נדרס (${kept.length}):\n${kept.slice(0, 20).map(k => '    ' + k).join('\n')}`)
  if (notFound.length) say(`\n  מזהי תרומה מהאקסל שלא נמצאו: ${notFound.slice(0, 30).join(', ')}${notFound.length > 30 ? ' ...' : ''}`)

  if (!process.argv.includes('--sql')) {
    say('\n  הרץ שוב עם --sql לקבלת פקודות העדכון. הן מודפסות, לא מורצות.\n')
    return
  }

  console.log(sqlHeader('פרטי צ\'ק/וואצ\'ר בתרומות מהתוכנה הישנה (יעקב, 10.11.2026).'))
  console.log('')
  console.log('-- השדה החדש; השרת מוסיף אותו גם בעצמו בהפעלה הראשונה אחרי הפריסה.')
  console.log(`alter table "donations" add column if not exists "accountNumber" varchar default '' not null;`)
  console.log('')
  console.log('create table if not exists "donations_legacy_check_backup" (')
  console.log('  "donationId" text        not null,')
  console.log('  "before"     jsonb       not null,')
  console.log('  "takenAt"    timestamptz not null default now()')
  console.log(');')
  console.log('')
  console.log('begin;')
  console.log('')
  if (newBanks.length) {
    console.log('-- בנקים מהתוכנה הישנה שאין במערכת.')
    for (const b of newBanks) {
      console.log(`insert into "banks" ("id","name","currencyId","notes","isActive","createdDate","updatedDate")`)
      console.log(`  values (${lit(b.id)}, ${lit(b.name)}, 'USD', 'מהתוכנה הישנה', true, now(), now());`)
    }
    console.log('')
  }
  if (newOrgs.length) {
    console.log('-- עמותות מטבלת העזר שאין במערכת.')
    for (const o of newOrgs) {
      const notes = `מהתוכנה הישנה, מספר ${o.legacyId}${o.address ? ' - ' + o.address : ''}`
      console.log(`insert into "organizations" ("id","name","currencyId","notes","isActive","createdDate","updatedDate")`)
      console.log(`  values (${lit(o.id)}, ${lit(o.name)}, 'USD', ${lit(notes)}, true, now(), now());`)
    }
    console.log('')
  }
  for (const { donation: d, set } of changes) {
    const fields = Object.keys(set) as Field[]
    console.log(`insert into "donations_legacy_check_backup" ("donationId","before")`)
    console.log(`  select "id", jsonb_build_object(${fields.map(f => `${lit(f)}, "${f}"`).join(', ')}) from "donations" where "id" = ${lit(d.id)};`)
    console.log(`update "donations" set ${fields.map(f => `"${f}" = ${lit(set[f])}`).join(', ')} where "id" = ${lit(d.id)};  -- ${d.donorName} #${d.excelDonationId}`)
  }
  if (fixMethod && methodFixes.length) {
    console.log('')
    console.log(`-- --fix-method: ${methodFixes.length} צ'קים מבנק שיובאו כ"תשלום עמותה" -> צ'ק.`)
    console.log(`create table if not exists "donations_legacy_method_backup" ("donationId" text not null, "methodBefore" text not null, "takenAt" timestamptz not null default now());`)
    console.log(`insert into "donations_legacy_method_backup" ("donationId","methodBefore")`)
    console.log(`  select "id", "donationMethodId" from "donations" where "id" in (${methodFixes.map(d => lit(d.id)).join(', ')});`)
    console.log(`update "donations" set "donationMethodId" = ${lit(checkMethodId)} where "id" in (${methodFixes.map(d => lit(d.id)).join(', ')});`)
  }
  console.log('')
  console.log(`-- בדיקה לפני commit: אמור להחזיר ${changes.length}.`)
  console.log(`select count(*) from "donations_legacy_check_backup";`)
  console.log('')
  console.log('commit;')
  console.log('')
  console.log('-- לחזרה אחורה - לכל שדה שנשמר בגיבוי:')
  console.log(`-- update "donations" d set "checkNumber" = coalesce(b."before"->>'checkNumber', d."checkNumber"), ...`)
  console.log('--   from "donations_legacy_check_backup" b where b."donationId" = d."id";')
  console.log('')
}

main().catch(err => {
  console.error('שגיאה:', err.message)
  process.exit(1)
})
