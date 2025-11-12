import { Injectable } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';

export interface CurrencyType {
  id: string;
  label: string;
  symbol: string;
}

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

  // Currency symbols mapping
  private currencySymbols: Record<string, string> = {
    'ILS': '₪',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'JPY': '¥',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'HUF': 'Ft',
    'CZK': 'Kč',
    'RON': 'lei',
    'BGN': 'лв',
    'HRK': 'kn',
    'ISK': 'kr',
    'UAH': '₴',
    'RUB': '₽',
    'TRY': '₺',
    'CNY': '¥',
    'INR': '₹',
    'KRW': '₩',
    'THB': '฿',
    'SGD': 'S$',
    'MYR': 'RM',
    'IDR': 'Rp',
    'PHP': '₱',
    'VND': '₫',
    'HKD': 'HK$',
    'TWD': 'NT$',
    'PKR': '₨',
    'BDT': '৳',
    'LKR': 'Rs',
    'BRL': 'R$',
    'ARS': '$',
    'MXN': '$',
    'CLP': '$',
    'COP': '$',
    'PEN': 'S/',
    'UYU': '$U',
    'AED': 'د.إ',
    'SAR': 'ر.س',
    'JOD': 'د.ا',
    'EGP': 'E£',
    'LBP': 'ل.ل',
    'BHD': 'ب.د',
    'KWD': 'د.ك',
    'QAR': 'ر.ق',
    'OMR': 'ر.ع',
    'ZAR': 'R',
    'NGN': '₦',
    'KES': 'KSh',
    'ETB': 'Br',
    'GHS': '₵',
    'NZD': 'NZ$'
  };

  constructor(private i18n: I18nService) {}

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

  /**
   * Get list of all available currency types with localized labels
   * Returns array of currency objects with id, label, and symbol
   */
  getCurrencyTypes(): CurrencyType[] {
    const currencies: CurrencyType[] = [
      // Major currencies
      { id: 'ILS', label: this.getCurrencyLabel('ILS'), symbol: '₪' },
      { id: 'USD', label: this.getCurrencyLabel('USD'), symbol: '$' },
      { id: 'EUR', label: this.getCurrencyLabel('EUR'), symbol: '€' },
      { id: 'GBP', label: this.getCurrencyLabel('GBP'), symbol: '£' },
      // { id: 'CAD', label: this.getCurrencyLabel('CAD'), symbol: 'C$' },
      // { id: 'AUD', label: this.getCurrencyLabel('AUD'), symbol: 'A$' },

      // // European currencies
      // { id: 'CHF', label: this.getCurrencyLabel('CHF'), symbol: 'CHF' },
      // { id: 'DKK', label: this.getCurrencyLabel('DKK'), symbol: 'kr' },
      // { id: 'SEK', label: this.getCurrencyLabel('SEK'), symbol: 'kr' },
      // { id: 'NOK', label: this.getCurrencyLabel('NOK'), symbol: 'kr' },
      // { id: 'PLN', label: this.getCurrencyLabel('PLN'), symbol: 'zł' },
      // { id: 'HUF', label: this.getCurrencyLabel('HUF'), symbol: 'Ft' },
      // { id: 'CZK', label: this.getCurrencyLabel('CZK'), symbol: 'Kč' },
      // { id: 'RON', label: this.getCurrencyLabel('RON'), symbol: 'lei' },
      // { id: 'BGN', label: this.getCurrencyLabel('BGN'), symbol: 'лв' },
      // { id: 'HRK', label: this.getCurrencyLabel('HRK'), symbol: 'kn' },
      // { id: 'ISK', label: this.getCurrencyLabel('ISK'), symbol: 'kr' },
      // { id: 'UAH', label: this.getCurrencyLabel('UAH'), symbol: '₴' },
      // { id: 'RSD', label: this.getCurrencyLabel('RSD'), symbol: 'дин' },
      // { id: 'MKD', label: this.getCurrencyLabel('MKD'), symbol: 'ден' },
      // { id: 'ALL', label: this.getCurrencyLabel('ALL'), symbol: 'L' },
      // { id: 'MDL', label: this.getCurrencyLabel('MDL'), symbol: 'L' },
      // { id: 'BYN', label: this.getCurrencyLabel('BYN'), symbol: 'Br' },
      // { id: 'RUB', label: this.getCurrencyLabel('RUB'), symbol: '₽' },
      // { id: 'TRY', label: this.getCurrencyLabel('TRY'), symbol: '₺' },

      // // Latin American currencies
      // { id: 'BRL', label: this.getCurrencyLabel('BRL'), symbol: 'R$' },
      // { id: 'ARS', label: this.getCurrencyLabel('ARS'), symbol: '$' },
      // { id: 'MXN', label: this.getCurrencyLabel('MXN'), symbol: '$' },
      // { id: 'CLP', label: this.getCurrencyLabel('CLP'), symbol: '$' },
      // { id: 'COP', label: this.getCurrencyLabel('COP'), symbol: '$' },
      // { id: 'PEN', label: this.getCurrencyLabel('PEN'), symbol: 'S/' },
      // { id: 'VES', label: this.getCurrencyLabel('VES'), symbol: 'Bs.' },
      // { id: 'UYU', label: this.getCurrencyLabel('UYU'), symbol: '$U' },
      // { id: 'PAB', label: this.getCurrencyLabel('PAB'), symbol: 'B/.' },
      // { id: 'CRC', label: this.getCurrencyLabel('CRC'), symbol: '₡' },

      // // Asian currencies
      // { id: 'CNY', label: this.getCurrencyLabel('CNY'), symbol: '¥' },
      // { id: 'JPY', label: this.getCurrencyLabel('JPY'), symbol: '¥' },
      // { id: 'INR', label: this.getCurrencyLabel('INR'), symbol: '₹' },
      // { id: 'KRW', label: this.getCurrencyLabel('KRW'), symbol: '₩' },
      // { id: 'THB', label: this.getCurrencyLabel('THB'), symbol: '฿' },
      // { id: 'SGD', label: this.getCurrencyLabel('SGD'), symbol: 'S$' },
      // { id: 'MYR', label: this.getCurrencyLabel('MYR'), symbol: 'RM' },
      // { id: 'IDR', label: this.getCurrencyLabel('IDR'), symbol: 'Rp' },
      // { id: 'PHP', label: this.getCurrencyLabel('PHP'), symbol: '₱' },
      // { id: 'VND', label: this.getCurrencyLabel('VND'), symbol: '₫' },
      // { id: 'HKD', label: this.getCurrencyLabel('HKD'), symbol: 'HK$' },
      // { id: 'TWD', label: this.getCurrencyLabel('TWD'), symbol: 'NT$' },
      // { id: 'PKR', label: this.getCurrencyLabel('PKR'), symbol: '₨' },
      // { id: 'BDT', label: this.getCurrencyLabel('BDT'), symbol: '৳' },
      // { id: 'LKR', label: this.getCurrencyLabel('LKR'), symbol: 'Rs' },
      // { id: 'NPR', label: this.getCurrencyLabel('NPR'), symbol: 'रू' },
      // { id: 'MMK', label: this.getCurrencyLabel('MMK'), symbol: 'K' },
      // { id: 'KHR', label: this.getCurrencyLabel('KHR'), symbol: '៛' },
      // { id: 'MNT', label: this.getCurrencyLabel('MNT'), symbol: '₮' },

      // // Middle Eastern currencies
      // { id: 'AED', label: this.getCurrencyLabel('AED'), symbol: 'د.إ' },
      // { id: 'SAR', label: this.getCurrencyLabel('SAR'), symbol: 'ر.س' },
      // { id: 'JOD', label: this.getCurrencyLabel('JOD'), symbol: 'د.ا' },
      // { id: 'EGP', label: this.getCurrencyLabel('EGP'), symbol: 'E£' },
      // { id: 'LBP', label: this.getCurrencyLabel('LBP'), symbol: 'ل.ل' },
      // { id: 'MAD', label: this.getCurrencyLabel('MAD'), symbol: 'د.م.' },
      // { id: 'TND', label: this.getCurrencyLabel('TND'), symbol: 'د.ت' },
      // { id: 'BHD', label: this.getCurrencyLabel('BHD'), symbol: 'ب.د' },
      // { id: 'KWD', label: this.getCurrencyLabel('KWD'), symbol: 'د.ك' },
      // { id: 'QAR', label: this.getCurrencyLabel('QAR'), symbol: 'ر.ق' },
      // { id: 'OMR', label: this.getCurrencyLabel('OMR'), symbol: 'ر.ع' },
      // { id: 'GEL', label: this.getCurrencyLabel('GEL'), symbol: '₾' },
      // { id: 'AZN', label: this.getCurrencyLabel('AZN'), symbol: '₼' },
      // { id: 'AMD', label: this.getCurrencyLabel('AMD'), symbol: '֏' },
      // { id: 'KZT', label: this.getCurrencyLabel('KZT'), symbol: '₸' },
      // { id: 'AFN', label: this.getCurrencyLabel('AFN'), symbol: '؋' },
      // { id: 'IQD', label: this.getCurrencyLabel('IQD'), symbol: 'ع.د' },
      // { id: 'IRR', label: this.getCurrencyLabel('IRR'), symbol: '﷼' },
      // { id: 'SYP', label: this.getCurrencyLabel('SYP'), symbol: 'ل.س' },
      // { id: 'YER', label: this.getCurrencyLabel('YER'), symbol: '﷼' },

      // // African currencies
      // { id: 'ZAR', label: this.getCurrencyLabel('ZAR'), symbol: 'R' },
      // { id: 'NGN', label: this.getCurrencyLabel('NGN'), symbol: '₦' },
      // { id: 'KES', label: this.getCurrencyLabel('KES'), symbol: 'KSh' },
      // { id: 'ETB', label: this.getCurrencyLabel('ETB'), symbol: 'Br' },
      // { id: 'UGX', label: this.getCurrencyLabel('UGX'), symbol: 'USh' },
      // { id: 'TZS', label: this.getCurrencyLabel('TZS'), symbol: 'TSh' },
      // { id: 'ZWL', label: this.getCurrencyLabel('ZWL'), symbol: 'Z$' },
      // { id: 'GHS', label: this.getCurrencyLabel('GHS'), symbol: '₵' },
      // { id: 'DZD', label: this.getCurrencyLabel('DZD'), symbol: 'د.ج' },
      // { id: 'LYD', label: this.getCurrencyLabel('LYD'), symbol: 'ل.د' },
      // { id: 'SDG', label: this.getCurrencyLabel('SDG'), symbol: 'ج.س' },

      // // Oceania currencies
      // { id: 'NZD', label: this.getCurrencyLabel('NZD'), symbol: 'NZ$' },
    ];

    return currencies;
  }

  /**
   * Get localized label for a currency
   * @param currencyCode Currency code (e.g., 'USD', 'EUR')
   * @returns Localized label from i18n or currency code if not found
   */
  private getCurrencyLabel(currencyCode: string): string {
    const key = `currency${currencyCode}` as keyof typeof this.i18n.currentTerms;
    return (this.i18n.currentTerms[key] as string) || currencyCode;
  }

  /**
   * Get symbol for a specific currency
   * @param currencyCode Currency code
   * @returns Currency symbol
   */
  getCurrencySymbol(currencyCode: string): string {
    return this.currencySymbols[currencyCode] || currencyCode;
  }
}
