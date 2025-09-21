import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  BackendMethod,
} from 'remult'
import { remult } from 'remult'
import { Roles } from '../enum/roles'

@Entity<Country>('countries', {
  allowApiCrud: [Roles.admin],
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: [Roles.admin],
  saving: async (country) => {
    if (isBackend()) {
      if (country._.isNew()) {
        country.createdDate = new Date()
      }
      country.updatedDate = new Date()
    }
  },
})
export class Country extends IdEntity {
  @Fields.string({
    caption: 'שם מדינה',
    validate: Validators.required,
  })
  name = ''

  @Fields.string({
    caption: 'שם מדינה באנגלית',
  })
  nameEn = ''

  @Fields.string({
    caption: 'קוד מדינה',
  })
  code = ''

  @Fields.string({
    caption: 'קידומת טלפון',
  })
  phonePrefix = ''

  @Fields.string({
    caption: 'מטבע',
  })
  currency = ''

  @Fields.string({
    caption: 'סמל מטבע',
  })
  currencySymbol = ''

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.date({
    allowApiUpdate: false,
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.date({
    allowApiUpdate: false,
    caption: 'תאריך עדכון',
  })
  updatedDate = new Date()

  @BackendMethod({ allowed: [Roles.admin] })
  static async seedCountries() {
    const repo = remult.repo(Country)

    const countries = [
      { name: 'ישראל', nameEn: 'Israel', code: 'IL', phonePrefix: '+972', currency: 'ILS', currencySymbol: '₪' },
      { name: 'ארצות הברית', nameEn: 'United States', code: 'US', phonePrefix: '+1', currency: 'USD', currencySymbol: '$' },
      { name: 'בריטניה', nameEn: 'United Kingdom', code: 'UK', phonePrefix: '+44', currency: 'GBP', currencySymbol: '£' },
      { name: 'קנדה', nameEn: 'Canada', code: 'CA', phonePrefix: '+1', currency: 'CAD', currencySymbol: 'C$' },
      { name: 'אוסטרליה', nameEn: 'Australia', code: 'AU', phonePrefix: '+61', currency: 'AUD', currencySymbol: 'A$' },
      { name: 'צרפת', nameEn: 'France', code: 'FR', phonePrefix: '+33', currency: 'EUR', currencySymbol: '€' },
      { name: 'גרמניה', nameEn: 'Germany', code: 'DE', phonePrefix: '+49', currency: 'EUR', currencySymbol: '€' },
      { name: 'איטליה', nameEn: 'Italy', code: 'IT', phonePrefix: '+39', currency: 'EUR', currencySymbol: '€' },
      { name: 'ספרד', nameEn: 'Spain', code: 'ES', phonePrefix: '+34', currency: 'EUR', currencySymbol: '€' },
      { name: 'הולנד', nameEn: 'Netherlands', code: 'NL', phonePrefix: '+31', currency: 'EUR', currencySymbol: '€' },
      { name: 'בלגיה', nameEn: 'Belgium', code: 'BE', phonePrefix: '+32', currency: 'EUR', currencySymbol: '€' },
      { name: 'שוויץ', nameEn: 'Switzerland', code: 'CH', phonePrefix: '+41', currency: 'CHF', currencySymbol: 'CHF' },
      { name: 'אוסטריה', nameEn: 'Austria', code: 'AT', phonePrefix: '+43', currency: 'EUR', currencySymbol: '€' },
      { name: 'דנמרק', nameEn: 'Denmark', code: 'DK', phonePrefix: '+45', currency: 'DKK', currencySymbol: 'kr' },
      { name: 'שוודיה', nameEn: 'Sweden', code: 'SE', phonePrefix: '+46', currency: 'SEK', currencySymbol: 'kr' },
      { name: 'נורווגיה', nameEn: 'Norway', code: 'NO', phonePrefix: '+47', currency: 'NOK', currencySymbol: 'kr' },
      { name: 'ברזיל', nameEn: 'Brazil', code: 'BR', phonePrefix: '+55', currency: 'BRL', currencySymbol: 'R$' },
      { name: 'ארגנטינה', nameEn: 'Argentina', code: 'AR', phonePrefix: '+54', currency: 'ARS', currencySymbol: '$' },
      { name: 'מקסיקו', nameEn: 'Mexico', code: 'MX', phonePrefix: '+52', currency: 'MXN', currencySymbol: '$' },
      { name: 'דרום אפריקה', nameEn: 'South Africa', code: 'ZA', phonePrefix: '+27', currency: 'ZAR', currencySymbol: 'R' },
      { name: 'יפן', nameEn: 'Japan', code: 'JP', phonePrefix: '+81', currency: 'JPY', currencySymbol: '¥' },
      { name: 'סין', nameEn: 'China', code: 'CN', phonePrefix: '+86', currency: 'CNY', currencySymbol: '¥' },
      { name: 'דרום קוריאה', nameEn: 'South Korea', code: 'KR', phonePrefix: '+82', currency: 'KRW', currencySymbol: '₩' },
      { name: 'הודו', nameEn: 'India', code: 'IN', phonePrefix: '+91', currency: 'INR', currencySymbol: '₹' },
      { name: 'רוסיה', nameEn: 'Russia', code: 'RU', phonePrefix: '+7', currency: 'RUB', currencySymbol: '₽' },
      { name: 'טורקיה', nameEn: 'Turkey', code: 'TR', phonePrefix: '+90', currency: 'TRY', currencySymbol: '₺' },
      { name: 'פולין', nameEn: 'Poland', code: 'PL', phonePrefix: '+48', currency: 'PLN', currencySymbol: 'zł' },
      { name: 'הונגריה', nameEn: 'Hungary', code: 'HU', phonePrefix: '+36', currency: 'HUF', currencySymbol: 'Ft' },
      { name: 'צ\'כיה', nameEn: 'Czech Republic', code: 'CZ', phonePrefix: '+420', currency: 'CZK', currencySymbol: 'Kč' },
      { name: 'יוון', nameEn: 'Greece', code: 'GR', phonePrefix: '+30', currency: 'EUR', currencySymbol: '€' },
      { name: 'פורטוגל', nameEn: 'Portugal', code: 'PT', phonePrefix: '+351', currency: 'EUR', currencySymbol: '€' },
      { name: 'פינלנד', nameEn: 'Finland', code: 'FI', phonePrefix: '+358', currency: 'EUR', currencySymbol: '€' },
      { name: 'אירלנד', nameEn: 'Ireland', code: 'IE', phonePrefix: '+353', currency: 'EUR', currencySymbol: '€' },
      { name: 'נרוזילנד', nameEn: 'New Zealand', code: 'NZ', phonePrefix: '+64', currency: 'NZD', currencySymbol: 'NZ$' },
      { name: 'סינגפור', nameEn: 'Singapore', code: 'SG', phonePrefix: '+65', currency: 'SGD', currencySymbol: 'S$' },
      { name: 'הונג קונג', nameEn: 'Hong Kong', code: 'HK', phonePrefix: '+852', currency: 'HKD', currencySymbol: 'HK$' },
      { name: 'תאילנד', nameEn: 'Thailand', code: 'TH', phonePrefix: '+66', currency: 'THB', currencySymbol: '฿' },
      { name: 'מלזיה', nameEn: 'Malaysia', code: 'MY', phonePrefix: '+60', currency: 'MYR', currencySymbol: 'RM' },
      { name: 'אינדונזיה', nameEn: 'Indonesia', code: 'ID', phonePrefix: '+62', currency: 'IDR', currencySymbol: 'Rp' },
      { name: 'פיליפינים', nameEn: 'Philippines', code: 'PH', phonePrefix: '+63', currency: 'PHP', currencySymbol: '₱' },
      { name: 'וייטנאם', nameEn: 'Vietnam', code: 'VN', phonePrefix: '+84', currency: 'VND', currencySymbol: '₫' },
      { name: 'מצרים', nameEn: 'Egypt', code: 'EG', phonePrefix: '+20', currency: 'EGP', currencySymbol: 'E£' },
      { name: 'איחוד האמירויות', nameEn: 'United Arab Emirates', code: 'AE', phonePrefix: '+971', currency: 'AED', currencySymbol: 'د.إ' },
      { name: 'ערב הסעודית', nameEn: 'Saudi Arabia', code: 'SA', phonePrefix: '+966', currency: 'SAR', currencySymbol: '﷼' },
      { name: 'קטר', nameEn: 'Qatar', code: 'QA', phonePrefix: '+974', currency: 'QAR', currencySymbol: 'ر.ق' },
      { name: 'כווית', nameEn: 'Kuwait', code: 'KW', phonePrefix: '+965', currency: 'KWD', currencySymbol: 'د.ك' },
      { name: 'בחריין', nameEn: 'Bahrain', code: 'BH', phonePrefix: '+973', currency: 'BHD', currencySymbol: '.د.ب' },
      { name: 'עומאן', nameEn: 'Oman', code: 'OM', phonePrefix: '+968', currency: 'OMR', currencySymbol: 'ر.ع.' },
      { name: 'לבנון', nameEn: 'Lebanon', code: 'LB', phonePrefix: '+961', currency: 'LBP', currencySymbol: 'ل.ل' },
      { name: 'ירדן', nameEn: 'Jordan', code: 'JO', phonePrefix: '+962', currency: 'JOD', currencySymbol: 'د.ا' },
      { name: 'מרוקו', nameEn: 'Morocco', code: 'MA', phonePrefix: '+212', currency: 'MAD', currencySymbol: 'د.م.' },
      { name: 'אלג\'יריה', nameEn: 'Algeria', code: 'DZ', phonePrefix: '+213', currency: 'DZD', currencySymbol: 'د.ج' },
      { name: 'תוניסיה', nameEn: 'Tunisia', code: 'TN', phonePrefix: '+216', currency: 'TND', currencySymbol: 'د.ت' },
      { name: 'ליביה', nameEn: 'Libya', code: 'LY', phonePrefix: '+218', currency: 'LYD', currencySymbol: 'ل.د' },
      { name: 'סודן', nameEn: 'Sudan', code: 'SD', phonePrefix: '+249', currency: 'SDG', currencySymbol: 'ج.س.' },
      { name: 'אתיופיה', nameEn: 'Ethiopia', code: 'ET', phonePrefix: '+251', currency: 'ETB', currencySymbol: 'Br' },
      { name: 'קניה', nameEn: 'Kenya', code: 'KE', phonePrefix: '+254', currency: 'KES', currencySymbol: 'KSh' },
      { name: 'ניגריה', nameEn: 'Nigeria', code: 'NG', phonePrefix: '+234', currency: 'NGN', currencySymbol: '₦' },
      { name: 'גאנה', nameEn: 'Ghana', code: 'GH', phonePrefix: '+233', currency: 'GHS', currencySymbol: '₵' },
      { name: 'חילה', nameEn: 'Chile', code: 'CL', phonePrefix: '+56', currency: 'CLP', currencySymbol: '$' },
      { name: 'פרו', nameEn: 'Peru', code: 'PE', phonePrefix: '+51', currency: 'PEN', currencySymbol: 'S/' },
      { name: 'קולומביה', nameEn: 'Colombia', code: 'CO', phonePrefix: '+57', currency: 'COP', currencySymbol: '$' },
      { name: 'אוורוגואי', nameEn: 'Uruguay', code: 'UY', phonePrefix: '+598', currency: 'UYU', currencySymbol: '$' },
      { name: 'פרגוואי', nameEn: 'Paraguay', code: 'PY', phonePrefix: '+595', currency: 'PYG', currencySymbol: '₲' },
      { name: 'בוליביה', nameEn: 'Bolivia', code: 'BO', phonePrefix: '+591', currency: 'BOB', currencySymbol: 'Bs.' },
      { name: 'אקוודור', nameEn: 'Ecuador', code: 'EC', phonePrefix: '+593', currency: 'USD', currencySymbol: '$' },
      { name: 'ונצואלה', nameEn: 'Venezuela', code: 'VE', phonePrefix: '+58', currency: 'VES', currencySymbol: 'Bs.S' },
      { name: 'קוסטה ריקה', nameEn: 'Costa Rica', code: 'CR', phonePrefix: '+506', currency: 'CRC', currencySymbol: '₡' },
      { name: 'פנמה', nameEn: 'Panama', code: 'PA', phonePrefix: '+507', currency: 'PAB', currencySymbol: 'B/.' },
      { name: 'גואטמלה', nameEn: 'Guatemala', code: 'GT', phonePrefix: '+502', currency: 'GTQ', currencySymbol: 'Q' },
      { name: 'הונדורס', nameEn: 'Honduras', code: 'HN', phonePrefix: '+504', currency: 'HNL', currencySymbol: 'L' },
      { name: 'ניקרגואה', nameEn: 'Nicaragua', code: 'NI', phonePrefix: '+505', currency: 'NIO', currencySymbol: 'C$' },
      { name: 'אל סלבדור', nameEn: 'El Salvador', code: 'SV', phonePrefix: '+503', currency: 'USD', currencySymbol: '$' },
      { name: 'איסלנד', nameEn: 'Iceland', code: 'IS', phonePrefix: '+354', currency: 'ISK', currencySymbol: 'kr' },
      { name: 'לוקסמבורג', nameEn: 'Luxembourg', code: 'LU', phonePrefix: '+352', currency: 'EUR', currencySymbol: '€' },
      { name: 'מלטה', nameEn: 'Malta', code: 'MT', phonePrefix: '+356', currency: 'EUR', currencySymbol: '€' },
      { name: 'קפריסין', nameEn: 'Cyprus', code: 'CY', phonePrefix: '+357', currency: 'EUR', currencySymbol: '€' },
      { name: 'רומניה', nameEn: 'Romania', code: 'RO', phonePrefix: '+40', currency: 'RON', currencySymbol: 'lei' },
      { name: 'בולגריה', nameEn: 'Bulgaria', code: 'BG', phonePrefix: '+359', currency: 'BGN', currencySymbol: 'лв' },
      { name: 'קרואטיה', nameEn: 'Croatia', code: 'HR', phonePrefix: '+385', currency: 'EUR', currencySymbol: '€' },
      { name: 'סלובניה', nameEn: 'Slovenia', code: 'SI', phonePrefix: '+386', currency: 'EUR', currencySymbol: '€' },
      { name: 'סלובקיה', nameEn: 'Slovakia', code: 'SK', phonePrefix: '+421', currency: 'EUR', currencySymbol: '€' },
      { name: 'ליטא', nameEn: 'Lithuania', code: 'LT', phonePrefix: '+370', currency: 'EUR', currencySymbol: '€' },
      { name: 'לטביה', nameEn: 'Latvia', code: 'LV', phonePrefix: '+371', currency: 'EUR', currencySymbol: '€' },
      { name: 'אסטוניה', nameEn: 'Estonia', code: 'EE', phonePrefix: '+372', currency: 'EUR', currencySymbol: '€' },
      { name: 'בלרוס', nameEn: 'Belarus', code: 'BY', phonePrefix: '+375', currency: 'BYN', currencySymbol: 'Br' },
      { name: 'אוקראינה', nameEn: 'Ukraine', code: 'UA', phonePrefix: '+380', currency: 'UAH', currencySymbol: '₴' },
      { name: 'מולדובה', nameEn: 'Moldova', code: 'MD', phonePrefix: '+373', currency: 'MDL', currencySymbol: 'L' },
      { name: 'גיאורגיה', nameEn: 'Georgia', code: 'GE', phonePrefix: '+995', currency: 'GEL', currencySymbol: '₾' },
      { name: 'ארמניה', nameEn: 'Armenia', code: 'AM', phonePrefix: '+374', currency: 'AMD', currencySymbol: '֏' },
      { name: 'אזרבייג\'אן', nameEn: 'Azerbaijan', code: 'AZ', phonePrefix: '+994', currency: 'AZN', currencySymbol: '₼' },
      { name: 'קזחסטן', nameEn: 'Kazakhstan', code: 'KZ', phonePrefix: '+7', currency: 'KZT', currencySymbol: '₸' },
      { name: 'אוזבקיסטן', nameEn: 'Uzbekistan', code: 'UZ', phonePrefix: '+998', currency: 'UZS', currencySymbol: 'so\'m' },
      { name: 'פקיסטן', nameEn: 'Pakistan', code: 'PK', phonePrefix: '+92', currency: 'PKR', currencySymbol: '₨' },
      { name: 'בנגלדש', nameEn: 'Bangladesh', code: 'BD', phonePrefix: '+880', currency: 'BDT', currencySymbol: '৳' },
      { name: 'סרי לנקה', nameEn: 'Sri Lanka', code: 'LK', phonePrefix: '+94', currency: 'LKR', currencySymbol: 'Rs' },
    ]

    for (const countryData of countries) {
      const existing = await repo.findFirst({ name: countryData.name })
      if (!existing) {
        const country = repo.create()
        country.name = countryData.name
        country.nameEn = countryData.nameEn
        country.code = countryData.code
        country.phonePrefix = countryData.phonePrefix
        country.currency = countryData.currency
        country.currencySymbol = countryData.currencySymbol
        country.isActive = true
        await country.save()
      }
    }

    return `Created ${countries.length} countries`
  }
}