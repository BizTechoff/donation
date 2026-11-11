import { Component, Input, OnInit } from '@angular/core';
import { AuditedRow } from '../../../shared/utils/audit-fields';
import { UserNameService } from '../../services/user-name.service';

/**
 * שלב ג׳ 9.1 - חתימה קטנה בכרטיס: "הוזן ע"י X · תאריך | עודכן ע"י Y · תאריך".
 * קומפוננטה אחת לכל הכרטיסים; הנוסח ב-UserNameService.stampText.
 * רשומה שנשמרה לפני 9.1 - בלי שם, ולכן בלי שורה.
 */
@Component({
  selector: 'app-audit-stamp',
  templateUrl: './audit-stamp.component.html',
  styleUrls: ['./audit-stamp.component.scss']
})
export class AuditStampComponent implements OnInit {
  @Input() row?: AuditedRow | null;

  constructor(private users: UserNameService) { }

  async ngOnInit() {
    await this.users.load();
  }

  get text(): string {
    return this.users.stampText(this.row);
  }
}
