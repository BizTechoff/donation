/**
 * סיווג מספר טלפון לרמת ודאות, לקראת נרמול ל-E.164. קריאה בלבד.
 *
 * למה קובץ נפרד מהדוח: אותו סיווג בדיוק נדרש גם למיגרציה שתריץ את העדכון,
 * וגם לכל בדיקה חוזרת אחרי שהנתונים ישתנו. הדוח הוא רק תצוגה שלו.
 *
 * ── ההיסטוריה שהביאה לכאן, כדי שלא תחזור ──
 *
 * הגרסה הראשונה שאלה "האם המספר תקין גם במדינה אחרת", וכל תשובה חיובית
 * פסלה את ההמרה. התוצאה: 2048 מתוך 3016 רשומות סומנו דו-משמעיות ונותרו
 * תקועות. בפועל 1751 מהן היו מספרים בריטיים של תורמים בריטיים, שסומנו רק
 * משום שתוכנית המספור הגרמנית מקבלת גם אותן.
 *
 * שלוש עובדות שהכריעו:
 *
 * 1. העמותה לונדונית, והצוות שהקליד את הנתונים לונדוני. מספר בפורמט מקומי
 *    ברשומה של תורם בריטי הוא מספר בריטי.
 * 2. באקסלים המקוריים של יעקב (docs/migration/TbName.xlsx, TbNameUSA.xlsx)
 *    כל מספר יושב בשדה ייעודי - Tel נייח, Pel נייד, TelNosaf נוסף, Fax פקס -
 *    וההמרה כתבה את זה אל description. כלומר במסד יש עדות עצמאית לסוג הקו,
 *    שלא נגזרה מהספרות.
 * 3. הצלבה של העדות הזו מול getType: בקריאה בריטית 1839 מתוך 1871 תואמים,
 *    בקריאה גרמנית 903. ההבדל אינו עניין של טעם.
 *
 * מכאן: החלופה אינה "מדינה שבה המספר תקין" אלא "מדינה שבה המספר תקין, שאינה
 * מוסברת בתוכנית מספור פרוצה, ושסוג הקו שלה אינו סותר את מה שנרשם במקור".
 */
import { CountryCode, validatePhoneNumberLength } from 'libphonenumber-js/max'
import { parsePhone } from '../src/shared/utils/phone-format'

/** רמת הוודאות שאיתה אפשר לכתוב את המספר המנורמל. */
export type Confidence = 'ודאי' | 'גבוה' | 'ידני' | 'ללא שינוי'

export interface Classification {
  confidence: Confidence
  /** הערך שייכתב. ריק כשאין הכרעה. */
  e164: string
  /** המדינה שלפיה פוענח בסופו של דבר. */
  country: string
  /** סוג הקו כפי ש-libphonenumber מדווח. */
  lineType: string
  /** הסיבה, בעברית - מה שמוצג בדוח ומה שמסביר החלטה בדיעבד. */
  reason: string
  /** החלופות שנשקלו ונדחו, לתיעוד. */
  alternatives: string[]
  /**
   * מספר שני שנמצא באותו שדה, כשהערך החזיק שניים. ריק ברוב המכריע.
   * הטיפול בו הוא רשומת טלפון נוספת לאותו תורם, לא דריסה - אחרת מספר
   * שהוזן נעלם.
   */
  split?: string
}

/**
 * המדינות שמותר להציע כחלופה כשהמספר נפסל במדינת הכתובת.
 *
 * DE ו-AT אינן ברשימה בכוונה. אין להן אורך מספר קבוע - התוכנית מקבלת רצפים
 * באורכים רבים - ולכן כמעט כל מספר אירופי "תקין" בהן. הן מייצרות חלופות שאינן
 * קיימות, ובשום מקרה בנתונים לא היתה להן כתובת תומכת.
 */
export const CANDIDATE_COUNTRIES: CountryCode[] = ['GB', 'US', 'IL', 'BE', 'CH', 'FR', 'NL', 'CA', 'AU']

/**
 * מדינות שתוכנית המספור שלהן רחבה מכדי לשמש ראיה. חלופה שמגיעה רק מהן אינה
 * חלופה - היא ארטיפקט של התוכנית.
 */
const LOOSE_PLAN: CountryCode[] = ['DE', 'AT']

/** ברירת המחדל כשאין מדינת כתובת. העמותה לונדונית - ראה את ההערה בראש. */
export const FALLBACK_COUNTRY: CountryCode = 'GB'

/**
 * מה שהתיאור אומר על סוג הקו. "טלפון נוסף" ו"פקס" אינם מעידים - הם שדות
 * שמחזיקים מה שהיה, ובנתונים יש בהם ניידים לא מעטים. רק "טלפון" ו"נייד"
 * נחשבים עדות.
 */
export function expectedLineType(description: string): 'mobile' | 'landline' | '' {
  const d = (description || '').trim()
  if (d.startsWith('נייד')) return 'mobile'
  if (d === 'טלפון') return 'landline'
  return ''
}

/** האם סוג הקו שחושב סותר את מה שנרשם במקור. FIXED_LINE_OR_MOBILE אינו סותר. */
function contradicts(lineType: string, expected: 'mobile' | 'landline' | ''): boolean {
  if (!expected || lineType === 'unknown') return false
  return lineType !== expected
}

/**
 * ציריך: הקידומת 01 בוטלה ב-2002 והוחלפה ב-044. במסד נותרו מספרים בצורה
 * "+411 xxx xx xx" - תקינים בזמנם, פסולים היום. ההמרה היא כלל מתועד ולא ניחוש,
 * ולכן מותרת - אבל בבלוק נפרד, כי מספר בן עשרים שנה עשוי להיות מת ממילא.
 */
function zurichLegacy(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!/^411\d{7}$/.test(digits)) return ''
  const fixed = `+4144${digits.slice(3)}`
  return parsePhone(fixed)?.isValid ? fixed : ''
}

/**
 * שדה שמחזיק שני מספרים בקיצור, בצורה "02082091668/9" - הסיומת אחרי הלוכסן
 * מחליפה את הספרות האחרונות. כך נהוג לרשום שני קווים רצופים של אותו בית.
 *
 * הפיצול מותנה בכך ששני הצדדים יוצאים תקינים. בלי התנאי הזה כל לוכסן בשדה
 * היה הופך לרשומה שנייה שגויה.
 */
function splitDualNumber(value: string, country: CountryCode): [string, string] | undefined {
  const m = value.match(/^(.*?)\/(\d{1,4})$/)
  if (!m) return undefined
  const base = m[1].replace(/\D/g, '')
  const tail = m[2]
  if (base.length <= tail.length) return undefined
  const second = base.slice(0, base.length - tail.length) + tail
  const a = parsePhone(base, country)
  const b = parsePhone(second, country)
  if (!a?.isValid || !b?.isValid || a.e164 === b.e164) return undefined
  return [a.e164, b.e164]
}

/**
 * האם הפסילה היא עניין של אורך, ולא של צורה. כשכן - זו ההודעה המועילה,
 * ואין טעם להציע מדינות חלופיות: מספר שחסרה בו ספרה יישאר שגוי בכל מדינה
 * שנלביש עליו.
 */
function describeLength(value: string, country: CountryCode): string {
  switch (validatePhoneNumberLength(value, country)) {
    case 'TOO_SHORT': return 'קצר מדי - כנראה חסרה ספרה'
    case 'TOO_LONG': return 'ארוך מדי - כנראה ספרה עודפת'
    case 'INVALID_LENGTH': return 'אורך שאינו קיים בתוכנית המספור'
    default: return ''
  }
}

/**
 * הסיווג.
 *
 * @param raw        הערך כפי שהוא במסד
 * @param addressCountry מדינת הכתובת הראשית של התורם, ריק כשאין
 * @param description שדה התיאור - טלפון / נייד / טלפון נוסף / פקס
 */
export function classifyPhone(raw: string, addressCountry: string, description: string): Classification {
  const value = (raw || '').trim()
  const expected = expectedLineType(description)
  const none = (reason: string): Classification =>
    ({ confidence: 'ידני', e164: '', country: '', lineType: '', reason, alternatives: [] })

  if (!value) return none('ערך ריק')
  if (!/\d/.test(value)) return none('אין ספרות כלל')
  if (/^0+$/.test(value.replace(/\D/g, ''))) return none('אפסים בלבד')

  const code = (addressCountry || '').trim().toUpperCase()
  const country = (code.length === 2 ? code : FALLBACK_COUNTRY) as CountryCode
  const viaFallback = code.length !== 2

  // שני מספרים בשדה אחד - נבדק לפני הכל, כי הערך כולו אינו מספר תקין
  // ובלעדיו הוא היה נופל לטיפול ידני.
  const dual = splitDualNumber(value, country)
  if (dual) {
    const first = parsePhone(dual[0])
    return {
      confidence: 'גבוה', e164: dual[0], country: first?.country || '',
      lineType: first?.lineType || '',
      reason: 'שני מספרים בשדה אחד - הראשון נשמר כאן, השני נפתח כרשומה נוספת',
      alternatives: [], split: dual[1]
    }
  }

  const parsed = parsePhone(value, country)

  // ── המסלול הראשי: המספר תקין במדינת הכתובת
  if (parsed?.isValid) {
    const already = value.replace(/[\s\-().]/g, '') === parsed.e164
    if (already) {
      return {
        confidence: 'ללא שינוי', e164: parsed.e164, country: parsed.country || '',
        lineType: parsed.lineType, reason: 'כבר E.164', alternatives: []
      }
    }

    // מספר שנושא קידומת בינלאומית מפורשת - הקידומת קובעת, אין מה לשקול.
    if (value.startsWith('+') || value.replace(/\D/g, '').startsWith('00')) {
      return {
        confidence: 'ודאי', e164: parsed.e164, country: parsed.country || '',
        lineType: parsed.lineType, reason: 'קידומת בינלאומית מפורשת', alternatives: []
      }
    }

    // חלופות אמיתיות בלבד: מדינה אחרת, תוכנית מספור הדוקה, תוצאה שונה,
    // וסוג קו שאינו סותר את מה שנרשם באקסל המקורי.
    const alternatives: string[] = []
    for (const c of CANDIDATE_COUNTRIES) {
      if (c === country) continue
      const alt = parsePhone(value, c)
      if (!alt?.isValid || alt.e164 === parsed.e164) continue
      if (contradicts(alt.lineType, expected)) continue
      alternatives.push(`${c}=${alt.e164}`)
    }

    const loose: string[] = []
    for (const c of LOOSE_PLAN) {
      const alt = parsePhone(value, c)
      if (alt?.isValid && alt.e164 !== parsed.e164) loose.push(`${c}=${alt.e164}`)
    }

    if (!alternatives.length) {
      return {
        confidence: viaFallback ? 'גבוה' : 'ודאי',
        e164: parsed.e164, country: parsed.country || '', lineType: parsed.lineType,
        reason: viaFallback
          ? 'אין מדינת כתובת - פוענח לפי ברירת המחדל הבריטית'
          : loose.length
            ? 'תקין במדינת הכתובת; החלופה היחידה היא תוכנית מספור פרוצה'
            : 'תקין רק במדינת הכתובת',
        alternatives: loose
      }
    }

    // יש חלופה אמיתית. מדינת הכתובת עדיין מנצחת - היא עדות ולא ניחוש - אבל
    // הוודאות יורדת ל"גבוה" וההמרה תרוץ בבלוק נפרד.
    return {
      confidence: 'גבוה', e164: parsed.e164, country: parsed.country || '',
      lineType: parsed.lineType,
      reason: `מדינת הכתובת (${country}) מול ${alternatives.length} חלופות`,
      alternatives
    }
  }

  // ── מסלול ההצלה: המספר נפסל במדינת הכתובת
  //
  // זה המקרה שבו הכתובת פשוט אינה המדינה של המספר - תורם שרשום בישראל עם
  // נייד בריטי, או להפך. אם המספר תקין בדיוק בצורה אחת בין המועמדות, אותה
  // צורה היא התשובה, וצורת המספר גוברת על הכתובת.
  const found = new Map<string, string[]>()
  for (const c of CANDIDATE_COUNTRIES) {
    const alt = parsePhone(value, c)
    if (!alt?.isValid) continue
    if (contradicts(alt.lineType, expected)) continue
    const list = found.get(alt.e164) || []
    list.push(c)
    found.set(alt.e164, list)
  }

  if (found.size === 1) {
    const [e164, countries] = [...found.entries()][0]
    const alt = parsePhone(e164)
    return {
      confidence: 'ודאי', e164, country: alt?.country || '', lineType: alt?.lineType || '',
      reason: `נפסל ב-${country}, תקין בדיוק בצורה אחת (${countries.join(', ')})`,
      alternatives: []
    }
  }

  const zurich = zurichLegacy(value)
  if (zurich) {
    return {
      confidence: 'גבוה', e164: zurich, country: 'CH', lineType: parsePhone(zurich)?.lineType || '',
      reason: 'קידומת ציריך הישנה 01, שבוטלה ב-2002 והוחלפה ב-044',
      alternatives: []
    }
  }

  // אבחון אורך. זה מה שהופך רשומה ידנית ממשימת בילוש למשימה של דקה: "חסרה
  // ספרה במספר לונדוני" אפשר לתקן מול התורם, "+33208806793 או +31208806793
  // או +61208806793" הוא רעש. נבדק רק כאן, אחרי כלל ציריך - שם האורך החסר
  // הוא התסמין ולא המחלה.
  const lengthIssue = describeLength(value, country)
  if (lengthIssue) return none(`${lengthIssue} (${country})`)

  // נותרו צורות אפשריות במדינות אחרות, אבל לא במדינת הכתובת. למעשה זה מספר
  // שבור של תורם מקומי: החלופות תיאורטיות, ומוצגות רק כדי שלא ייראה שנשקל
  // פחות ממה שנשקל.
  if (found.size > 1) {
    return none(`נפסל ב-${country}; חלופות תיאורטיות בלבד: ${[...found.keys()].join(' | ')}`)
  }

  return none(`לא תקין ב-${country} ובאף אחת מהמדינות המועמדות`)
}
