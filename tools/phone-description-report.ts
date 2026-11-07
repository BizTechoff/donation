/**
 * סעיף 6 - אילו ערכים כתובים היום בשדה "תיאור" של מספרי הטלפון. קריאה בלבד.
 *
 *   npx tsx tools/phone-description-report.ts
 *   npx tsx tools/phone-description-report.ts --prod
 *
 * הבסיס להחלטה על הרשימה הסגורה (נייד / טלפון / עבודה / פקס) ולמיגרציה:
 * לכל ערך - כמה מספרים נושאים אותו, וכמה מהם המספר עצמו מזהה כנייד.
 */
import { connectDb } from './lib/db'
import { isMobilePhone } from '../src/shared/utils/phone-utils'

async function main() {
  const { client } = await connectDb()
  const { rows } = await client.query<{ description: string | null; phoneNumber: string | null; isActive: boolean }>(`
    select c."description", c."phoneNumber", c."isActive"
      from "donor_contacts" c
     where c."type" = 'phone'
  `)
  await client.end()

  const groups = new Map<string, { total: number; active: number; mobileByNumber: number }>()
  for (const r of rows) {
    const key = (r.description || '').trim() || '(ריק)'
    const g = groups.get(key) || { total: 0, active: 0, mobileByNumber: 0 }
    g.total++
    if (r.isActive) g.active++
    // לפי המספר בלבד - בלי התיאור - כדי לראות כמה התיאור והמספר מסכימים.
    if (isMobilePhone(r.phoneNumber)) g.mobileByNumber++
    groups.set(key, g)
  }

  const sorted = [...groups].sort((a, b) => b[1].total - a[1].total)
  console.log(`  סה"כ מספרי טלפון: ${rows.length}, ערכי תיאור שונים: ${sorted.length}\n`)
  console.log('  כמות  פעילים  נייד-לפי-מספר  תיאור')
  for (const [desc, g] of sorted) {
    console.log(`  ${String(g.total).padStart(5)} ${String(g.active).padStart(7)} ${String(g.mobileByNumber).padStart(14)}  ${desc}`)
  }
  console.log()
}

main().catch(e => { console.error(e); process.exit(1) })
