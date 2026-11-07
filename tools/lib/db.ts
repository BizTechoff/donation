/**
 * חיבור למסד לכלי הדוחות והמיגרציה - המקום האחד.
 *
 * כל כלי ב-tools/ פותח חיבור באותה דרך: אותם דגלים, אותו סדר עדיפות, אותה
 * אזהרה כשהיעד פרודקשן. עד עכשיו כל כלי העתיק את זה לעצמו.
 *
 * דגלים:
 *   --prod      DATABASE_URL_PROD מ-.env (מחוץ לגיט) - עדיף על הדבקת סיסמה בשורת הפקודה.
 *   --url=...   מחרוזת חיבור מפורשת.
 *   ברירת מחדל  DATABASE_URL_REPORT, ואחריו DATABASE_URL.
 */
import 'dotenv/config'
import { Client } from 'pg'

export interface DbConnection {
  client: Client
  host: string
  /** רלוויי מגישה את הפרודקשן דרך פרוקסי ציבורי - שם המארח הוא הסימן היחיד. */
  isProd: boolean
  /** "<host>  ← פרודקשן" - למסך ולראש כל דוח. דוח שלא יודע מול מה רץ חסר ערך. */
  label: string
}

/** הודעות הכלים יוצאות ל-stderr, כך ש-stdout נשאר נקי ל-SQL שמופנה לקובץ. */
export const say = (text = '') => process.stderr.write(text + '\n')

export async function connectDb(argv: string[] = process.argv): Promise<DbConnection> {
  const urlArg = argv.find(a => a.startsWith('--url='))?.slice('--url='.length)
  const wantsProd = argv.includes('--prod')

  if (wantsProd && !process.env['DATABASE_URL_PROD']) {
    say('--prod הועבר אבל DATABASE_URL_PROD אינו מוגדר ב-.env.')
    process.exit(1)
  }

  const connectionString = urlArg
    || (wantsProd ? process.env['DATABASE_URL_PROD'] : '')
    || process.env['DATABASE_URL_REPORT']
    || process.env['DATABASE_URL']
  if (!connectionString) {
    say('אין מחרוזת חיבור. הגדר DATABASE_URL ב-.env, או העבר --url=...')
    process.exit(1)
  }

  let host = 'לא ידוע'
  try { host = new URL(connectionString).host } catch { /* פורמט אחר */ }
  const isProd = /rlwy\.net|railway/.test(host)
  const label = isProd ? `${host}  ← פרודקשן` : host
  say(`\n  מסד: ${label}\n`)

  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)
  const client = new Client({ connectionString, ssl: isLocal ? undefined : { rejectUnauthorized: false } })
  await client.connect()
  return { client, host, isProd, label }
}
