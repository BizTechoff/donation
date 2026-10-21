/**
 * דוח נרמול טלפונים - I1 (סעיפים 1, 31). קריאה בלבד. שום דבר לא מורץ.
 *
 *   npx tsx tools/phone-normalize-report.ts                   מול המסד המקומי
 *   npx tsx tools/phone-normalize-report.ts --prod            מול פרודקשן
 *   npx tsx tools/phone-normalize-report.ts --prod --sql      גם פקודות העדכון
 *   npx tsx tools/phone-normalize-report.ts --url=postgresql://...
 *
 * --prod קורא את DATABASE_URL_PROD מ-.env (מחוץ לגיט). זה עדיף על הדבקת
 * המחרוזת בשורת הפקודה: היא נשמרת בהיסטוריית ה-shell, וסיסמת פרודקשן לא
 * אמורה לשבת שם.
 *
 * הסיווג יושב ב-tools/phone-classify.ts, שם גם ההסבר למה הוא נראה כפי שהוא.
 * הפענוח עצמו נעשה דרך shared/utils/phone-format - אותה לוגיקה של הקונטרול,
 * בלי עותק שני. מה שהדוח אומר הוא מה שהמסך יציג.
 */
import 'dotenv/config'
import { Client } from 'pg'
import { writeFileSync } from 'fs'
import { Classification, Confidence, classifyPhone } from './phone-classify'

/**
 * הדוח לקונסולה נכתב ל-stderr, וה-SQL בלבד ל-stdout.
 * בלי ההפרדה הזו "--sql > file.sql" מכניס את כותרות הדוח לתוך הקובץ,
 * ו-psql נופל על השורה הראשונה.
 */
const say = (text = '') => process.stderr.write(text + '\n')

interface Row {
  id: string
  donorId: string
  phoneNumber: string
  description: string
  donorName: string
  /** קוד מדינת הכתובת הראשית של התורם - ממנו נגזרת מדינת הפענוח. */
  countryCode: string
}

type Result = { row: Row; result: Classification }

const ORDER: Confidence[] = ['ודאי', 'גבוה', 'ידני', 'ללא שינוי']

const COLOR: Record<Confidence, string> = {
  'ודאי': '#27ae60',
  'גבוה': '#2980b9',
  'ידני': '#c0392b',
  'ללא שינוי': '#95a5a6'
}

async function main() {
  const urlArg = process.argv.find(a => a.startsWith('--url='))?.slice('--url='.length)
  const wantsProd = process.argv.includes('--prod')

  if (wantsProd && !process.env['DATABASE_URL_PROD']) {
    console.error('--prod הועבר אבל DATABASE_URL_PROD אינו מוגדר ב-.env.')
    process.exit(1)
  }

  const connectionString = urlArg
    || (wantsProd ? process.env['DATABASE_URL_PROD'] : '')
    || process.env['DATABASE_URL_REPORT']
    || process.env['DATABASE_URL']
  if (!connectionString) {
    console.error('אין מחרוזת חיבור. הגדר DATABASE_URL ב-.env, או העבר --url=...')
    process.exit(1)
  }

  let host = 'לא ידוע'
  try { host = new URL(connectionString).host } catch { /* פורמט אחר */ }

  // רלוויי מגישה את הפרודקשן דרך פרוקסי ציבורי, ולכן שם המארח הוא הסימן
  // היחיד שמבדיל אותו מהמקומי. הוא נכתב גם למסך וגם לראש הדוח - דוח ישן
  // שנשמר בלי לדעת מול מה רץ הוא דוח חסר ערך.
  const isProd = /rlwy\.net|railway/.test(host)
  const label = isProd ? `${host}  ← פרודקשן` : host
  say(`\n  מסד: ${label}\n`)

  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)
  const client = new Client({ connectionString, ssl: isLocal ? undefined : { rejectUnauthorized: false } })
  await client.connect()

  const { rows } = await client.query<Row>(`
    select c."id",
           coalesce(c."donorId", '')                                as "donorId",
           btrim(c."phoneNumber")                                   as "phoneNumber",
           coalesce(btrim(c."description"), '')                     as "description",
           trim(coalesce(d."firstName",'') || ' ' || coalesce(d."lastName",'')) as "donorName",
           coalesce((
             select co."code"
             from "donor_places" dp
             join "places" p on p."id" = dp."placeId"
             left join "countries" co on co."id" = p."countryId"
             where dp."donorId" = c."donorId" and dp."isActive" = true
             order by dp."isPrimary" desc
             limit 1), '')                                          as "countryCode"
    from "donor_contacts" c
    left join "donors" d on d."id" = c."donorId"
    where c."type" = 'phone'
      and c."phoneNumber" is not null
      and btrim(c."phoneNumber") <> ''
    order by c."id"
  `)
  await client.end()

  const results: Result[] = rows.map(row => ({
    row,
    result: classifyPhone(row.phoneNumber, row.countryCode, row.description)
  }))

  const counts = new Map<Confidence, number>()
  for (const r of results) counts.set(r.result.confidence, (counts.get(r.result.confidence) || 0) + 1)

  say('==================================================================')
  say('  דוח נרמול טלפונים - קריאה בלבד, שום דבר לא שונה')
  say('==================================================================')
  say(`  סך רשומות טלפון: ${rows.length}\n`)
  for (const c of ORDER) say(`  ${c.padEnd(12)} ${String(counts.get(c) || 0).padStart(5)}`)

  // פירוט הסיבות - כך רואים מיד אם קבוצה שלמה נתקעת מסיבה אחת שאפשר לסגור.
  for (const c of ORDER) {
    const list = results.filter(r => r.result.confidence === c)
    if (!list.length || c === 'ללא שינוי') continue
    const byReason = new Map<string, number>()
    for (const r of list) byReason.set(r.result.reason, (byReason.get(r.result.reason) || 0) + 1)
    say(`\n  ${c}:`)
    for (const [reason, n] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
      say(`    ${String(n).padStart(5)}  ${reason}`)
    }
  }

  say('\n  לטיפול ידני:')
  for (const { row, result } of results.filter(r => r.result.confidence === 'ידני')) {
    say(`    ${row.phoneNumber.padEnd(22)} ${(row.countryCode || '--').padEnd(4)} ${row.description.padEnd(12)} ${row.donorName}`)
    say(`      ${result.reason}`)
  }

  if (process.argv.includes('--sql')) printSql(results)
  else say(`\n  הרץ שוב עם --sql לקבלת פקודות העדכון. הן מודפסות, לא מורצות.\n`)

  writeHtml(results, label)
}

/**
 * ה-SQL, בבלוקים לפי רמת ודאות - כדי שאפשר יהיה להריץ את הוודאי לבדו,
 * לבדוק במסך, ורק אז להחליט על השאר. בלוק אחד גדול לא מאפשר את זה.
 *
 * כל בלוק מגבה את הערך הקודם אל donor_contacts_phone_backup באותה
 * טרנזקציה. בלי זה אין דרך לחזור: הערך המקורי נדרס ואין לו עותק.
 */
function printSql(results: Result[]) {
  const esc = (s: string) => s.replace(/'/g, "''")

  console.log('')
  console.log('-- =================================================================')
  console.log('-- נרמול טלפונים ל-E.164. מודפס בלבד - לא הורץ.')
  console.log('-- =================================================================')
  console.log('')
  console.log('create table if not exists "donor_contacts_phone_backup" (')
  console.log('  "contactId"   text        not null,')
  console.log('  "phoneBefore" text        not null,')
  console.log('  "phoneAfter"  text        not null,')
  console.log('  "confidence"  text        not null,')
  console.log('  "reason"      text        not null,')
  console.log('  "takenAt"     timestamptz not null default now()')
  console.log(');')
  console.log('')

  for (const confidence of ['ודאי', 'גבוה'] as Confidence[]) {
    const list = results.filter(r => r.result.confidence === confidence && r.result.e164 && r.result.e164 !== r.row.phoneNumber)
    if (!list.length) continue

    console.log(`-- ----------------------------------------------------------------`)
    console.log(`-- בלוק "${confidence}" - ${list.length} רשומות`)
    console.log(`-- ----------------------------------------------------------------`)
    console.log('begin;')
    console.log('')
    console.log('insert into "donor_contacts_phone_backup"')
    console.log('  ("contactId", "phoneBefore", "phoneAfter", "confidence", "reason")')
    console.log('values')
    console.log(list.map(({ row, result }) =>
      `  ('${esc(row.id)}', '${esc(row.phoneNumber)}', '${esc(result.e164)}', '${confidence}', '${esc(result.reason)}')`
    ).join(',\n') + ';')
    console.log('')
    for (const { row, result } of list) {
      // התנאי על הערך הנוכחי הוא מה שהופך את הקובץ לבטוח: הרצה שנייה לא
      // עושה דבר, והרצה של קובץ ישן אחרי שמישהו תיקן ידנית במסך לא דורסת
      // את התיקון שלו - השורה פשוט לא נתפסת.
      console.log(`update "donor_contacts" set "phoneNumber" = '${esc(result.e164)}'`)
      console.log(`  where "id" = '${esc(row.id)}' and btrim("phoneNumber") = '${esc(row.phoneNumber)}';`)
    }
    console.log('')

    // שדה שהחזיק שני מספרים: הראשון נכתב בעדכון שלמעלה, השני נפתח כרשומה
    // נוספת. uuid_generate_v4 אינו מובטח בכל מסד - gen_random_uuid קיים
    // בפוסטגרס 13 ומעלה והוא מה שרימלט מייצר ממילא.
    const splits = list.filter(r => r.result.split)
    if (splits.length) {
      console.log(`-- ${splits.length} רשומות שהחזיקו שני מספרים - המספר השני נפתח כרשומה נוספת.`)
      for (const { row, result } of splits) {
        // not exists - אחרת הרצה שנייה של הקובץ פותחת רשומה כפולה.
        console.log(`insert into "donor_contacts" ("id", "donorId", "type", "phoneNumber", "description", "isPrimary", "isActive", "createdDate", "updatedDate")`)
        console.log(`  select gen_random_uuid()::text, '${esc(row.donorId)}', 'phone', '${esc(result.split!)}', '${esc(row.description)}', false, true, now(), now()`)
        console.log(`  where not exists (select 1 from "donor_contacts"`)
        console.log(`    where "donorId" = '${esc(row.donorId)}' and "phoneNumber" = '${esc(result.split!)}');  -- ${row.phoneNumber}`)
      }
      console.log('')
    }

    console.log('-- בדיקה לפני commit. הראשון אמור להיות ' + list.length + ',')
    console.log('-- והשני 0 - לא נותר מספר שאינו E.164 בקבוצה הזו.')
    console.log(`select count(*) from "donor_contacts_phone_backup" where "confidence" = '${confidence}';`)
    console.log(`select count(*) from "donor_contacts" where "id" in (${list.map(r => `'${esc(r.row.id)}'`).join(', ')}) and "phoneNumber" not like '+%';`)
    console.log('')
    console.log('commit;')
    console.log('')
  }

  console.log('-- ----------------------------------------------------------------')
  console.log('-- לחזרה אחורה, כולה או לפי בלוק:')
  console.log('-- ----------------------------------------------------------------')
  console.log('-- update "donor_contacts" c set "phoneNumber" = b."phoneBefore"')
  console.log('--   from "donor_contacts_phone_backup" b')
  console.log(`--   where b."contactId" = c."id" and b."confidence" = 'גבוה';`)
  console.log('')
}

/** דוח HTML - כל מספר, ולידו איך ייראה אחרי העדכון ולמה. */
function writeHtml(results: Result[], host: string) {
  const esc = (s: string) => (s || '').replace(/[&<>"]/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string))

  const counts = new Map<Confidence, number>()
  for (const r of results) counts.set(r.result.confidence, (counts.get(r.result.confidence) || 0) + 1)

  const rows = results.map(({ row, result }) => `
    <tr data-c="${esc(result.confidence)}">
      <td>${esc(row.donorName)}</td>
      <td class="ltr">${esc(row.phoneNumber)}</td>
      <td>${esc(row.countryCode || '--')}</td>
      <td class="ltr after">${esc(result.e164 && result.e164 !== row.phoneNumber ? result.e164 : '')}${result.split ? `<br>${esc(result.split)}` : ''}</td>
      <td>${result.lineType === 'mobile' ? 'נייד' : result.lineType === 'landline' ? 'טלפון' : ''}</td>
      <td>${esc(row.description)}</td>
      <td style="color:${COLOR[result.confidence]};font-weight:600">${esc(result.confidence)}</td>
      <td class="reason">${esc(result.reason)}${result.alternatives.length ? ` <span class="alt">(${esc(result.alternatives.join(' · '))})</span>` : ''}</td>
    </tr>`).join('')

  const summary = ORDER
    .map(c => `<button class="chip" data-f="${esc(c)}" style="border-color:${COLOR[c]};color:${COLOR[c]}">${c}: ${counts.get(c) || 0}</button>`)
    .join(' ') + ` <button class="chip" data-f="" style="border-color:#2c3e50;color:#2c3e50">הכל: ${results.length}</button>`

  const html = `<!doctype html>
<html dir="rtl" lang="he"><head><meta charset="utf-8">
<title>נרמול טלפונים - I1</title>
<style>
 body{font-family:'Segoe UI',Arial,sans-serif;margin:24px;color:#2c3e50;background:#fafbfc}
 h1{font-size:20px;margin:0 0 4px}
 .meta{color:#7f8c8d;font-size:13px;margin-bottom:12px;line-height:1.6}
 .chip{display:inline-block;border:1px solid;border-radius:12px;padding:4px 12px;font-size:12px;
       margin-left:6px;background:#fff;cursor:pointer;font-family:inherit}
 .chip:hover{background:#f0f3f6}
 table{width:100%;border-collapse:collapse;background:#fff;font-size:13px}
 th{background:#4a5568;color:#fff;padding:8px;text-align:right;position:sticky;top:0}
 td{padding:6px 8px;border-bottom:1px solid #eef2f5;vertical-align:top}
 tr:nth-child(even){background:#fafbfc}
 .ltr{direction:ltr;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
 .after{font-weight:600}
 .reason{color:#7f8c8d;font-size:12px}
 .alt{color:#b0bac5}
</style></head><body>
<h1>נרמול טלפונים - I1</h1>
<div class="meta">מסד: ${esc(host)} · ${results.length} רשומות · הופק ${new Date().toLocaleString('he-IL')}<br>
קריאה בלבד. "אחרי" מציג את הערך שייכתב.
<b>ודאי</b> - אין פירוש אחר. <b>גבוה</b> - מדינת הכתובת מכריעה מול חלופה, או כלל מתועד; בלוק נפרד.
<b>ידני</b> - חייב החלטה אנושית.</div>
<div style="margin-bottom:12px">${summary}</div>
<table><thead><tr>
 <th>תורם</th><th>לפני</th><th>מדינה</th><th>אחרי</th><th>סוג קו</th><th>תיאור</th><th>ודאות</th><th>סיבה</th>
</tr></thead><tbody>${rows}</tbody></table>
<script>
 // סינון לפי רמת ודאות - הקבוצה הידנית היא מה שבאמת צריך לעבור עליו,
 // ובלי סינון היא טובעת בתוך שלושת אלפים שורות.
 document.querySelectorAll('.chip').forEach(function (b) {
   b.addEventListener('click', function () {
     var f = b.dataset.f
     document.querySelectorAll('tbody tr').forEach(function (tr) {
       tr.style.display = (!f || tr.dataset.c === f) ? '' : 'none'
     })
   })
 })
</script>
</body></html>`

  const path = 'docs/phone-normalize-report.html'
  writeFileSync(path, html, 'utf-8')
  say(`  דוח HTML נכתב אל ${path}\n`)
}

main().catch(err => {
  console.error('שגיאה:', err.message)
  process.exit(1)
})
