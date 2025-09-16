import { remult } from 'remult';
import { Country } from '../shared/entity/country';

export async function seedCountries() {
  const repo = remult.repo(Country);

  const countries = [
    // מדינות עיקריות בעברית
    { name: 'ישראל', nameEn: 'Israel', code: 'IL' },
    { name: 'ארצות הברית', nameEn: 'United States', code: 'US' },
    { name: 'בריטניה', nameEn: 'United Kingdom', code: 'GB' },
    { name: 'קנדה', nameEn: 'Canada', code: 'CA' },
    { name: 'אוסטרליה', nameEn: 'Australia', code: 'AU' },
    { name: 'צרפת', nameEn: 'France', code: 'FR' },
    { name: 'גרמניה', nameEn: 'Germany', code: 'DE' },
    { name: 'איטליה', nameEn: 'Italy', code: 'IT' },
    { name: 'ספרד', nameEn: 'Spain', code: 'ES' },
    { name: 'הולנד', nameEn: 'Netherlands', code: 'NL' },
    { name: 'בלגיה', nameEn: 'Belgium', code: 'BE' },
    { name: 'שוויץ', nameEn: 'Switzerland', code: 'CH' },
    { name: 'אוסטריה', nameEn: 'Austria', code: 'AT' },
    { name: 'דנמרק', nameEn: 'Denmark', code: 'DK' },
    { name: 'שוודיה', nameEn: 'Sweden', code: 'SE' },
    { name: 'נורווגיה', nameEn: 'Norway', code: 'NO' },
    { name: 'פינלנד', nameEn: 'Finland', code: 'FI' },
    { name: 'פולין', nameEn: 'Poland', code: 'PL' },
    { name: 'הונגריה', nameEn: 'Hungary', code: 'HU' },
    { name: 'צ\'כיה', nameEn: 'Czech Republic', code: 'CZ' },
    { name: 'רומניה', nameEn: 'Romania', code: 'RO' },
    { name: 'בולגריה', nameEn: 'Bulgaria', code: 'BG' },
    { name: 'יוון', nameEn: 'Greece', code: 'GR' },
    { name: 'טורקיה', nameEn: 'Turkey', code: 'TR' },
    { name: 'רוסיה', nameEn: 'Russia', code: 'RU' },
    { name: 'אוקראינה', nameEn: 'Ukraine', code: 'UA' },
    { name: 'פורטוגל', nameEn: 'Portugal', code: 'PT' },
    { name: 'אירלנד', nameEn: 'Ireland', code: 'IE' },
    { name: 'איסלנד', nameEn: 'Iceland', code: 'IS' },
    { name: 'לוקסמבורג', nameEn: 'Luxembourg', code: 'LU' },

    // אמריקה הלטינית
    { name: 'ברזיל', nameEn: 'Brazil', code: 'BR' },
    { name: 'ארגנטינה', nameEn: 'Argentina', code: 'AR' },
    { name: 'מקסיקו', nameEn: 'Mexico', code: 'MX' },
    { name: 'צ\'ילה', nameEn: 'Chile', code: 'CL' },
    { name: 'קולומביה', nameEn: 'Colombia', code: 'CO' },
    { name: 'פרו', nameEn: 'Peru', code: 'PE' },
    { name: 'ונצואלה', nameEn: 'Venezuela', code: 'VE' },
    { name: 'אורוגוואי', nameEn: 'Uruguay', code: 'UY' },
    { name: 'פנמה', nameEn: 'Panama', code: 'PA' },
    { name: 'קוסטה ריקה', nameEn: 'Costa Rica', code: 'CR' },

    // אסיה
    { name: 'סין', nameEn: 'China', code: 'CN' },
    { name: 'יפן', nameEn: 'Japan', code: 'JP' },
    { name: 'הודו', nameEn: 'India', code: 'IN' },
    { name: 'קוריאה הדרומית', nameEn: 'South Korea', code: 'KR' },
    { name: 'תאילנד', nameEn: 'Thailand', code: 'TH' },
    { name: 'סינגפור', nameEn: 'Singapore', code: 'SG' },
    { name: 'מלזיה', nameEn: 'Malaysia', code: 'MY' },
    { name: 'אינדונזיה', nameEn: 'Indonesia', code: 'ID' },
    { name: 'פיליפינים', nameEn: 'Philippines', code: 'PH' },
    { name: 'וייטנאם', nameEn: 'Vietnam', code: 'VN' },
    { name: 'הונג קונג', nameEn: 'Hong Kong', code: 'HK' },
    { name: 'טייוואן', nameEn: 'Taiwan', code: 'TW' },

    // המזרח התיכון
    { name: 'איחוד האמירויות', nameEn: 'United Arab Emirates', code: 'AE' },
    { name: 'ערב הסעודית', nameEn: 'Saudi Arabia', code: 'SA' },
    { name: 'ירדן', nameEn: 'Jordan', code: 'JO' },
    { name: 'מצרים', nameEn: 'Egypt', code: 'EG' },
    { name: 'לבנון', nameEn: 'Lebanon', code: 'LB' },
    { name: 'מרוקו', nameEn: 'Morocco', code: 'MA' },
    { name: 'תוניסיה', nameEn: 'Tunisia', code: 'TN' },
    { name: 'בחריין', nameEn: 'Bahrain', code: 'BH' },
    { name: 'כווית', nameEn: 'Kuwait', code: 'KW' },
    { name: 'קטאר', nameEn: 'Qatar', code: 'QA' },
    { name: 'עומאן', nameEn: 'Oman', code: 'OM' },
    { name: 'קפריסין', nameEn: 'Cyprus', code: 'CY' },
    { name: 'גאורגיה', nameEn: 'Georgia', code: 'GE' },
    { name: 'אזרבייג\'ן', nameEn: 'Azerbaijan', code: 'AZ' },

    // אפריקה
    { name: 'דרום אפריקה', nameEn: 'South Africa', code: 'ZA' },
    { name: 'ניגריה', nameEn: 'Nigeria', code: 'NG' },
    { name: 'קניה', nameEn: 'Kenya', code: 'KE' },
    { name: 'אתיופיה', nameEn: 'Ethiopia', code: 'ET' },
    { name: 'אוגנדה', nameEn: 'Uganda', code: 'UG' },
    { name: 'טנזניה', nameEn: 'Tanzania', code: 'TZ' },
    { name: 'זימבבואה', nameEn: 'Zimbabwe', code: 'ZW' },
    { name: 'גאנה', nameEn: 'Ghana', code: 'GH' },

    // אוקיאניה
    { name: 'ניו זילנד', nameEn: 'New Zealand', code: 'NZ' },

    // מדינות נוספות
    { name: 'מלטה', nameEn: 'Malta', code: 'MT' },
    { name: 'אסטוניה', nameEn: 'Estonia', code: 'EE' },
    { name: 'לטביה', nameEn: 'Latvia', code: 'LV' },
    { name: 'ליטא', nameEn: 'Lithuania', code: 'LT' },
    { name: 'סלובקיה', nameEn: 'Slovakia', code: 'SK' },
    { name: 'סלובניה', nameEn: 'Slovenia', code: 'SI' },
    { name: 'קרואטיה', nameEn: 'Croatia', code: 'HR' },
    { name: 'סרביה', nameEn: 'Serbia', code: 'RS' },
    { name: 'אלבניה', nameEn: 'Albania', code: 'AL' },
    { name: 'מקדוניה הצפונית', nameEn: 'North Macedonia', code: 'MK' },
    { name: 'מולדובה', nameEn: 'Moldova', code: 'MD' },
    { name: 'בלארוס', nameEn: 'Belarus', code: 'BY' },
    { name: 'ארמניה', nameEn: 'Armenia', code: 'AM' },
    { name: 'קזחסטן', nameEn: 'Kazakhstan', code: 'KZ' },
    { name: 'פקיסטן', nameEn: 'Pakistan', code: 'PK' },
    { name: 'בנגלדש', nameEn: 'Bangladesh', code: 'BD' },
    { name: 'סרי לנקה', nameEn: 'Sri Lanka', code: 'LK' },
    { name: 'נפאל', nameEn: 'Nepal', code: 'NP' },
    { name: 'מיאנמר', nameEn: 'Myanmar', code: 'MM' },
    { name: 'קמבודיה', nameEn: 'Cambodia', code: 'KH' },
    { name: 'מונגוליה', nameEn: 'Mongolia', code: 'MN' },
    { name: 'אפגניסטן', nameEn: 'Afghanistan', code: 'AF' },
    { name: 'עיראק', nameEn: 'Iraq', code: 'IQ' },
    { name: 'איראן', nameEn: 'Iran', code: 'IR' },
    { name: 'סוריה', nameEn: 'Syria', code: 'SY' },
    { name: 'תימן', nameEn: 'Yemen', code: 'YE' },
    { name: 'אלג\'יריה', nameEn: 'Algeria', code: 'DZ' },
    { name: 'לוב', nameEn: 'Libya', code: 'LY' },
    { name: 'סודן', nameEn: 'Sudan', code: 'SD' },
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