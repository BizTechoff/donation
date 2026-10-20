/**
 * Campaign money math - ONE place for the client display and the server sort.
 *
 * "נאסף" is shown per currency, so to compare campaigns (sort) or to measure
 * them against a target (progress) everything is converted to shekels with
 * the same rateInShekel table the screen uses. Before this file the progress
 * formula lived twice in campaigns-list; the server sort would have been a
 * third copy, and a sorted column that disagrees with the displayed one is
 * worse than no sort.
 */

export interface CurrencyAmount {
  currencyId: string
  total: number
}

export type RateTable = Record<string, { rateInShekel?: number } | undefined>

/** Sum of per-currency totals, in shekels. */
export function raisedInShekel(totals: CurrencyAmount[], rates: RateTable): number {
  return (totals || []).reduce(
    (sum, t) => sum + t.total * (rates[t.currencyId]?.rateInShekel || 1),
    0
  )
}

/** Percent of target reached, 0..100, rounded - exactly what the list shows. */
export function campaignProgress(
  campaign: { targetAmount?: number; currencyId?: string },
  totals: CurrencyAmount[],
  rates: RateTable
): number {
  if (!campaign.targetAmount) return 0
  const targetInShekel =
    campaign.targetAmount * (rates[campaign.currencyId || 'ILS']?.rateInShekel || 1)
  return Math.min(100, Math.round((raisedInShekel(totals, rates) / targetInShekel) * 100))
}
