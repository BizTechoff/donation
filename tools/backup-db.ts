/**
 * גיבוי מלא של המסד לפני מיגרציה - קובץ מקומי בתיקייה backups (מחוץ לגיט:
 * יש בו פרטי תורמים).
 *
 *   npx tsx tools/backup-db.ts --prod
 *
 * עדיפות: pg_dump (קובץ .dump, שחזור ב-pg_restore). אם pg_dump לא מותקן או
 * שגרסתו ישנה מגרסת השרת - גיבוי נתונים ב-Node: כל טבלה כקובץ JSON בתיקייה
 * אחת, יחד עם מבנה העמודות. כך הגיבוי עובד בכל מחשב.
 */
import * as fs from 'fs'
import * as path from 'path'
import { spawnSync } from 'child_process'
import { connectDb, hostLabel, resolveConnectionString, say } from './lib/db'

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')

function tryPgDump(url: string, file: string): boolean {
  const version = spawnSync('pg_dump', ['--version'], { encoding: 'utf8', shell: false })
  if (version.error || version.status !== 0) { say('  pg_dump לא נמצא - עובר לגיבוי JSON.'); return false }
  say(`  ${version.stdout.trim()}`)
  const run = spawnSync('pg_dump', ['--format=custom', '--no-owner', '--no-acl', `--file=${file}`, `--dbname=${url}`],
    { encoding: 'utf8', stdio: ['ignore', 'inherit', 'pipe'], shell: false })
  if (run.status === 0) return true
  say(`  pg_dump נכשל - עובר לגיבוי JSON:\n  ${(run.stderr || '').trim()}`)
  if (fs.existsSync(file)) fs.unlinkSync(file)
  return false
}

async function jsonBackup(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
  const { client } = await connectDb()
  const tables = (await client.query<{ table_name: string }>(
    `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`)).rows
  const columns = (await client.query(
    `select table_name, column_name, data_type, is_nullable, column_default
       from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`)).rows
  fs.writeFileSync(path.join(dir, '_schema.json'), JSON.stringify(columns, null, 1))
  let total = 0
  for (const { table_name } of tables) {
    const { rows } = await client.query(`select * from "${table_name}"`)
    fs.writeFileSync(path.join(dir, `${table_name}.json`), JSON.stringify(rows))
    total += rows.length
    say(`    ${String(rows.length).padStart(7)}  ${table_name}`)
  }
  await client.end()
  say(`\n  ${tables.length} טבלאות, ${total} שורות.`)
}

async function main() {
  const url = resolveConnectionString()
  const { isProd, label } = hostLabel(url)
  const base = path.join('backups', `donation-${isProd ? 'prod' : 'local'}-${stamp()}`)
  fs.mkdirSync('backups', { recursive: true })
  say(`\n  גיבוי: ${label}\n`)

  if (tryPgDump(url, `${base}.dump`)) {
    const mb = (fs.statSync(`${base}.dump`).size / 1048576).toFixed(1)
    say(`\n  נשמר: ${base}.dump (${mb} MB)\n  שחזור: pg_restore --clean --no-owner --dbname=<url> ${base}.dump\n`)
    return
  }
  await jsonBackup(base)
  say(`  נשמר: ${base}\n`)
}

main().catch(err => { say(`שגיאה: ${err.message}`); process.exit(1) })
