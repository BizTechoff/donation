import { Allow, BackendMethod, remult } from 'remult'
import { Donation } from '../entity/donation'
import { Payment } from '../entity/payment'
import { calculatePaymentTotals } from '../utils/donation-utils'
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

/**
 * CommitmentController - שלב ג׳, קבוצה 4. המקום האחד שטוען ומחשב את מצב
 * ההתחייבויות. החישוב עצמו - commitment-utils.commitmentProgress.
 *
 * חשוב: ההתקדמות כאן היא להצגה ("שולם מתוך"). בסכומי התרומות (סה"כ, דוחות)
 * תרומה שנזקפה להתחייבות כבר נספרת בעצמה כתרומה רגילה, ולכן שם ההתחייבות
 * ממשיכה להיספר לפי התנועות הישנות בלבד (calculateEffectiveAmount) - אחרת
 * אותו כסף היה נספר פעמיים.
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

  /** החישוב המשותף: תנועות ישנות + תרומות שנזקפו, לכל התחייבות. */
  private static async progressFor(commitments: Donation[]): Promise<Record<string, CommitmentProgress>> {
    const ids = commitments.map(c => c.id)
    if (!ids.length) return {}
    const [payments, linked] = await Promise.all([
      remult.repo(Payment).find({ where: { donationId: { $in: ids }, isActive: true } }),
      remult.repo(Donation).groupBy({
        group: ['commitmentId'],
        sum: ['amount'],
        where: { commitmentId: { $in: ids }, donationType: 'full' }
      })
    ])
    const legacy = calculatePaymentTotals(commitments, payments)
    const linkedById = new Map(linked.map(r => [r.commitmentId, r.amount?.sum || 0]))
    const out: Record<string, CommitmentProgress> = {}
    for (const c of commitments) {
      out[c.id] = commitmentProgress(c.amount, legacy[c.id] || 0, linkedById.get(c.id) || 0)
    }
    return out
  }
}
