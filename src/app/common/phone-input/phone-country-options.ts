import { remult } from 'remult';
import { Country } from '../../../shared/entity/country';
import { PhoneCountryOption } from './phone-input.component';

/**
 * phone-country-options.ts - בניית רשימת המדינות לבוחר של app-phone-input.
 *
 * סעיפים 1, 31. המיפוי הזה היה כתוב בכרטיס התורם בלבד, וכשהקונטרול הוחל גם
 * על בנק, חברה, ארגון ואיש קשר הוא היה נדרש בחמישה מקומות. אותו סינון ואותו
 * מיון, חמש פעמים - בדיוק הסוג של כפילות שמביא לכך ששינוי אחד נשכח באחד
 * מהם.
 *
 * הרשימה מגיעה מיישות Country של הפלטפורמה ולא מ-libphonenumber: היא כבר
 * מחזיקה שם בעברית, קוד וקידומת, ואין סיבה להחזיק רשימה שנייה.
 *
 * מדינה בלי קוד דו-אותי מסוננת - בלעדיו אין דגל ואין פענוח.
 */
export function toPhoneCountryOptions(countries: Country[]): PhoneCountryOption[] {
  return (countries || [])
    .filter(c => (c.code || '').trim().length === 2)
    .map(c => ({ code: c.code, name: c.name, phonePrefix: c.phonePrefix }))
    .sort((a, b) => a.name.localeCompare(b.name, 'he'));
}

/**
 * אותה רשימה, למסך שאינו טוען מדינות ממילא.
 *
 * כרטיס התורם מקבל את המדינות בתוך טעינה מרוכזת ומשתמש ב-
 * toPhoneCountryOptions ישירות; בנק, חברה וארגון אינם טוענים אותן כלל,
 * ובשבילם זו שאילתה אחת קטנה ב-ngOnInit.
 */
export async function loadPhoneCountryOptions(): Promise<PhoneCountryOption[]> {
  return toPhoneCountryOptions(await remult.repo(Country).find());
}
