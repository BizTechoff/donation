/**
 * currency.ts
 *
 * O3 / W11 - the platform's default currency, in one place.
 * Client decision (Zoom 24.08.2026, ~2:59): "בכל מקום בתוכנה ברירת מחדל זה
 * ליש״ט" - not only in gifts. Every entity that used to hard-code 'ILS' now
 * points here, so a future change is a single line.
 */
export const DEFAULT_CURRENCY = 'GBP'
