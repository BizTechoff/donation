import { Pipe, PipeTransform } from '@angular/core';
import { CountryCode } from 'libphonenumber-js/max';
import { DEFAULT_PHONE_COUNTRY, formatPhoneForDisplay } from '../../../shared/utils/phone-format';

/**
 * phone.pipe.ts
 *
 * סעיפים 1, 31 - המקום היחיד שמחליט איך נראה מספר טלפון ברשימה, בדוח,
 * בייצוא ובהדפסה. מקביל ל-amount.pipe של הסכומים.
 *
 * עד היום כל מסך הציג את המחרוזת הגולמית כפי שהוזנה, והרשימות הראו
 * "7188518962", "596-3284 845" ו-"052-652-6063" זה לצד זה.
 *
 * ההחלטה עצמה יושבת ב-shared/utils/phone-format.formatPhoneForDisplay -
 * אותה פונקציה שהקונטרול והמיגרציה משתמשים בה. הפייפ הוא עטיפה לתבניות
 * בלבד, ובכוונה אינו מחזיק לוגיקה משלו: שתי הגדרות של "איך נראה מספר"
 * הן בדיוק מה שיצר את הפער בין המסך ל-SQL.
 *
 * מספר שאינו תקין מוחזר כפי שהוא ולא נעלם - זה עדיף על שדה ריק, וכולל
 * ערכים שאינם מספרים כלל.
 *
 * שימוש: {{ phone | phone }}  ·  {{ phone | phone:'US' }}
 */
@Pipe({ name: 'phone' })
export class PhonePipe implements PipeTransform {
  transform(value: string | null | undefined, country: string = DEFAULT_PHONE_COUNTRY): string {
    const code = (country || '').trim().toUpperCase();
    return formatPhoneForDisplay(value, (code.length === 2 ? code : DEFAULT_PHONE_COUNTRY) as CountryCode);
  }
}
