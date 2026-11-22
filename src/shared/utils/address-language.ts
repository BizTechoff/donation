/**
 * שפת הכתובות - מדיניות: כתובות, ערים ומדינות באנגלית בלבד (מוטי, 04.11.2026).
 * מקום אחד לבדיקה, לסינון הגלובלי ולרשימות הבחירה של עיר / שכונה / מדינה.
 */

/** יש בטקסט אותיות עבריות */
export function hasHebrew(value: string | null | undefined): boolean {
  return /[֐-׿]/.test(value || '')
}

/** רק ערכים באנגלית - לרשימות בחירה (עיר, שכונה) */
export function englishOnly(values: string[]): string[] {
  return values.filter(v => !!v && !hasHebrew(v))
}

/** שם המדינה באנגלית - nameEn, ורק אם חסר: name, ואחריו הקוד */
export function countryEnglishName(country: { nameEn?: string, name?: string, code?: string } | null | undefined): string {
  return country?.nameEn || country?.name || country?.code || ''
}
