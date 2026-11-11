import { ClassType, remult } from 'remult'
import { Observable, Subject } from 'rxjs'
import { debounceTime, filter, map } from 'rxjs/operators'

/**
 * שלב ג׳ 9.4 (Z17) - רענון אוטומטי בין המסכים אחרי עדכון, במקום אחד.
 *
 * זום 24.08 (3:16): "עשיתי עדכון תרומה, סגרתי את זה, שירענן את המסך שהיה פה".
 * חזר שלוש פעמים בזום - אחרי הוספת תנועה, מחיקת שותף ועדכון תרומה.
 *
 * מי מודיע: entity-write.interceptor - כל כתיבה שהצליחה (שמירה, הוספה, מחיקה)
 * מכל מקום בפלטפורמה, בלי שהכרטיס צריך לזכור להודיע.
 * מי מאזין: TableState (refreshOn) - כל רשימה מצהירה על אילו יישויות היא
 * מציגה, ומתרעננת במקום (אותו עמוד, אותו מקום גלילה).
 *
 * ערוץ ברמת המודול ולא שירות: TableState אינו מוזרק, ולכן אינו רואה DI.
 */

/** כל יישות - מתאים לכל מאזין (כתיבה דרך מתודת שרת, שהיישות שלה לא ידועה). */
export const ANY_ENTITY = '*'

const changes$ = new Subject<string>()

export function entityKeyOf(entity: ClassType<any>): string {
  return remult.repo(entity).metadata.key
}

/** הודעה שיישות נכתבה. key - מפתח היישות (Donation -> 'donations') או ANY_ENTITY. */
export function announceEntityChange(key: string): void {
  changes$.next(key)
}

/**
 * שינויים באחת מהיישויות האלה. כמה כתיבות ברצף (שמירת כרטיס עם שורות-בן)
 * מתאחדות לרענון אחד.
 */
export function entityChanges(entities: ClassType<any>[]): Observable<void> {
  const keys = new Set(entities.map(entityKeyOf))
  return changes$.pipe(
    filter(key => key === ANY_ENTITY || keys.has(key)),
    debounceTime(300),
    map(() => undefined)
  )
}
