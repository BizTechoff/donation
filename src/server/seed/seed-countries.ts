import { remult } from 'remult';
import { Country } from '../../shared/entity/country';

export async function seedCountries() {
  const countryRepo = remult.repo(Country);

  // Check if countries already exist
  const existingCount = await countryRepo.count();
  if (existingCount > 0) {
    console.log('Countries already seeded, skipping...');
    return;
  }

  const countries = [
    {
      name: 'ישראל',
      nameEn: 'Israel',
      code: 'IL',
      phonePrefix: '+972',
      currency: 'ILS',
      currencySymbol: '₪',
      isActive: true
    },
    {
      name: 'ארצות הברית',
      nameEn: 'United States',
      code: 'US',
      phonePrefix: '+1',
      currency: 'USD',
      currencySymbol: '$',
      isActive: true
    },
    {
      name: 'קנדה',
      nameEn: 'Canada',
      code: 'CA',
      phonePrefix: '+1',
      currency: 'CAD',
      currencySymbol: '$',
      isActive: true
    },
    {
      name: 'אוסטרליה',
      nameEn: 'Australia',
      code: 'AU',
      phonePrefix: '+61',
      currency: 'AUD',
      currencySymbol: '$',
      isActive: true
    },
    {
      name: 'בריטניה',
      nameEn: 'United Kingdom',
      code: 'GB',
      phonePrefix: '+44',
      currency: 'GBP',
      currencySymbol: '£',
      isActive: true
    },
    {
      name: 'צרפת',
      nameEn: 'France',
      code: 'FR',
      phonePrefix: '+33',
      currency: 'EUR',
      currencySymbol: '€',
      isActive: true
    },
    {
      name: 'גרמניה',
      nameEn: 'Germany',
      code: 'DE',
      phonePrefix: '+49',
      currency: 'EUR',
      currencySymbol: '€',
      isActive: true
    },
    {
      name: 'איטליה',
      nameEn: 'Italy',
      code: 'IT',
      phonePrefix: '+39',
      currency: 'EUR',
      currencySymbol: '€',
      isActive: true
    },
    {
      name: 'ספרד',
      nameEn: 'Spain',
      code: 'ES',
      phonePrefix: '+34',
      currency: 'EUR',
      currencySymbol: '€',
      isActive: true
    },
    {
      name: 'רוסיה',
      nameEn: 'Russia',
      code: 'RU',
      phonePrefix: '+7',
      currency: 'RUB',
      currencySymbol: '₽',
      isActive: true
    },
    {
      name: 'יפן',
      nameEn: 'Japan',
      code: 'JP',
      phonePrefix: '+81',
      currency: 'JPY',
      currencySymbol: '¥',
      isActive: true
    },
    {
      name: 'סין',
      nameEn: 'China',
      code: 'CN',
      phonePrefix: '+86',
      currency: 'CNY',
      currencySymbol: '¥',
      isActive: true
    },
    {
      name: 'הודו',
      nameEn: 'India',
      code: 'IN',
      phonePrefix: '+91',
      currency: 'INR',
      currencySymbol: '₹',
      isActive: true
    },
    {
      name: 'ברזיל',
      nameEn: 'Brazil',
      code: 'BR',
      phonePrefix: '+55',
      currency: 'BRL',
      currencySymbol: 'R$',
      isActive: true
    },
    {
      name: 'מקסיקו',
      nameEn: 'Mexico',
      code: 'MX',
      phonePrefix: '+52',
      currency: 'MXN',
      currencySymbol: '$',
      isActive: true
    },
    {
      name: 'ארגנטינה',
      nameEn: 'Argentina',
      code: 'AR',
      phonePrefix: '+54',
      currency: 'ARS',
      currencySymbol: '$',
      isActive: true
    },
    {
      name: 'דרום אפריקה',
      nameEn: 'South Africa',
      code: 'ZA',
      phonePrefix: '+27',
      currency: 'ZAR',
      currencySymbol: 'R',
      isActive: true
    },
    {
      name: 'ניו זילנד',
      nameEn: 'New Zealand',
      code: 'NZ',
      phonePrefix: '+64',
      currency: 'NZD',
      currencySymbol: '$',
      isActive: true
    },
    {
      name: 'שוויץ',
      nameEn: 'Switzerland',
      code: 'CH',
      phonePrefix: '+41',
      currency: 'CHF',
      currencySymbol: 'CHF',
      isActive: true
    },
    {
      name: 'בלגיה',
      nameEn: 'Belgium',
      code: 'BE',
      phonePrefix: '+32',
      currency: 'EUR',
      currencySymbol: '€',
      isActive: true
    }
  ];

  for (const country of countries) {
    await countryRepo.insert(country);
  }

  console.log(`Seeded ${countries.length} countries`);
}