// רשימה מלאה של כפילויות IdName בין TbName.xlsx ל-TbNameUSA.xlsx
// הרצה:
//   node tools/list-donor-duplicates.js

const XLSX = require('xlsx')
const fs   = require('fs')
const path = require('path')

const EXCELS_DIR = path.join(__dirname, '..', 'src', 'assets', 'excels')
const FILES = ['TbName.xlsx', 'TbNameUSA.xlsx']

function readFile(fileName) {
  const full = path.join(EXCELS_DIR, fileName)
  if (!fs.existsSync(full)) {
    console.error(`File not found: ${full}`)
    return []
  }
  const wb = XLSX.readFile(full)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' })
  return rows.map(r => ({ ...r, __source: fileName }))
}

// קורא את שני הקבצים
const allRows = FILES.flatMap(readFile)
console.log(`Total rows: ${allRows.length}`)

// קיבוץ לפי IdName
const grouped = new Map()
for (const r of allRows) {
  const id = r['IdName']
  if (id == null || id === '') continue
  if (!grouped.has(id)) grouped.set(id, [])
  grouped.get(id).push(r)
}

// סינון הכפולים
const duplicates = [...grouped.entries()].filter(([_, rows]) => rows.length > 1)

// ספירה של שדות מלאים (כל מה שלא null/undefined/empty string)
function countFilled(row) {
  return Object.entries(row).filter(([k, v]) => {
    if (k === '__source') return false
    if (v == null || v === '' ) return false
    return true
  }).length
}

console.log(`\nFound ${duplicates.length} duplicated IdNames:\n`)
console.log('ID'.padEnd(8) + 'Source'.padEnd(20) + 'Filled'.padEnd(8) + 'Heb Name'.padEnd(30) + 'Eng Name')
console.log('-'.repeat(100))

for (const [id, rows] of duplicates.sort((a, b) => Number(a[0]) - Number(b[0]))) {
  for (const r of rows) {
    const hebName = `${r.ToarHeb || ''} ${r.FirstNameHeb || ''} ${r.LastNameHeb || ''}`.trim().slice(0, 28)
    const engName = `${r.ToarEng || ''} ${r.FirstNameEng || ''} ${r.LastNameEng || ''}`.trim().slice(0, 40)
    const filled  = countFilled(r)
    console.log(
      String(id).padEnd(8) +
      r.__source.padEnd(20) +
      String(filled).padEnd(8) +
      hebName.padEnd(30) +
      engName
    )
  }
  console.log('')  // separator between groups
}

console.log(`\nTotal: ${duplicates.length} groups, ${duplicates.reduce((s, [_, rows]) => s + rows.length, 0)} rows`)
