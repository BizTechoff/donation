import { remult, withRemult } from 'remult'
import { createPostgresConnection } from 'remult/postgres'
import { DonationMethod, Event, NoteType, Organization, User, Bank, DonorAddressType, LetterTitle, Country, Place, BlessingBookType } from '../shared/entity'
import { entities } from './api'

/**
 * Seed letter titles (prefix and suffix lines for letters)
 */
async function seedLetterTitles() {
  console.log('\n--- Creating Letter Titles ---')

  // Prefix lines (שורות פתיחה)
  const prefixLines = [
    'כבוד ידידנו הנדיב הנכבד, אוהב תורה ורודף חסד',
    'לכבוד ידידנו היקר והנעלה',
    'כבוד ידידנו הנכבד והנדיב',
    'לידידנו הנעלה והיקר',
    'כבוד הרב הגאון והחסיד',
    'לכבוד החבר היקר'
  ]

  // Suffix lines (שורות סיום)
  const suffixLines = [
    'א כשר און א פרייליכען פסח',
    'א פרייליכען יום טוב',
    'בברכת גמר חתימה טובה',
    'בברכת הצלחה רבה וכט"ס',
    'בברכת כתיבה וחתימה טובה',
    'ביקרא דאורייתא וכט"ס',
    'בברכה והצלחה',
    'בכבוד רב ובברכה',
    'בברכת הרב',
    'בידידות ובברכה',
    'בכבוד ובהוקרה',
    'בברכת התורה',
    'בברכת חג שמח',
    'בברכת שבת שלום'
  ]

  const createdTitles = []

  // Create prefix lines
  for (let i = 0; i < prefixLines.length; i++) {
    const text = prefixLines[i]
    const existing = await remult.repo(LetterTitle).findFirst({ text, type: 'prefix' })
    if (!existing) {
      const letterTitle = remult.repo(LetterTitle).create({
        text,
        type: 'prefix',
        sortOrder: i,
        active: true
      })
      await remult.repo(LetterTitle).save(letterTitle)
      createdTitles.push(letterTitle)
      console.log(`  ✓ Prefix: ${text}`)
    } else {
      createdTitles.push(existing)
      console.log(`  - Prefix: ${text} (already exists)`)
    }
  }

  // Create suffix lines
  for (let i = 0; i < suffixLines.length; i++) {
    const text = suffixLines[i]
    const existing = await remult.repo(LetterTitle).findFirst({ text, type: 'suffix' })
    if (!existing) {
      const letterTitle = remult.repo(LetterTitle).create({
        text,
        type: 'suffix',
        sortOrder: i,
        active: true
      })
      await remult.repo(LetterTitle).save(letterTitle)
      createdTitles.push(letterTitle)
      console.log(`  ✓ Suffix: ${text}`)
    } else {
      createdTitles.push(existing)
      console.log(`  - Suffix: ${text} (already exists)`)
    }
  }

  return { total: createdTitles.length, prefix: prefixLines.length, suffix: suffixLines.length }
}

/**
 * Seed countries with currency information - רשימה מקיפה של כל המדינות
 */
async function seedCountries() {
  console.log('\n--- Creating Countries ---')
  const repo = remult.repo(Country)

  // Currency to Symbol mapping
  const currencySymbols: { [key: string]: string } = {
    'ILS': '₪', 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$',
    'NZD': 'NZ$', 'CHF': 'CHF', 'RUB': '₽', 'JPY': '¥', 'CNY': '¥', 'INR': '₹',
    'BRL': 'R$', 'MXN': 'MX$', 'ARS': 'AR$', 'ZAR': 'R', 'DKK': 'kr', 'SEK': 'kr',
    'NOK': 'kr', 'PLN': 'zł', 'HUF': 'Ft', 'CZK': 'Kč', 'RON': 'lei', 'TRY': '₺',
    'SGD': 'S$', 'AED': 'د.إ', 'THB': '฿', 'MYR': 'RM', 'HKD': 'HK$', 'TWD': 'NT$',
    'KRW': '₩', 'VND': '₫', 'PHP': '₱', 'IDR': 'Rp', 'ISK': 'kr', 'BGN': 'лв',
    'HRK': 'kn', 'RSD': 'дин', 'UAH': '₴', 'BYN': 'Br', 'GEL': '₾', 'AMD': '֏',
    'AZN': '₼', 'KZT': '₸', 'UZS': 'soʻm', 'KGS': 'с', 'TJS': 'ЅМ', 'TMT': 'm',
    'SAR': '﷼', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'KWD': 'د.ك', 'OMR': 'ر.ع.', 'JOD': 'د.ا',
    'EGP': 'ج.م', 'MAD': 'د.م.', 'TND': 'د.ت', 'DZD': 'د.ج', 'LYD': 'ل.د', 'SDG': 'ج.س',
    'IQD': 'ع.د', 'SYP': 'ل.س', 'LBP': 'ل.ل', 'YER': '﷼', 'IRR': '﷼',
    'PKR': '₨', 'BDT': '৳', 'LKR': 'Rs', 'NPR': 'Rs', 'BTN': 'Nu.', 'MVR': 'Rf',
    'AFN': '؋', 'KPW': '₩', 'MNT': '₮', 'LAK': '₭', 'KHR': '៛', 'MMK': 'K',
    'BND': 'B$', 'CLP': 'CLP$', 'COP': 'COL$', 'PEN': 'S/', 'VED': 'Bs.', 'UYU': '$U',
    'PYG': '₲', 'BOB': 'Bs.', 'GYD': 'G$', 'SRD': 'Sr$', 'CRC': '₡', 'PAB': 'B/.',
    'NIO': 'C$', 'HNL': 'L', 'GTQ': 'Q', 'BMD': 'BD$', 'BZD': 'BZ$', 'CUP': '₱',
    'JMD': 'J$', 'HTG': 'G', 'DOP': 'RD$', 'TTD': 'TT$', 'BBD': 'Bds$', 'BSD': 'B$',
    'KYD': 'CI$', 'XCD': 'EC$', 'ETB': 'Br', 'ERN': 'Nfk', 'DJF': 'Fdj', 'SOS': 'Sh',
    'KES': 'KSh', 'UGX': 'USh', 'TZS': 'TSh', 'RWF': 'FRw', 'BIF': 'FBu', 'MGA': 'Ar',
    'MUR': '₨', 'SCR': '₨', 'KMF': 'CF', 'CDF': 'FC', 'XAF': 'FCFA', 'STN': 'Db',
    'NGN': '₦', 'GHS': 'GH₵', 'XOF': 'CFA', 'GNF': 'FG', 'MRU': 'UM', 'GMD': 'D',
    'CVE': 'Esc', 'SLL': 'Le', 'LRD': 'L$', 'BWP': 'P', 'NAD': 'N$', 'ZWL': 'Z$',
    'ZMW': 'ZK', 'MWK': 'MK', 'MZN': 'MT', 'AOA': 'Kz', 'LSL': 'L', 'SZL': 'E',
    'FJD': 'FJ$', 'PGK': 'K', 'SBD': 'SI$', 'VUV': 'VT', 'WST': 'WS$', 'TOP': 'T$',
    'XPF': '₣', 'MOP': 'MOP$', 'BAM': 'KM', 'MKD': 'ден', 'ALL': 'L', 'MDL': 'L',
    'SSP': '£'
  }

  const countries = [
    // מדינות עיקריות
    { name: 'ישראל', nameEn: 'Israel', code: 'IL', phonePrefix: '+972', currency: 'ILS' },
    { name: 'ארצות הברית', nameEn: 'United States', code: 'US', phonePrefix: '+1', currency: 'USD' },
    { name: 'בריטניה', nameEn: 'United Kingdom', code: 'GB', phonePrefix: '+44', currency: 'GBP' },
    { name: 'קנדה', nameEn: 'Canada', code: 'CA', phonePrefix: '+1', currency: 'CAD' },
    { name: 'אוסטרליה', nameEn: 'Australia', code: 'AU', phonePrefix: '+61', currency: 'AUD' },
    { name: 'ניו זילנד', nameEn: 'New Zealand', code: 'NZ', phonePrefix: '+64', currency: 'NZD' },

    // אירופה המערבית
    { name: 'צרפת', nameEn: 'France', code: 'FR', phonePrefix: '+33', currency: 'EUR' },
    { name: 'גרמניה', nameEn: 'Germany', code: 'DE', phonePrefix: '+49', currency: 'EUR' },
    { name: 'איטליה', nameEn: 'Italy', code: 'IT', phonePrefix: '+39', currency: 'EUR' },
    { name: 'ספרד', nameEn: 'Spain', code: 'ES', phonePrefix: '+34', currency: 'EUR' },
    { name: 'הולנד', nameEn: 'Netherlands', code: 'NL', phonePrefix: '+31', currency: 'EUR' },
    { name: 'בלגיה', nameEn: 'Belgium', code: 'BE', phonePrefix: '+32', currency: 'EUR' },
    { name: 'שוויץ', nameEn: 'Switzerland', code: 'CH', phonePrefix: '+41', currency: 'CHF' },
    { name: 'אוסטריה', nameEn: 'Austria', code: 'AT', phonePrefix: '+43', currency: 'EUR' },
    { name: 'פורטוגל', nameEn: 'Portugal', code: 'PT', phonePrefix: '+351', currency: 'EUR' },
    { name: 'אירלנד', nameEn: 'Ireland', code: 'IE', phonePrefix: '+353', currency: 'EUR' },
    { name: 'לוקסמבורג', nameEn: 'Luxembourg', code: 'LU', phonePrefix: '+352', currency: 'EUR' },
    { name: 'מונאקו', nameEn: 'Monaco', code: 'MC', phonePrefix: '+377', currency: 'EUR' },
    { name: 'ליכטנשטיין', nameEn: 'Liechtenstein', code: 'LI', phonePrefix: '+423', currency: 'CHF' },
    { name: 'אנדורה', nameEn: 'Andorra', code: 'AD', phonePrefix: '+376', currency: 'EUR' },
    { name: 'סן מרינו', nameEn: 'San Marino', code: 'SM', phonePrefix: '+378', currency: 'EUR' },
    { name: 'ותיקן', nameEn: 'Vatican City', code: 'VA', phonePrefix: '+39', currency: 'EUR' },
    { name: 'מלטה', nameEn: 'Malta', code: 'MT', phonePrefix: '+356', currency: 'EUR' },

    // אירופה הצפונית
    { name: 'דנמרק', nameEn: 'Denmark', code: 'DK', phonePrefix: '+45', currency: 'DKK' },
    { name: 'שוודיה', nameEn: 'Sweden', code: 'SE', phonePrefix: '+46', currency: 'SEK' },
    { name: 'נורווגיה', nameEn: 'Norway', code: 'NO', phonePrefix: '+47', currency: 'NOK' },
    { name: 'פינלנד', nameEn: 'Finland', code: 'FI', phonePrefix: '+358', currency: 'EUR' },
    { name: 'איסלנד', nameEn: 'Iceland', code: 'IS', phonePrefix: '+354', currency: 'ISK' },
    { name: 'פארו', nameEn: 'Faroe Islands', code: 'FO', phonePrefix: '+298', currency: 'DKK' },
    { name: 'גרינלנד', nameEn: 'Greenland', code: 'GL', phonePrefix: '+299', currency: 'DKK' },

    // אירופה המזרחית
    { name: 'פולין', nameEn: 'Poland', code: 'PL', phonePrefix: '+48', currency: 'PLN' },
    { name: 'הונגריה', nameEn: 'Hungary', code: 'HU', phonePrefix: '+36', currency: 'HUF' },
    { name: 'צ\'כיה', nameEn: 'Czech Republic', code: 'CZ', phonePrefix: '+420', currency: 'CZK' },
    { name: 'סלובקיה', nameEn: 'Slovakia', code: 'SK', phonePrefix: '+421', currency: 'EUR' },
    { name: 'סלובניה', nameEn: 'Slovenia', code: 'SI', phonePrefix: '+386', currency: 'EUR' },
    { name: 'רומניה', nameEn: 'Romania', code: 'RO', phonePrefix: '+40', currency: 'RON' },
    { name: 'בולגריה', nameEn: 'Bulgaria', code: 'BG', phonePrefix: '+359', currency: 'BGN' },
    { name: 'קרואטיה', nameEn: 'Croatia', code: 'HR', phonePrefix: '+385', currency: 'EUR' },
    { name: 'סרביה', nameEn: 'Serbia', code: 'RS', phonePrefix: '+381', currency: 'RSD' },
    { name: 'בוסניה והרצגובינה', nameEn: 'Bosnia and Herzegovina', code: 'BA', phonePrefix: '+387', currency: 'BAM' },
    { name: 'מונטנגרו', nameEn: 'Montenegro', code: 'ME', phonePrefix: '+382', currency: 'EUR' },
    { name: 'מקדוניה הצפונית', nameEn: 'North Macedonia', code: 'MK', phonePrefix: '+389', currency: 'MKD' },
    { name: 'אלבניה', nameEn: 'Albania', code: 'AL', phonePrefix: '+355', currency: 'ALL' },
    { name: 'יוון', nameEn: 'Greece', code: 'GR', phonePrefix: '+30', currency: 'EUR' },
    { name: 'קפריסין', nameEn: 'Cyprus', code: 'CY', phonePrefix: '+357', currency: 'EUR' },
    { name: 'אסטוניה', nameEn: 'Estonia', code: 'EE', phonePrefix: '+372', currency: 'EUR' },
    { name: 'לטביה', nameEn: 'Latvia', code: 'LV', phonePrefix: '+371', currency: 'EUR' },
    { name: 'ליטא', nameEn: 'Lithuania', code: 'LT', phonePrefix: '+370', currency: 'EUR' },
    { name: 'בלארוס', nameEn: 'Belarus', code: 'BY', phonePrefix: '+375', currency: 'BYN' },
    { name: 'מולדובה', nameEn: 'Moldova', code: 'MD', phonePrefix: '+373', currency: 'MDL' },
    { name: 'אוקראינה', nameEn: 'Ukraine', code: 'UA', phonePrefix: '+380', currency: 'UAH' },
    { name: 'רוסיה', nameEn: 'Russia', code: 'RU', phonePrefix: '+7', currency: 'RUB' },

    // אמריקה הצפונית
    { name: 'מקסיקו', nameEn: 'Mexico', code: 'MX', phonePrefix: '+52', currency: 'MXN' },
    { name: 'ברמודה', nameEn: 'Bermuda', code: 'BM', phonePrefix: '+1', currency: 'BMD' },
    { name: 'גואטמלה', nameEn: 'Guatemala', code: 'GT', phonePrefix: '+502', currency: 'GTQ' },
    { name: 'הונדורס', nameEn: 'Honduras', code: 'HN', phonePrefix: '+504', currency: 'HNL' },
    { name: 'אל סלבדור', nameEn: 'El Salvador', code: 'SV', phonePrefix: '+503', currency: 'USD' },
    { name: 'ניקרגואה', nameEn: 'Nicaragua', code: 'NI', phonePrefix: '+505', currency: 'NIO' },
    { name: 'קוסטה ריקה', nameEn: 'Costa Rica', code: 'CR', phonePrefix: '+506', currency: 'CRC' },
    { name: 'פנמה', nameEn: 'Panama', code: 'PA', phonePrefix: '+507', currency: 'PAB' },
    { name: 'בליז', nameEn: 'Belize', code: 'BZ', phonePrefix: '+501', currency: 'BZD' },

    // הקריביים
    { name: 'קובה', nameEn: 'Cuba', code: 'CU', phonePrefix: '+53', currency: 'CUP' },
    { name: 'ג\'מייקה', nameEn: 'Jamaica', code: 'JM', phonePrefix: '+1', currency: 'JMD' },
    { name: 'האיטי', nameEn: 'Haiti', code: 'HT', phonePrefix: '+509', currency: 'HTG' },
    { name: 'הרפובליקה הדומיניקנית', nameEn: 'Dominican Republic', code: 'DO', phonePrefix: '+1', currency: 'DOP' },
    { name: 'פורטו ריקו', nameEn: 'Puerto Rico', code: 'PR', phonePrefix: '+1', currency: 'USD' },
    { name: 'טרינידד וטובגו', nameEn: 'Trinidad and Tobago', code: 'TT', phonePrefix: '+1', currency: 'TTD' },
    { name: 'ברבדוס', nameEn: 'Barbados', code: 'BB', phonePrefix: '+1', currency: 'BBD' },
    { name: 'בהאמה', nameEn: 'Bahamas', code: 'BS', phonePrefix: '+1', currency: 'BSD' },
    { name: 'איי קיימן', nameEn: 'Cayman Islands', code: 'KY', phonePrefix: '+1', currency: 'KYD' },
    { name: 'איי הבתולה הבריטיים', nameEn: 'British Virgin Islands', code: 'VG', phonePrefix: '+1', currency: 'USD' },
    { name: 'אנטיגואה וברבודה', nameEn: 'Antigua and Barbuda', code: 'AG', phonePrefix: '+1', currency: 'XCD' },
    { name: 'דומיניקה', nameEn: 'Dominica', code: 'DM', phonePrefix: '+1', currency: 'XCD' },
    { name: 'גרנדה', nameEn: 'Grenada', code: 'GD', phonePrefix: '+1', currency: 'XCD' },
    { name: 'סנט קיטס ונביס', nameEn: 'Saint Kitts and Nevis', code: 'KN', phonePrefix: '+1', currency: 'XCD' },
    { name: 'סנט לוסיה', nameEn: 'Saint Lucia', code: 'LC', phonePrefix: '+1', currency: 'XCD' },
    { name: 'סנט וינסנט והגרנדינים', nameEn: 'Saint Vincent and the Grenadines', code: 'VC', phonePrefix: '+1', currency: 'XCD' },

    // אמריקה הדרומית
    { name: 'ברזיל', nameEn: 'Brazil', code: 'BR', phonePrefix: '+55', currency: 'BRL' },
    { name: 'ארגנטינה', nameEn: 'Argentina', code: 'AR', phonePrefix: '+54', currency: 'ARS' },
    { name: 'צ\'ילה', nameEn: 'Chile', code: 'CL', phonePrefix: '+56', currency: 'CLP' },
    { name: 'קולומביה', nameEn: 'Colombia', code: 'CO', phonePrefix: '+57', currency: 'COP' },
    { name: 'פרו', nameEn: 'Peru', code: 'PE', phonePrefix: '+51', currency: 'PEN' },
    { name: 'ונצואלה', nameEn: 'Venezuela', code: 'VE', phonePrefix: '+58', currency: 'VED' },
    { name: 'אורוגוואי', nameEn: 'Uruguay', code: 'UY', phonePrefix: '+598', currency: 'UYU' },
    { name: 'פרגוואי', nameEn: 'Paraguay', code: 'PY', phonePrefix: '+595', currency: 'PYG' },
    { name: 'בוליביה', nameEn: 'Bolivia', code: 'BO', phonePrefix: '+591', currency: 'BOB' },
    { name: 'אקוודור', nameEn: 'Ecuador', code: 'EC', phonePrefix: '+593', currency: 'USD' },
    { name: 'גיאנה', nameEn: 'Guyana', code: 'GY', phonePrefix: '+592', currency: 'GYD' },
    { name: 'סורינאם', nameEn: 'Suriname', code: 'SR', phonePrefix: '+597', currency: 'SRD' },
    { name: 'גיאנה הצרפתית', nameEn: 'French Guiana', code: 'GF', phonePrefix: '+594', currency: 'EUR' },

    // אסיה המזרחית
    { name: 'סין', nameEn: 'China', code: 'CN', phonePrefix: '+86', currency: 'CNY' },
    { name: 'יפן', nameEn: 'Japan', code: 'JP', phonePrefix: '+81', currency: 'JPY' },
    { name: 'קוריאה הדרומית', nameEn: 'South Korea', code: 'KR', phonePrefix: '+82', currency: 'KRW' },
    { name: 'קוריאה הצפונית', nameEn: 'North Korea', code: 'KP', phonePrefix: '+850', currency: 'KPW' },
    { name: 'טייוואן', nameEn: 'Taiwan', code: 'TW', phonePrefix: '+886', currency: 'TWD' },
    { name: 'הונג קונג', nameEn: 'Hong Kong', code: 'HK', phonePrefix: '+852', currency: 'HKD' },
    { name: 'מקאו', nameEn: 'Macao', code: 'MO', phonePrefix: '+853', currency: 'MOP' },
    { name: 'מונגוליה', nameEn: 'Mongolia', code: 'MN', phonePrefix: '+976', currency: 'MNT' },

    // דרום מזרח אסיה
    { name: 'תאילנד', nameEn: 'Thailand', code: 'TH', phonePrefix: '+66', currency: 'THB' },
    { name: 'וייטנאם', nameEn: 'Vietnam', code: 'VN', phonePrefix: '+84', currency: 'VND' },
    { name: 'קמבודיה', nameEn: 'Cambodia', code: 'KH', phonePrefix: '+855', currency: 'KHR' },
    { name: 'לאוס', nameEn: 'Laos', code: 'LA', phonePrefix: '+856', currency: 'LAK' },
    { name: 'מיאנמר', nameEn: 'Myanmar', code: 'MM', phonePrefix: '+95', currency: 'MMK' },
    { name: 'מלזיה', nameEn: 'Malaysia', code: 'MY', phonePrefix: '+60', currency: 'MYR' },
    { name: 'סינגפור', nameEn: 'Singapore', code: 'SG', phonePrefix: '+65', currency: 'SGD' },
    { name: 'אינדונזיה', nameEn: 'Indonesia', code: 'ID', phonePrefix: '+62', currency: 'IDR' },
    { name: 'פיליפינים', nameEn: 'Philippines', code: 'PH', phonePrefix: '+63', currency: 'PHP' },
    { name: 'ברוניי', nameEn: 'Brunei', code: 'BN', phonePrefix: '+673', currency: 'BND' },
    { name: 'טימור המזרחית', nameEn: 'East Timor', code: 'TL', phonePrefix: '+670', currency: 'USD' },

    // דרום אסיה
    { name: 'הודו', nameEn: 'India', code: 'IN', phonePrefix: '+91', currency: 'INR' },
    { name: 'פקיסטן', nameEn: 'Pakistan', code: 'PK', phonePrefix: '+92', currency: 'PKR' },
    { name: 'בנגלדש', nameEn: 'Bangladesh', code: 'BD', phonePrefix: '+880', currency: 'BDT' },
    { name: 'סרי לנקה', nameEn: 'Sri Lanka', code: 'LK', phonePrefix: '+94', currency: 'LKR' },
    { name: 'נפאל', nameEn: 'Nepal', code: 'NP', phonePrefix: '+977', currency: 'NPR' },
    { name: 'בהוטן', nameEn: 'Bhutan', code: 'BT', phonePrefix: '+975', currency: 'BTN' },
    { name: 'מלדיביים', nameEn: 'Maldives', code: 'MV', phonePrefix: '+960', currency: 'MVR' },
    { name: 'אפגניסטן', nameEn: 'Afghanistan', code: 'AF', phonePrefix: '+93', currency: 'AFN' },

    // מרכז אסיה
    { name: 'קזחסטן', nameEn: 'Kazakhstan', code: 'KZ', phonePrefix: '+7', currency: 'KZT' },
    { name: 'אוזבקיסטן', nameEn: 'Uzbekistan', code: 'UZ', phonePrefix: '+998', currency: 'UZS' },
    { name: 'קירגיזסטן', nameEn: 'Kyrgyzstan', code: 'KG', phonePrefix: '+996', currency: 'KGS' },
    { name: 'טג\'יקיסטן', nameEn: 'Tajikistan', code: 'TJ', phonePrefix: '+992', currency: 'TJS' },
    { name: 'טורקמניסטן', nameEn: 'Turkmenistan', code: 'TM', phonePrefix: '+993', currency: 'TMT' },

    // מערב אסיה / המזרח התיכון
    { name: 'טורקיה', nameEn: 'Turkey', code: 'TR', phonePrefix: '+90', currency: 'TRY' },
    { name: 'איראן', nameEn: 'Iran', code: 'IR', phonePrefix: '+98', currency: 'IRR' },
    { name: 'עיראק', nameEn: 'Iraq', code: 'IQ', phonePrefix: '+964', currency: 'IQD' },
    { name: 'סוריה', nameEn: 'Syria', code: 'SY', phonePrefix: '+963', currency: 'SYP' },
    { name: 'לבנון', nameEn: 'Lebanon', code: 'LB', phonePrefix: '+961', currency: 'LBP' },
    { name: 'ירדן', nameEn: 'Jordan', code: 'JO', phonePrefix: '+962', currency: 'JOD' },
    { name: 'ערב הסעודית', nameEn: 'Saudi Arabia', code: 'SA', phonePrefix: '+966', currency: 'SAR' },
    { name: 'איחוד האמירויות', nameEn: 'United Arab Emirates', code: 'AE', phonePrefix: '+971', currency: 'AED' },
    { name: 'קטאר', nameEn: 'Qatar', code: 'QA', phonePrefix: '+974', currency: 'QAR' },
    { name: 'בחריין', nameEn: 'Bahrain', code: 'BH', phonePrefix: '+973', currency: 'BHD' },
    { name: 'כווית', nameEn: 'Kuwait', code: 'KW', phonePrefix: '+965', currency: 'KWD' },
    { name: 'עומאן', nameEn: 'Oman', code: 'OM', phonePrefix: '+968', currency: 'OMR' },
    { name: 'תימן', nameEn: 'Yemen', code: 'YE', phonePrefix: '+967', currency: 'YER' },
    { name: 'גאורגיה', nameEn: 'Georgia', code: 'GE', phonePrefix: '+995', currency: 'GEL' },
    { name: 'אזרבייג\'ן', nameEn: 'Azerbaijan', code: 'AZ', phonePrefix: '+994', currency: 'AZN' },
    { name: 'ארמניה', nameEn: 'Armenia', code: 'AM', phonePrefix: '+374', currency: 'AMD' },

    // צפון אפריקה
    { name: 'מצרים', nameEn: 'Egypt', code: 'EG', phonePrefix: '+20', currency: 'EGP' },
    { name: 'לוב', nameEn: 'Libya', code: 'LY', phonePrefix: '+218', currency: 'LYD' },
    { name: 'תוניסיה', nameEn: 'Tunisia', code: 'TN', phonePrefix: '+216', currency: 'TND' },
    { name: 'אלג\'יריה', nameEn: 'Algeria', code: 'DZ', phonePrefix: '+213', currency: 'DZD' },
    { name: 'מרוקו', nameEn: 'Morocco', code: 'MA', phonePrefix: '+212', currency: 'MAD' },
    { name: 'סודן', nameEn: 'Sudan', code: 'SD', phonePrefix: '+249', currency: 'SDG' },
    { name: 'דרום סודן', nameEn: 'South Sudan', code: 'SS', phonePrefix: '+211', currency: 'SSP' },

    // מזרח אפריקה
    { name: 'אתיופיה', nameEn: 'Ethiopia', code: 'ET', phonePrefix: '+251', currency: 'ETB' },
    { name: 'אריתריאה', nameEn: 'Eritrea', code: 'ER', phonePrefix: '+291', currency: 'ERN' },
    { name: 'ג\'יבוטי', nameEn: 'Djibouti', code: 'DJ', phonePrefix: '+253', currency: 'DJF' },
    { name: 'סומליה', nameEn: 'Somalia', code: 'SO', phonePrefix: '+252', currency: 'SOS' },
    { name: 'קניה', nameEn: 'Kenya', code: 'KE', phonePrefix: '+254', currency: 'KES' },
    { name: 'אוגנדה', nameEn: 'Uganda', code: 'UG', phonePrefix: '+256', currency: 'UGX' },
    { name: 'טנזניה', nameEn: 'Tanzania', code: 'TZ', phonePrefix: '+255', currency: 'TZS' },
    { name: 'רואנדה', nameEn: 'Rwanda', code: 'RW', phonePrefix: '+250', currency: 'RWF' },
    { name: 'בורונדי', nameEn: 'Burundi', code: 'BI', phonePrefix: '+257', currency: 'BIF' },
    { name: 'מדגסקר', nameEn: 'Madagascar', code: 'MG', phonePrefix: '+261', currency: 'MGA' },
    { name: 'מאוריציוס', nameEn: 'Mauritius', code: 'MU', phonePrefix: '+230', currency: 'MUR' },
    { name: 'סיישל', nameEn: 'Seychelles', code: 'SC', phonePrefix: '+248', currency: 'SCR' },
    { name: 'קומורו', nameEn: 'Comoros', code: 'KM', phonePrefix: '+269', currency: 'KMF' },

    // מרכז אפריקה
    { name: 'הרפובליקה הדמוקרטית של קונגו', nameEn: 'Democratic Republic of the Congo', code: 'CD', phonePrefix: '+243', currency: 'CDF' },
    { name: 'הרפובליקה של קונגו', nameEn: 'Republic of the Congo', code: 'CG', phonePrefix: '+242', currency: 'XAF' },
    { name: 'הרפובליקה המרכז אפריקנית', nameEn: 'Central African Republic', code: 'CF', phonePrefix: '+236', currency: 'XAF' },
    { name: 'צ\'אד', nameEn: 'Chad', code: 'TD', phonePrefix: '+235', currency: 'XAF' },
    { name: 'קמרון', nameEn: 'Cameroon', code: 'CM', phonePrefix: '+237', currency: 'XAF' },
    { name: 'גינאה המשוונית', nameEn: 'Equatorial Guinea', code: 'GQ', phonePrefix: '+240', currency: 'XAF' },
    { name: 'גבון', nameEn: 'Gabon', code: 'GA', phonePrefix: '+241', currency: 'XAF' },
    { name: 'סאו טומה ופרינסיפה', nameEn: 'Sao Tome and Principe', code: 'ST', phonePrefix: '+239', currency: 'STN' },

    // מערב אפריקה
    { name: 'ניגריה', nameEn: 'Nigeria', code: 'NG', phonePrefix: '+234', currency: 'NGN' },
    { name: 'גאנה', nameEn: 'Ghana', code: 'GH', phonePrefix: '+233', currency: 'GHS' },
    { name: 'חוף השנהב', nameEn: 'Ivory Coast', code: 'CI', phonePrefix: '+225', currency: 'XOF' },
    { name: 'בורקינה פאסו', nameEn: 'Burkina Faso', code: 'BF', phonePrefix: '+226', currency: 'XOF' },
    { name: 'מאלי', nameEn: 'Mali', code: 'ML', phonePrefix: '+223', currency: 'XOF' },
    { name: 'ניז\'ר', nameEn: 'Niger', code: 'NE', phonePrefix: '+227', currency: 'XOF' },
    { name: 'גינאה', nameEn: 'Guinea', code: 'GN', phonePrefix: '+224', currency: 'GNF' },
    { name: 'סנגל', nameEn: 'Senegal', code: 'SN', phonePrefix: '+221', currency: 'XOF' },
    { name: 'מאוריטניה', nameEn: 'Mauritania', code: 'MR', phonePrefix: '+222', currency: 'MRU' },
    { name: 'גמביה', nameEn: 'Gambia', code: 'GM', phonePrefix: '+220', currency: 'GMD' },
    { name: 'גינאה ביסאו', nameEn: 'Guinea-Bissau', code: 'GW', phonePrefix: '+245', currency: 'XOF' },
    { name: 'כף ורדה', nameEn: 'Cape Verde', code: 'CV', phonePrefix: '+238', currency: 'CVE' },
    { name: 'סיירה ליאון', nameEn: 'Sierra Leone', code: 'SL', phonePrefix: '+232', currency: 'SLL' },
    { name: 'ליבריה', nameEn: 'Liberia', code: 'LR', phonePrefix: '+231', currency: 'LRD' },
    { name: 'טוגו', nameEn: 'Togo', code: 'TG', phonePrefix: '+228', currency: 'XOF' },
    { name: 'בנין', nameEn: 'Benin', code: 'BJ', phonePrefix: '+229', currency: 'XOF' },

    // דרום אפריקה
    { name: 'דרום אפריקה', nameEn: 'South Africa', code: 'ZA', phonePrefix: '+27', currency: 'ZAR' },
    { name: 'בוטסואנה', nameEn: 'Botswana', code: 'BW', phonePrefix: '+267', currency: 'BWP' },
    { name: 'נמיביה', nameEn: 'Namibia', code: 'NA', phonePrefix: '+264', currency: 'NAD' },
    { name: 'זימבבואה', nameEn: 'Zimbabwe', code: 'ZW', phonePrefix: '+263', currency: 'ZWL' },
    { name: 'זמביה', nameEn: 'Zambia', code: 'ZM', phonePrefix: '+260', currency: 'ZMW' },
    { name: 'מלאווי', nameEn: 'Malawi', code: 'MW', phonePrefix: '+265', currency: 'MWK' },
    { name: 'מוזמביק', nameEn: 'Mozambique', code: 'MZ', phonePrefix: '+258', currency: 'MZN' },
    { name: 'אנגולה', nameEn: 'Angola', code: 'AO', phonePrefix: '+244', currency: 'AOA' },
    { name: 'לסוטו', nameEn: 'Lesotho', code: 'LS', phonePrefix: '+266', currency: 'LSL' },
    { name: 'אסווטיני', nameEn: 'Eswatini', code: 'SZ', phonePrefix: '+268', currency: 'SZL' },

    // אוקיאניה
    { name: 'פיג\'י', nameEn: 'Fiji', code: 'FJ', phonePrefix: '+679', currency: 'FJD' },
    { name: 'פפואה גינאה החדשה', nameEn: 'Papua New Guinea', code: 'PG', phonePrefix: '+675', currency: 'PGK' },
    { name: 'איי שלמה', nameEn: 'Solomon Islands', code: 'SB', phonePrefix: '+677', currency: 'SBD' },
    { name: 'ונואטו', nameEn: 'Vanuatu', code: 'VU', phonePrefix: '+678', currency: 'VUV' },
    { name: 'סמואה', nameEn: 'Samoa', code: 'WS', phonePrefix: '+685', currency: 'WST' },
    { name: 'טונגה', nameEn: 'Tonga', code: 'TO', phonePrefix: '+676', currency: 'TOP' },
    { name: 'טובאלו', nameEn: 'Tuvalu', code: 'TV', phonePrefix: '+688', currency: 'AUD' },
    { name: 'קיריבטי', nameEn: 'Kiribati', code: 'KI', phonePrefix: '+686', currency: 'AUD' },
    { name: 'נאורו', nameEn: 'Nauru', code: 'NR', phonePrefix: '+674', currency: 'AUD' },
    { name: 'איי מרשל', nameEn: 'Marshall Islands', code: 'MH', phonePrefix: '+692', currency: 'USD' },
    { name: 'מיקרונזיה', nameEn: 'Micronesia', code: 'FM', phonePrefix: '+691', currency: 'USD' },
    { name: 'פלאו', nameEn: 'Palau', code: 'PW', phonePrefix: '+680', currency: 'USD' },
    { name: 'גואם', nameEn: 'Guam', code: 'GU', phonePrefix: '+1', currency: 'USD' },
    { name: 'פולינזיה הצרפתית', nameEn: 'French Polynesia', code: 'PF', phonePrefix: '+689', currency: 'XPF' },
    { name: 'קלדוניה החדשה', nameEn: 'New Caledonia', code: 'NC', phonePrefix: '+687', currency: 'XPF' },
    { name: 'איי קוק', nameEn: 'Cook Islands', code: 'CK', phonePrefix: '+682', currency: 'NZD' },
    { name: 'ניואה', nameEn: 'Niue', code: 'NU', phonePrefix: '+683', currency: 'NZD' },
    { name: 'איי פיטקרן', nameEn: 'Pitcairn Islands', code: 'PN', phonePrefix: '+64', currency: 'NZD' },
    { name: 'טוקלאו', nameEn: 'Tokelau', code: 'TK', phonePrefix: '+690', currency: 'NZD' },
    { name: 'סמואה האמריקנית', nameEn: 'American Samoa', code: 'AS', phonePrefix: '+1', currency: 'USD' },
    { name: 'איי הוואי', nameEn: 'Hawaii', code: 'HI', phonePrefix: '+1', currency: 'USD' },
  ]

  let created = 0
  let updated = 0

  for (const countryData of countries) {
    try {
      const existing = await repo.findFirst({ name: countryData.name })

      if (!existing) {
        const country = repo.create()
        country.name = countryData.name
        country.nameEn = countryData.nameEn
        country.code = countryData.code
        country.phonePrefix = countryData.phonePrefix
        country.currencyId = countryData.currency
        country.currencySymbol = currencySymbols[countryData.currency] || countryData.currency
        country.isActive = true
        await country.save()
        created++
        console.log(`  ✓ ${countryData.name} (${country.currencySymbol})`)
      } else {
        // עדכון מדינה קיימת אם חסרים נתונים
        let needsUpdate = false
        if (!existing.nameEn && countryData.nameEn) {
          existing.nameEn = countryData.nameEn
          needsUpdate = true
        }
        if (!existing.code && countryData.code) {
          existing.code = countryData.code
          needsUpdate = true
        }
        if (!existing.phonePrefix && countryData.phonePrefix) {
          existing.phonePrefix = countryData.phonePrefix
          needsUpdate = true
        }
        if (!existing.currencyId && countryData.currency) {
          existing.currencyId = countryData.currency
          needsUpdate = true
        }
        if (!existing.currencySymbol && countryData.currency) {
          existing.currencySymbol = currencySymbols[countryData.currency] || countryData.currency
          needsUpdate = true
        }
        if (needsUpdate) {
          await existing.save()
          updated++
          console.log(`  - ${countryData.name} (updated)`)
        } else {
          console.log(`  - ${countryData.name} (already exists)`)
        }
      }
    } catch (error) {
      console.error(`  ✗ Error processing country ${countryData.name}:`, error)
    }
  }

  return { created, updated, total: countries.length }
}

/**
 * Seed blessing book types (סוגי ספר הברכות)
 */
async function seedBlessingBookTypes() {
  console.log('\n--- Creating Blessing Book Types ---')

  const blessingBookTypes = [
    { type: 'רבע', price: 250 },
    { type: 'חצי', price: 360 },
    { type: 'שלם', price: 500 },
    { type: 'אדני נחושת', price: 600 },
    { type: 'אבני כסף', price: 750 },
    { type: 'עמודי זהב', price: 1000 },
    { type: 'ספיר ויהלום', price: 2000 },
    { type: 'פלאטיניום', price: 2500 },
    { type: 'פטרון', price: 3600 },
    { type: 'מחזיק תורה', price: 5000 },
    { type: 'עץ חיים', price: 10000 },
    { type: 'כתר תורה', price: 18000 }
  ]

  let created = 0
  let existing = 0

  for (const typeData of blessingBookTypes) {
    const existingType = await remult.repo(BlessingBookType).findFirst({ type: typeData.type })
    if (!existingType) {
      const blessingType = remult.repo(BlessingBookType).create({
        type: typeData.type,
        price: typeData.price,
        isActive: true
      })
      await remult.repo(BlessingBookType).save(blessingType)
      created++
      console.log(`  ✓ ${typeData.type} (₪${typeData.price})`)
    } else {
      existing++
      console.log(`  - ${typeData.type} (already exists)`)
    }
  }

  return { created, existing, total: blessingBookTypes.length }
}

/**
 * Helper function to find or create a country
 */
async function findOrCreateCountry(countryCode: string): Promise<Country | undefined> {
  try {
    let country = await remult.repo(Country).findFirst({ code: countryCode })

    if (!country) {
      console.log(`  ⚠ Country with code '${countryCode}' not found, creating it...`)

      // Default country data based on code
      const countryDefaults: { [key: string]: { name: string, nameEn: string, phonePrefix: string, currency: string } } = {
        'US': { name: 'ארצות הברית', nameEn: 'United States', phonePrefix: '+1', currency: 'USD' },
        'CA': { name: 'קנדה', nameEn: 'Canada', phonePrefix: '+1', currency: 'CAD' },
        'GB': { name: 'בריטניה', nameEn: 'United Kingdom', phonePrefix: '+44', currency: 'GBP' },
        'IL': { name: 'ישראל', nameEn: 'Israel', phonePrefix: '+972', currency: 'ILS' }
      }

      const defaultData = countryDefaults[countryCode] || {
        name: countryCode,
        nameEn: countryCode,
        phonePrefix: '+1',
        currency: 'USD'
      }

      country = remult.repo(Country).create({
        name: defaultData.name,
        nameEn: defaultData.nameEn,
        code: countryCode,
        phonePrefix: defaultData.phonePrefix,
        currencyId: defaultData.currency,
        currencySymbol: defaultData.currency === 'USD' ? '$' : defaultData.currency === 'ILS' ? '₪' : defaultData.currency === 'EUR' ? '€' : defaultData.currency === 'GBP' ? '£' : defaultData.currency === 'CAD' ? 'C$' : defaultData.currency,
        isActive: true
      })
      await country.save()
      console.log(`  ✓ Country '${defaultData.nameEn}' created automatically`)
    }

    return country
  } catch (error) {
    console.error(`  ✗ Error finding/creating country ${countryCode}:`, error)
    return undefined
  }
}

/**
 * Seed infrastructure data
 * This script creates all the basic infrastructure data needed for the donation system
 */
export async function seedInfrastructure() {
  console.log('Starting infrastructure seeding...')

  try {
    // Create countries FIRST (required by other entities)
    const countriesResult = await seedCountries()

    // Create donation methods
    console.log('\n--- Creating Donation Methods ---')
    const methods = [
      { name: 'מזומן', type: 'cash' as const, description: 'תשלום במזומן', feePercentage: 0, fixedFee: 0 },
      { name: 'צק', type: 'check' as const, description: 'תשלום בצק', feePercentage: 0, fixedFee: 5 },
      { name: 'כרטיס אשראי', type: 'credit_card' as const, description: 'תשלום בכרטיס אשראי', feePercentage: 2.5, fixedFee: 0 },
      { name: 'העברה בנקאית', type: 'bank_transfer' as const, description: 'העברה בנקאית', feePercentage: 0, fixedFee: 2 },
      { name: 'הו"ק', type: 'standing_order' as const, description: 'הוראת קבע', feePercentage: 0, fixedFee: 0 },
      { name: 'עמותה', type: 'association' as const, description: 'עמותה', feePercentage: 0, fixedFee: 0 }
    ]

    const createdMethods = []
    for (const methodData of methods) {
      const existing = await remult.repo(DonationMethod).findFirst({ name: methodData.name })
      if (!existing) {
        const method = remult.repo(DonationMethod).create(methodData)
        await method.save()
        createdMethods.push(method)
        console.log(`✓ Donation method '${methodData.name}' created`)
      } else {
        createdMethods.push(existing)
        console.log(`- Donation method '${methodData.name}' already exists`)
      }
    }

    // Create donor address types
    console.log('\n--- Creating Donor Address Types ---')
    const addressTypesData = [
      { name: 'בית', description: 'כתובת מגורים ראשית' },
      { name: 'שטיבלך', description: 'בית כנסת או מקום תפילה' },
      { name: 'עבודה', description: 'מקום משרד' },
      { name: 'נופש', description: 'כתובת נופש או משנית' }
    ]
    const createdAddressTypes = []

    for (const typeData of addressTypesData) {
      const existing = await remult.repo(DonorAddressType).findFirst({ name: typeData.name })
      if (!existing) {
        const addressType = remult.repo(DonorAddressType).create({
          name: typeData.name,
          description: typeData.description,
          isActive: true
        })
        await remult.repo(DonorAddressType).save(addressType)
        createdAddressTypes.push(addressType)
        console.log(`✓ Address type '${typeData.name}' created`)
      } else {
        createdAddressTypes.push(existing)
        console.log(`- Address type '${typeData.name}' already exists`)
      }
    }

    // Create basic events
    console.log('\n--- Creating Events ---')
    const events = [
      { description: 'יום הולדת', type: 'personal', isRequired: false, sortOrder: 0, category: 'אישי' },
      { description: 'יום נישואין', type: 'personal', isRequired: false, sortOrder: 1, category: 'אישי' },
      { description: 'יארצייט אבא', type: 'personal', isRequired: false, sortOrder: 2, category: 'יארצייט' },
      { description: 'יארצייט אמא', type: 'personal', isRequired: false, sortOrder: 3, category: 'יארצייט' },
      { description: 'יארצייט בן/בת זוג', type: 'personal', isRequired: false, sortOrder: 4, category: 'יארצייט' },
      { description: 'בר מצווה', type: 'personal', isRequired: false, sortOrder: 5, category: 'דתי' },
      { description: 'בת מצווה', type: 'personal', isRequired: false, sortOrder: 6, category: 'דתי' },
      { description: 'יום השנה', type: 'personal', isRequired: false, sortOrder: 7, category: 'אישי' },
      { description: 'סיום לימודים', type: 'personal', isRequired: false, sortOrder: 8, category: 'אישי' },
      { description: 'עלייה לתורה', type: 'personal', isRequired: false, sortOrder: 9, category: 'דתי' },
    ]

    const createdEvents = []
    for (const eventData of events) {
      const existing = await remult.repo(Event).findFirst({ description: eventData.description })
      if (!existing) {
        const event = remult.repo(Event).create(eventData)
        await event.save()
        createdEvents.push(event)
        console.log(`✓ Event '${eventData.description}' created`)
      } else {
        createdEvents.push(existing)
        console.log(`- Event '${eventData.description}' already exists`)
      }
    }

    // Create note types
    console.log('\n--- Creating Note Types ---')
    const noteTypeNames = [
      'הערות',
      'הקשר לישיבה',
      'זיהוי אישי',
      'מקורבים',
      'סדרי עדיפויות',
      'פרוייקט חיים',
      'קטגורית תורן',
      'ריגושים',
      'שייכות מגזרית',
      'תחביבים אישיים'
    ]

    const createdNoteTypes = []
    for (let i = 0; i < noteTypeNames.length; i++) {
      const name = noteTypeNames[i]
      const existing = await remult.repo(NoteType).findFirst({ name })
      if (!existing) {
        const noteType = remult.repo(NoteType).create({
          name,
          sortOrder: i,
          isActive: true
        })
        await remult.repo(NoteType).save(noteType)
        createdNoteTypes.push(noteType)
        console.log(`✓ Note type '${name}' created`)
      } else {
        createdNoteTypes.push(existing)
        console.log(`- Note type '${name}' already exists`)
      }
    }

    // Create organizations with places
    // Note: placeId is temporary and should be updated with real Google Place IDs later
    console.log('\n--- Creating Organizations ---')
    const organizationsData = [
      {
        name: 'Donors',
        address: 'New York',
        city: 'New York',
        state: 'New York',
        stateCode: 'NY',
        countryCode: 'US',
        registrationNumber: "1"
      },
      {
        name: 'Ojc',
        address: '40 Wall Street, 36th Floor, Suite 3602, New York, NY 10005',
        city: 'New York',
        state: 'New York',
        stateCode: 'NY',
        postcode: '10005',
        countryCode: 'US',
        registrationNumber: "2"
      },
      {
        name: 'Pledger',
        address: 'San Francisco, CA',
        city: 'San Francisco',
        state: 'California',
        stateCode: 'CA',
        countryCode: 'US',
        registrationNumber: "3"
      },
      {
        name: 'Friends Of Mosdot Goor',
        address: '1310 48th Street, Brooklyn, NY',
        city: 'Brooklyn',
        state: 'New York',
        stateCode: 'NY',
        countryCode: 'US',
        registrationNumber: "4"
      },
      {
        name: 'West Coast Vaad HaChesed',
        address: '7220 Beverly Blvd, Suite 208, Los Angeles, CA 90036',
        city: 'Los Angeles',
        state: 'California',
        stateCode: 'CA',
        postcode: '90036',
        countryCode: 'US',
        registrationNumber: "5"
      },
      {
        name: 'Schwab Charitable',
        address: '211 Main Street, San Francisco, CA 94105',
        city: 'San Francisco',
        state: 'California',
        stateCode: 'CA',
        postcode: '94105',
        countryCode: 'US',
        registrationNumber: "6"
      },
      {
        name: 'Nadven',
        address: 'New York',
        city: 'New York',
        state: 'New York',
        stateCode: 'NY',
        countryCode: 'US',
        registrationNumber: "7"
      },
      {
        name: 'Fidelity',
        address: '67 West Street, Unit 2, Medfield, MA 02052',
        city: 'Medfield',
        state: 'Massachusetts',
        stateCode: 'MA',
        postcode: '02052',
        countryCode: 'US',
        registrationNumber: "8"
      },
      {
        name: 'DAF giving 360',
        address: '211 Main Street, San Francisco, CA 94105',
        city: 'San Francisco',
        state: 'California',
        stateCode: 'CA',
        postcode: '94105',
        countryCode: 'US',
        registrationNumber: "9"
      }
    ]

    const createdOrganizations = []
    for (const orgData of organizationsData) {
      const existing = await remult.repo(Organization).findFirst({ registrationNumber: orgData.registrationNumber })
      if (!existing) {
        // Find or create the country
        const country = await findOrCreateCountry(orgData.countryCode)

        // Create place for organization
        // Using temporary placeId - should be replaced with real Google Place ID
        const tempPlaceId = `temp-org-${orgData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`

        // Check if place already exists by checking fullAddress to avoid duplicates
        let place = await remult.repo(Place).findFirst({
          fullAddress: orgData.address,
          city: orgData.city
        })

        if (!place) {
          place = remult.repo(Place).create({
            placeId: tempPlaceId,
            fullAddress: orgData.address,
            city: orgData.city,
            state: orgData.state,
            postcode: orgData.postcode,
            countryId: country?.id
          })
          await remult.repo(Place).save(place)
        }

        // Create organization and link to place.id (UUID, not Google placeId)
        const organization = remult.repo(Organization).create({
          name: orgData.name,
          placeId: place.id,  // This is the UUID (place.id), not the Google placeId
          currency: country?.currencyId || 'USD',
          isActive: true
        })
        await organization.save()
        createdOrganizations.push(organization)
        console.log(`✓ ${orgData.name} (${orgData.city}, ${orgData.stateCode})`)
      } else {
        createdOrganizations.push(existing)
        console.log(`- ${orgData.name} (already exists)`)
      }
    }

    // Create users
    console.log('\n--- Creating Users ---')
    const userData = [
      { name: 'אדמין', admin: true, commission: 0, password: '123456' },
      { name: 'ראש ישיבה', donator: true, commission: 0, password: '123456' },
      { name: 'משה ראובן', donator: true, commission: 5, password: '123456' },
      { name: 'יוסף חיים', donator: true, commission: 0, password: '123456' },
      { name: 'אברהם פסח', donator: true, commission: 0, password: '123456' },
      { name: 'שלמה', donator: true, commission: 0, password: '123456' },
      { name: 'יעקב', admin: true, commission: 0, password: '123456' }
    ]

    let admin: User | undefined
    for (const userInfo of userData) {
      let user = await remult.repo(User).findFirst({ name: userInfo.name })
      if (!user) {
        user = remult.repo(User).create({
          name: userInfo.name,
          admin: userInfo.admin || false,
          donator: userInfo.donator || false,
          commission: userInfo.commission,
          disabled: false
        })
        await user.hashAndSetPassword(userInfo.password)
        await user.save()
        console.log(`✓ User '${userInfo.name}' created with commission ${userInfo.commission}%`)
      } else {
        // Update existing user with commission
        user.commission = userInfo.commission
        if (userInfo.admin) user.admin = true
        if (userInfo.donator) user.donator = true
        await user.save()
        console.log(`- User '${userInfo.name}' updated with commission ${userInfo.commission}%`)
      }

      // Keep reference to admin user
      if (userInfo.name === 'אדמין') {
        admin = user
      }
    }

    // Create banks with places
    // Note: placeId is temporary and should be updated with real Google Place IDs later
    console.log('\n--- Creating Banks ---')
    const banksData = [
      { name: 'AmeriCU Credit Union', state: 'New York', stateHe: 'ניו יורק', countryCode: 'US' },
      { name: 'Andrews FCU', state: 'Maryland', stateHe: 'מרילנד', countryCode: 'US' },
      { name: 'Armed Forces Bank', state: 'Kansas', stateHe: 'קנזס', countryCode: 'US' },
      { name: 'Banco Popular', state: 'Puerto Rico/New York', stateHe: 'פוארטו ריקו/ניו יורק', countryCode: 'US' },
      { name: 'Bank of America', state: 'North Carolina', stateHe: 'צפון קרוליינה', countryCode: 'US' },
      { name: 'Bank of Guam', state: 'Guam', stateHe: 'גואם', countryCode: 'US' },
      { name: 'Bank of Hawaii', state: 'Hawaii', stateHe: 'הוואי', countryCode: 'US' },
      { name: 'Bank of Pensacola', state: 'Florida', stateHe: 'פלורידה', countryCode: 'US' },
      { name: 'Barksdale FCU', state: 'Louisiana', stateHe: 'לואיזיאנה', countryCode: 'US' },
      { name: 'Blue FCU', state: 'Colorado/Wyoming', stateHe: 'קולורדו/ויומינג', countryCode: 'US' },
      { name: 'Border FCU', state: 'Texas', stateHe: 'טקסס', countryCode: 'US' },
      { name: 'Broadway Bank', state: 'Texas', stateHe: 'טקסס', countryCode: 'US' },
      { name: 'CBC FCU', state: 'Texas', stateHe: 'טקסס', countryCode: 'US' },
      { name: 'Cedar Point FCU', state: 'Maryland', stateHe: 'מרילנד', countryCode: 'US' },
      { name: 'Central Coast FCU', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'Central National Bank & Trust', state: 'Oklahoma', stateHe: 'אוקלהומה', countryCode: 'US' },
      { name: 'Citizens National Bank', state: 'Massachusetts', stateHe: 'מסצ\'וסטס', countryCode: 'US' },
      { name: 'City National Bank', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'Congressional FCU', state: 'Virginia/D.C.', stateHe: 'וירג\'יניה/וושינגטון די.סי.', countryCode: 'US' },
      { name: 'CPM FCU', state: 'South Carolina', stateHe: 'דרום קרוליינה', countryCode: 'US' },
      { name: 'Eagle Bank', state: 'Maryland', stateHe: 'מרילנד', countryCode: 'US' },
      { name: 'Eglin FCU', state: 'Florida', stateHe: 'פלורידה', countryCode: 'US' },
      { name: 'ENT CU', state: 'Colorado', stateHe: 'קולורדו', countryCode: 'US' },
      { name: 'Fifth Third Bank', state: 'Ohio', stateHe: 'אוהיו', countryCode: 'US' },
      { name: 'First Arkansas Bank & Trust', state: 'Arkansas', stateHe: 'ארקנסו', countryCode: 'US' },
      { name: 'First Citizens Bank & Trust Co.', state: 'North Carolina', stateHe: 'צפון קרוליינה', countryCode: 'US' },
      { name: 'First Hawaiian Bank', state: 'Hawaii', stateHe: 'הוואי', countryCode: 'US' },
      { name: 'First National Bank Alaska', state: 'Alaska', stateHe: 'אלסקה', countryCode: 'US' },
      { name: 'First National Bank of Fort Smith', state: 'Arkansas', stateHe: 'ארקנסו', countryCode: 'US' },
      { name: 'First Savings Bank', state: 'South Dakota', stateHe: 'דרום דקוטה', countryCode: 'US' },
      { name: 'First Tennessee Bank', state: 'Tennessee', stateHe: 'טנסי', countryCode: 'US' },
      { name: 'FNB Community Bank', state: 'Multiple Locations', stateHe: 'מוסדות רבים', countryCode: 'US' },
      { name: 'FNBT.Com Bank', state: 'Florida', stateHe: 'פלורידה', countryCode: 'US' },
      { name: 'Foothills Credit Union', state: 'Colorado', stateHe: 'קולורדו', countryCode: 'US' },
      { name: 'Fort Hood NB', state: 'Texas', stateHe: 'טקסס', countryCode: 'US' },
      { name: 'Fort Sill NB', state: 'Oklahoma', stateHe: 'אוקלהומה', countryCode: 'US' },
      { name: 'Freestar Financial CU', state: 'Michigan', stateHe: 'מישיגן', countryCode: 'US' },
      { name: 'Frontwave CU', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'Great Western Bank', state: 'South Dakota', stateHe: 'דרום דקוטה', countryCode: 'US' },
      { name: 'Hancock Bank', state: 'Mississippi', stateHe: 'מיסיסיפי', countryCode: 'US' },
      { name: 'Hanscom FCU', state: 'Massachusetts', stateHe: 'מסצ\'וסטס', countryCode: 'US' },
      { name: 'Intrust Bank', state: 'Kansas', stateHe: 'קנזס', countryCode: 'US' },
      { name: 'J.P. Morgan Chase Bank', state: 'New York', stateHe: 'ניו יורק', countryCode: 'US' },
      { name: 'Kitsap Credit Union', state: 'Washington', stateHe: 'וושינגטון', countryCode: 'US' },
      { name: 'Lakehurst Naval FCU', state: 'New Jersey', stateHe: 'ניו ג\'רזי', countryCode: 'US' },
      { name: 'Langley FCU', state: 'Virginia', stateHe: 'וירג\'יניה', countryCode: 'US' },
      { name: 'Magnolia FCU', state: 'Mississippi', stateHe: 'מיסיסיפי', countryCode: 'US' },
      { name: 'Marine Federal CU', state: 'North Carolina', stateHe: 'צפון קרוליינה', countryCode: 'US' },
      { name: 'National Institutes of Health FCU', state: 'Maryland', stateHe: 'מרילנד', countryCode: 'US' },
      { name: 'Navy FCU', state: 'Virginia', stateHe: 'וירג\'יניה', countryCode: 'US' },
      { name: 'NBC Oklahoma', state: 'Oklahoma', stateHe: 'אוקלהומה', countryCode: 'US' },
      { name: 'New Mexico Bank & Trust', state: 'New Mexico', stateHe: 'ניו מקסיקו', countryCode: 'US' },
      { name: 'North Star CCU', state: 'North Dakota', stateHe: 'צפון דקוטה', countryCode: 'US' },
      { name: 'Nymeo FCU', state: 'Maryland', stateHe: 'מרילנד', countryCode: 'US' },
      { name: 'Otero FCU', state: 'New Mexico', stateHe: 'ניו מקסיקו', countryCode: 'US' },
      { name: 'Pen Air FCU', state: 'Florida', stateHe: 'פלורידה', countryCode: 'US' },
      { name: 'Pentagon Federal Credit Union', state: 'Virginia', stateHe: 'וירג\'יניה', countryCode: 'US' },
      { name: 'Regions Bank', state: 'Alabama', stateHe: 'אלבמה', countryCode: 'US' },
      { name: 'RIA FCU', state: 'Iowa', stateHe: 'איווה', countryCode: 'US' },
      { name: 'Robins Financial Credit Union', state: 'Georgia', stateHe: 'ג\'ורג\'יה', countryCode: 'US' },
      { name: 'Royal Bank of Canada', state: 'Canada', stateHe: 'קנדה', countryCode: 'CA' },
      { name: 'Sabine State Bank & Trust', state: 'Louisiana', stateHe: 'לואיזיאנה', countryCode: 'US' },
      { name: 'SAC Federal Credit Union', state: 'Nebraska', stateHe: 'נברסקה', countryCode: 'US' },
      { name: 'Safe Credit Union', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'Service CU', state: 'New Hampshire', stateHe: 'ניו המפשייר', countryCode: 'US' },
      { name: 'Sierra Central CU', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'Sioux Empire FCU', state: 'South Dakota', stateHe: 'דרום דקוטה', countryCode: 'US' },
      { name: 'State Bank of Southern Utah', state: 'Utah', stateHe: 'יוטה', countryCode: 'US' },
      { name: 'Suntrust Bank', state: 'Georgia', stateHe: 'ג\'ורג\'יה', countryCode: 'US' },
      { name: 'Synovus Bank', state: 'Georgia', stateHe: 'ג\'ורג\'יה', countryCode: 'US' },
      { name: 'TD Bank', state: 'New Jersey', stateHe: 'ניו ג\'רזי', countryCode: 'US' },
      { name: 'The Heritage Bank', state: 'Georgia', stateHe: 'ג\'ורג\'יה', countryCode: 'US' },
      { name: 'The Peoples Bank', state: 'Multiple Locations', stateHe: 'מוסדות רבים', countryCode: 'US' },
      { name: 'Trustmark National Bank', state: 'Mississippi', stateHe: 'מיסיסיפי', countryCode: 'US' },
      { name: 'Tyndall FCU', state: 'Florida', stateHe: 'פלורידה', countryCode: 'US' },
      { name: 'UMB Bank', state: 'Missouri', stateHe: 'מיזורי', countryCode: 'US' },
      { name: 'United Bank', state: 'West Virginia', stateHe: 'וירג\'יניה המערבית', countryCode: 'US' },
      { name: 'US Bank', state: 'Minnesota', stateHe: 'מינסוטה', countryCode: 'US' },
      { name: 'Washington Federal', state: 'Washington', stateHe: 'וושינגטון', countryCode: 'US' },
      { name: 'Wells Fargo', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'White Sands FCU', state: 'New Mexico', stateHe: 'ניו מקסיקו', countryCode: 'US' }
    ]

    const createdBanks = []
    for (const bankData of banksData) {
      const existing = await remult.repo(Bank).findFirst({ name: bankData.name })
      if (!existing) {
        // Find or create the country
        const country = await findOrCreateCountry(bankData.countryCode)

        // Create place for bank
        // Using temporary placeId - should be replaced with real Google Place ID
        const tempPlaceId = `temp-bank-${bankData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
        const fullAddress = `${bankData.state}, ${country?.nameEn || bankData.countryCode}`

        // Check if place already exists by checking fullAddress and city to avoid duplicates
        let place = await remult.repo(Place).findFirst({
          fullAddress: fullAddress,
          city: bankData.state
        })

        if (!place) {
          place = remult.repo(Place).create({
            placeId: tempPlaceId,
            fullAddress: fullAddress,
            city: bankData.state,
            state: bankData.state,
            countryId: country?.id
          })
          await remult.repo(Place).save(place)
        }

        // Create bank and link to place.id (UUID, not Google placeId)
        const bank = remult.repo(Bank).create({
          name: bankData.name,
          placeId: place.id,  // This is the UUID (place.id), not the Google placeId
          currency: country?.currencyId || 'USD',
          isActive: true
        })
        await bank.save()
        createdBanks.push(bank)
        console.log(`✓ ${bankData.name} (${bankData.stateHe})`)
      } else {
        createdBanks.push(existing)
        console.log(`- ${bankData.name} (already exists)`)
      }
    }

    // Create letter titles
    const letterTitlesResult = await seedLetterTitles()

    // Create blessing book types
    const blessingBookTypesResult = await seedBlessingBookTypes()

    console.log('\n=== Infrastructure Seeding Completed Successfully! ===')
    console.log(`Created:`)
    console.log(`- ${countriesResult.total} countries (${countriesResult.created} created, ${countriesResult.updated} updated)`)
    console.log(`- ${createdMethods.length} donation methods`)
    console.log(`- ${createdAddressTypes.length} donor address types`)
    console.log(`- ${createdEvents.length} events`)
    console.log(`- ${createdNoteTypes.length} note types`)
    console.log(`- ${createdOrganizations.length} organizations`)
    console.log(`- ${userData.length} users`)
    console.log(`- ${createdBanks.length} banks`)
    console.log(`- ${letterTitlesResult.total} letter titles (${letterTitlesResult.prefix} prefix, ${letterTitlesResult.suffix} suffix)`)
    console.log(`- ${blessingBookTypesResult.total} blessing book types (${blessingBookTypesResult.created} created, ${blessingBookTypesResult.existing} existing)`)

  } catch (error) {
    console.error('Error seeding infrastructure:', error)
    throw error
  }
}

// אם רצים את הקובץ ישירות - רק בסביבת Node.js
if (typeof module !== 'undefined' && require.main === module) {
  const dataProvider = createPostgresConnection({
    // configuration: 'heroku',
    sslInDev: !(process.env['DEV_MODE'] === 'DEV')
  })

  withRemult(async () => {
    await seedInfrastructure()
  }, {
    dataProvider,
    entities
  })
    .then(() => {
      console.log('\nDone!')
      process.exit(0)
    })
    .catch(err => {
      console.error('\nError:', err)
      process.exit(1)
    })
}
