/**
 * commitment-utils.ts - שלב ג׳, קבוצה 4: התחייבויות.
 *
 * הכלל האחד של "כמה שולם מתוך התחייבות". טהור, בלי I/O - הטעינה ב-
 * CommitmentController, וכל מסך שמציג התקדמות מקבל ממנו את התוצאה.
 *
 * שני מקורות לתשלום על חשבון התחייבות:
 *   - legacyPaid: תנועות שנרשמו בטופס התנועות לפני שלב ג׳. הטופס הוסתר, אבל
 *     התנועות נשארו במסד ונספרות.
 *   - linkedPaid: תרומות רגילות שמצביעות על ההתחייבות (Donation.commitmentId).
 *
 * חריגה מותרת (זום ב׳ ~1:06-1:22: היום המערכת חוסמת 900 מול 850 - "צריך
 * לאפשר"). התחייבות שהגיעה לסכום שלה - סגורה.
 */

export interface CommitmentProgress {
  total: number
  paid: number
  /** לא שלילי - בחריגה היתרה אפס. */
  remaining: number
  isClosed: boolean
  /** כמה תרומות נזקפו להתחייבות (בלי התנועות הישנות). */
  linkedCount: number
}

export function commitmentProgress(total: number, legacyPaid: number, linkedPaid: number, linkedCount = 0): CommitmentProgress {
  const paid = (legacyPaid || 0) + (linkedPaid || 0)
  const t = total || 0
  return { total: t, paid, remaining: Math.max(0, t - paid), isClosed: t > 0 && paid >= t, linkedCount }
}

/**
 * "שולם / סה"כ" - הסדר והרווח כפי שסוכמו (זום ב׳ ~1:03-1:04: יעקב חשב שהמספר
 * כתוב הפוך כשלא היה רווח בין שני הנתונים). להצגה בכיוון LTR.
 */
export function formatCommitmentProgress(p: Pick<CommitmentProgress, 'paid' | 'total'>, symbol = ''): string {
  return `${symbol}${p.paid.toLocaleString()} / ${symbol}${p.total.toLocaleString()}`
}
