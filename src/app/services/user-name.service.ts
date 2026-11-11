import { formatDate } from '@angular/common';
import { Injectable } from '@angular/core';
import { remult } from 'remult';
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

  /** "הוזן ע"י X · תאריך | עודכן ע"י Y · תאריך". רשומה בלי שמות - ''. */
  stampText(row: AuditedRow | null | undefined): string {
    if (!row) return '';
    const when = (d?: Date) => d ? ` · ${formatDate(d, 'dd/MM/yyyy HH:mm', 'en-US')}` : '';
    const created = this.name(row.createdById);
    const updated = this.name(row.updatedById);
    return [
      created ? `הוזן ע"י ${created}${when(row.createdDate || row.createdAt)}` : '',
      updated ? `עודכן ע"י ${updated}${when(row.updatedDate || row.updatedAt)}` : ''
    ].filter(Boolean).join(' | ');
  }
}
