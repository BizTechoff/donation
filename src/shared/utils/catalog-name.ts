import { ClassType, remult } from 'remult'

/**
 * שמות בקטלוגים שהמשתמש מנהל (סוגי תזכורת, אירועים...) - הכלל במקום אחד.
 *
 * השם נשמר פעם אחת בקטלוג, ובכל מקום אחר יש רק הפניה אליו (קוד / מזהה).
 * לכן שגיאת כתיב מתוקנת במקום אחד ומתעדכנת בכל המקומות - וכאן מצמצמים
 * אותה כבר בהזנה: ניקוי רווחים וחסימת כפילות.
 */

/** רווחים בתחילה ובסוף מוסרים, ורווח כפול בפנים הופך לרווח אחד. */
export function normalizeCatalogName(name: string | undefined | null): string {
  return (name ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * חוסם שם שכבר קיים בקטלוג (אחרי ניקוי, בלי הבדל אותיות גדולות/קטנות).
 * רץ בשרת, ב-saving של היישות - כך שהכלל חל על כל דרך שמירה.
 */
export async function assertUniqueCatalogName<T extends { id: string }>(
  entity: ClassType<T>,
  field: keyof T & string,
  row: T
): Promise<void> {
  const name = normalizeCatalogName(row[field] as any)
  if (!name) throw new Error('יש להזין שם')
  const key = name.toLowerCase()
  const others = await remult.repo(entity).find({ where: { id: { $ne: row.id } } as any })
  if (others.some(o => normalizeCatalogName(o[field] as any).toLowerCase() === key)) {
    throw new Error(`"${name}" כבר קיים`)
  }
}
