/**
 * phone-format.ts - פענוח, עיצוב וזיהוי של מספרי טלפון. סעיפים 1 ו-31.
 *
 * עוטף את libphonenumber-js/max. הגרסה /max היא זו שמחזיקה את מטא-הנתונים של
 * סוג הקו (getType), שבלעדיה אי אפשר להבחין בין נייד לנייח - וזה הלב של
 * הסעיף.
 *
 * למה כאן ולא בתוך הקומפוננטה: אותה לוגיקה בדיוק נדרשת ל-I1, המיגרציה שתנרמל
 * את הטלפונים הקיימים ל-E.164. פונקציות טהורות, בלי Angular, קליינט ושרת.
 *
 * ← חשוב להבנת הארכיטקטורה: הקובץ הזה אינו מחליף את phone-utils.ts.
 *   phone-utils מחזיק את MOBILE_PATTERNS, שאותם ביטויים מוזרקים גם ל-
 *   sqlIsMobile ורצים בתוך פוסטגרס - שם אי אפשר להריץ libphonenumber. אילו
 *   הקונטרול היה מסווג לפי libphonenumber בלבד, המסך והמיון ב-SQL היו
 *   חלוקים זה על זה.
 *   הפתרון שנקבע בתכנון: הקונטרול כותב את סוג הקו המזוהה אל שדה התיאור, ושני
 *   הצדדים - isMobilePhone ו-sqlIsMobile - קוראים אותו משם. מקור אחד.
 */
import { AsYouType, CountryCode, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/max'
import metadata from 'libphonenumber-js/metadata.max.json'

/**
 * ברירת המחדל כשאין קידומת בינלאומית ואי אפשר להסיק מדינה.
 *
 * GB ולא IL: בדיקת הנתונים בפרודקשן (21.10) הראתה שבסיס התורמים הוא בעיקר
 * בריטניה, ארה"ב ובלגיה. ברירת מחדל ישראלית פסלה אלפי מספרים בריטיים תקינים
 * ("07977932665" נפסל כישראלי, ותקין לגמרי כבריטי).
 *
 * זו רק נקודת פתיחה: כשידועה מדינת הכתובת של התורם היא גוברת עליה.
 */
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'GB'

export type PhoneLineType = 'mobile' | 'landline' | 'unknown'

export interface ParsedPhone {
  /** E.164 - הצורה היחידה שנשמרת. לדוגמה +972526526063 */
  e164: string
  /** לתצוגה, בפורמט המקומי של המדינה. 052-652-6063 */
  national: string
  /** לתצוגה בינלאומית. +972 52-652-6063 */
  international: string
  country?: CountryCode
  /** קידומת המדינה בלי הפלוס. 972 */
  callingCode?: string
  lineType: PhoneLineType
  /** המספר תקין במדינה שזוהתה. ולידציה = סימון בלבד, לא חסימה. */
  isValid: boolean
}

/**
 * סוג הקו כפי ש-libphonenumber מדווח עליו.
 *
 * FIXED_LINE_OR_MOBILE מוחזר כ-unknown ולא כניחוש: זה המצב בארה"ב ובקנדה,
 * שם אותם אזורי חיוג משרתים נייד, נייח ומשרד, והספרות פשוט לא נושאות את
 * התשובה. בתכנון נקבע שבארה"ב/קנדה הסיווג ידני.
 */
function toLineType(type: string | undefined): PhoneLineType {
  switch (type) {
    case 'MOBILE':
      return 'mobile'
    case 'FIXED_LINE':
    case 'VOIP':
    case 'TOLL_FREE':
    case 'PREMIUM_RATE':
    case 'SHARED_COST':
    case 'UAN':
      return 'landline'
    default:
      return 'unknown'
  }
}

/**
 * מפענח מספר. מחזיר undefined כשאין מה לפענח - מחרוזת ריקה או ספרות בודדות.
 *
 * @param defaultCountry המדינה שלפיה יפוענח מספר בלי קידומת בינלאומית.
 *        מספר שמתחיל ב-+ מפוענח לפי הקידומת שלו ומתעלם מהפרמטר - זה מה שמונע
 *        את הטעות שבה מספר בריטי (07391682358) פוענח כישראלי.
 */
export function parsePhone(
  raw: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): ParsedPhone | undefined {
  const value = (raw || '').trim()
  if (!value) return undefined

  const parsed = parsePhoneNumberFromString(value, defaultCountry)
  if (!parsed) return undefined

  return {
    e164: parsed.number,
    national: parsed.formatNational(),
    international: parsed.formatInternational(),
    country: parsed.country,
    callingCode: parsed.countryCallingCode?.toString(),
    lineType: toLineType(parsed.getType()),
    isValid: parsed.isValid()
  }
}

/**
 * עיצוב תוך כדי הקלדה. AsYouType מעצב חלקית, כך שהמשתמש רואה את המספר מתגבש
 * בזמן אמת ולא קופץ רק בסיום.
 */
export function formatAsYouType(
  raw: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string {
  const value = (raw || '').trim()
  if (!value) return ''
  return new AsYouType(value.startsWith('+') ? undefined : defaultCountry).input(value)
}

/** E.164 לשמירה, או המקור כפי שהוא כשאי אפשר לפענח - לעולם לא מאבדים קלט. */
export function toE164(
  raw: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string {
  return parsePhone(raw, defaultCountry)?.e164 || (raw || '').trim()
}

/**
 * קידומת החיוג מתוך קלט חלקי, בלי לדרוש מספר שלם.
 *
 * parsePhone מחזיר undefined כל עוד המספר קצר מדי, ולכן בזמן ההקלדה אין ממנו
 * מדינה. AsYouType כן מזהה את הקידומת מיד עם הספרה האחרונה שלה: "+44" -> "44".
 */
export function partialCallingCode(raw: string | null | undefined): string {
  const value = (raw || '').trim()
  if (!value.startsWith('+')) return ''
  const typing = new AsYouType()
  typing.input(value)
  return typing.getCallingCode()?.toString() || ''
}

/**
 * המדינה הראשית של קידומת חיוג. "44" -> "GB", "1" -> "US".
 *
 * AsYouType.getCountry() לא עונה על זה: לקידומת משותפת הוא מחזיר undefined
 * ("+44" = בריטניה, גרנזי, אי מאן). המטא-דאטה של libphonenumber מחזיקה לכל
 * קידומת את רשימת המדינות כשהראשית בראש, וזו התשובה הנכונה.
 *
 * עדיף על הכרעה מול רשימת המדינות של הפלטפורמה: אותה רשימה תלויה בנתונים
 * שהוזנו, ומדינה שחסרה בה או שהקידומת שלה ריקה היתה מונעת זיהוי.
 */
export function countryForCallingCode(callingCode: string | null | undefined): string {
  const code = (callingCode || '').replace(/\D/g, '')
  if (!code) return ''
  const map = (metadata as any)?.country_calling_codes || {}
  return map[code]?.[0] || ''
}

/**
 * הפורמט שבו מוצג מספר טלפון בכל הפלטפורמה - רשימות, דוחות, ייצוא והדפסה.
 *
 * מקביל ל-Place.getDisplayAddress() של הכתובות: מקום אחד שמחליט איך נראה
 * מספר, במקום שכל מסך יציג את המחרוזת הגולמית כפי שהוזנה. עד היום הרשימות
 * הציגו "7188518962", "596-3284 845" ו-"052-652-6063" זה לצד זה.
 *
 * E.164 נבחר כי הוא חד-משמעי: קידומת מדינה מפורשת, בלי רווחים ומקפים שמשתנים
 * בין מדינה למדינה, ובלי תלות בשאלה מי הקליד ואיך.
 *
 * רק מספר שהוא תקין במדינה שזוהתה מומר. מספר שאינו תקין מוחזר כפי שהוא, וזה
 * לא קוסמטיקה אלא מניעת שיבוש: "7188518962" הוא מספר אמריקאי שנשמר בלי קידומת,
 * ופענוח לפי ברירת המחדל הישראלית הפך אותו ל-"+9727188518962" - מספר שלא קיים.
 * המרה מתבצעת רק כשיש ודאות; בכל מקרה אחר מוצג מה שהוזן, כולל ערכים שאינם
 * מספרים כלל ("עיע"), שעדיף שייראו מאשר שייעלמו.
 */
export function formatPhoneForDisplay(
  raw: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string {
  const value = (raw || '').trim()
  if (!value) return ''
  const parsed = parsePhone(value, defaultCountry)
  return parsed?.isValid ? parsed.e164 : value
}

/**
 * מספר שהוקלד עם "+" אבל הקידומת שלו אינה של אף מדינה.
 *
 * זו טעות הקלדה ודאית, להבדיל ממספר שאינו תקין: בנתונים ההיסטוריים יש הרבה
 * מספרים לא תקינים ואסור לחסום בגללם שמירה, אבל קידומת שלא קיימת בעולם היא
 * ערך שנוצר עכשיו ואין סיבה לשמור אותו.
 */
export function hasUnknownCallingCode(raw: string | null | undefined): boolean {
  const value = (raw || '').trim()
  if (!value.startsWith('+')) return false
  const parsed = parsePhone(value)
  if (parsed?.country) return false
  return !countryForCallingCode(partialCallingCode(value))
}

/** קידומת החיוג של מדינה, עם הפלוס. IL -> "+972" */
export function callingCodeForCountry(country: CountryCode): string {
  try {
    return `+${getCountryCallingCode(country)}`
  } catch {
    return ''
  }
}

/**
 * אותו מספר תחת קידומת של מדינה אחרת, כשהמשתמש בוחר מדינה ידנית.
 *
 * לא די בפענוח מחדש לפי המדינה החדשה: מספר שכבר נושא "+" מפוענח לפי הקידומת
 * שבתוכו ומתעלם מברירת המחדל, ולכן בחירת מדינה לא היתה משנה דבר. כאן הקידומת
 * הישנה מוסרת, הספרות המקומיות נשמרות, והקידומת החדשה מולבשת עליהן.
 */
export function withCountry(raw: string | null | undefined, country: CountryCode): string {
  const value = (raw || '').trim()
  if (!value) return ''

  const parsed = parsePhoneNumberFromString(value, country)
  let national = parsed?.nationalNumber?.toString() || ''

  if (!national) {
    // מספר שאי אפשר לפענח. הספרות נלקחות ישירות, אבל הקידומת הישנה מוסרת
    // קודם - אחרת היא נבלעת לתוך המספר והבחירה "מוסיפה" קידומת במקום
    // להחליף אותה: "+234" + בחירת ישראל נתן "+972234".
    const digits = value.replace(/\D/g, '')
    const oldCode = partialCallingCode(value)
    national = oldCode && digits.startsWith(oldCode) ? digits.slice(oldCode.length) : digits
  }

  const newCode = (() => {
    try { return getCountryCallingCode(country) } catch { return '' }
  })()
  if (!newCode) return value

  return national ? `+${newCode}${national}` : `+${newCode}`
}

/**
 * מה שמותר להקליד בשדה טלפון: ספרות, ופלוס אחד בלבד בתחילת המחרוזת.
 *
 * כאן ולא בתוך הקומפוננטה כי זו לוגיקה טהורה על מחרוזת, בדיוק כמו שאר
 * הקובץ - וכך גם הדבקה, גרירה והקלדה עוברות דרך אותה פונקציה אחת במקום
 * שלוש בדיקות שמתפצלות.
 *
 * אותיות וסימנים אינם נחסמים ברמת המקש אלא מנוקים מהערך: חסימה לפי מקש
 * לבדה משאירה פתח להדבקה, ל-IME ולגרירה, והמשתמש היה רואה אותיות נכנסות
 * לשדה. ניקוי הערך תופס את כל הדרכים.
 *
 * הפלוס נשמר רק בראש: "+44 20" הוא מספר, "44+20" הוא שגיאת הקלדה, ו-
 * libphonenumber היה מתעלם ממנו בשקט ומשאיר את המשתמש עם תו שאינו עושה דבר.
 */
export function sanitizePhoneInput(raw: string | null | undefined): string {
  const value = (raw || '')
  const digits = value.replace(/[^\d+]/g, '')
  const plus = digits.startsWith('+')
  return (plus ? '+' : '') + digits.replace(/\+/g, '')
}

/** האם התו מותר להקלדה ישירה בשדה. הפלוס נבדק מול מיקומו בנפרד. */
export function isAllowedPhoneChar(ch: string): boolean {
  return /[\d+]/.test(ch)
}

/** דגל המדינה כאמוג׳י, מקוד דו-אותי. IL -> 🇮🇱 */
export function countryFlag(country: string | null | undefined): string {
  const code = (country || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))
}
