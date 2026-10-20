/**
 * שמות קבצים - הכלל האחד של הפלטפורמה.
 *
 * שני צרכנים, אותם כללי ניקוי:
 *
 * 1. סעיף 27 (ישראל, 09.10.2026) - שם קובץ של דוח מופק נושא את סוג הדוח ואת כל
 *    מאפייני הסינון, כדי שקובץ שנשמר או נשלח יהיה מזוהה בלי לפתוח אותו.
 *    מפריד " - ", עד כ-120 תווים, והתו "/" אסור בשם קובץ.
 *
 * 2. סעיף 7 - שם הקובץ שמשתמש מעלה הופך ל-S3 key. שם כמו "עצמי - 3 ,ף.jpeg"
 *    עובר קידוד באחוזים בדרך, וכל אי-התאמה בין המפתח שנחתם בהעלאה למפתח
 *    שנחתם בהורדה מחזירה AccessDenied.
 *
 * אין כאן תלות ב-Angular או ברימלט במכוון - הקובץ משרת גם קליינט וגם שרת,
 * ויכול לשרת גם את שם קובץ המכתב (סעיף 11).
 */

export const FILE_NAME_SEPARATOR = ' - '
export const FILE_NAME_MAX_LENGTH = 120

/**
 * מפרידי נתיב. הופכים למקף ולא נמחקים, אחרת "אנ"ש / תלמידנו" היה הופך
 * ל"אנ"ש תלמידנו" ושתי הקטגוריות נבלעות זו בזו.
 */
const PATH_SEPARATORS = /[\\/]/g

/**
 * גרשיים כפולים צמודים לאות עברית הם גרשיים של עברית - ציון שנה (תשפ"ו),
 * ראשי תיבות (ע"ח), קיצור (אנ"ש) - ולא מירכאות. התו ASCII אסור בשם קובץ,
 * אבל הגרשיים העבריים (U+05F4) מותרים, ולכן ההמרה משמרת את הטקסט.
 * בלי זה "דינער תשפ"ו" היה הופך ל"דינער תשפ-ו".
 */
const HEBREW_GERSHAYIM = /(?<=[\u05D0-\u05EA])"(?=[\u05D0-\u05EA])/g
/** גרש בודד צמוד לאות עברית - ר' , צ' . מותר בשם קובץ, אבל מאוחד לצורה העברית. */
const HEBREW_GERESH = /(?<=[\u05D0-\u05EA])'/g

/** שאר התווים שמערכות הקבצים אוסרות. נמחקים - מקף במקומם רק מרעיש. */
const ILLEGAL_CHARS = /[:*?"<>|]/g
/** תווי בקרה - לא נראים, ושוברים גם שמות קבצים וגם S3 keys. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g

/**
 * חלק אחד של שם קובץ, מנוקה. מחזיר מחרוזת ריקה לערך ריק - כך שהבונה למטה
 * יכול לסנן חלקים ריקים במקום לבדוק כל שדה בנפרד.
 */
export function sanitizeFileNamePart(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(CONTROL_CHARS, ' ')
    .replace(HEBREW_GERSHAYIM, '\u05F4')
    .replace(HEBREW_GERESH, '\u05F3')
    .replace(PATH_SEPARATORS, '-')
    .replace(ILLEGAL_CHARS, '')
    .replace(/\s+/g, ' ')
    // ווינדוס לא שומר שם שמסתיים בנקודה או ברווח.
    .replace(/^[\s.]+/, '')
    .replace(/[\s.]+$/, '')
}

export interface BuildFileNameOptions {
  /** סיומת בלי הנקודה, למשל 'xlsx'. בלי סיומת - מוחזר שם בלבד, ל-<title> של הדפסה. */
  extension?: string
  /** אורך מקסימלי של השם עצמו, בלי הסיומת. */
  maxLength?: number
  separator?: string
}

/**
 * מחבר חלקים לשם קובץ אחד: מנקה כל חלק, זורק ריקים וכפולים עוקבים, מחבר
 * במפריד ומקצר לפי הכלל של סעיף 27.
 */
export function buildFileName(
  parts: (string | number | null | undefined)[],
  options: BuildFileNameOptions = {}
): string {
  const {
    extension,
    maxLength = FILE_NAME_MAX_LENGTH,
    separator = FILE_NAME_SEPARATOR
  } = options

  const clean: string[] = []
  for (const part of parts) {
    const value = sanitizeFileNamePart(part)
    // חלק זהה לקודמו לא מוסיף מידע ("דוח תרומות - דוח תרומות").
    if (value && value !== clean[clean.length - 1]) clean.push(value)
  }

  // קיצור: זורקים חלקים שלמים מהסוף, כי החלקים הראשונים הם המזהים - סוג הדוח
  // ואחריו הסינון העיקרי. אם גם החלק הראשון לבדו ארוך מדי, חותכים אותו.
  while (clean.length > 1 && clean.join(separator).length > maxLength) clean.pop()
  let name = clean.join(separator)
  if (name.length > maxLength) name = sanitizeFileNamePart(name.slice(0, maxLength))

  if (!name) name = 'ללא שם'
  return extension ? `${name}.${extension}` : name
}

/* ===========================================================================
 * S3 - סעיף 7
 * ======================================================================== */

/**
 * שם קובץ שבטוח לשמש כ-S3 key: בלי "/" (הוא מפריד תיקיות במפתח), בלי תווי
 * בקרה, ובלי רווחים כפולים. עברית נשמרת - S3 תומך ב-UTF-8 במפתח; מה ששבר את
 * ההורדה היה אי-התאמה בין המפתחות, לא העברית עצמה.
 */
export function sanitizeS3FileName(fileName: string | null | undefined): string {
  const clean = sanitizeFileNamePart(fileName)
  return clean || 'file'
}

/**
 * מחזיר את ה-S3 key מתוך filePath, בשני הפורמטים שקיימים ב-DonationFile:
 *
 *   - נתיב יחסי, הפורמט הנוכחי: "donations/<donationId>/<uniqueFileName>"
 *   - URL מלא, מה שנשמר בעבר (ה-URL החתום בלי ה-query) - ממנו נלקח ה-pathname
 *     ומפוענח, אחרת המפתח נשאר מקודד באחוזים ולא תואם לאובייקט שבבאקט.
 *
 * הנחה: URL בסגנון virtual-hosted (<bucket>.s3.<region>.amazonaws.com/<key>),
 * כפי שה-SDK מייצר כאן. בסגנון path-style ה-pathname היה כולל גם את שם הבאקט.
 */
export function parseS3FilePath(filePath: string | null | undefined): { bucketKey: string; fileName: string } {
  let key = (filePath || '').trim()

  if (/^https?:\/\//i.test(key)) {
    try {
      key = new URL(key).pathname
    } catch {
      key = key.replace(/^https?:\/\/[^/]+/i, '')
    }
    try {
      key = decodeURIComponent(key)
    } catch {
      // מחרוזת עם % לא תקין - משאירים כמות שהיא ולא מפילים את הבקשה.
    }
  }

  key = key.replace(/^\/+/, '')

  const lastSlash = key.lastIndexOf('/')
  return lastSlash < 0
    ? { bucketKey: '', fileName: key }
    : { bucketKey: key.slice(0, lastSlash), fileName: key.slice(lastSlash + 1) }
}
