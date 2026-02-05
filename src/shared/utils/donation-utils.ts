import { Donation } from '../entity/donation'

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
