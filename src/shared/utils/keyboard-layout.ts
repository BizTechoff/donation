/**
 * keyboard-layout.ts - שלב ג׳, קבוצה 2: שפת המקלדת לפי השדה.
 *
 * דפדפן אינו יכול להחליף את שפת המקלדת של מערכת ההפעלה - אין לזה API. מה
 * שאפשר, וזה הפתרון המקובל: לפי המקש הפיזי שנלחץ (KeyboardEvent.code, שאינו
 * תלוי בשפה הפעילה) להחליט איזו אות נכנסת לשדה. בשדה עברי מקש T נותן א גם
 * כשהמקלדת באנגלית; בשדה אנגלי - ההפך.
 *
 * הטבלה היא הפריסה העברית התקנית (SI-1452) מול QWERTY. קובץ טהור, בלי
 * Angular - כדי שיהיה מקור אחד גם לשדות וגם לחיפוש הדו-לשוני.
 */

export type FieldLang = 'he' | 'en'

interface KeyChars { en: string; enShift: string; he: string }

/** מקש פיזי -> מה שהוא נותן באנגלית (רגיל / Shift) ובעברית. */
const KEYS: Record<string, KeyChars> = {
  KeyQ: { en: 'q', enShift: 'Q', he: '/' },
  KeyW: { en: 'w', enShift: 'W', he: "'" },
  KeyE: { en: 'e', enShift: 'E', he: 'ק' },
  KeyR: { en: 'r', enShift: 'R', he: 'ר' },
  KeyT: { en: 't', enShift: 'T', he: 'א' },
  KeyY: { en: 'y', enShift: 'Y', he: 'ט' },
  KeyU: { en: 'u', enShift: 'U', he: 'ו' },
  KeyI: { en: 'i', enShift: 'I', he: 'ן' },
  KeyO: { en: 'o', enShift: 'O', he: 'ם' },
  KeyP: { en: 'p', enShift: 'P', he: 'פ' },
  KeyA: { en: 'a', enShift: 'A', he: 'ש' },
  KeyS: { en: 's', enShift: 'S', he: 'ד' },
  KeyD: { en: 'd', enShift: 'D', he: 'ג' },
  KeyF: { en: 'f', enShift: 'F', he: 'כ' },
  KeyG: { en: 'g', enShift: 'G', he: 'ע' },
  KeyH: { en: 'h', enShift: 'H', he: 'י' },
  KeyJ: { en: 'j', enShift: 'J', he: 'ח' },
  KeyK: { en: 'k', enShift: 'K', he: 'ל' },
  KeyL: { en: 'l', enShift: 'L', he: 'ך' },
  Semicolon: { en: ';', enShift: ':', he: 'ף' },
  Quote: { en: "'", enShift: '"', he: ',' },
  KeyZ: { en: 'z', enShift: 'Z', he: 'ז' },
  KeyX: { en: 'x', enShift: 'X', he: 'ס' },
  KeyC: { en: 'c', enShift: 'C', he: 'ב' },
  KeyV: { en: 'v', enShift: 'V', he: 'ה' },
  KeyB: { en: 'b', enShift: 'B', he: 'נ' },
  KeyN: { en: 'n', enShift: 'N', he: 'מ' },
  KeyM: { en: 'm', enShift: 'M', he: 'צ' },
  Comma: { en: ',', enShift: '<', he: 'ת' },
  Period: { en: '.', enShift: '>', he: 'ץ' },
  Slash: { en: '/', enShift: '?', he: '.' }
}

/**
 * האות שהמקש הפיזי צריך לתת בשדה בשפה `lang`, או null כשאין מה להמיר (מקש
 * שאינו בטבלה, ספרה, רווח). בשדה עברי Shift אינו ממופה - בפריסה העברית הוא
 * נותן אות לטינית גדולה, וזה מה שמשתמש שלוחץ Shift מתכוון אליו.
 */
export function charForKey(code: string, shift: boolean, lang: FieldLang): string | null {
  const k = KEYS[code]
  if (!k) return null
  if (lang === 'en') return shift ? k.enShift : k.en
  return shift ? null : k.he
}

/** האם התו שייך לשפה - לשימוש בהחלטה אם להמיר. */
export function isHebrewChar(ch: string): boolean {
  return /[א-ת]/.test(ch)
}
