/**
 * זיהוי ערים כפולות - סעיף 2 (E1).
 *
 * אותה עיר נרשמה בכמה צורות, ולכל צורה המערכת מתייחסת כאל עיר נפרדת: הסינון
 * הגלובלי מפספס, הדוחות מפצלים והמפה מפזרת. המזהה של עיר הוא המחרוזת עצמה -
 * donor.controller בונה את רשימת הערים מ-[...new Set(places.map(p => p.city))].
 *
 * שתי רמות של התאמה, לפי החלטת מוטי (20.10):
 *
 * 1. נרמול כתיב - רווחים כפולים, מקפים, גרשיים וגרש, ניקוד, רישיות.
 *    "בני-ברק" = "בני ברק" = "בני  ברק". בטוח לחלוטין.
 *
 * 2. שלד עיצורים חוצה-שפה - "Bnei Brak" מול "בני ברק". אותה עיר שנרשמה פעם
 *    בעברית ופעם בתעתיק לטיני. שתי המחרוזות מצטמצמות לשלד עיצורים אחד,
 *    ולכן גם Bney Brak, B'nei Brak ו-Bene Beraq נופלים יחד איתן.
 *
 * אף אחת מהשתיים אינה הוכחה - הן מציעות קבוצות לאישור אנושי. שום איחוד לא
 * קורה אוטומטית.
 */

/** ניקוד, טעמים וסימני פיסוק עבריים שאינם אותיות. */
const HEBREW_MARKS = /[֑-ׇ]/g
/** גרש, גרשיים, מרכאות, אפוסטרוף - כולם מופיעים בקיצורי ערים. */
const QUOTES = /['"`׳״‘’“”]/g
/** מפריד מילים: מקף, מקף עברי, קו תחתון, נקודה, פסיק. */
const WORD_SEPARATORS = /[-־_.,]/g

/**
 * נרמול כתיב - רמה 1. שתי מחרוזות עם אותו ערך מוחזר הן כמעט בוודאות אותה עיר.
 */
export function normalizeCityName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    // דיאקריטיים מפורשות: Zürich -> Zurich, São -> Sao. בלי זה ה-ü פשוט נפל
    // מהשלד כי הוא אינו a-z, וזה עבד במקרה - "Müller" היה מתנהג לא צפוי.
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(HEBREW_MARKS, '')
    .replace(QUOTES, '')
    .replace(WORD_SEPARATORS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * אותיות עבריות לעיצור לטיני.
 *
 * שתי הכרעות שנובעות מכך שתעתיק אינו חד-חד-ערכי:
 *
 * 1. הלביאליות מתמזגות. ב היא b או v ("אביב" / "Aviv"), פ היא p או f
 *    ("חיפה" / "Haifa"), ו-w מופיעה בתעתיקים ישנים. כולן -> 'b'. בלי זה
 *    "תל אביב" ו-"Tel Aviv" לא נפגשים.
 *
 * 2. א, ה, י נזרקות כאמות קריאה, כמו התנועות בצד הלטיני.
 *
 * ו לא נכרעת כאן - היא גם תנועה ("חולון" / "Holon") וגם עיצור
 * ("תקווה" / "Tikva"), ולכן היא מטופלת בנפרד ב-cityConsonantKeys, שמייצר
 * מפתח לכל קריאה.
 */
const HEBREW_TO_LATIN: { [letter: string]: string } = {
  'א': '', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': '', 'ז': 'z',
  'ח': 'h', 'ט': 't', 'י': '', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm',
  'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '', 'פ': 'b', 'ף': 'b',
  'צ': 'z', 'ץ': 'z', 'ק': 'k', 'ר': 'r', 'ש': 's', 'ת': 't',
}

/** תנועות לטיניות ו-j (שמייצגת י, שנזרקת) - כולן מחוץ לשלד. */
const LATIN_DROPPED = /[aeiouyj]/g

/**
 * צמדי אותיות לטיניים שמייצגים עיצור עברי אחד. חייבים להצטמצם לפני המיפוי
 * אות-אות, אחרת "sh" יהפוך ל-"ss" ולא ייפגש עם ש.
 */
const LATIN_DIGRAPHS: [RegExp, string][] = [
  [/sh/g, 's'], [/ch/g, 'h'], [/kh/g, 'h'], [/ts/g, 'z'], [/tz/g, 'z'],
  [/ph/g, 'p'], [/th/g, 't'], [/qu/g, 'k'], [/ck/g, 'k'],
]

/**
 * לביאליות וסימנים לטיניים שממופים לעיצור העברי המקביל.
 *
 * מיזוג הלביאליות (v/w/f/p -> b) נחוץ רק בהשוואה חוצת-כתב: ב היא b או v
 * ("אביב" / "Aviv"), פ היא p או f ("חיפה" / "Haifa"). בתוך אותו כתב הוא מזיק -
 * בפרודקשן הוא איחד "Haifa" עם "Hawaii" (שתיהן hb). לכן יש שתי רמות.
 */
const LATIN_LABIALS: [RegExp, string][] = [[/[vwfp]/g, 'b']]
const LATIN_SINGLES: [RegExp, string][] = [
  [/q/g, 'k'], [/c/g, 'k'], [/x/g, 'ks'],
]

/** הכתב שבו נכתב השם - קובע איזו רמת השוואה חלה. */
export type CityScript = 'hebrew' | 'latin' | 'mixed'

export function cityScript(name: string | null | undefined): CityScript {
  const raw = name || ''
  const hasHebrew = /[\u05D0-\u05EA]/.test(raw)
  const hasLatin = /[A-Za-z]/.test(raw)
  return hasHebrew && hasLatin ? 'mixed' : hasHebrew ? 'hebrew' : 'latin'
}

/**
 * מרחק עריכה עם החלפת שכנים (Damerau-Levenshtein).
 *
 * הכלל שהוסכם (מוטי, 20.10): בתוך אותו כתב, הפרש של אות אחת הוא כמעט תמיד
 * אותה עיר - "Zurich"/"Zürich", "Beit"/"Bet". החלפת שתי אותיות סמוכות
 * ("Haifa"/"Hiafa") נספרת כאחת. הפרש גדול יותר הוא כבר שם אחר -
 * "Haifa"/"Hawaii".
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (m === 0 || n === 0) return Math.max(m, n)

  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost)
      }
    }
  }
  return d[m][n]
}

/**
 * צירופי גרש בעברית שמייצגים עיצור לועזי. הגרש מוסר בנרמול, ולכן הם מטופלים
 * על המחרוזת הגולמית: "מנצ׳סטר" בלי זה היה mnzstr ו-"Manchester" היה mnhstr.
 */
const HEBREW_GERESH: [RegExp, string][] = [
  [/צ['\u05F3\u2019]/g, 'h'], [/ג['\u05F3\u2019]/g, 'g'], [/ז['\u05F3\u2019]/g, 'z'],
]

/**
 * בניית שלד אחד, עם קריאה נתונה של ו.
 *
 * בצד הלטיני הכללים חלים לפני הסרת הרווחים, אחרת צמד נוצר על פני גבול מילה:
 * "beit shemesh" היה הופך ל-"beitsemes", ואז הצמד ts בולע את גבול המילה
 * ומוציא "bzms" במקום "btsms".
 */
function buildKey(normalized: string, vavAsConsonant: boolean, mergeLabials: boolean): string {
  const isHebrew = /[\u05D0-\u05EA]/.test(normalized)

  if (isHebrew) {
    let key = ''
    for (const char of normalized) {
      if (char === 'ו') key += vavAsConsonant ? 'b' : ''
      else if (char >= '\u05D0' && char <= '\u05EA') {
        const mapped = HEBREW_TO_LATIN[char] ?? ''
        // ברמה המחמירה פ נשארת p; במיזוג היא b, כמו f ו-ph הלטיניות.
        key += !mergeLabials && (char === 'פ' || char === 'ף') ? 'p' : mapped
      }
      else if (char >= 'a' && char <= 'z') key += char
      // ספרות, רווחים וכל השאר - מחוץ לשלד.
    }
    return key.replace(/(.)\1+/g, '$1')
  }

  let latin = normalized
  for (const [pattern, replacement] of LATIN_DIGRAPHS) latin = latin.replace(pattern, replacement)
  for (const [pattern, replacement] of LATIN_SINGLES) latin = latin.replace(pattern, replacement)
  if (mergeLabials) for (const [pattern, replacement] of LATIN_LABIALS) latin = latin.replace(pattern, replacement)
  latin = latin.replace(LATIN_DROPPED, '').replace(/[^a-z]/g, '')

  // אות כפולה היא הבדל כתיב, לא הבדל עיר ("Beraq" / "Berraq").
  return latin.replace(/(.)\1+/g, '$1')
}

/**
 * מפריד סיומת קיצור מדינה/מחוז מהשם: "Brooklyn, NY" -> { city: 'Brooklyn', state: 'NY' }.
 *
 * זה הדפוס שהתגלה בנתונים האמיתיים (20.10): הכפילות השכיחה היא "City, ST"
 * מול "City". בלי ההפרדה, ה-ST מוסיף עיצור לשלד ושתי הגרסאות לא נפגשות.
 *
 * הסיומת נשמרת ולא נזרקת: "Springfield, IL" ו-"Springfield, MA" הן ערים
 * שונות, ולכן שתי גרסאות ששתיהן נושאות קיצור והוא שונה לא מתאחדות.
 */
export function splitCityState(name: string | null | undefined): { city: string; state: string } {
  const raw = (name || '').trim()
  const match = raw.match(/^(.*?)[,\s]+([A-Za-z]{2})\.?$/)
  if (!match || !match[1].trim()) return { city: raw, state: '' }
  return { city: match[1].trim(), state: match[2].toUpperCase() }
}

/**
 * שלדי העיצורים של שם - אחד, או שניים כששתי קריאות של ו אפשריות.
 * שני שמות הם אותה עיר כשיש להם שלד משותף אחד לפחות:
 *
 *   "בני ברק" / "Bnei Brak"   -> bnbrk
 *   "תל אביב" / "Tel Aviv"     -> tlb
 *   "חולון"  / "Holon"        -> hln
 *   "תקווה"  / "Tikva"        -> tkb
 */
export function cityConsonantKeys(name: string | null | undefined, mergeLabials = true): string[] {
  // השלד נבנה מהעיר בלבד; הקיצור מושווה בנפרד ב-groupDuplicateCities.
  let raw = splitCityState(name).city
  for (const [pattern, replacement] of HEBREW_GERESH) raw = raw.replace(pattern, replacement)

  const normalized = normalizeCityName(raw)
  if (!normalized) return []

  const keys = new Set<string>()
  for (const vavAsConsonant of [false, true]) {
    const key = buildKey(normalized, vavAsConsonant, mergeLabials)
    if (key) keys.add(key)
  }
  return [...keys]
}

/** השלד הראשי - לתצוגה ולבדיקות. */
export function cityConsonantKey(name: string | null | undefined): string {
  return cityConsonantKeys(name)[0] || ''
}

export interface CityVariant {
  /** הערך כפי שהוא שמור ב-places.city */
  name: string
  /** בכמה רשומות places הוא מופיע */
  placeCount: number
  /** כמה תורמים מחוברים לרשומות האלה */
  donorCount: number
  /** מרכז הכובד של ה-places שעברו גיאוקודינג, כשיש כאלה. */
  lat?: number
  lng?: number
  /** מתוך כמה places חושב המרכז. אחד בלבד הוא עדות חלשה. */
  geoCount?: number
}

/** איך נוצרה הקבוצה - משפיע על מידת הביטחון שאפשר לתת לה. */
export type CityMatchBasis = 'spelling' | 'location' | 'both'

export interface CityDuplicateGroup {
  key: string
  /** הגרסה שהכי הרבה תורמים משתמשים בה - ההצעה לערך המוביל. */
  suggested: string
  variants: CityVariant[]
  /** על מה נשענה הקבוצה: כתיב, מיקום, או שניהם. */
  basis: CityMatchBasis
  /**
   * המרחק הגדול ביותר בק"מ בין שתי גרסאות בקבוצה שיש להן מיקום.
   * undefined - אין מספיק מיקומים להשוואה.
   */
  maxDistanceKm?: number
  /**
   * המיקום סותר את הכתיב. בפרודקשן זה כמעט תמיד כתובת בודדת עם קואורדינטות
   * שגויות ולא קבוצה שגויה, ולכן locationOutliers מציין איזו גרסה חורגת.
   */
  locationConflict?: boolean
  /** הגרסאות שמרוחקות מהגרסה הדומיננטית מעבר ל-conflictAboveKm. */
  locationOutliers?: string[]
}

/**
 * מרחק בק"מ בין שתי נקודות (haversine). רדיוס כדור הארץ 6371 ק"מ.
 */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number) => deg * Math.PI / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

export interface CityGroupingOptions {
  /**
   * מרחק מרבי בין מרכזי שתי גרסאות שעדיין מצרף אותן, גם כשהכתיב לא תפס
   * (ראשי תיבות כמו ב"ב).
   *
   * ברירת המחדל 0 - כבוי. בנתונים האמיתיים (20.10) צירוף לפי מיקום יצר 7
   * קבוצות, ואף אחת מהן לא היתה כפילות אמיתית: רוב התורמים בארה"ב, שם
   * עיריות נפרדות יושבות במרחק מאות מטרים - University Heights ו-Beachwood
   * באוהיו, Valley Village ו-North Hollywood בקליפורניה, Teaneck
   * ו-Bergenfield בניו ג׳רזי. אחרי שהשלד מקלף את קיצור המדינה הוא תופס
   * לבדו את הכפילויות האמיתיות, והמיקום נשאר לתפקיד שבו הוא כן הוכיח את
   * עצמו - סימון סתירה (conflictAboveKm).
   */
  mergeWithinKm?: number
  /**
   * מרחק מהגרסה הדומיננטית שמעליו גרסה מסומנת כחריגה - אותו שם בשתי מדינות,
   * או קואורדינטות שגויות.
   */
  conflictAboveKm?: number
  /**
   * הפרש אותיות מרבי שעדיין נחשב אותה עיר, בתוך אותו כתב. 1 - אות אחת או
   * החלפת שתי אותיות סמוכות.
   */
  maxEditDistance?: number
}

/**
 * האם שתי גרסאות הן אותה עיר. הכלל תלוי בכתב, כי מה שמעיד באחד מטעה בשני.
 *
 * אותו כתב - הפרש של אות אחת (כולל החלפת שתי אותיות סמוכות) הוא כמעט תמיד
 *   אותה עיר: "Zurich"/"Zürich", "Beit Shemesh"/"Bet Shemesh",
 *   "Haifa"/"Hiafa". גם שלד מחמיר זהה מספיק. מה שלא עומד בזה הוא שם אחר -
 *   "Haifa"/"Hawaii" הם מרחק 3, ולכן נפרדים.
 *
 * כתב שונה - אין מה למדוד במרחק עריכה בין "חיפה" ל-"Haifa", ולכן ההשוואה
 *   היא בשלד המתמזג, שבו ב/פ הופכות ל-b כמו v/w/f/p הלטיניות. כאן נותרת
 *   אפשרות לפגיעה שגויה ("רחוב" מול "Rahway"), ועליה אחראי דגל המרחק.
 *
 * בשני המקרים: שתי גרסאות ששתיהן נושאות קיצור מדינה שונה אינן אותה עיר.
 */
export function isSameCity(
  nameA: string,
  nameB: string,
  maxEditDistance = 1
): { same: boolean; crossScript: boolean } {
  const a = splitCityState(nameA)
  const b = splitCityState(nameB)
  const sameScript = cityScript(a.city) === cityScript(b.city) && cityScript(a.city) !== 'mixed'

  if (a.state && b.state && a.state !== b.state) return { same: false, crossScript: !sameScript }

  const normA = normalizeCityName(a.city)
  const normB = normalizeCityName(b.city)
  if (!normA || !normB) return { same: false, crossScript: !sameScript }
  if (normA === normB) return { same: true, crossScript: false }

  if (sameScript) {
    if (editDistance(normA, normB) <= maxEditDistance) return { same: true, crossScript: false }
    const strictA = cityConsonantKeys(a.city, false)
    const strictB = new Set(cityConsonantKeys(b.city, false))
    if (strictA.some(k => strictB.has(k))) return { same: true, crossScript: false }
    return { same: false, crossScript: false }
  }

  const looseA = cityConsonantKeys(a.city, true)
  const looseB = new Set(cityConsonantKeys(b.city, true))
  return { same: looseA.some(k => looseB.has(k)), crossScript: true }
}

/**
 * מקבץ גרסאות לקבוצות.
 *
 * ההשוואה היא זוגית ולא לפי מפתח יחיד, כי הכלל תלוי בזוג (אותו כתב או לא).
 * 142 ערים בפרודקשן = כעשרת אלפים זוגות, זניח. הקיבוץ הוא איחוד קבוצות, ולכן
 * א׳ וג׳ נופלות יחד גם דרך ב׳ - "Haifa" / "Hiafa" / "חיפה".
 *
 * המיקום אינו מצרף כברירת מחדל (ראה mergeWithinKm) ומשמש לסימון סתירה בלבד.
 *
 * מוחזרות רק קבוצות עם יותר מגרסה אחת. הסדר: קודם הקבוצות שנוגעות ליותר
 * תורמים.
 */
export function groupDuplicateCities(
  variants: CityVariant[],
  options: CityGroupingOptions = {}
): CityDuplicateGroup[] {
  const { mergeWithinKm = 0, conflictAboveKm = 50, maxEditDistance = 1 } = options
  const usable = variants.filter(v => v.name?.trim())

  const parent = new Map<number, number>()
  const find = (i: number): number => {
    let root = i
    while (parent.get(root) !== root) root = parent.get(root)!
    return root
  }
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b)
    if (ra !== rb) parent.set(rb, ra)
  }
  usable.forEach((_, index) => parent.set(index, index))

  const spellingMates = new Set<number>()
  const locationMates = new Set<number>()

  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const a = usable[i], b = usable[j]

      const match = isSameCity(a.name, b.name, maxEditDistance)
      if (match.same) {
        // התאמה חוצת-כתב נשענת על השלד המתמזג בלבד, ולכן היא הפגיעה ביותר
        // לפגיעה שגויה: "חיפה" ו-"Hawaii" הן שתיהן hb, וכך גם "רחוב"
        // ו-"Rahway". כשיש לשתיהן מיקום והוא סותר - ההתאמה נדחית.
        // התאמה באותו כתב לא נדחית כך: שם סתירת מיקום היא באג קואורדינטות
        // ("Brooklyn" עם גיאוקודינג שגוי), לא קבוצה שגויה.
        const contradicted = match.crossScript &&
          a.lat !== undefined && a.lng !== undefined &&
          b.lat !== undefined && b.lng !== undefined &&
          distanceKm(a.lat, a.lng, b.lat, b.lng) > conflictAboveKm
        if (!contradicted) {
          union(i, j)
          spellingMates.add(i)
          spellingMates.add(j)
        }
        continue
      }

      if (mergeWithinKm > 0 &&
          a.lat !== undefined && a.lng !== undefined &&
          b.lat !== undefined && b.lng !== undefined &&
          !(splitCityState(a.name).state && splitCityState(b.name).state &&
            splitCityState(a.name).state !== splitCityState(b.name).state) &&
          distanceKm(a.lat, a.lng, b.lat, b.lng) <= mergeWithinKm) {
        union(i, j)
        locationMates.add(i)
        locationMates.add(j)
      }
    }
  }

  const byRoot = new Map<number, number[]>()
  usable.forEach((_, index) => {
    const root = find(index)
    const list = byRoot.get(root)
    if (list) list.push(index)
    else byRoot.set(root, [index])
  })

  const result: CityDuplicateGroup[] = []
  for (const [root, indexes] of byRoot) {
    if (indexes.length < 2) continue

    const members = indexes.map(i => usable[i])
    // הערך המוביל: הכי הרבה תורמים, ואז הכי הרבה כתובות. בשוויון - איכות
    // הכתיב מכריעה, אחרת הבחירה שרירותית: "Baltimore" מול "Baltimore, MD"
    // שתיהן תורם אחד, ו-"Haifa" / "Hiafa" / "חיפה" שלושתן אחד.
    const sorted = [...members].sort((a, b) =>
      b.donorCount - a.donorCount ||
      b.placeCount - a.placeCount ||
      spellingQuality(b.name) - spellingQuality(a.name) ||
      a.name.localeCompare(b.name))

    // המרחק נמדד מהגרסה הדומיננטית, לא בין כל זוג: כתובת בודדת עם
    // קואורדינטות שבורות סימנה קבוצה שלמה של 314 תורמים כסתירה. כך החריגה
    // מיוחסת לגרסה שלה.
    const anchor = sorted.find(v => v.lat !== undefined && v.lng !== undefined)
    let maxDistanceKm: number | undefined
    const outliers: string[] = []
    if (anchor) {
      for (const v of sorted) {
        if (v === anchor || v.lat === undefined || v.lng === undefined) continue
        const km = distanceKm(anchor.lat!, anchor.lng!, v.lat, v.lng)
        maxDistanceKm = maxDistanceKm === undefined ? km : Math.max(maxDistanceKm, km)
        if (km > conflictAboveKm) outliers.push(v.name)
      }
    }

    const bySpelling = indexes.some(i => spellingMates.has(i))
    const byLocation = indexes.some(i => locationMates.has(i))

    result.push({
      key: cityConsonantKeys(usable[root].name)[0] || normalizeCityName(usable[root].name),
      suggested: sorted[0].name,
      variants: sorted,
      basis: bySpelling && byLocation ? 'both' : byLocation ? 'location' : 'spelling',
      maxDistanceKm: maxDistanceKm === undefined ? undefined : Math.round(maxDistanceKm * 10) / 10,
      locationConflict: outliers.length > 0,
      locationOutliers: outliers.length > 0 ? outliers : undefined
    })
  }

  return result.sort((a, b) =>
    b.variants.reduce((t, v) => t + v.donorCount, 0) - a.variants.reduce((t, v) => t + v.donorCount, 0))
}

/**
 * ניקוד איכות כתיב, לשבירת שוויון בלבד - לעולם לא גובר על מספר התורמים.
 * מעדיף ערך שנראה כמו ערך שהוזן נכון: רישיות תקינה, וקיצור מדינה כמו רוב
 * הנתונים ("Brooklyn, NY"). בלעדיו הבחירה בין "Baltimore" ל-"Baltimore, MD",
 * ששתיהן תורם אחד, היתה שרירותית.
 */
function spellingQuality(name: string): number {
  let score = 0
  const { city, state } = splitCityState(name)
  if (state) score += 2
  // כולו אותיות קטנות = הקלדה חפוזה.
  if (/[a-z]/.test(city) && city === city.toLowerCase()) score -= 2
  if (/^[A-Z]/.test(city)) score += 1
  return score
}
