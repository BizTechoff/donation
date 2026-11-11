import { Fields, isBackend, remult } from 'remult'

/**
 * שלב ג׳ 9.1 - "מי הזין ומי עדכן" בכל הפלטפורמה, במקום אחד.
 *
 * זום 24.08 (3:18): "גם בתרומות, גם בתזכורות, בכל מקום... מי השם המשתמש
 * שהכניס את זה". הערך הוא המשתמש המחובר, נקבע בשרת בשמירה - לא נכתב ידנית
 * ולא נשלח מהקליינט. שמירה בלי משתמש (scheduler, ייבוא) משאירה ריק.
 *
 * השימוש ביישות:
 *   @CreatedByField() createdById = ''
 *   @UpdatedByField() updatedById = ''
 * ביישות שכבר יש לה createdById - מוסיפים לשדה הקיים saving: stampCreatedBy.
 */

/** משתמש מחובר בשרת, או '' כשאין (scheduler, ייבוא). */
function currentUserId(): string {
  return isBackend() ? remult.user?.id || '' : ''
}

/** רשומה חדשה בלי "הוזן ע"י" - המשתמש המחובר. ערך קיים לא נדרס. */
export function stampCreatedBy(_row: unknown, ref: { value: string }, e: { isNew: boolean }) {
  if (isBackend() && e.isNew && !ref.value) ref.value = currentUserId()
}

/** כל שמירה - המשתמש המחובר. */
export function stampUpdatedBy(_row: unknown, ref: { value: string }) {
  if (isBackend()) ref.value = currentUserId()
}

export function CreatedByField() {
  return Fields.string({ caption: 'הוזן ע"י', allowApiUpdate: false, saving: stampCreatedBy as any })
}

export function UpdatedByField() {
  return Fields.string({ caption: 'עודכן ע"י', allowApiUpdate: false, saving: stampUpdatedBy as any })
}

/** שדות החתימה ביישות (createdDate/updatedDate או createdAt/updatedAt). */
export interface AuditedRow {
  createdById?: string
  updatedById?: string
  createdDate?: Date
  updatedDate?: Date
  createdAt?: Date
  updatedAt?: Date
}
