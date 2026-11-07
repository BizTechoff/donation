import { ValueListFieldType } from 'remult'

/**
 * phone-type.ts - סעיף 6 (זום 03.11): סוג מספר הטלפון כרשימה סגורה.
 *
 * נייד / טלפון / עבודה / פקס. הערך נשמר בשדה "תיאור" של DonorContact,
 * והמזהה של כל סוג הוא הטקסט העברי עצמו - כך 2,929 מתוך 3,002 המספרים
 * בפרודקשן ("טלפון", "נייד", "פקס", כפי שהומרו מהאקסלים של יעקב) תקפים כמו
 * שהם, ומיפוי הסוגים לגוגל, שבנוי על הטקסט, ממשיך לעבוד.
 *
 * למה בתיאור ולא בשדה חדש: התיאור כבר נושא את הסוג בפועל, הוא השדה ששני
 * הצדדים - הקוד ופוסטגרס (sqlExpression של המיון) - קוראים, ושדה נוסף היה
 * יוצר שני מקורות לאותה עובדה. תיאור של אימייל לא מושפע - אותו שדה, רשומה
 * מסוג אחר.
 *
 * הסיווג עצמו (סוג, ואם אין - לפי המספר) יושב ב-phone-utils.phoneLineOf,
 * כי הוא צריך את MOBILE_PATTERNS. כאן - הרשימה, ותרגום ערכים ישנים אליה.
 */

/** לאיזו עמודה המספר שייך ברשימות. פקס - לאף אחת. */
export type PhoneLine = 'mobile' | 'landline' | 'fax'

@ValueListFieldType<PhoneType>({ caption: 'סוג טלפון' })
export class PhoneType {
  static mobile = new PhoneType('נייד', 'mobile')
  // "טלפון" לפני "עבודה": בהתנגשות ביניהם בעמודת הטלפון - הראשון קובע
  // (ראשי, ואחריו סדר ההזנה), לא הסוג.
  static phone = new PhoneType('טלפון', 'landline')
  static work = new PhoneType('עבודה', 'landline')
  static fax = new PhoneType('פקס', 'fax')

  constructor(public id: string, public line: PhoneLine) { }

  get caption(): string { return this.id }

  /** הרשימה הסגורה, בסדר התצוגה. */
  static all(): PhoneType[] {
    return [PhoneType.mobile, PhoneType.phone, PhoneType.work, PhoneType.fax]
  }

  /**
   * תיאור שמור -> סוג. ערך מהרשימה - ישירות. ערך ישן שהסוג שלו ודאי - מתורגם
   * (LEGACY_EXACT, ואחריו מילת רמז). אחרת undefined - הסוג נקבע לפי המספר.
   * "טלפון נוסף" מכוון ל-undefined: באקסל המקורי זה השדה TelNosaf, שהחזיק
   * גם ניידים (39 מתוך 72 בפרודקשן).
   */
  static fromDescription(description: string | null | undefined): PhoneType | undefined {
    const value = (description || '').trim()
    if (!value) return undefined
    const exact = PhoneType.all().find(t => t.id === value) || LEGACY_EXACT[value]
    if (exact) return exact
    const lower = value.toLowerCase()
    return LEGACY_HINTS.find(([word]) => lower.includes(word))?.[1]
  }
}

/**
 * ערכים ישנים בהתאמה מלאה. "נייח" - מה שהקונטרול בכרטיס כתב פעם; "בית",
 * "פקס בית", "פקס עבודה" - מה שסנכרון גוגל כתב לפני הרשימה.
 */
export const LEGACY_EXACT: Record<string, PhoneType> = {
  'נייח': PhoneType.phone,
  'בית': PhoneType.phone,
  'פקס בית': PhoneType.fax,
  'פקס עבודה': PhoneType.fax
}

/**
 * מילות רמז בתוך תיאור חופשי - המשך של MOBILE_DESCRIPTION_HINTS הישן ("נייד 2",
 * "mobile"). רק נייד ופקס: מילה כמו "טלפון" לא מכריעה, כי "טלפון נוסף" יכול
 * להיות נייד. גם פוסטגרס קורא את הטבלה הזו - phone-utils.sqlPhoneLine.
 */
export const LEGACY_HINTS: [string, PhoneType][] = [
  ['נייד', PhoneType.mobile],
  ['סלולרי', PhoneType.mobile],
  ['mobile', PhoneType.mobile],
  ['cell', PhoneType.mobile],
  ['פקס', PhoneType.fax],
  ['fax', PhoneType.fax]
]
