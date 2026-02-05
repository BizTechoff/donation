import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Donation, DonationMethod, Payment } from '../../../../shared/entity';
import { CurrencyType } from '../../../../shared/type/currency.type';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { PayerService } from '../../../services/payer.service';

export interface PaymentDetailsModalArgs {
  paymentId: string; // Can be 'new' for new payment or payment ID
  donationId?: string; // Required for new payments
  donationType?: string;
  donationMethod?: DonationMethod;
  standingOrderType?: string;
  paymentType?: string;
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
  donation?: Donation;
  isNewPayment = false;
  loading = false;


  // For validation display
  totalPaidSoFar = 0;
  remainingAmount = 0;

  // Currency
  currencyTypes: Record<string, CurrencyType> = {};
  currencies: CurrencyType[] = [];

  paymentRepo = remult.repo(Payment);
  donationRepo = remult.repo(Donation);

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private payerService: PayerService,
    public dialogRef: MatDialogRef<PaymentDetailsModalComponent>
  ) {
    this.currencyTypes = this.payerService.getCurrencyTypesRecord();
    this.currencies = Object.values(this.currencyTypes);
  }

  async ngOnInit() {
    await this.loadPayment();
  }

  async loadPayment() {
    this.loading = true;
    try {
      if (this.args.paymentId === 'new') {
        this.isNewPayment = true;
        this.payment = this.paymentRepo.create();
        this.payment.type = this.args.paymentType || ''

        if (this.args.donationId) {
          this.payment.donationId = this.args.donationId;
        }

        if (this.args.donationType) {
          this.payment.type = this.args.donationType
        }

        // Amount stays empty (0) - user must fill it manually
        this.payment.amount = 0;
        this.payment.paymentDate = new Date();
      } else {
        this.payment = await this.paymentRepo.findId(this.args.paymentId) || this.paymentRepo.create();
        this.isNewPayment = false;
      }

      // Load donation and calculate totals
      await this.loadDonationAndTotals();

      // Set default currency from donation for new payments
      if (this.isNewPayment && this.donation) {
        this.payment.currencyId = this.donation.currencyId || 'ILS';
      }
    } catch (error) {
      console.error('Error loading payment:', error);
      this.ui.error('שגיאה בטעינת פרטי התשלום');
    } finally {
      this.loading = false;
    }
  }

  async loadDonationAndTotals() {
    if (!this.payment.donationId) return;

    // Load donation with donationMethod
    const donation = await this.donationRepo.findFirst(
      { id: this.payment.donationId },
      { include: { donationMethod: true } }
    );
    if (!donation) return;
    this.donation = donation;

    // Get all existing payments for this donation (excluding current payment if editing)
    const existingPayments = await this.paymentRepo.find({
      where: {
        donationId: this.payment.donationId,
        isActive: true
      }
    });

    // Calculate total paid so far (excluding current payment if editing)
    this.totalPaidSoFar = existingPayments
      .filter(p => this.isNewPayment || p.id !== this.payment.id)
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate remaining amount
    this.remainingAmount = this.donation.amount - this.totalPaidSoFar;
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

      // Validate that total payments don't exceed commitment amount (only for commitments)
      if (this.donation?.donationType === 'commitment') {
        const newTotal = this.totalPaidSoFar + this.payment.amount;
        if (newTotal > this.donation.amount) {
          const excess = newTotal - this.donation.amount;
          this.ui.error(`סכום התשלום חורג מסך ההתחייבות ב-${excess.toLocaleString()}. יתרה לתשלום: ${this.remainingAmount.toLocaleString()}`);
          return;
        }
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

  getTransactionTypeLabel(): string {
    if (!this.donation) return '';
    if (this.donation.donationType === 'commitment') return 'התחייבות';
    if (this.donation.donationMethod?.type === 'standing_order') {
      switch (this.donation.standingOrderType) {
        case 'bank': return 'הו"ק בנקאית';
        case 'creditCard': return 'הו"ק כרטיס אשראי';
        case 'organization': return 'הו"ק עמותה';
        default: return 'הו"ק';
      }
    }
    return this.donation.donationMethod?.name || '';
  }

  onClose() {
    this.dialogRef.close(false);
  }
}
