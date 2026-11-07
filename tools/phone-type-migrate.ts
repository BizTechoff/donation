/**
 * סעיף 6 - המרת תיאורי הטלפון לרשימה הסגורה (נייד / טלפון / עבודה / פקס).
 * קריאה בלבד; עם --sql מדפיס את פקודות העדכון, לא מריץ אותן.
 *
 *   npx tsx tools/phone-type-migrate.ts --prod
 *   npx tsx tools/phone-type-migrate.ts --prod --sql > docs/phone-type.sql
 *
 * מה מומר: כל מספר שהתיאור שלו אינו ערך מהרשימה. בפרודקשן (07.11) - 72
 * "טלפון נוסף" ו-1 "נייד 2". ההכרעה היא PhoneType.fromDescription - הכלל
 * שהמערכת עצמה משתמשת בו - ואם הוא לא מכריע ("טלפון נוסף"), לפי המספר.
 * כך מה שיישמר הוא בדיוק מה שהרשימות מציגות היום.
 */
import { connectDb, say } from './lib/db'
import { lit, sqlHeader } from './lib/sql'
import { PhoneType } from '../src/shared/enum/phone-type'
import { isMobileNumber } from '../src/shared/utils/phone-utils'

interface Row { id: string; description: string; phoneNumber: string; donorName: string }

const LIST = new Set(PhoneType.all().map(t => t.id))

/** הסוג שהמספר יקבל. */
function targetType(r: Row): PhoneType {
  return PhoneType.fromDescription(r.description)
    || (isMobileNumber(r.phoneNumber) ? PhoneType.mobile : PhoneType.phone)
}

async function main() {
  const { client } = await connectDb()
  const { rows } = await client.query<Row>(`
    select c."id",
           btrim(coalesce(c."description", ''))                               as "description",
           coalesce(c."phoneNumber", '')                                      as "phoneNumber",
           trim(coalesce(d."firstName",'') || ' ' || coalesce(d."lastName",'')) as "donorName"
      from "donor_contacts" c
      left join "donors" d on d."id" = c."donorId"
     where c."type" = 'phone'
  `)
  await client.end()

  const toConvert = rows.filter(r => !LIST.has(r.description))

  say('==================================================================')
  say('  סעיף 6 - סוג טלפון כרשימה סגורה. קריאה בלבד.')
  say('==================================================================')
  say(`  מספרי טלפון: ${rows.length}, כבר מהרשימה: ${rows.length - toConvert.length}, להמרה: ${toConvert.length}\n`)
  const summary = new Map<string, number>()
  for (const r of toConvert) {
    const key = `${r.description || '(ריק)'}  ->  ${targetType(r).id}`
    summary.set(key, (summary.get(key) || 0) + 1)
  }
  for (const [key, n] of [...summary].sort((a, b) => b[1] - a[1])) say(`    ${String(n).padStart(4)}  ${key}`)

  if (!process.argv.includes('--sql')) {
    say('\n  הרץ שוב עם --sql לקבלת פקודות העדכון. הן מודפסות, לא מורצות.\n')
    return
  }

  console.log(sqlHeader('סעיף 6 - תיאורי טלפון לרשימה הסגורה.'))
  console.log('')
  console.log('create table if not exists "donor_contacts_type_backup" (')
  console.log('  "contactId"         text        not null,')
  console.log('  "descriptionBefore" text        not null,')
  console.log('  "descriptionAfter"  text        not null,')
  console.log('  "takenAt"           timestamptz not null default now()')
  console.log(');')
  console.log('')
  console.log('begin;')
  console.log('')
  for (const r of toConvert) {
    const after = targetType(r).id
    console.log(`insert into "donor_contacts_type_backup" ("contactId","descriptionBefore","descriptionAfter")`)
    console.log(`  values (${lit(r.id)}, ${lit(r.description)}, ${lit(after)});`)
    console.log(`update "donor_contacts" set "description" = ${lit(after)}`)
    console.log(`  where "id" = ${lit(r.id)} and btrim(coalesce("description", '')) = ${lit(r.description)};  -- ${r.donorName} ${r.phoneNumber}`)
  }
  console.log('')
  console.log('-- בדיקה לפני commit: אמור להחזיר 0.')
  console.log(`select count(*) from "donor_contacts" where "type" = 'phone'`)
  console.log(`  and btrim(coalesce("description", '')) not in (${[...LIST].map(lit).join(', ')});`)
  console.log('')
  console.log('commit;')
  console.log('')
  console.log('-- לחזרה אחורה:')
  console.log('-- update "donor_contacts" c set "description" = b."descriptionBefore"')
  console.log('--   from "donor_contacts_type_backup" b where b."contactId" = c."id";')
  console.log('')
}

main().catch(err => {
  console.error('שגיאה:', err.message)
  process.exit(1)
})
