/**
 * text-case.ts - שלב ג׳, 2.2: אות ראשונה גדולה בכל מילה בשדות האנגלית.
 *
 * יעקב, זום 24.08: "...עם אות ראשונה גדולה... כל פעם אחרי רווח".
 * רק האות הראשונה עולה; השאר לא נוגעים - McDonald ו-DeVries נשארים כפי
 * שהוקלדו. מילה מתחילה אחרי רווח או מקף (Ben-David).
 */

const WORD_BREAK = /[\s-]/

/** האם מיקום `index` בטקסט הוא תחילת מילה. */
export function isWordStart(text: string, index: number): boolean {
  return index === 0 || WORD_BREAK.test(text.charAt(index - 1))
}

/** מעלה את האות הראשונה בכל מילה. */
export function capitalizeWords(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i)
    out += isWordStart(text, i) ? ch.toLocaleUpperCase('en') : ch
  }
  return out
}
