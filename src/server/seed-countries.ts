import { remult } from 'remult';
import { Country } from '../shared/entity/country';

export async function seedCountries() {
  const repo = remult.repo(Country);

  const countries = [
    // מדינות עיקריות - מעבר לקידומות נכונות ומטבעות מעודכנות
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
    { name: 'הבאיטי', nameEn: 'Haiti', code: 'HT', phonePrefix: '+509', currency: 'HTG' },
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
  ];

  let created = 0;
  let updated = 0;

  for (const countryData of countries) {
    try {
      const existing = await repo.findFirst({ name: countryData.name });

      if (!existing) {
        const country = repo.create();
        country.name = countryData.name;
        country.nameEn = countryData.nameEn;
        country.code = countryData.code;
        country.phonePrefix = countryData.phonePrefix;
        country.currency = countryData.currency;
        country.isActive = true;
        await country.save();
        created++;
        console.log(`Created country: ${countryData.name}`);
      } else {
        // עדכון מדינה קיימת אם חסרים נתונים
        let needsUpdate = false;
        if (!existing.nameEn && countryData.nameEn) {
          existing.nameEn = countryData.nameEn;
          needsUpdate = true;
        }
        if (!existing.code && countryData.code) {
          existing.code = countryData.code;
          needsUpdate = true;
        }
        if (!existing.phonePrefix && countryData.phonePrefix) {
          existing.phonePrefix = countryData.phonePrefix;
          needsUpdate = true;
        }
        if (!existing.currency && countryData.currency) {
          existing.currency = countryData.currency;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await existing.save();
          updated++;
          console.log(`Updated country: ${countryData.name}`);
        }
      }
    } catch (error) {
      console.error(`Error processing country ${countryData.name}:`, error);
    }
  }

  console.log(`\n✅ Countries seeding completed!`);
  console.log(`   Created: ${created} new countries`);
  console.log(`   Updated: ${updated} existing countries`);
  console.log(`   Total countries in system: ${countries.length}`);

  return { created, updated, total: countries.length };
}

// אם רצים את הקובץ ישירות - רק בסביבת Node.js
if (typeof module !== 'undefined' && require.main === module) {
  seedCountries()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}