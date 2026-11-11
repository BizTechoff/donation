/**
 * תנועות (payments) - למי הן שייכות ומה הן. קריאה בלבד.
 *
 *   npx tsx tools/payments-report.ts --prod
 *
 * לפני החלטה על הסבת התנועות לתרומות רגילות / מחיקתן: לכל תנועה - התורם,
 * התרומה שהיא שייכת אליה (סוג, סכום, אמצעי תשלום), ופרטי התנועה. בסוף -
 * סיכום לפי תורם ולפי סוג התרומה, ושורות שנראות כבדיקה.
 */
import { connectDb, say } from './lib/db'

interface Row {
  id: string; donorName: string; donationId: string; donationType: string; donationAmount: number
  donationCurrency: string; donationDate: string; method: string; amount: number; currencyId: string
  paymentDate: string; status: string; type: string; reference: string; notes: string
  isActive: boolean; createdDate: string
}

const d10 = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : '')

async function main() {
  const { client } = await connectDb()
  const { rows } = await client.query<Row>(`
    select p."id",
           trim(coalesce(n."lastName",'') || ' ' || coalesce(n."firstName",'')) as "donorName",
           p."donationId", coalesce(d."donationType",'') as "donationType",
           coalesce(d."amount",0) as "donationAmount", coalesce(d."currencyId",'') as "donationCurrency",
           d."donationDate", coalesce(m."name",'') as "method",
           p."amount", p."currencyId", p."paymentDate", p."status", p."type",
           coalesce(p."reference",'') as "reference", coalesce(p."notes",'') as "notes",
           p."isActive", p."createdDate"
      from "payments" p
      left join "donations" d on d."id" = p."donationId"
      left join "donors" n on n."id" = d."donorId"
      left join "donation_methods" m on m."id" = d."donationMethodId"
     order by "donorName", p."paymentDate"`)
  await client.end()

  say('==================================================================')
  say(`  תנועות: ${rows.length} (פעילות: ${rows.filter(r => r.isActive).length}). קריאה בלבד.`)
  say('==================================================================')
  for (const r of rows) {
    say(`  ${r.isActive ? ' ' : 'x'} ${r.donorName || '(אין תורם)'} | תרומה: ${r.donationType || '?'} ${r.donationAmount} ${r.donationCurrency} ${d10(r.donationDate)} ${r.method}`)
    say(`      תנועה: ${r.amount} ${r.currencyId} ${d10(r.paymentDate)} ${r.status} ${r.type}${r.reference ? ' אסמכתא ' + r.reference : ''}${r.notes ? ' | ' + r.notes : ''} | נוצרה ${d10(r.createdDate)}`)
  }

  const group = (key: (r: Row) => string) => {
    const m = new Map<string, { n: number; sum: number }>()
    for (const r of rows) { const k = key(r); const g = m.get(k) || { n: 0, sum: 0 }; g.n++; g.sum += Number(r.amount) || 0; m.set(k, g) }
    return [...m].sort((a, b) => b[1].n - a[1].n)
  }
  say('\n  לפי תורם:')
  for (const [k, g] of group(r => r.donorName || '(אין תורם)')) say(`    ${String(g.n).padStart(3)}  ${k}  (סה"כ ${g.sum})`)
  say('\n  לפי סוג התרומה:')
  for (const [k, g] of group(r => `${r.donationType || '?'} / ${r.method || '?'}`)) say(`    ${String(g.n).padStart(3)}  ${k}`)
  const suspect = rows.filter(r => !r.donorName || Number(r.amount) <= 1 || /test|בדיק|טסט/i.test(r.notes + r.reference))
  say(`\n  נראות כבדיקה (בלי תורם / סכום 1 ומטה / "בדיקה"): ${suspect.length}\n`)
}

main().catch(err => { say(`שגיאה: ${err.message}`); process.exit(1) })
