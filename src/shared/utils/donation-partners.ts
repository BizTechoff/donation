import { remult } from 'remult'
import { Donor } from '../entity/donor'

/**
 * שלב ג׳ 8 - שותפים לתרומה: הכללים במקום אחד.
 *
 * תרומה אחת, עם תורם (donorId) ושותפים (partnerIds). היא מוצגת אצל כולם,
 * אבל נספרת פעם אחת בלבד - אצל התורם. אצל שותף היא תצוגה בלבד: בסוגריים,
 * ומחוץ לסה"כ. כאן הכלל, הנוסח וטעינת השמות; המסכים, הדוחות וההדפסה קוראים לכאן.
 */

type PartneredDonation = { donorId?: string; partnerIds?: string[] }

const UNKNOWN_DONOR = 'תורם לא ידוע'

/** האם התורם הזה רואה את התרומה כשותף (ולא כתורם שלה). */
export function isPartnerView(donation: PartneredDonation, viewerDonorId: string | undefined): boolean {
  return !!viewerDonorId && donation.donorId !== viewerDonorId &&
    (donation.partnerIds || []).includes(viewerDonorId)
}

/** אילו שמות צריך כדי לנסח את השותפות של התרומות האלה, מנקודת המבט של viewer. */
export function partnershipNameIds(donations: PartneredDonation[], viewerDonorId?: string): string[] {
  const ids = new Set<string>()
  for (const d of donations) {
    if (isPartnerView(d, viewerDonorId)) {
      if (d.donorId) ids.add(d.donorId)
    } else {
      for (const id of d.partnerIds || []) if (id !== viewerDonorId) ids.add(id)
    }
  }
  return [...ids]
}

/**
 * הנוסח: אצל התורם - "שותפים בתרומה: X, Y". אצל שותף - "שותף בתרומה עם <התורם>".
 * בלי viewer (רשימת התרומות) - מנקודת המבט של התורם. בלי שותפים - ''.
 */
export function partnershipNote(
  donation: PartneredDonation,
  names: Map<string, string>,
  viewerDonorId: string | undefined = donation.donorId
): string {
  const name = (id: string) => names.get(id) || UNKNOWN_DONOR
  if (isPartnerView(donation, viewerDonorId)) {
    return `שותף בתרומה עם ${name(donation.donorId!)}`
  }
  const partners = (donation.partnerIds || []).filter(id => id !== viewerDonorId)
  return partners.length ? `שותפים בתרומה: ${partners.map(name).join(', ')}` : ''
}

/** מי יכול לקבל מכתב תודה על התרומה: התורם, ואחריו כל שותף. */
export function letterRecipientIds(donation: PartneredDonation): string[] {
  return [...new Set([donation.donorId, ...(donation.partnerIds || [])].filter((id): id is string => !!id))]
}

/** id -> "משפחה פרטי", בשאילתה אחת. עובד בשרת ובקליינט. */
export async function loadDonorNames(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map()
  const donors = await remult.repo(Donor).find({ where: { id: { $in: ids } } })
  return new Map(donors.map(d => [d.id, d.lastAndFirstName]))
}
