import { formatPhoneForDisplay } from './phone-format'
import { LEGACY_EXACT, LEGACY_HINTS, PhoneLine, PhoneType } from '../enum/phone-type'
/**
 * phone-utils.ts
 *
 * Shared helpers for phone-number classification and display selection.
 *
 * Single source of truth used by all controllers/components that show a donor's
 * phone information (donor list, donations, reports, exports, prints, etc.) so
 * the rules are defined once. Per client decision the canonical "טלפון" column
 * shows mobiles when any exist, otherwise falls back to landlines - never both.
 */

/**
 * MOBILE_PATTERNS - the ONE list that decides whether a number is a mobile.
 *
 * Kept as plain regex SOURCE strings (not RegExp objects) on purpose: the same
 * strings are compiled by isMobilePhone() here in TypeScript AND injected into
 * the sqlExpression on Donor, so Postgres sorts by exactly the value the screen
 * shows. Adding a country is one line here and both sides follow.
 *
 * Digits only - spaces, dashes, dots and the plus are stripped before matching,
 * so '050-1234567', '050 123 4567' and '+972-50-123-4567' all behave the same.
 *
 * Note on the US/Canada (+1): there is NO mobile pattern. American numbers use
 * the same area codes for mobile, landline and office, so the digits cannot
 * tell them apart - those take their type from the description, which since
 * item 6 is a closed list (shared/enum/phone-type.ts).
 *
 * Switzerland has no local pattern here on purpose. Its mobile range 075-079
 * is ten digits starting 07 - exactly the Israeli VoIP/landline range
 * (076/077/078/079). A local Swiss pattern classified every Israeli 077 as a
 * mobile, and disagreed with itself, since the same number written
 * +972-77-... did not match. Swiss mobiles are matched by '^417[5-9]...'.
 * Before adding a bare local range for a new country, check it against the
 * Israeli ranges first.
 */
export const MOBILE_PATTERNS: string[] = [
  '^05\\d{8}$',      // Israel        05X          (local - home country)
  '^9725\\d{8}$',    // Israel intl   +972 5X
  '^07\\d{9}$',      // UK            07X          (11 digits - no Israeli overlap)
  '^447\\d{9}$',     // UK intl       +44 7X
  '^04[789]\\d{7}$', // Belgium       047/048/049  (10 digits - Israeli 04 is 9)
  '^324[789]\\d{7}$',// Belgium intl  +32 4X
  '^417[5-9]\\d{7}$' // Switzerland intl +41 7X    (no local form - see RULE)
]

/** True when the digits alone match a mobile pattern - without the description. */
export function isMobileNumber(raw: string | null | undefined): boolean {
  if (!raw) return false
  const digits = String(raw).replace(/\D/g, '')
  return MOBILE_PATTERNS.some(p => new RegExp(p).test(digits))
}

/**
 * סעיף 6 - הכלל האחד: לאיזו עמודה המספר שייך.
 * הסוג שנבחר בכרטיס קובע (PhoneType, דרך התיאור). רק כשאין סוג מוכר - לפי
 * המספר. sqlPhoneLine הוא אותו כלל בדיוק, לפוסטגרס.
 */
export function phoneLineOf(raw: string | null | undefined, description?: string | null): PhoneLine {
  const type = PhoneType.fromDescription(description)
  if (type) return type.line
  return isMobileNumber(raw) ? 'mobile' : 'landline'
}

/** True when the number belongs in the נייד column - see phoneLineOf. */
export function isMobilePhone(raw: string | null | undefined, description?: string | null): boolean {
  if (!raw) return false
  return phoneLineOf(raw, description) === 'mobile'
}

/**
 * True when the number genuinely cannot be classified: no type in the
 * description and no mobile pattern. In practice US/Canada, where the digits do
 * not carry the answer. סעיף 6 - זו הדרך למצוא את המספרים שעוד צריכים אדם
 * שיבחר להם סוג מהרשימה.
 */
export function isMobileUnknown(raw: string | null | undefined, description?: string | null): boolean {
  if (!raw) return false
  return !PhoneType.fromDescription(description) && !isMobileNumber(raw)
}

/**
 * Picks which phone numbers should be shown in the canonical "טלפון" column.
 * Per client decision:
 *   - If the donor has any mobile numbers -> return ALL mobiles
 *   - Otherwise -> return ALL landlines (if any)
 *   - Otherwise -> empty array
 *
 * Returned array preserves the original order of `allPhones` within each
 * bucket, and is de-duplicated.
 */
export function selectDisplayPhones(allPhones: (string | null | undefined)[]): string[] {
  const seenMobile = new Set<string>()
  const seenLandline = new Set<string>()
  const mobiles: string[] = []
  const landlines: string[] = []
  for (const p of allPhones) {
    if (!p) continue
    const value = String(p).trim()
    if (!value) continue
    if (isMobilePhone(value)) {
      if (!seenMobile.has(value)) {
        seenMobile.add(value)
        mobiles.push(value)
      }
    } else {
      if (!seenLandline.has(value)) {
        seenLandline.add(value)
        landlines.push(value)
      }
    }
  }
  return mobiles.length > 0 ? mobiles : landlines
}

/**
 * Convenience helper - joins the display phones with a separator (default '\n'
 * so each number renders on its own line in Excel cells with wrap-text and in
 * print HTML after a '\n' -> '<br>' substitution).
 *
 * Why newline by default: a semicolon-joined string ('0501234567; 050987...')
 * makes columns very wide and harder to scan when a donor has multiple
 * numbers. Stacking them vertically keeps the column narrow and readable.
 */
export function formatDisplayPhones(allPhones: (string | null | undefined)[], separator: string = '\n'): string {
  return selectDisplayPhones(allPhones).map(p => formatPhoneForDisplay(p)).join(separator)
}

// ── Separate phone / mobile columns (item 18 / B1, 20.10.2026) ────────────
//
// Israel: "עמודת נייד - במסך, בייצוא ובהדפסה, בכל המקומות". The single
// "טלפון" column above (mobiles if any, else landlines) becomes TWO columns:
// טלפון = landlines, נייד = mobiles. Same classifier (isMobilePhone - the
// number pattern OR a mobile word in the description), one place.

export interface PhoneContactLike {
  phoneNumber?: string | null
  description?: string | null
  isPrimary?: boolean | null
  /** סדר ההזנה - שובר שוויון אחרי isPrimary. */
  createdDate?: Date | string | null
}

/** Display strings per donor - each joined with '\n', '' when none. */
export interface DonorPhoneDisplay {
  phone: string
  mobile: string
}

/**
 * Splits a donor's phone contacts into landlines and mobiles, primary first,
 * de-duplicated by digits (so '050-1234567' and '0501234567' count once).
 *
 * סעיפים 1, 31 - הערכים חוזרים מכאן כבר מעוצבים ב-formatPhoneForDisplay.
 * זה הפתח היחיד שדרכו טלפון של תורם מגיע לכל מסך בפלטפורמה, ולכן זה המקום
 * לעצב בו. קודם רק toPhoneDisplay עיצב, ומי שקרא ל-DonorPhoneController.load
 * ישירות - דוח התרומות - קיבל את המחרוזת כפי שהוזנה והציג אותה כך.
 *
 * הסיווג נייד/נייח נעשה על הערך הגולמי, לפני העיצוב, כדי שלא ישתנה בגללו.
 */
export function splitPhones(contacts: PhoneContactLike[]): { landlines: string[]; mobiles: string[] } {
  // סעיף 6 - "הראשון קובע": ראשי, ואחריו סדר ההזנה. אותו סדר כמו
  // Donor.primaryLandline / primaryMobile, כך שהמיון והתצוגה מסכימים.
  const time = (d?: Date | string | null) => d ? new Date(d).getTime() : 0
  const sorted = [...(contacts || [])].sort((a, b) =>
    ((b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)) || (time(a.createdDate) - time(b.createdDate)))
  const landlines: string[] = []
  const mobiles: string[] = []
  for (const c of sorted) {
    const value = String(c.phoneNumber || '').trim()
    if (!value) continue
    const line = phoneLineOf(value, c.description)
    // סעיף 6 - טלפון אחד ונייד אחד בלבד, במסך, בייצוא ובהדפסה. פקס לא מופיע
    // ברשימות כלל - הוא נשאר בכרטיס התורם.
    if (line === 'mobile' && mobiles.length === 0) mobiles.push(formatPhoneForDisplay(value))
    if (line === 'landline' && landlines.length === 0) landlines.push(formatPhoneForDisplay(value))
  }
  return { landlines, mobiles }
}

/**
 * splitPhones joined for display.
 *
 * סעיפים 1, 31 - כל מספר עובר דרך formatPhoneForDisplay, הפורמט האחד של
 * הפלטפורמה (E.164), מקביל ל-Place.getDisplayAddress() של הכתובות. עד כה
 * הרשימות הציגו את המחרוזת הגולמית כפי שהוזנה, ולכן "7188518962",
 * "596-3284 845" ו-"052-652-6063" הופיעו זו לצד זו באותה עמודה.
 */
export function toPhoneDisplay(split: { landlines: string[]; mobiles: string[] } | undefined, separator: string = '\n'): DonorPhoneDisplay {
  const format = (list: string[]) => list.map(p => formatPhoneForDisplay(p)).join(separator)
  return {
    phone: format(split?.landlines || []),
    mobile: format(split?.mobiles || [])
  }
}

/**
 * phoneLineOf כביטוי SQL - לשדות המיון (Donor.primaryLandline / primaryMobile),
 * כך שפוסטגרס ממיין בדיוק לפי מה שכל עמודה מציגה. נבנה מאותן טבלאות -
 * PhoneType, LEGACY_EXACT, LEGACY_HINTS, MOBILE_PATTERNS - ובאותו סדר: סוג
 * מדויק, מילת רמז, ורק אז המספר. הכלל עדיין חי רק כאן.
 * הקלטים הם שמות עמודות שהפלטפורמה כותבת, אף פעם לא קלט משתמש.
 */
export function sqlPhoneLine(numberCol: string, descriptionCol: string): string {
  const lit = (v: string) => `'${v.replace(/'/g, "''")}'`
  const desc = `btrim(coalesce(${descriptionCol}, ''))`
  const exact: [string, PhoneType][] = [
    ...PhoneType.all().map(t => [t.id, t] as [string, PhoneType]),
    ...Object.entries(LEGACY_EXACT)
  ]
  const digits = `regexp_replace(coalesce(${numberCol}, ''), '\\D', '', 'g')`
  const patterns = MOBILE_PATTERNS.map(p => `${digits} ~ '${p.replace(/\\\\/g, '\\\\').replace(/'/g, "''")}'`)
  return `(case
    ${exact.map(([v, t]) => `when ${desc} = ${lit(v)} then ${lit(t.line)}`).join('\n    ')}
    ${LEGACY_HINTS.map(([w, t]) => `when lower(${desc}) like ${lit('%' + w.toLowerCase() + '%')} then ${lit(t.line)}`).join('\n    ')}
    when ${patterns.join(' or ')} then 'mobile'
    else 'landline' end)`
}

/** עמודת נייד - sqlPhoneLine. */
export function sqlIsMobile(numberCol: string, descriptionCol: string): string {
  return `(${sqlPhoneLine(numberCol, descriptionCol)} = 'mobile')`
}

/** עמודת טלפון - sqlPhoneLine. פקס אינו טלפון ואינו נייד. */
export function sqlIsLandline(numberCol: string, descriptionCol: string): string {
  return `(${sqlPhoneLine(numberCol, descriptionCol)} = 'landline')`
}
