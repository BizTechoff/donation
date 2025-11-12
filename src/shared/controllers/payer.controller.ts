import { Allow, BackendMethod, Controller } from 'remult';

// export interface CurrencyType {
//   id: string;
//   label: string;
//   symbol: string;
//   rateInShekel: number;
// }

/**
 * Controller for payer-related operations including currency conversions
 */
@Controller('payer')
export class PayerController {

  /**
   * Single source of truth for all currency information
   * Includes ID, label (description), symbol, and exchange rate to ILS
   */
  // private static readonly currencies: CurrencyType[] = [
  //   { id: 'ILS', label: 'שקל', symbol: '₪', rateInShekel: 1 },
  //   { id: 'USD', label: 'דולר', symbol: '$', rateInShekel: 3.2 },
  //   { id: 'EUR', label: 'יורו', symbol: '€', rateInShekel: 3.73 },
  //   { id: 'GBP', label: 'ליש"ט', symbol: '£', rateInShekel: 4.58 }
  // ];

  /**
   * Get exchange rate for a specific currency to ILS
   * @param currency Currency code (e.g., 'USD', 'EUR')
   * @returns Exchange rate to ILS, or 1 if currency not found
   */
  // @BackendMethod({ allowed: Allow.authenticated })
  // static async getInShekel(currency: string): Promise<number> {
  //   const currencyData = PayerController.currencies.find(c => c.id === currency);
  //   return currencyData?.rateInShekel || 1;
  // }

  /**
   * Get list of all available currency types with labels, symbols, and exchange rates
   * This is the single source of truth for currency information
   * @returns Array of currency objects with id, label, symbol, and rateInShekel
   */
  // @BackendMethod({ allowed: Allow.authenticated })
  // static async getCurrencyTypes(): Promise<CurrencyType[]> {
  //   return [...PayerController.currencies];
  // }
}
