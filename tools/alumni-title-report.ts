/**
 * סעיף 36 - מי מהתורמים נושא עדיין את התואר שהסימון קבע. קריאה בלבד.
 *
 *   npx tsx tools/alumni-title-report.ts
 *   npx tsx tools/alumni-title-report.ts --prod
 *   npx tsx tools/alumni-title-report.ts --prod --sql > docs/alumni-title.sql
 *
 * הרקע: עד 03.11 סימון "תלמידנו" מילא את שדה התואר בערך
 * 'תלמידנו הרה"ח ר'' כשהתואר היה ריק. ישראל הבהיר בזום שזו לא הדרישה -
 * הסימון אינו נוגע בתואר, והמילה מתווספת בהפקת המכתב בלבד.
 *
 * מכאן שהתורמים שסומנו לפני השינוי מחזיקים תואר שכולל כבר את המילה, ובמכתב
 * היא היתה מופיעה פעמיים אלמלא ההגנה ב-titleForLetter. ההמרה מפרידה את
 * השניים: התואר חוזר להיות 'הרה"ח ר'' בלבד, והסימון נושא את המשמעות.
 *
 * ישראל אישר בזום את מחיקת הערך מרשימת התוארים: "אם יש הצלבה בין התלמידנו
 * שם לתואר הזה של תלמידנו, אז צריך למחוק אותו".
 */
import { connectDb, say } from './lib/db'
import { lit, sqlHeader } from './lib/sql'
import { ALUMNI_TITLE, ALUMNI_LETTER_PREFIX } from '../src/shared/constants/donor-titles'

/** מה שנשאר מהתואר אחרי הפרדת המילה "תלמידנו". */
const STRIPPED_TITLE = ALUMNI_TITLE.slice(ALUMNI_LETTER_PREFIX.length).trim()

interface Row {
  id: string
  title: string
  isAlumni: boolean
  donorName: string
}

async function main() {
  const { client } = await connectDb()

  const { rows } = await client.query<Row>(`
    select "id",
           coalesce(btrim("title"), '')                                  as "title",
           coalesce("isAlumni", false)                                   as "isAlumni",
           trim(coalesce("firstName",'') || ' ' || coalesce("lastName",'')) as "donorName"
    from "donors"
    where btrim(coalesce("title", '')) like $1 || '%'
       or coalesce("isAlumni", false) = true
    order by "lastName", "firstName"
  `, [ALUMNI_LETTER_PREFIX])
  await client.end()

  const carriesPrefix = rows.filter(r => r.title.startsWith(ALUMNI_LETTER_PREFIX))
  const markedOnly = rows.filter(r => r.isAlumni && !r.title.startsWith(ALUMNI_LETTER_PREFIX))
  const needsFlag = carriesPrefix.filter(r => !r.isAlumni)

  say('==================================================================')
  say('  סעיף 36 - תואר "תלמידנו" מול הסימון. קריאה בלבד.')
  say('==================================================================')
  say(`  תואר שמתחיל ב"${ALUMNI_LETTER_PREFIX}":   ${carriesPrefix.length}`)
  say(`    מתוכם בלי הסימון:              ${needsFlag.length}`)
  say(`  מסומנים בלי המילה בתואר:          ${markedOnly.length}`)
  say('')
  say('  פירוט התוארים שנמצאו:')
  const byTitle = new Map<string, number>()
  for (const r of carriesPrefix) byTitle.set(r.title, (byTitle.get(r.title) || 0) + 1)
  for (const [title, n] of [...byTitle.entries()].sort((a, b) => b[1] - a[1])) {
    say(`    ${String(n).padStart(4)}  ${title}`)
  }

  if (!process.argv.includes('--sql')) {
    say('\n  הרץ שוב עם --sql לקבלת פקודות העדכון. הן מודפסות, לא מורצות.\n')
    return
  }

  const exact = carriesPrefix.filter(r => r.title === ALUMNI_TITLE)
  const other = carriesPrefix.filter(r => r.title !== ALUMNI_TITLE)

  console.log(sqlHeader('סעיף 36 - הפרדת המילה "תלמידנו" מהתואר אל הסימון.'))
  console.log('')
  console.log('create table if not exists "donors_title_backup" (')
  console.log('  "donorId"      text        not null,')
  console.log('  "titleBefore"  text        not null,')
  console.log('  "titleAfter"   text        not null,')
  console.log('  "isAlumniBefore" boolean   not null,')
  console.log('  "takenAt"      timestamptz not null default now()')
  console.log(');')
  console.log('')
  console.log('begin;')
  console.log('')
  console.log(`-- ${exact.length} תורמים עם התואר המדויק שהסימון קבע.`)
  for (const r of exact) {
    console.log(`insert into "donors_title_backup" ("donorId","titleBefore","titleAfter","isAlumniBefore")`)
    console.log(`  values (${lit(r.id)}, ${lit(r.title)}, ${lit(STRIPPED_TITLE)}, ${r.isAlumni});`)
    console.log(`update "donors" set "title" = ${lit(STRIPPED_TITLE)}, "isAlumni" = true`)
    console.log(`  where "id" = ${lit(r.id)} and btrim("title") = ${lit(r.title)};  -- ${r.donorName}`)
  }
  console.log('')
  console.log('-- בדיקה לפני commit: אמור להחזיר 0.')
  console.log(`select count(*) from "donors" where btrim(coalesce("title",'')) = ${lit(ALUMNI_TITLE)};`)
  console.log('')
  console.log('commit;')
  console.log('')

  if (other.length) {
    console.log('-- ----------------------------------------------------------------')
    console.log(`-- ${other.length} תוארים אחרים שפותחים ב"${ALUMNI_LETTER_PREFIX}" - לא נגעתי.`)
    console.log('-- לא ברור אם הוקלדו ביד או נוצרו אחרת; להכרעה שלך.')
    for (const r of other) console.log(`--   ${r.title}   (${r.donorName})`)
    console.log('')
  }

  console.log('-- לחזרה אחורה:')
  console.log('-- update "donors" d set "title" = b."titleBefore", "isAlumni" = b."isAlumniBefore"')
  console.log('--   from "donors_title_backup" b where b."donorId" = d."id";')
  console.log('')
}

main().catch(err => {
  console.error('שגיאה:', err.message)
  process.exit(1)
})
