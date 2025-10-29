import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { Payment } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';

export interface PaymentDetailsModalArgs {
  paymentId: string; // Can be 'new' for new payment or payment ID
  donationId?: string; // Required for new payments
  amount?: number; // Optional pre-filled amount
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-payment-details-modal',
  templateUrl: './payment-details-modal.component.html',
  styleUrls: ['./payment-details-modal.component.scss']
})
export class PaymentDetailsModalComponent implements OnInit {
  args!: PaymentDetailsModalArgs;
  payment!: Payment;
  isNewPayment = false;
  loading = false;

  paymentRepo = remult.repo(Payment);

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<PaymentDetailsModalComponent>
  ) {}

  async ngOnInit() {
    await this.loadPayment();
  }

  async loadPayment() {
    this.loading = true;
    try {
      if (this.args.paymentId === 'new') {
        this.isNewPayment = true;
        this.payment = this.paymentRepo.create();

        if (this.args.donationId) {
          this.payment.donationId = this.args.donationId;
        }

        if (this.args.amount) {
          this.payment.amount = this.args.amount;
        }

        this.payment.paymentDate = new Date();
      } else {
        this.payment = await this.paymentRepo.findId(this.args.paymentId) || this.paymentRepo.create();
        this.isNewPayment = false;
      }
    } catch (error) {
      console.error('Error loading payment:', error);
      this.ui.error('שגיאה בטעינת פרטי התשלום');
    } finally {
      this.loading = false;
    }
  }

  async save() {
    try {
      // Validation
      if (!this.payment.donationId) {
        this.ui.error('חובה לציין תרומה');
        return;
      }

      if (!this.payment.amount || this.payment.amount <= 0) {
        this.ui.error('חובה לציין סכום תקין');
        return;
      }

      if (!this.payment.paymentDate) {
        this.ui.error('חובה לציין תאריך תשלום');
        return;
      }

      this.loading = true;

      // Save using remult
      await this.paymentRepo.save(this.payment);

      this.ui.info(this.isNewPayment ? 'התשלום נוסף בהצלחה' : 'התשלום עודכן בהצלחה');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving payment:', error);
      this.ui.error('שגיאה בשמירת התשלום');
    } finally {
      this.loading = false;
    }
  }

  onClose() {
    this.dialogRef.close(false);
  }
}
