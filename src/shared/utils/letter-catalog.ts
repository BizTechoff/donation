import { remult } from 'remult'
import { CustomLetter } from '../entity/custom-letter'
import { Letter } from '../enum/letter'

/**
 * שלב ג׳ 5.4 - רשימת המכתבים האחת של הפלטפורמה: המובנים (enum/letter) ואלה
 * שהלקוח הוסיף (CustomLetter). מכתב שנוסף הוא Letter רגיל - עם השדות ונתיב
 * התבנית של מכתב הבסיס - ולכן חלון המכתב, העץ, ברירות המחדל וההפקה עובדים
 * איתו בלי טיפוס מקביל.
 */

const CUSTOM_PREFIX = 'custom_'

export function customLetterId(custom: CustomLetter): string {
  return CUSTOM_PREFIX + custom.id
}

/** CustomLetter.id של מכתב שנוסף, או undefined למכתב מובנה. */
export function customIdOf(letterId: string): string | undefined {
  return letterId.startsWith(CUSTOM_PREFIX) ? letterId.slice(CUSTOM_PREFIX.length) : undefined
}

/** שם למכתב משוכפל: אותה קטגוריה (ותת-קטגוריה), שם אחרון חדש. */
export function duplicateCaption(base: Letter, name: string): string {
  const parts = base.caption.split(' / ').map(p => p.trim())
  return [...parts.slice(0, -1), name.trim()].join(' / ')
}

export function letterCatalog(customs: CustomLetter[]): Letter[] {
  const builtIn = Letter.getFields()
  const added = customs
    .filter(c => c.isActive)
    .map(c => {
      const base = builtIn.find(l => l.id === c.baseLetterId)
      if (!base) return undefined
      const letter = new Letter(c.caption, base.templatePath, [...base.fields])
      letter.id = customLetterId(c)
      letter.baseId = base.id
      return letter
    })
    .filter((l): l is Letter => !!l)
  return [...builtIn, ...added]
}

/** הרשימה המלאה - שאילתה אחת על המכתבים שנוספו. עובד בשרת ובקליינט. */
export async function loadLetterCatalog(): Promise<Letter[]> {
  return letterCatalog(await remult.repo(CustomLetter).find({ where: { isActive: true } }))
}

export async function findLetter(letterId: string): Promise<Letter | undefined> {
  return (await loadLetterCatalog()).find(l => l.id === letterId)
}
