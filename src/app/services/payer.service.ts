import { Injectable } from '@angular/core';
import { CurrencyType } from '../../shared/type/currency.type';


// Currency data
const CURRENCIES: CurrencyType[] = [

  // ישראל
  { id: 'ILS', label: 'שקל', labelEnglish: 'Shekel', symbol: '₪', rateInShekel: 1 },

  // ארה"ב
  { id: 'USD', label: 'דולר', labelEnglish: 'Dollar', symbol: '$', rateInShekel: 3.2 },

  // אירופה
  { id: 'EUR', label: 'יורו', labelEnglish: 'Euro', symbol: '€', rateInShekel: 3.77 },

  // בריטניה (לונדון)
  { id: 'GBP', label: 'ליש"ט', labelEnglish: 'Pound', symbol: '£', rateInShekel: 4.31 },

]

//   // צפון אמריקה
//   { id: 'CAD', label: 'דולר קנדי', labelEnglish: 'Canadian Dollar', symbol: 'C$', rateInShekel: 2.34 },
//   { id: 'MXN', label: 'פזו מקסיקני', labelEnglish: 'Mexican Peso', symbol: '$', rateInShekel: 0.18 },

//   // דרום אמריקה
//   { id: 'BRL', label: 'ריאל ברזילאי', labelEnglish: 'Brazilian Real', symbol: 'R$', rateInShekel: 0.57 },
//   { id: 'ARS', label: 'פזו ארגנטינאי', labelEnglish: 'Argentine Peso', symbol: '$', rateInShekel: 0.003 }, // שער משתנה מאוד
//   { id: 'CLP', label: `פזו צ'יליאני`, labelEnglish: 'Chilean Peso', symbol: '$', rateInShekel: 0.0035 },
//   { id: 'PEN', label: 'סול פרואני', labelEnglish: 'Peruvian Sol', symbol: 'S/', rateInShekel: 0.86 }
// ];

/**
 * Service for currency conversion and payer-related utilities
 * Single Source of Truth for currency rates
 */
@Injectable({
  providedIn: 'root'
})
export class PayerService {

  // async getCurrencyTypes(): Promise<CurrencyType[]> {
  //   return [...CURRENCIES];
  // }

  // getCurrencyTypesMap(): [string, CurrencyType][] {
  //   return CURRENCIES.map(cur => [cur.id, cur]);
  // }

  getCurrencyTypesRecord(): Record<string, CurrencyType> {
    return Object.fromEntries(CURRENCIES.map(cur => [cur.id, cur]));
  }

  // async getCurrencyTypesMap(): Promise<Map<string /*currencyId*/, CurrencyType>> {
  //   return new Map(CURRENCIES.map(cur => [cur.id, cur]));
  // }

}
