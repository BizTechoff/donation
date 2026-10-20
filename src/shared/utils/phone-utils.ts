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
 * tell them apart - those fall back to the contact's description (see
 * MOBILE_DESCRIPTION_HINTS). This is why Z8 needs the "numbers to classify"
 * list, and why H2 (a closed description list) is the real fix.
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

/** Descriptions that mark a contact as a mobile when the digits cannot. */
export const MOBILE_DESCRIPTION_HINTS = ['נייד', 'סלולרי', 'mobile', 'cell', 'cellular']

/**
 * Returns true if the given phone number matches a mobile pattern.
 * `description` is consulted when the digits are inconclusive - the only
 * signal available for US/Canada numbers.
 */
export function isMobilePhone(raw: string | null | undefined, description?: string | null): boolean {
  if (!raw) return false
  const digits = String(raw).replace(/\D/g, '')
  if (MOBILE_PATTERNS.some(p => new RegExp(p).test(digits))) return true

  const desc = (description || '').trim().toLowerCase()
  if (desc && MOBILE_DESCRIPTION_HINTS.some(h => desc.includes(h.toLowerCase()))) return true

  return false
}

/**
 * True when the number genuinely cannot be classified: no pattern matched and
 * the description gives no hint. In practice this is US/Canada, where the same
 * area codes serve mobile, landline and office - the digits simply do not carry
 * the answer, and no rule here will ever recover it.
 *
 * NOT CALLED ANYWHERE TODAY, and kept on purpose. Z8 was closed by adding the
 * Belgian and Swiss patterns; the American remainder falls back to the contact
 * description. The real fix is H2 - a CLOSED list of contact descriptions
 * (נייד / בית / משרד) instead of free text - after which this predicate becomes
 * the way to find the rows that still need a human to say which they are.
 * Delete it only if H2 is dropped for good.
 */
export function isMobileUnknown(raw: string | null | undefined, description?: string | null): boolean {
  if (!raw) return false
  if (isMobilePhone(raw, description)) return false
  const desc = (description || '').trim().toLowerCase()
  const saysLandline = ['בית', 'משרד', 'עבודה', 'פקס', 'home', 'work', 'office', 'fax']
    .some(h => desc.includes(h))
  return !saysLandline
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
  return selectDisplayPhones(allPhones).join(separator)
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
}

/** Display strings per donor - each joined with '\n', '' when none. */
export interface DonorPhoneDisplay {
  phone: string
  mobile: string
}

/**
 * Splits a donor's phone contacts into landlines and mobiles, primary first,
 * de-duplicated by digits (so '050-1234567' and '0501234567' count once).
 */
export function splitPhones(contacts: PhoneContactLike[]): { landlines: string[]; mobiles: string[] } {
  const sorted = [...(contacts || [])].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
  const seen = new Set<string>()
  const landlines: string[] = []
  const mobiles: string[] = []
  for (const c of sorted) {
    const value = String(c.phoneNumber || '').trim()
    if (!value) continue
    const key = value.replace(/\D/g, '') || value
    if (seen.has(key)) continue
    seen.add(key)
    if (isMobilePhone(value, c.description)) mobiles.push(value)
    else landlines.push(value)
  }
  return { landlines, mobiles }
}

/** splitPhones joined for display. */
export function toPhoneDisplay(split: { landlines: string[]; mobiles: string[] } | undefined, separator: string = '\n'): DonorPhoneDisplay {
  return {
    phone: (split?.landlines || []).join(separator),
    mobile: (split?.mobiles || []).join(separator)
  }
}

/**
 * The same classifier as isMobilePhone, as a SQL boolean expression - for
 * sqlExpression sort fields (Donor.primaryLandline / primaryMobile), so the
 * DB sorts by exactly the value each column shows. Built from MOBILE_PATTERNS
 * and MOBILE_DESCRIPTION_HINTS - the rule still lives only in this file.
 * Inputs are column references written by the platform, never user input.
 */
export function sqlIsMobile(numberCol: string, descriptionCol: string): string {
  const digits = `regexp_replace(coalesce(${numberCol}, ''), '\\D', '', 'g')`
  const patterns = MOBILE_PATTERNS.map(p => `${digits} ~ '${p.replace(/\\\\/g, '\\\\').replace(/'/g, "''")}'`)
  const hints = MOBILE_DESCRIPTION_HINTS.map(h => `lower(coalesce(${descriptionCol}, '')) like '%${h.toLowerCase().replace(/'/g, "''")}%'`)
  return `(${[...patterns, ...hints].join(' or ')})`
}
