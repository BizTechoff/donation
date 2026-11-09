import { Letter } from '../enum/letter'

/**
 * letter-rules.ts - שלב ג׳ 5.2: בחירת סוג המכתב אוטומטית.
 *
 * עץ ההחלטה כפי שסוכם בזום 24.08 (ב׳ 1:31-1:44, יעקב ומוטי):
 *
 * 1. הכתובת אינה בארה"ב (גם לא קנדה - "לא מעניין אותי קנדה") -> קטגוריית
 *    "תרומות": סיבה ריקה -> "מכתב תודה רגיל"; סיבה כתובה -> "מכתב תודה עם
 *    סיבה" (B0533-B0541: "זה אוטומטי צריך להיות").
 *    תרומה על חשבון התחייבות: נוסח "על חשבון" נכנס לשדה {תרומה} (5.1), עד
 *    שתגיע התבנית הנפרדת שיעקב אמר שיכין (B0615).
 * 2. הכתובת בארה"ב -> ארבעת מכתבי "אמריקה" (B0567-B0575):
 *    - קבלה: תרומה דרך עמותה / קרן צדקה (שובר עמותה) - הקבלה כבר ניתנה שם,
 *      ולכן NoReceipt. כל אמצעי אחר (אשראי, צ'ק, מזומן...) - Receipt.
 *    - ישיבה: "ולמטה כנ"ל אותו דבר רק אם זה אנ"ש" - גרסת Yeshiva לאנ"ש.
 *
 * הבחירה היא ברירת מחדל: המשתמש עדיין יכול לבחור מכתב אחר במסך.
 */
export interface LetterChoiceInput {
  isUSA: boolean
  isAnash: boolean
  /** DonationMethod.type */
  methodType?: string
  reason?: string
}

/** אמצעים שבהם הקבלה כבר ניתנה על ידי גוף אחר. */
const NO_RECEIPT_METHODS = ['association']

export function pickDonationLetter(input: LetterChoiceInput): Letter {
  if (input.isUSA) {
    const receipt = !NO_RECEIPT_METHODS.includes(input.methodType || '')
    if (input.isAnash) {
      return receipt ? Letter.letter_america_tyyeshivareceipt : Letter.letter_america_tyyeshivanoreceipt
    }
    return receipt ? Letter.letter_america_tyreceipt : Letter.letter_america_tynoreceipt
  }
  return (input.reason || '').trim()
    ? Letter.letter_donation_mktb_tvdh_am_sybh
    : Letter.letter_donation_mktb_tvdh_rgyl
}
