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
 * Returns true if the given phone number matches a mobile pattern.
 * Patterns recognised:
 *   - Israeli 05X-XXXXXXX           (10 digits starting with 05)
 *   - Israeli international +972 5X (digits start 9725...)
 *   - UK     07X-XXXXXXXXX          (11 digits starting with 07)
 *   - UK     international +44 7X   (digits start 447...)
 *
 * Non-digit characters in the input (spaces, dashes, dots, plus) are ignored,
 * so '050-1234567', '050 123 4567', '+972-50-123-4567' all match the same way.
 *
 * To add more patterns (US mobile, French mobile, etc.) just extend the regex
 * list below - all consumers of this helper benefit automatically.
 */
export function isMobilePhone(raw: string | null | undefined): boolean {
  if (!raw) return false
  const digits = String(raw).replace(/\D/g, '')
  if (/^05\d{8}$/.test(digits)) return true     // Israeli 05X
  if (/^9725\d{8}$/.test(digits)) return true   // Israeli +972 5X
  if (/^07\d{9}$/.test(digits)) return true     // UK 07X
  if (/^447\d{9}$/.test(digits)) return true    // UK +44 7X
  return false
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
