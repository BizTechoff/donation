import { Directive, HostListener } from '@angular/core'

/**
 * number-wheel-guard.directive.ts
 *
 * סעיף 29 (חדש 11) - "גלגלת משנה סכום". בדפדפן, שדה <input type="number">
 * שנמצא בפוקוס מגיב לגלילת גלגלת ומעלה או מוריד את הערך. בטופס תרומה המשתמש
 * גולל כדי להגיע לשדה הבא, והסכום שכבר הוקלד משתנה בלי שהוא שם לב - נתון
 * כספי שנדרס בשקט.
 *
 * ההחלטה (ישראל / מוטי, סבב 20.10): השדה נשאר type="number" - המקלדת
 * המספרית בנייד, החיצים והוולידציה נשמרים - וה-wheel רק מוציא את הפוקוס.
 * אין preventDefault בכוונה: הדף ממשיך להיגלל כרגיל, רק הערך לא משתנה.
 *
 * דירקטיבה ולא טיפול בכל טופס: יש היום 21 שדות type="number" ב-11 תבניות,
 * והסלקטור פה הוא התג עצמו - input[type=number] - כך שכל שדה מספרי בפלטפורמה,
 * גם זה שייכתב מחר, מכוסה בלי לגעת באף תבנית. אפס שורות בקומפוננטות.
 *
 * מגבלה ידועה: Angular מתאים סלקטורים לפי התבנית הסטטית, ולכן שדה שמגדיר
 * [type] דינמית לא ייתפס. אין כזה היום בפלטפורמה.
 */
@Directive({
  selector: 'input[type=number]'
})
export class NumberWheelGuardDirective {

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    const input = event.target as HTMLInputElement | null
    // רק שדה בפוקוס מגיב ל-wheel מלכתחילה; גלילה מעל שדה שאינו בפוקוס לא
    // משנה דבר, ואין סיבה לגעת בו.
    if (input && document.activeElement === input) input.blur()
  }
}
