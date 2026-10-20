import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ExcelColumn<T> {
  header: string;                    // כותרת עברית
  key?: keyof T;                     // שדה מהאובייקט (אופציונלי)
  mapper?: (item: T) => any;         // פונקציה מותאמת אישית
  width?: number;                    // רוחב עמודה
  align?: 'left' | 'right' | 'center'; // יישור (LTR/RTL): שימושי לכתובות באנגלית
}

/** The name parts of a donor, as exports show them. */
export interface DonorNameParts {
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  titleEnglish?: string | null;
  firstNameEnglish?: string | null;
  lastNameEnglish?: string | null;
  suffixEnglish?: string | null;
}

/**
 * The donor-name columns of every export - ONE definition (item 32).
 *
 * Israel: "שם משפחה יופיע לפני שם פרטי - גם בעברית וגם באנגלית". The same
 * eight columns (title, first, last, suffix x Hebrew/English) were written out
 * by hand in every list and report export; the order is now set here once:
 * תואר, שם משפחה, שם פרטי, סיומת / Title, Last Name, First Name, Suffix.
 *
 * @param donor reads the donor (or the row's donor details) from a row
 * @param terms i18n terms for the Hebrew headers (optional)
 */
export function donorNameColumns<T>(donor: (row: T) => DonorNameParts | null | undefined, terms?: any): ExcelColumn<T>[] {
  const v = (row: T, key: keyof DonorNameParts) => donor(row)?.[key] || '';
  return [
    // Hebrew
    { header: terms?.title || 'תואר', mapper: r => v(r, 'title'), width: 15 },
    { header: terms?.lastName || 'שם משפחה', mapper: r => v(r, 'lastName'), width: 15 },
    { header: terms?.firstName || 'שם פרטי', mapper: r => v(r, 'firstName'), width: 15 },
    { header: terms?.suffix || 'סיומת', mapper: r => v(r, 'suffix'), width: 10 },
    // English
    { header: terms?.titleEnglish || 'Title', mapper: r => v(r, 'titleEnglish'), width: 12 },
    { header: terms?.lastNameEnglish || 'Last Name', mapper: r => v(r, 'lastNameEnglish'), width: 15 },
    { header: terms?.firstNameEnglish || 'First Name', mapper: r => v(r, 'firstNameEnglish'), width: 15 },
    { header: terms?.suffixEnglish || 'Suffix', mapper: r => v(r, 'suffixEnglish'), width: 10 }
  ];
}

/** Same order for exports that build rows positionally (headers + values). */
export const DONOR_NAME_HEADERS = ['תואר', 'שם משפחה', 'שם פרטי', 'סיומת', 'Title', 'Last Name', 'First Name', 'Suffix'];
export function donorNameValues(d: DonorNameParts | null | undefined): string[] {
  const x = d || {};
  return [x.title, x.lastName, x.firstName, x.suffix, x.titleEnglish, x.lastNameEnglish, x.firstNameEnglish, x.suffixEnglish].map(s => s || '');
}

export interface ExcelExportConfig<T> {
  data: T[];                         // הנתונים לייצוא
  columns: ExcelColumn<T>[];         // הגדרת העמודות
  sheetName: string;                 // שם הגיליון
  fileName: string;                  // שם הקובץ
  includeStats?: boolean;            // האם לכלול גיליון סטטיסטיקות
  stats?: { label: string; value: any }[];  // סטטיסטיקות
}

/**
 * שירות לייצוא נתונים לאקסל
 *
 * דוגמת שימוש:
 * ```typescript
 * constructor(private excelService: ExcelExportService) {}
 *
 * async exportData() {
 *   await this.excelService.export({
 *     data: this.myData,
 *     columns: [
 *       { header: 'שם', key: 'name', width: 20 },
 *       { header: 'טלפון', mapper: (item) => item.phone || '-', width: 15 }
 *     ],
 *     sheetName: 'נתונים',
 *     fileName: this.excelService.generateFileName('נתונים')
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  constructor(private snackBar: MatSnackBar) {}

  /**
   * ייצוא גנרי לאקסל
   * @param config קונפיגורציה של הייצוא
   */
  async export<T>(config: ExcelExportConfig<T>): Promise<void> {
    try {
      if (!config.data || config.data.length === 0) {
        this.snackBar.open('אין נתונים לייצוא', 'סגור', { duration: 3000 });
        return;
      }

      // Dynamic import של xlsx
      const XLSX = await import('xlsx');

      // בניית הנתונים
      const data = config.data.map(item => {
        const row: any = {};
        config.columns.forEach(col => {
          if (col.mapper) {
            row[col.header] = col.mapper(item);
          } else if (col.key) {
            row[col.header] = item[col.key];
          }
        });
        return row;
      });

      // יצירת worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // הגדרת רוחב עמודות + wrap-text כברירת מחדל כדי שערכים שמכילים
      // newline (כמו כמה טלפונים מ-phone-utils.formatDisplayPhones) יוצגו
      // כל אחד בשורה משלו בתוך התא.
      if (config.columns.some(col => col.width)) {
        ws['!cols'] = config.columns.map(col => ({ wch: col.width || 15 }));
      }
      // Enable wrap-text on cells that contain newlines, plus auto-grow row
      // height. Without wrap-text Excel shows the embedded \n as a single
      // square glyph instead of wrapping to a new line.
      try {
        const range = XLSX.utils.decode_range(ws['!ref'] as string);
        const rowHeights: { hpt?: number; hpx?: number }[] = [];
        for (let r = range.s.r; r <= range.e.r; r++) {
          let maxLines = 1;
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = ws[addr];
            if (cell && cell.v != null) {
              const text = String(cell.v);
              if (text.includes('\n')) {
                cell.s = Object.assign({}, cell.s || {}, {
                  alignment: Object.assign({}, (cell.s && cell.s.alignment) || {}, { wrapText: true, vertical: 'top' })
                });
                const lines = text.split('\n').length;
                if (lines > maxLines) maxLines = lines;
              }
            }
          }
          // ~15pt per line - reasonable for default font
          if (maxLines > 1) rowHeights[r] = { hpt: maxLines * 15 };
        }
        if (rowHeights.some(h => h)) {
          ws['!rows'] = rowHeights;
        }
      } catch { /* style support best-effort */ }

      // Force LTR rendering on cells with align:'left' by prepending the
      // Unicode LRE marker (U+202A). xlsx 0.18 (open-source) does not support
      // per-cell style/alignment without xlsx-style, but the LRE marker forces
      // most viewers (Excel, Google Sheets, LibreOffice) to render the value
      // left-to-right - effective for Latin-script address columns embedded in
      // an otherwise RTL Hebrew sheet.
      const ltrCols = config.columns
        .map((col, idx) => ({ col, idx }))
        .filter(({ col }) => col.align === 'left');
      if (ltrCols.length > 0) {
        const range = XLSX.utils.decode_range(ws['!ref'] as string);
        for (const { col, idx } of ltrCols) {
          for (let r = range.s.r + 1; r <= range.e.r; r++) { // +1 to skip header
            const cellAddr = XLSX.utils.encode_cell({ r, c: idx });
            const cell = ws[cellAddr];
            if (cell && cell.v != null && cell.v !== '') {
              const text = String(cell.v);
              if (!text.startsWith('‪')) {
                cell.v = '‪' + text + '‬';
                if (typeof cell.w === 'string') cell.w = cell.v;
              }
            }
          }
        }
      }

      // יצירת workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, config.sheetName);

      // הוספת סטטיסטיקות (אופציונלי)
      if (config.includeStats && config.stats && config.stats.length > 0) {
        const statsData = config.stats.map(s => ({ 'נתון': s.label, 'ערך': s.value }));
        const statsWs = XLSX.utils.json_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, statsWs, 'סטטיסטיקות');
      }

      // שמירה
      XLSX.writeFile(wb, config.fileName);

      this.snackBar.open('הקובץ יוצא בהצלחה', 'סגור', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.snackBar.open('שגיאה בייצוא לאקסל', 'סגור', { duration: 3000 });
    }
  }

  /**
   * יצירת שם קובץ עם תאריך
   * @param baseName שם הבסיס של הקובץ
   * @param extension סיומת הקובץ (ברירת מחדל: xlsx)
   * @returns שם קובץ עם תאריך
   *
   * דוגמה: generateFileName('מוזמנים') -> 'מוזמנים_2025-11-02.xlsx'
   */
  generateFileName(baseName: string, extension: string = 'xlsx'): string {
    const date = new Date().toISOString().split('T')[0];
    return `${baseName}_${date}.${extension}`;
  }

  /**
   * המרת boolean לעברית
   * @param value ערך בוליאני
   * @returns 'כן' או 'לא'
   */
  booleanToHebrew(value: boolean | undefined): string {
    return value ? 'כן' : 'לא';
  }

  /**
   * החזרת ערך ברירת מחדל אם הערך ריק
   * @param value הערך לבדיקה
   * @param defaultVal ערך ברירת מחדל (ברירת מחדל: '-')
   * @returns הערך או ערך ברירת המחדל
   */
  defaultValue(value: any, defaultVal: string = '-'): any {
    return value || defaultVal;
  }
}
