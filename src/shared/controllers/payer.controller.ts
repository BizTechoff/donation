import { Allow, BackendMethod, Controller } from 'remult';

/**
 * Controller for payer-related operations including currency conversions
 */
@Controller('payer')
export class PayerController {

  // Exchange rates to ILS (Israeli Shekel)
  private static exchangeRates: Record<string, number> = {
    'ILS': 1,       // Base currency
    'USD': 3.25,    // Dollar (נכון ל-7.11.2025: 3.2463)
    'EUR': 3.75,    // Euro (נכון ל-8.11.2025: 3.7469)
    'GBP': 4.29,    // British Pound (נכון ל-8.11.2025: 4.2925)
    'JPY': 0.0212,  // Japanese Yen (נכון ל-4.11.2025: 0.02130)
    'CHF': 4.04     // Swiss Franc (נכון ל-8.11.2025: 4.0350)
  };

  /**
   * Get exchange rate for a specific currency to ILS
   * @param currency Currency code (e.g., 'USD', 'EUR')
   * @returns Exchange rate to ILS, or 1 if currency not found
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getInShekel(currency: string): Promise<number> {
    return PayerController.exchangeRates[currency] || 1;
  }

  /**
   * Get all exchange rates to ILS (Shekels)
   * @returns A map of currency code to ILS exchange rate
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getRatesInShekels(): Promise<Record<string, number>> {
    return { ...PayerController.exchangeRates };
  }
}
