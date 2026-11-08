import { formatAmount } from './pipes/amount.pipe'

/**
 * donation-confirm.ts - הנוסח האחד של "למחוק את התרומה?".
 *
 * ארבעה מסכים בנו את השאלה כל אחד בעצמו, ושניים מהם שבורים: כרטיס התרומה
 * החליף {amount} בנוסח שמכיל {donor} ("של {donor}?"), ו"תרומות של…" לקח את
 * השם מ-donation.donor שלא נטען שם ("של undefined"). כאן - שם וסכום, ממקום
 * אחד, והקורא מעביר את השם שבאמת יש בידו.
 */
export function deleteDonationQuestion(
  template: string | undefined,
  donorName: string | undefined,
  amount?: number,
  symbol?: string
): string {
  const name = (donorName || '').trim()
  const sum = amount ? `${formatAmount(amount)} ${symbol || ''}`.trim() : ''
  const who = [name, sum && `(${sum})`].filter(Boolean).join(' ')
  return (template || 'האם אתה בטוח שברצונך למחוק את התרומה של {donor}?').replace('{donor}', who)
}
