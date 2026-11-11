/**
 * הסבת התנועות של התחייבויות לתרומות רגילות המקושרות להתחייבות.
 * קריאה בלבד; עם --sql מדפיס את ההסבה, לא מריץ אותה.
 *
 *   npx tsx tools/payments-to-donations.ts --prod
 *   npx tsx tools/payments-to-donations.ts --prod --sql > docs/payments-to-donations.sql
 *
 * שלב ג׳ 4.1 קבע "כל תרומה = תנועה": תשלום על התחייבות הוא תרומה עם
 * commitmentId. התנועות הישנות (payments) הן השיטה הקודמת. כאן כל תנועה
 * פעילה של התחייבות הופכת לתרומה: אותו תורם, סכום ומטבע, תאריך התנועה,
 * הקמפיין של ההתחייבות; האסמכתא וההערה - להערות. אמצעי התשלום נשאר ריק:
 * להתחייבות אין אמצעי תשלום (הוא נקבע בתרומה עצמה), ומה שרשום בהתחייבויות
 * הישנות הוא ברירת המחדל של הטופס. התנועה
 * מסומנת לא פעילה (לא נמחקת) ובהערה שלה מזהה התרומה החדשה.
 * הסכומים לא משתנים: מה שנספר דרך התנועה נספר מעתה דרך התרומה.
 *
 * לא נוגע: תנועות לא פעילות, ותנועות של הו"ק (תרומה רגילה) - ההו"ק יטופל
 * בנפרד. תנועה בלי תרומה קיימת (שארית בדיקה) - מסומנת לא פעילה.
 */
import { connectDb, say } from './lib/db'
import { lit, sqlHeader } from './lib/sql'

interface Row {
  id: string; amount: number; currencyId: string; paymentDate: string; reference: string; notes: string
  commitmentId: string | null; donationType: string | null; donorId: string; donorName: string
  campaignId: string; donationMethodId: string; createdById: string; commitmentAmount: number
}
const newId = (): string => (require('crypto') as any).randomUUID()
const d10 = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : '')

async function main() {
  const { client } = await connectDb()
  const { rows } = await client.query<Row>(`
    select p."id", p."amount", p."currencyId", p."paymentDate",
           coalesce(p."reference",'') as "reference", coalesce(p."notes",'') as "notes",
           c."id" as "commitmentId", c."donationType", coalesce(c."donorId",'') as "donorId",
           trim(coalesce(n."lastName",'') || ' ' || coalesce(n."firstName",'')) as "donorName",
           coalesce(c."campaignId",'') as "campaignId", coalesce(c."donationMethodId",'') as "donationMethodId",
           coalesce(c."createdById",'') as "createdById", coalesce(c."amount",0) as "commitmentAmount"
      from "payments" p
      left join "donations" c on c."id" = p."donationId"
      left join "donors" n on n."id" = c."donorId"
     where p."isActive" = true
     order by "donorName", p."paymentDate"`)
  // כמה תרומות כבר מקושרות לכל התחייבות - כדי להראות את "שולם" לפני / אחרי.
  const linked = new Map((await client.query<{ commitmentId: string; sum: number }>(`
    select "commitmentId", sum("amount")::float as "sum" from "donations"
     where coalesce("commitmentId",'') <> '' group by "commitmentId"`)).rows.map(r => [r.commitmentId, Number(r.sum)]))
  await client.end()

  const toConvert = rows.filter(r => r.commitmentId && r.donationType === 'commitment')
  const orphans = rows.filter(r => !r.commitmentId)
  const standing = rows.filter(r => r.commitmentId && r.donationType !== 'commitment')

  say('==================================================================')
  say('  הסבת תנועות של התחייבויות לתרומות מקושרות. קריאה בלבד.')
  say('==================================================================')
  say(`  תנועות פעילות: ${rows.length} · להסבה: ${toConvert.length} · הו"ק (לא נוגעים): ${standing.length} · בלי תרומה (יבוטלו): ${orphans.length}`)

  const byCommitment = new Map<string, Row[]>()
  for (const r of toConvert) byCommitment.set(r.commitmentId!, [...(byCommitment.get(r.commitmentId!) || []), r])
  say(`\n  התחייבויות: ${byCommitment.size}. "שולם" לפני ואחרי - אמור להיות זהה:`)
  for (const [cid, list] of byCommitment) {
    const pay = list.reduce((t, r) => t + Number(r.amount), 0)
    const lnk = linked.get(cid) || 0
    say(`    ${list[0].donorName} - התחייבות ${list[0].commitmentAmount}: לפני ${pay} (תנועות) + ${lnk} (תרומות) = ${pay + lnk} · אחרי 0 + ${lnk + pay} = ${pay + lnk} · ${list.length} תרומות חדשות`)
  }
  if (standing.length) say(`\n  הו"ק - נשארות: ${standing.map(r => `${r.donorName} ${r.amount}`).join(', ')}`)
  if (orphans.length) say(`  בלי תרומה - יבוטלו: ${orphans.map(r => `${r.amount} ${r.currencyId} ${d10(r.paymentDate)}`).join(', ')}`)

  if (!process.argv.includes('--sql')) {
    say('\n  הרץ שוב עם --sql לקבלת ההסבה. היא מודפסת, לא מורצת.\n')
    return
  }

  console.log(sqlHeader('הסבת תנועות של התחייבויות לתרומות מקושרות (שלב ג׳ 4.1 - כל תרומה = תנועה).'))
  console.log('')
  console.log('create table if not exists "payments_to_donations_backup" (')
  console.log('  "paymentId" text not null, "donationId" text not null, "paymentBefore" jsonb not null,')
  console.log('  "takenAt" timestamptz not null default now()')
  console.log(');')
  console.log('')
  console.log('begin;')
  for (const r of toConvert) {
    const id = newId()
    const notes = ['הוסב מתנועה מ-' + d10(r.paymentDate), r.reference && `אסמכתא ${r.reference}`, r.notes].filter(Boolean).join(' · ')
    console.log('')
    console.log(`-- ${r.donorName}: ${r.amount} ${r.currencyId} ${d10(r.paymentDate)}`)
    console.log(`insert into "payments_to_donations_backup" ("paymentId","donationId","paymentBefore")`)
    console.log(`  select "id", ${lit(id)}, to_jsonb(p) from "payments" p where "id" = ${lit(r.id)};`)
    console.log(`insert into "donations" ("id","donorId","amount","currencyId","donationDate","donationType","commitmentId",`)
    console.log(`  "donationMethodId","campaignId","notes","createdById","partnerIds","attachments","createdDate","updatedDate")`)
    console.log(`  values (${lit(id)}, ${lit(r.donorId)}, ${Number(r.amount)}, ${lit(r.currencyId)}, ${lit(d10(r.paymentDate))}, 'full', ${lit(r.commitmentId)},`)
    console.log(`  '', ${lit(r.campaignId)}, ${lit(notes)}, ${lit(r.createdById)}, '[]', '[]', now(), now());`)
    console.log(`update "payments" set "isActive" = false, "notes" = trim(coalesce("notes",'') || ' [הוסב לתרומה ${id}]') where "id" = ${lit(r.id)};`)
  }
  if (orphans.length) {
    console.log('')
    console.log('-- תנועות בלי תרומה (שארית בדיקה).')
    console.log(`update "payments" set "isActive" = false where "id" in (${orphans.map(r => lit(r.id)).join(', ')});`)
  }
  console.log('')
  console.log(`-- בדיקה לפני commit: אמור להחזיר ${toConvert.length} ו-0.`)
  console.log(`select count(*) from "payments_to_donations_backup";`)
  console.log(`select count(*) from "payments" p join "donations" d on d."id" = p."donationId" where p."isActive" = true and d."donationType" = 'commitment';`)
  console.log('')
  console.log('commit;')
  console.log('')
}

main().catch(err => { say(`שגיאה: ${err.message}`); process.exit(1) })
