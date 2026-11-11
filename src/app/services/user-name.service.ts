import { formatDate } from '@angular/common';
import { Injectable } from '@angular/core';
import { getEntityRef, remult } from 'remult';
import { User } from '../../shared/entity/user';
import { AuditedRow } from '../../shared/utils/audit-fields';

/**
 * שלב ג׳ 9.1 - שם משתמש לפי id, ונוסח החתימה "הוזן / עודכן ע"י" - במקום אחד,
 * לחתימה שבכרטיסים (app-audit-stamp) ולטולטיפ של שורות בתוך כרטיס.
 */
@Injectable({
  providedIn: 'root'
})
export class UserNameService {
  private names = new Map<string, string>();
  private loading?: Promise<void>;

  load(): Promise<void> {
    if (!this.loading) {
      this.loading = remult.repo(User).find().then(users => {
        this.names = new Map(users.map(u => [u.id, u.name]));
      });
    }
    return this.loading;
  }

  name(id: string | undefined): string {
    return (id && this.names.get(id)) || '';
  }

  /**
   * "הוזן ע"י X · תאריך | עודכן ע"י Y · תאריך".
   * רשומה ישנה (לפני 9.1) - בלי שם, רק התאריכים: "הוזן · תאריך | עודכן · תאריך".
   * רשומה חדשה שעוד לא נשמרה - ''.
   */
  stampText(row: AuditedRow | null | undefined): string {
    if (!row || getEntityRef(row as any, false)?.isNew()) return '';
    const when = (d?: Date) => d ? ` · ${formatDate(d, 'dd/MM/yyyy HH:mm', 'en-US')}` : '';
    const part = (label: string, id?: string, date?: Date) => {
      const who = this.name(id);
      return who || date ? `${label}${who ? ` ע"י ${who}` : ''}${when(date)}` : '';
    };
    return [
      part('הוזן', row.createdById, row.createdDate || row.createdAt),
      part('עודכן', row.updatedById, row.updatedDate || row.updatedAt)
    ].filter(Boolean).join(' | ');
  }
}
