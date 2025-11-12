import { Injectable } from '@angular/core';

export interface CurrencyType {
  id: string;
  label: string;
  labelEnglish: string;
  symbol: string;
  rateInShekel: number;
}

// Currency data - exported for server-side access
export const CURRENCIES: CurrencyType[] = [
  { id: 'ILS', label: 'שקל', labelEnglish: 'Shekel', symbol: '₪', rateInShekel: 1 },
  { id: 'USD', label: 'דולר', labelEnglish: 'Dollar', symbol: '$', rateInShekel: 3.2 },
  { id: 'EUR', label: 'יורו', labelEnglish: 'Euro', symbol: '€', rateInShekel: 3.73 },
  { id: 'GBP', label: 'ליש"ט', labelEnglish: 'Pound', symbol: '£', rateInShekel: 4.58 }
];

/**
 * Service for currency conversion and payer-related utilities
 * Single Source of Truth for currency rates
 */
@Injectable({
  providedIn: 'root'
})
export class PayerService {

  async getCurrencyTypes(): Promise<CurrencyType[]> {
    return [...CURRENCIES];
  }

}
