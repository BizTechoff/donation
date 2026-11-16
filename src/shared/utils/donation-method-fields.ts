import { remult } from 'remult'
import { Bank } from '../entity/bank'
import { Organization } from '../entity/organization'

/**
 * אמצעי התשלום של תרומה - איזה סוג הוא, ואילו שדות הוא מקבל. מקום אחד למחשב
 * (כרטיס התרומה) ולמובייל (תרומה מהירה). עד היום הכלל ישב רק בכרטיס התרומה,
 * והמובייל הציג לצ'ק רק מספר צ'ק - בלי בנק ומספר חשבון, ובלי עמותה ושובר.
 */

export type PaymentKind = 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'standing_order' | 'association' | 'other'

/**
 * הסוג - לפי type או לפי השם, בדיוק כמו שהיה בכרטיס התרומה. "מזומן" נבדק
 * אחרון: זה ה-type ההתחלתי של כל אמצעי, ובנתונים מהייבוא יש אמצעים ש-type
 * שלהם נשאר cash אבל השם שלהם "צ'ק" או "העברה" - השם קובע אצלם.
 */
export function paymentKind(method?: { type?: string, name?: string } | null): PaymentKind {
  const type = method?.type
  const name = method?.name || ''
  if (type === 'check' || name === 'צק' || name.includes('צ\'ק')) return 'check'
  if (type === 'bank_transfer' || name.includes('העברה')) return 'bank_transfer'
  if (type === 'association' || name.includes('עמותה') || name.includes('ארגון')) return 'association'
  if (type === 'credit_card' || name.includes('כרטיס') || name.includes('אשראי')) return 'credit_card'
  if (type === 'standing_order' || name.includes('הוראת קבע') || name.includes('הו"ק')) return 'standing_order'
  if (type === 'cash' || name.includes('מזומן')) return 'cash'
  return 'other'
}

export interface DonationMethodFields {
  checkNumber: boolean
  accountNumber: boolean
  voucherNumber: boolean
  bank: boolean
  organization: boolean
}

/**
 * השדות שאמצעי התשלום מקבל:
 * צ'ק - מספר צ'ק, מספר חשבון ובנק (נמשך מבנק - יעקב, 11.11.2026).
 * העברה - מספר חשבון ובנק. עמותה - עמותה, מספר חשבון ומספר שובר.
 * הו"ק - בנק או עמותה, לפי סוג ההוראה.
 */
export function donationMethodFields(
  method?: { type?: string, name?: string } | null,
  standingOrderType?: string
): DonationMethodFields {
  const kind = paymentKind(method)
  const soBank = kind === 'standing_order' && standingOrderType === 'bank'
  const soOrganization = kind === 'standing_order' && standingOrderType === 'organization'
  return {
    checkNumber: kind === 'check',
    accountNumber: kind === 'check' || kind === 'bank_transfer' || kind === 'association',
    voucherNumber: kind === 'association' || soOrganization,
    bank: kind === 'check' || kind === 'bank_transfer' || soBank,
    organization: kind === 'association' || soOrganization
  }
}

/**
 * הבנקים והעמותות הפעילים לבחירה בתרומה, לפי שם - שאילתה אחת למחשב
 * (DonationController.getDonationDetailsData) ולמובייל (PayerService).
 */
export async function loadPaymentEntities(): Promise<{ banks: Bank[], organizations: Organization[] }> {
  const [banks, organizations] = await Promise.all([
    remult.repo(Bank).find({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    remult.repo(Organization).find({ where: { isActive: true }, orderBy: { name: 'asc' } })
  ])
  return { banks, organizations }
}
