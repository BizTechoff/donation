import { Allow, BackendMethod, remult } from 'remult'
import { Donation } from '../entity/donation'
import { Payment } from '../entity/payment'
import { isStandingOrder } from '../utils/donation-utils'
import { CommitmentProgress, commitmentProgress } from '../utils/commitment-utils'

/** התחייבות פתוחה כפי שכרטיס התרומה צריך אותה - לבחירה ולזקיפה. */
export interface OpenCommitment {
  id: string
  donationDate: Date
  currencyId: string
  reason: string
  progress: CommitmentProgress
}

/** סיכום התחייבויות פתוחות של תורם, לפי מטבע - לכותרת כרטיס התרומות. */
export interface CommitmentBanner {
  currencyId: string
  paid: number
  total: number
}

/** תשלום בפועל על תרומה מבוססת-תשלומים: תנועה של הו"ק, או תרומה שנזקפה להתחייבות. */
export interface PaidEntry {
  /** התרומה שעליה שולם - ההו"ק או ההתחייבות. */
  donationId: string
  amount: number
  paymentDate: Date
}

/**
 * CommitmentController - שלב ג׳, קבוצה 4. המקום האחד שטוען ומחשב את מצב
 * ההתחייבויות. החישוב עצמו - commitment-utils.commitmentProgress.
 *
 * "שולם" של התחייבות = התרומות שנזקפו לה (commitmentId) בלבד. התנועות
 * (payments) של התחייבויות הוסבו לתרומות מקושרות (11.11.2026) והתנתקו מהחישוב.
 *
 * חשוב: ההתקדמות כאן היא להצגה ("שולם מתוך"). בסכומי התרומות (סה"כ, דוחות)
 * תרומה שנזקפה נספרת בעצמה כתרומה רגילה, וההתחייבות עצמה - 0
 * (calculateEffectiveAmount) - אחרת אותו כסף היה נספר פעמיים.
 *
 * paidEntriesFor / paidTotalsFor - המקום האחד של "שולם בפועל" לכל תרומה
 * מבוססת-תשלומים: הו"ק מהתנועות שלה, התחייבות מהתרומות שנזקפו לה.
 */
export class CommitmentController {

  /** commitmentId -> התקדמות. מזהים שאינם התחייבות - לא מוחזרים. */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getProgress(commitmentIds: string[]): Promise<Record<string, CommitmentProgress>> {
    const ids = [...new Set((commitmentIds || []).filter(Boolean))]
    if (!ids.length) return {}
    const commitments = await remult.repo(Donation).find({
      where: { id: { $in: ids }, donationType: 'commitment' }
    })
    return CommitmentController.progressFor(commitments)
  }

  /**
   * ההתחייבויות הפתוחות של תורם, האחרונה ראשונה - היא ברירת המחדל לזקיפה
   * (L3: "בברירת מחדל יתקזז על חשבון ההתחייבות האחרונה - ניתן לבחירה").
   * currencyId - רק התחייבויות באותו מטבע של התרומה, בלי המרות (מוטי, 08.11).
   * includeId - התחייבות שהתרומה כבר משויכת אליה, גם אם נסגרה בינתיים.
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getOpenCommitments(donorId: string, currencyId?: string, includeId?: string): Promise<OpenCommitment[]> {
    if (!donorId) return []
    const where: any = { donorId, donationType: 'commitment' }
    if (currencyId) where.currencyId = currencyId
    const commitments = await remult.repo(Donation).find({ where, orderBy: { donationDate: 'desc', createdDate: 'desc' } as any })
    const progress = await CommitmentController.progressFor(commitments)
    return commitments
      .filter(c => !progress[c.id].isClosed || c.id === includeId)
      .map(c => ({
        id: c.id,
        donationDate: c.donationDate,
        currencyId: c.currencyId,
        reason: c.reason || '',
        progress: progress[c.id]
      }))
  }

  /**
   * L1 / שלב ג׳ 4.4 - "שולם מתוך סה"כ" של כל ההתחייבויות הפתוחות של התורם, לכל
   * מטבע. התחייבות שנסגרה יורדת מכאן (L6/L7: "ברגע שזה נגמר, נגמר").
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonorBanner(donorId: string): Promise<CommitmentBanner[]> {
    const open = await CommitmentController.getOpenCommitments(donorId)
    const byCurrency = new Map<string, CommitmentBanner>()
    for (const c of open) {
      const row = byCurrency.get(c.currencyId) || { currencyId: c.currencyId, paid: 0, total: 0 }
      row.paid += c.progress.paid
      row.total += c.progress.total
      byCurrency.set(c.currencyId, row)
    }
    return [...byCurrency.values()]
  }

  /** החישוב המשותף: התרומות שנזקפו לכל התחייבות. */
  private static async progressFor(commitments: Donation[]): Promise<Record<string, CommitmentProgress>> {
    const ids = commitments.map(c => c.id)
    if (!ids.length) return {}
    const linked = await remult.repo(Donation).groupBy({
      group: ['commitmentId'],
      sum: ['amount'],
      where: { commitmentId: { $in: ids }, donationType: 'full' }
    })
    const linkedById = new Map(linked.map(r => [r.commitmentId, r]))
    const out: Record<string, CommitmentProgress> = {}
    for (const c of commitments) {
      const row = linkedById.get(c.id)
      out[c.id] = commitmentProgress(c.amount, 0, row?.amount?.sum || 0, row?.$count || 0)
    }
    return out
  }

  /**
   * "שולם בפועל" כרשימת תשלומים, לכל תרומה מבוססת-תשלומים ברשימה:
   * הו"ק - התנועות הפעילות שלה (מסוג הו"ק); התחייבות - התרומות שנזקפו לה.
   * צד השרת. donations חייבות לכלול donationMethod (לזיהוי הו"ק).
   */
  static async paidEntriesFor(donations: Donation[]): Promise<PaidEntry[]> {
    const standing = donations.filter(d => d.id && isStandingOrder(d))
    const commitmentIds = donations.filter(d => d.id && d.donationType === 'commitment').map(d => d.id)
    const [payments, linked] = await Promise.all([
      standing.length
        ? remult.repo(Payment).find({ where: { donationId: { $in: standing.map(d => d.id) }, isActive: true } })
        : Promise.resolve([] as Payment[]),
      commitmentIds.length
        ? remult.repo(Donation).find({ where: { commitmentId: { $in: commitmentIds }, donationType: 'full' } })
        : Promise.resolve([] as Donation[])
    ])
    return [
      ...payments
        .filter(p => p.type?.startsWith('הו"ק'))
        .map(p => ({ donationId: p.donationId, amount: p.amount, paymentDate: p.paymentDate })),
      ...linked.map(d => ({ donationId: d.commitmentId, amount: d.amount, paymentDate: d.donationDate }))
    ]
  }

  /** "שולם בפועל" לכל תרומה מבוססת-תשלומים - הסכום של paidEntriesFor. */
  static async paidTotalsFor(donations: Donation[]): Promise<Record<string, number>> {
    const totals: Record<string, number> = {}
    for (const e of await CommitmentController.paidEntriesFor(donations)) {
      totals[e.donationId] = (totals[e.donationId] || 0) + (e.amount || 0)
    }
    return totals
  }
}
