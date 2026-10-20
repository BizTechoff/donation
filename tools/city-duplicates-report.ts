/**
 * דוח ערים כפולות - סעיף 2 (E1). קריאה בלבד.
 *
 * הרצה מתיקיית הפרויקט, מול המסד שב-.env:
 *   npx tsx tools/city-duplicates-report.ts
 *
 * מול מסד אחר (פרודקשן ב-Railway), בלי לגעת ב-.env:
 *   set DATABASE_URL_REPORT=postgres://...   &&  npx tsx tools/city-duplicates-report.ts
 * או:
 *   npx tsx tools/city-duplicates-report.ts --url=postgres://...
 *
 * ה-URL לא נשמר בשום מקום ולא מודפס - רק שם המארח, כדי שיהיה ברור מול מה
 * רצה הבדיקה.
 *
 * הסקריפט קורא את DATABASE_URL מ-.env, מושך את הערים מ-places עם ספירת
 * תורמים ומרכז קואורדינטות, ומדפיס את הקבוצות דרך אותה לוגיקה שבה משתמש
 * CityDuplicatesController - shared/utils/city-matching. אין כאן עותק שני
 * של הזיהוי, ולכן מה שרואים כאן הוא מה שהמסך יראה.
 *
 * הסקריפט לא כותב ולא מוחק דבר. עם --sql הוא גם מדפיס את ה-UPDATE לאיחוד -
 * מדפיס בלבד, לא מריץ. ההרצה בידיים שלך, אחרי קריאה.
 */
import 'dotenv/config'
import { Client } from 'pg'
import { CityDuplicateGroup, CityVariant, groupDuplicateCities } from '../src/shared/utils/city-matching'

async function main() {
  const urlArg = process.argv.find(a => a.startsWith('--url='))?.slice('--url='.length)
  const connectionString = urlArg || process.env['DATABASE_URL_REPORT'] || process.env['DATABASE_URL']
  if (!connectionString) {
    console.error('אין מחרוזת חיבור. הגדר DATABASE_URL ב-.env, או העבר --url=...')
    process.exit(1)
  }

  // רק שם המארח, בלי משתמש וסיסמה.
  let host = 'לא ידוע'
  try { host = new URL(connectionString).host } catch { /* מחרוזת בפורמט אחר */ }
  console.log(`\n  מסד: ${host}`)

  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)
  const client = new Client({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false }
  })
  await client.connect()

  // ספירת תורמים ייחודיים דרך donor_places פעילות - אותו מקור שממנו נבנית
  // רשימת הערים בסינון הגלובלי.
  const { rows } = await client.query<{
    city: string
    placecount: string
    donorcount: string
    geocount: string
    lat: string | null
    lng: string | null
  }>(`
    select
      btrim(p."city")                                        as city,
      count(distinct p."id")                                 as placecount,
      count(distinct dp."donorId")                           as donorcount,
      count(p."latitude")                                    as geocount,
      avg(p."latitude")                                      as lat,
      avg(p."longitude")                                     as lng
    from "places" p
    left join "donor_places" dp on dp."placeId" = p."id" and dp."isActive" = true
    where p."city" is not null and btrim(p."city") <> ''
    group by btrim(p."city")
  `)

  const variants: CityVariant[] = rows.map(r => ({
    name: r.city,
    placeCount: Number(r.placecount),
    donorCount: Number(r.donorcount),
    geoCount: Number(r.geocount),
    lat: r.lat === null ? undefined : Number(r.lat),
    lng: r.lng === null ? undefined : Number(r.lng)
  }))

  const groups = groupDuplicateCities(variants)

  const { rows: orphanRows } = await client.query<{ count: string }>(`
    select count(*) as count
    from "places" p
    where not exists (select 1 from "donor_places"  dp where dp."placeId" = p."id")
      and not exists (select 1 from "banks"          b where  b."placeId" = p."id")
      and not exists (select 1 from "companies"      c where  c."placeId" = p."id")
      and not exists (select 1 from "organizations"  o where  o."placeId" = p."id")
      -- campaigns מצביע דרך eventLocationId ולא placeId (מיקום אירוע הדינער).
      -- בלי השורה הזו כל מיקום אירוע נספר כיתום.
      and not exists (select 1 from "campaigns"      ca where ca."eventLocationId" = p."id")
  `)
  await client.end()

  const totalPlaces = variants.reduce((t, v) => t + v.placeCount, 0)
  const inGroups = groups.reduce((t, g) => t + g.variants.length, 0)

  console.log('')
  console.log('==================================================================')
  console.log('  דוח ערים כפולות - קריאה בלבד, שום דבר לא שונה')
  console.log('==================================================================')
  console.log(`  ערים שונות בטבלה:      ${variants.length}`)
  console.log(`  רשומות places:          ${totalPlaces}`)
  console.log(`  עם קואורדינטות:         ${variants.filter(v => v.lat !== undefined).length} ערים`)
  console.log(`  קבוצות כפילות:          ${groups.length}  (${inGroups} גרסאות)`)
  console.log(`  places יתומות:          ${orphanRows[0]?.count ?? '?'}`)
  console.log('')

  if (groups.length === 0) {
    console.log('  לא נמצאו כפילויות.')
  }

  groups.forEach((g, i) => {
    const basis = g.basis === 'both' ? 'כתיב+מיקום' : g.basis === 'location' ? 'מיקום בלבד' : 'כתיב בלבד'
    const distance = g.maxDistanceKm === undefined ? 'אין מיקום' : `${g.maxDistanceKm} ק"מ`
    console.log(`${String(i + 1).padStart(3)}. [${basis}] מרחק מהגרסה הראשית: ${distance}`)
    const outliers = new Set(g.locationOutliers || [])
    for (const v of g.variants) {
      const mark = v.name === g.suggested ? '->' : '  '
      const geo = v.geoCount ? '' : '  (בלי קואורדינטות)'
      const flag = outliers.has(v.name) ? '   <<< קואורדינטות חורגות' : ''
      console.log(`     ${mark} ${v.name.padEnd(28)} ${String(v.donorCount).padStart(5)} תורמים   ${String(v.placeCount).padStart(5)} כתובות${geo}${flag}`)
    }
    console.log('')
  })

  if (process.argv.includes('--sql')) printMergeSql(groups)

  console.log('  -> מסומן בחץ: ההצעה לערך המוביל (הגרסה עם הכי הרבה תורמים).')
  console.log('  <<< מסומן כך: הקואורדינטות של הגרסה רחוקות מהראשית - כנראה גיאוקודינג שגוי,')
  console.log('      לא קבוצה שגויה. שווה בדיקה בנפרד, זה משפיע על המפה.')
  console.log('')
}

/**
 * ה-UPDATE לאיחוד. מודפס בלבד.
 *
 * הערך המוביל הוא הגרסה עם הכי הרבה תורמים, ואם שוות - הכי הרבה כתובות.
 * כל שאר הגרסאות בקבוצה מתעדכנות אליו, לפי הערך המדויק כפי שהוא שמור.
 *
 * קבוצה שבה סומנה גרסה חורגת מודפסת כהערה ולא כפקודה: שם צריך הכרעה אנושית -
 * או שהקואורדינטות שגויות (והאיחוד נכון), או ששתי הערים באמת שונות.
 */
function printMergeSql(groups: CityDuplicateGroup[]) {
  const quote = (s: string) => `'${s.replace(/'/g, "''")}'`

  console.log('')
  console.log('==================================================================')
  console.log('  SQL לאיחוד - להרצה ידנית, אחרי קריאה. לא הורץ.')
  console.log('==================================================================')
  console.log('')
  console.log('begin;')
  console.log('')

  let clean = 0
  let flagged = 0

  for (const g of groups) {
    const others = g.variants.filter(v => v.name !== g.suggested)
    if (others.length === 0) continue

    const statement =
      `update "places" set "city" = ${quote(g.suggested)}\n` +
      `  where btrim("city") in (${others.map(v => quote(v.name)).join(', ')});`

    // הקבוצות פעילות גם כשסומנה חריגת קואורדינטות: אחרי שההתאמה החוצת-כתב
    // נדחית על ידי המיקום, חריגה שנותרה היא באג גיאוקודינג בכתובת בודדת -
    // לא קבוצה שגויה. איחוד המחרוזת נכון בלי קשר לקואורדינטות.
    const affected = others.reduce((t, v) => t + v.placeCount, 0)
    if (g.locationConflict) {
      flagged++
      console.log(`-- ${g.suggested}: ${affected} כתובות מ-${others.length} גרסאות`)
      console.log(`-- שים לב: קואורדינטות שגויות ב-${g.locationOutliers?.join(', ')} - לתקן בנפרד, לא חוסם את האיחוד.`)
    } else {
      clean++
      console.log(`-- ${g.suggested}: ${affected} כתובות מ-${others.length} גרסאות`)
    }
    console.log(statement)
    console.log('')
  }

  console.log('-- לפני commit: לבדוק שהמספרים תואמים')
  console.log('select btrim("city") as city, count(*) from "places" group by 1 order by 2 desc;')
  console.log('')
  console.log('commit;')
  printOrphanSql()
  console.log('')
  console.log(`  ${clean + flagged} קבוצות לאיחוד, מהן ${flagged} עם כתובת שהגיאוקודינג שלה שגוי.`)
  console.log('')
}

/**
 * היתומות - places שאף אחת מחמש היישויות המצביעות לא מחזיקה.
 *
 * חמש ולא ארבע: donor_places, banks, companies, organizations ו-campaigns,
 * שמצביע דרך "eventLocationId" ולא "placeId". הרשימה נגזרת מהדקורטורים
 * @Relations.toOne(() => Place) ולא משמות העמודות.
 *
 * אזהרה: אלה אינם foreign keys אמיתיים אלא קשרים של רימלט. פוסטגרס לא יעצור
 * מחיקה של place שמישהו מצביע עליו - אין לו מושג על הקשר. ולכן ה-select
 * חייב לרוץ ולהיבדק לפני ה-delete, וה-delete מודפס כהערה.
 */
function printOrphanSql() {
  const notReferenced = `  where not exists (select 1 from "donor_places"  dp where dp."placeId" = p."id")
    and not exists (select 1 from "banks"          b where  b."placeId" = p."id")
    and not exists (select 1 from "companies"      c where  c."placeId" = p."id")
    and not exists (select 1 from "organizations"  o where  o."placeId" = p."id")
    and not exists (select 1 from "campaigns"      ca where ca."eventLocationId" = p."id")`

  console.log('')
  console.log('==================================================================')
  console.log('  SQL ליתומות - להרצה בנפרד, אחרי האיחוד')
  console.log('==================================================================')
  console.log('')
  console.log('-- 1. לראות מה עומד להימחק. להריץ קודם, ולעבור על הרשימה.')
  console.log('select p."id", p."city", p."street", p."houseNumber", p."fullAddress"')
  console.log('from "places" p')
  console.log(notReferenced)
  console.log('order by p."city";')
  console.log('')
  console.log('-- 2. המחיקה. להסיר את ה-- רק אחרי שהרשימה למעלה נבדקה.')
  console.log('--    מחיקה בפרודקשן היא סופית, אין ביטול ואין Trash.')
  console.log('-- begin;')
  console.log('-- delete from "places" p')
  console.log(notReferenced.split('\n').map(l => '-- ' + l).join('\n'))
  console.log('-- ;')
  console.log('-- commit;')
  console.log('')
}

main().catch(err => {
  console.error('שגיאה:', err.message)
  process.exit(1)
})
