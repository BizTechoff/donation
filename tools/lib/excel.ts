/**
 * קריאת גיליון אקסל לכלי המיגרציה - המקום האחד.
 * מחזיר את השורות של הגיליון הראשון כאובייקטים לפי כותרות העמודות.
 */
import * as XLSX from 'xlsx'

export type SheetRow = Record<string, any>

export function readSheet(file: string): SheetRow[] {
  const wb = XLSX.readFile(file)
  return XLSX.utils.sheet_to_json<SheetRow>(wb.Sheets[wb.SheetNames[0]], { defval: null })
}

/** ערך תא כמחרוזת נקייה; ריק / null / 0 - מחרוזת ריקה. */
export function cell(row: SheetRow, ...names: string[]): string {
  for (const n of names) {
    const v = row[n]
    if (v !== null && v !== undefined && String(v).trim() !== '' && v !== 0) return String(v).trim()
  }
  return ''
}
