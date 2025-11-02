import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ExcelColumn<T> {
  header: string;                    // כותרת עברית
  key?: keyof T;                     // שדה מהאובייקט (אופציונלי)
  mapper?: (item: T) => any;         // פונקציה מותאמת אישית
  width?: number;                    // רוחב עמודה
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

      // הגדרת רוחב עמודות
      if (config.columns.some(col => col.width)) {
        ws['!cols'] = config.columns.map(col => ({ wch: col.width || 15 }));
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
