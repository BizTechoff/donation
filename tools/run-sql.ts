/**
 * הרצת קובץ SQL שכלי מיגרציה הפיק - המקום האחד. הקובץ רץ כפי שהוא (כולל
 * ה-begin / commit שבו); שגיאה באמצע - rollback ושום דבר לא משתנה.
 * מדפיס את תוצאות שאילתות ה-select שבקובץ (שאילתות הבדיקה).
 *
 *   npx tsx tools/run-sql.ts --prod docs/legacy-check-fix.sql
 */
import * as fs from 'fs'
import { connectDb, say } from './lib/db'

async function main() {
  const file = process.argv.slice(2).find(a => !a.startsWith('--'))
  if (!file || !fs.existsSync(file)) { say('שימוש: npx tsx tools/run-sql.ts --prod <file.sql>'); process.exit(1) }
  const sql = fs.readFileSync(file, 'utf8')

  const { client, label } = await connectDb()
  say(`  מריץ: ${file}\n  על:   ${label}\n`)
  try {
    const result = await client.query(sql)
    const results = Array.isArray(result) ? result : [result]
    for (const r of results) if (r.command === 'SELECT') say(`  בדיקה: ${JSON.stringify(r.rows)}`)
    say(`\n  הסתיים: ${results.length} פקודות.\n`)
  } catch (err: any) {
    await client.query('rollback').catch(() => undefined)
    say(`\n  שגיאה - בוטל (rollback), שום דבר לא השתנה:\n  ${err.message}\n`)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

main()
