/**
 * תוויות סינון לשם קובץ - סעיף 27.
 *
 * כל מסך שמייצא מתאר את הסינון שלו במילים, וכל המסכים מתארים טווח, תאריך
 * ורשימת שמות באותה צורה. הפונקציות טהורות, בלי Angular ובלי רימלט.
 */

/** תאריך בתצוגה עברית, או מחרוזת ריקה. */
export function dateLabel(d?: Date | string | null): string {
  return d ? new Date(d).toLocaleDateString('he-IL') : ''
}

/** טווח תאריכים. ריק כששני הקצוות ריקים. */
export function dateRangeLabel(from?: Date | string | null, to?: Date | string | null): string {
  if (!from && !to) return ''
  return `${dateLabel(from) || 'מההתחלה'} עד ${dateLabel(to) || 'היום'}`
}

/** טווח סכומים. ריק כששני הקצוות ריקים. */
export function amountRangeLabel(min?: number | null, max?: number | null): string {
  const has = (n?: number | null) => n !== undefined && n !== null
  if (!has(min) && !has(max)) return ''
  return `סכום ${has(min) ? min : 'ללא מינימום'} עד ${has(max) ? max : 'ללא מקסימום'}`
}

/** רשימת שמות, בלי ריקים. */
export function namesLabel(names: (string | null | undefined)[]): string {
  return names.filter(n => !!n && String(n).trim()).join(', ')
}

/** "חיפוש X", או ריק. */
export function searchLabel(text?: string | null): string {
  const t = (text || '').trim()
  return t ? `חיפוש ${t}` : ''
}
