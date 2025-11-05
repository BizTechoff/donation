import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { I18nService } from '../../../i18n/i18n.service';
import { EmailController } from '../../../../shared/controllers/email.controller';
import { EmailRequest } from '../../../../shared/email.type';
import { remult } from 'remult';
import { Blessing } from '../../../../shared/entity/blessing';

export interface SendEmailModalArgs {
  to: string[];
  subject: string;
  htmlBody: string;
  from?: string;
  blessingId?: string;  // Optional: to update blessing record after sending
}

@DialogConfig({
  hasBackdrop: true,
  width: '900px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-send-email-modal',
  templateUrl: './send-email-modal.component.html',
  styleUrls: ['./send-email-modal.component.scss']
})
export class SendEmailModalComponent implements OnInit {
  args!: SendEmailModalArgs;

  from = '';
  to: string[] = [];
  subject = '';
  htmlBody = '';
  sending = false;

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<SendEmailModalComponent>,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.from = this.args.from || 'המערכת';
    this.to = [...this.args.to];
    this.subject = this.args.subject || '';
    this.htmlBody = this.args.htmlBody || '';
  }

  // Add email to the list
  addEmail() {
    const email = prompt('הזן כתובת אימייל:');
    if (email && email.trim()) {
      const trimmedEmail = email.trim();
      if (this.isValidEmail(trimmedEmail)) {
        if (!this.to.includes(trimmedEmail)) {
          this.to.push(trimmedEmail);
        } else {
          this.snackBar.open('כתובת האימייל כבר קיימת ברשימה', 'סגור', { duration: 3000 });
        }
      } else {
        this.snackBar.open('כתובת אימייל לא תקינה', 'סגור', { duration: 3000 });
      }
    }
  }

  // Remove email from the list
  removeEmail(index: number) {
    this.to.splice(index, 1);
  }

  // Validate email format
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Send the email
  async sendEmail() {
    if (this.to.length === 0) {
      this.snackBar.open('יש להזין לפחות כתובת אימייל אחת', 'סגור', { duration: 3000 });
      return;
    }

    if (!this.subject.trim()) {
      this.snackBar.open('יש למלא נושא', 'סגור', { duration: 3000 });
      return;
    }

    if (!this.htmlBody.trim()) {
      this.snackBar.open('יש למלא תוכן האימייל', 'סגור', { duration: 3000 });
      return;
    }

    this.sending = true;

    try {
      const emailRequest: EmailRequest = {
        emails: this.to,
        subject: this.subject,
        html: this.htmlBody
      };

      const response = await EmailController.sendCustomEmail(emailRequest);

      if (response.success) {
        // If blessing ID is provided, update the blessing record
        if (this.args.blessingId) {
          const blessingRepo = remult.repo(Blessing);
          const blessing = await blessingRepo.findId(this.args.blessingId);
          if (blessing) {
            blessing.isEmailSent = true;
            blessing.emailSentAt = new Date();
            await blessingRepo.save(blessing);
          }
        }

        this.snackBar.open('האימייל נשלח בהצלחה!', 'סגור', { duration: 3000 });
        this.dialogRef.close(true);
      } else {
        this.snackBar.open(`שגיאה בשליחת אימייל: ${response.errorText}`, 'סגור', { duration: 5000 });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      this.snackBar.open('שגיאה בשליחת אימייל', 'סגור', { duration: 3000 });
    } finally {
      this.sending = false;
    }
  }

  onClose() {
    this.dialogRef.close();
  }

  // Static method to open the modal
  static async open(args: SendEmailModalArgs) {
    return await openDialog(
      SendEmailModalComponent,
      (comp) => {
        comp.args = args;
      }
    );
  }
}
