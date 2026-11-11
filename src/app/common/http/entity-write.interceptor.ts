import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Entities from '../../../shared/entity';
import { ANY_ENTITY, announceEntityChange, entityKeyOf } from '../entity-changes';

/**
 * שלב ג׳ 9.4 - כל כתיבה שהצליחה מול השרת מודיעה על עצמה (common/entity-changes).
 *
 * - יישות (/api/<key>): POST (הוספה), PUT (עדכון), DELETE - מודיע על אותה יישות.
 *   POST שהוא קריאה (__action=get/count/...) - לא כתיבה.
 * - מתודת יישות (/api/<key>/<method>, למשל reminder.complete) - אותה יישות.
 * - מתודת קונטרולר (/api/<controller>/<method>) שכותבת נתונים - מהרשימה
 *   הסגורה למטה. היישות לא ידועה, ולכן מודיע על כולן. רשימה ולא לפי שם הפועל:
 *   merge (הגדרות משתמש) ו-convertGregorianToHebrew היו מרעננים כל מסך פתוח.
 *   מתודת קונטרולר חדשה שכותבת - מתווספת כאן.
 */
const READ_ACTION = /__action=(get|count|groupBy|aggregate|liveQuery|endLiveQuery|query)/i;
const WRITING_CONTROLLER_METHODS = new Set([
  'assignReceiptNumber',                                   // DonationController
  'assignGiftToDonors',                                    // DonorGiftController
  'deleteFile',                                            // FileController
  'createPayment', 'updatePayment', 'deletePayment', 'processExcelTransactions', // PaymentController
  'createTargetAudience', 'updateTargetAudience', 'deleteTargetAudience',
  'addDonorsToTargetAudience', 'removeDonorsFromTargetAudience', 'refreshTargetAudienceByPolygon' // TargetAudienceController
]);

@Injectable()
export class EntityWriteInterceptor implements HttpInterceptor {
  private entityKeys?: Set<string>;

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const key = this.changedKey(req);
    if (!key) return next.handle(req);
    return next.handle(req).pipe(
      tap(event => { if (event instanceof HttpResponse && event.ok) announceEntityChange(key); })
    );
  }

  /** מה נכתב בבקשה הזו - מפתח יישות, ANY_ENTITY, או undefined לקריאה. */
  private changedKey(req: HttpRequest<unknown>): string | undefined {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return undefined;
    const match = req.url.match(/\/api\/([^?#]+)/);
    if (!match || READ_ACTION.test(req.url)) return undefined;
    const segments = match[1].split('/');
    if (this.keys().has(segments[0])) return segments[0];
    const method = segments[segments.length - 1];
    return req.method === 'POST' && segments.length > 1 && WRITING_CONTROLLER_METHODS.has(method) ? ANY_ENTITY : undefined;
  }

  private keys(): Set<string> {
    if (!this.entityKeys) {
      this.entityKeys = new Set();
      for (const e of Object.values(Entities)) {
        if (typeof e !== 'function') continue;
        try { this.entityKeys.add(entityKeyOf(e as any)); } catch { /* לא יישות */ }
      }
    }
    return this.entityKeys;
  }
}
