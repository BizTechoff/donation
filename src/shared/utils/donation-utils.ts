import { Donation } from '../entity/donation'
import { Payment } from '../entity/payment'

/**
 * מחשב סכום תשלומים לכל תרומה, עם סינון לפי סוג התשלום המתאים
 * - התחייבות: רק תשלומים עם type = 'התחייבות'
 * - הו"ק: רק תשלומים עם type שמתחיל ב-'הו"ק'
 *
 * @param donations - רשימת התרומות (חייב לכלול donationMethod)
 * @param payments - רשימת התשלומים
 * @returns מפה של donationId לסכום התשלומים המסונן
 */
export function calculatePaymentTotals(
  donations: Donation[],
  payments: Payment[]
): Record<string, number> {
  if (!donations || donations.length === 0 || !payments || payments.length === 0) {
    return {}
  }

  // בנה מפה של donationId לסוג התשלום הצפוי
  const donationTypeMap = new Map<string, string>()
  for (const d of donations) {
    if (d.donationType === 'commitment') {
      donationTypeMap.set(d.id, 'התחייבות')
    } else if (d.donationMethod?.type === 'standing_order') {
      donationTypeMap.set(d.id, 'הו"ק') // התחלה משותפת לכל סוגי ההו"ק
    }
  }

  // סכום רק תשלומים שהסוג שלהם תואם לסוג התרומה
  const totals: Record<string, number> = {}
  for (const payment of payments) {
    if (payment.donationId && payment.isActive !== false) {
      const expectedType = donationTypeMap.get(payment.donationId)
      // אם יש סוג צפוי, בדוק התאמה
      if (expectedType && payment.type?.startsWith(expectedType)) {
        totals[payment.donationId] = (totals[payment.donationId] || 0) + payment.amount
      }
    }
  }

  return totals
}

/**
 * מחשב את הסכום האפקטיבי של תרומה לפי סוגה:
 * - תרומה חד-פעמית: מחזיר donation.amount
 * - הו"ק (donationMethod.type === 'standing_order'): מחזיר סכום התשלומים בפועל (paymentsTotal)
 * - התחייבות: מחזיר סכום התשלומים בפועל (paymentsTotal)
 */
export function calculateEffectiveAmount(
  donation: Donation,
  paymentsTotal?: number,
  asOfDate?: Date
): number {
  // התחייבות: רק תשלומים בפועל נספרים
  if (donation.donationType === 'commitment') {
    return paymentsTotal || 0
  }

  // הו"ק: רק תשלומים בפועל נספרים (כמו התחייבות)
  if (donation.donationMethod?.type === 'standing_order') {
    return paymentsTotal || 0
  }

  // תרומה חד-פעמית
  return donation.amount
}

/**
 * בודק אם תרומה היא הו"ק (הוראת קבע) לפי סוג אמצעי התשלום
 */
export function isStandingOrder(donation: Donation): boolean {
  return donation.donationMethod?.type === 'standing_order'
}

/**
 * בודק אם תרומה מבוססת תשלומים (יש לה רשומות Payment):
 * - התחייבות (donationType === 'commitment')
 * - הו"ק (donationMethod.type === 'standing_order')
 */
export function isPaymentBased(donation: Donation): boolean {
  return donation.donationType === 'commitment' || donation.donationMethod?.type === 'standing_order'
}

/**
 * סיכום מצב תרומת התחייבות: סך ההתחייבות, סך התנועות המשוייכות, והיתרה.
 * מקור אמת אחד לכל מי שרוצה להציג את שני הסכומים יחד — רשימת התרומות,
 * המכתב לתורם, דוחות וכיו"ב.
 *
 * טהור וללא I/O: מקבל את התשלומים כפרמטר כדי לאפשר שני שימושים:
 *   - רשימות שכבר טענו תשלומים ב-bulk (מקבלות את המערך הרלוונטי)
 *   - קונטקסטים של תרומה בודדת (טוענים דרך PaymentController.getPaymentsByDonation
 *     ואז מעבירים)
 *
 * חוזר לוגיקת הסינון ל-calculatePaymentTotals — בלי שכפול.
 * לתרומה שאינה התחייבות: pledgeTotal = amount, paidTotal = 0, remaining = amount.
 */
export interface PledgeSummary {
  pledgeTotal: number
  paidTotal: number
  remaining: number
}

export function getPledgeSummary(
  donation: Donation,
  payments: Payment[]
): PledgeSummary {
  const pledgeTotal = donation.amount || 0
  const paidTotal = calculatePaymentTotals([donation], payments)[donation.id] || 0
  return {
    pledgeTotal,
    paidTotal,
    remaining: pledgeTotal - paidTotal
  }
}

/**
 * מחשב כמה תקופות תשלום חלפו מאז תחילת ההו"ק
 */
export function calculatePeriodsElapsed(
  donation: Donation,
  asOfDate?: Date
): number {
  const startDate = new Date(donation.donationDate)
  const endDate = asOfDate || new Date()

  if (endDate < startDate) return 0

  let periods: number

  switch (donation.frequency) {
    case 'monthly': {
      const yearDiff = endDate.getFullYear() - startDate.getFullYear()
      const monthDiff = endDate.getMonth() - startDate.getMonth()
      const totalMonths = yearDiff * 12 + monthDiff
      // +1 כי החודש הראשון נספר כתשלום 1
      periods = endDate.getDate() >= startDate.getDate()
        ? totalMonths + 1
        : totalMonths
      break
    }
    case 'weekly': {
      const msPerWeek = 7 * 24 * 60 * 60 * 1000
      periods = Math.floor((endDate.getTime() - startDate.getTime()) / msPerWeek) + 1
      break
    }
    case 'quarterly': {
      const yearDiff = endDate.getFullYear() - startDate.getFullYear()
      const monthDiff = endDate.getMonth() - startDate.getMonth()
      const totalMonths = yearDiff * 12 + monthDiff
      periods = Math.floor(totalMonths / 3) + 1
      break
    }
    case 'yearly': {
      const yearDiff = endDate.getFullYear() - startDate.getFullYear()
      if (endDate.getMonth() > startDate.getMonth() ||
        (endDate.getMonth() === startDate.getMonth() && endDate.getDate() >= startDate.getDate())) {
        periods = yearDiff + 1
      } else {
        periods = yearDiff
      }
      break
    }
    default:
      return 1
  }

  // הגבלה למספר תשלומים אם לא ללא הגבלה
  if (!donation.unlimitedPayments && donation.numberOfPayments) {
    periods = Math.min(periods, donation.numberOfPayments)
  }

  return Math.max(1, periods)
}
