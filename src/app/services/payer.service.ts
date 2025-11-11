import { Injectable } from '@angular/core';

/**
 * Service for currency conversion and payer-related utilities
 */
@Injectable({
  providedIn: 'root'
})
export class PayerService {

  // Exchange rates to ILS (Israeli Shekel)
  private exchangeRates: Record<string, number> = {
    'ILS': 1,      // Base currency
    'USD': 3.65,   // Dollar
    'EUR': 4.00,   // Euro
    'GBP': 4.70,   // British Pound
    'JPY': 0.024,  // Japanese Yen
    'CHF': 4.20    // Swiss Franc
  };

  constructor() {}

  /**
   * Get all exchange rates
   * Returns a map of currency code to ILS exchange rate
   */
  getRates(): Record<string, number> {
    return { ...this.exchangeRates };
  }

  /**
   * Get exchange rate for a specific currency to ILS
   * @param currency Currency code (e.g., 'USD', 'EUR')
   * @returns Exchange rate to ILS, or 1 if currency not found
   */
  getInShekel(currency: string): number {
    return this.exchangeRates[currency] || 1;
  }

  /**
   * Convert an amount from a given currency to ILS
   * @param amount Amount to convert
   * @param currency Source currency code
   * @returns Amount in ILS
   */
  convertToShekel(amount: number, currency: string): number {
    const rate = this.getInShekel(currency);
    return amount * rate;
  }

  /**
   * Update exchange rate for a currency
   * @param currency Currency code
   * @param rate New exchange rate to ILS
   */
  updateRate(currency: string, rate: number): void {
    this.exchangeRates[currency] = rate;
  }

  /**
   * Update multiple exchange rates at once
   * @param rates Map of currency codes to exchange rates
   */
  updateRates(rates: Record<string, number>): void {
    this.exchangeRates = { ...this.exchangeRates, ...rates };
  }
}
