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
 * שלב ג׳ 5.1 - מכתב תודה על תרומה על חשבון התחייבות.
 *
 * הנוסח שסוכם (מייל ישראל 24.08): "תודה... על תרומתך בסך £500 על חשבון נדבת
 * ליבך בסך £1800 לכבוד התורה ולומדיה". U3 (זום ב׳ ~1:45-1:52): המכתב מופק על
 * התרומה, לא על שורת ההתחייבות.
 *
 * המחרוזת נכנסת לשדה {תרומה} שבתבנית הקיימת - "בהרימכם תרומת ה' בסך
 * {תרומה} {סיבה_תרומה}, לכבוד התורה ולומדיה" - כך שלא נדרשת תבנית חדשה.
 * "לבכם" ברבים, כמו בשאר נוסח המכתב.
 */
export const ON_ACCOUNT_PHRASE = 'על חשבון נדבת לבכם הטוב בסך'

export function formatOnAccountOfCommitment(amount: number, commitmentTotal: number, currency = ''): string {
  return `${currency}${(amount || 0).toLocaleString()} ${ON_ACCOUNT_PHRASE} ${currency}${(commitmentTotal || 0).toLocaleString()}`
}

/**
 * "שולם / סה"כ" - הסדר והרווח כפי שסוכמו (זום ב׳ ~1:03-1:04: יעקב חשב שהמספר
 * כתוב הפוך כשלא היה רווח בין שני הנתונים). להצגה בכיוון LTR.
 */
export function formatCommitmentProgress(p: Pick<CommitmentProgress, 'paid' | 'total'>, symbol = ''): string {
  return `${symbol}${p.paid.toLocaleString()} / ${symbol}${p.total.toLocaleString()}`
}
