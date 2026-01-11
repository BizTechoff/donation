import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { Payment, Donation } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { PaymentController } from '../../../../shared/controllers/payment.controller';

export interface PaymentListModalArgs {
  donationId: string;
  donationAmount?: number;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-payment-list-modal',
  templateUrl: './payment-list-modal.component.html',
  styleUrls: ['./payment-list-modal.component.scss']
})
export class PaymentListModalComponent implements OnInit {
  args!: PaymentListModalArgs;

  donation?: Donation;
  payments: Payment[] = [];

  paymentRepo = remult.repo(Payment);
  donationRepo = remult.repo(Donation);

  loading = false;

  // Filters
  filterText = '';

  // Table configuration
  displayedColumns: string[] = ['paymentDate', 'amount', 'reference', 'paymentIdentifier', 'actions'];

  // Totals
  totalAmount = 0;
  totalPayments = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<PaymentListModalComponent>
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  get modalTitle(): string {
    return 'רשימת תנועות שנקלטו';
  }

  get modalIcon(): string {
    return 'payment';
  }

  async loadData() {
    this.loading = true;
    try {
      // Load donation
      this.donation = await this.donationRepo.findId(this.args.donationId) || undefined;

      // Load payments
      await this.loadPayments();

      this.calculateTotals();
    } catch (error) {
      console.error('Error loading payments:', error);
      this.ui.error('שגיאה בטעינת נתוני התשלומים');
    } finally {
      this.loading = false;
    }
  }

  async loadPayments() {
    this.payments = await PaymentController.getPaymentsByDonation(this.args.donationId);
  }

  calculateTotals() {
    this.totalPayments = this.payments.length;
    this.totalAmount = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  get filteredPayments(): Payment[] {
    return this.payments.filter(payment => {
      const matchesText = !this.filterText ||
        payment.notes?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        payment.reference?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        payment.paymentIdentifier?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        payment.amount.toString().includes(this.filterText);

      return matchesText;
    });
  }

  getFilteredTotal(): number {
    return this.filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'בהמתנה';
      case 'completed': return 'הושלם';
      case 'failed': return 'נכשל';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'completed': return 'status-completed';
      case 'failed': return 'status-failed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  async addPayment() {
    const result = await this.ui.paymentDetailsDialog('new', {
      donationId: this.args.donationId
    });

    if (result) {
      await this.loadPayments();
      this.calculateTotals();
    }
  }

  async editPayment(payment: Payment) {
    const result = await this.ui.paymentDetailsDialog(payment.id);

    if (result) {
      await this.loadPayments();
      this.calculateTotals();
    }
  }

  async deletePayment(payment: Payment) {
    if (await this.ui.yesNoQuestion(`האם אתה בטוח שברצונך למחוק את התשלום של ${payment.amount} ₪?`)) {
      try {
        await PaymentController.deletePayment(payment.id);
        await this.loadPayments();
        this.calculateTotals();
        this.ui.info('התשלום נמחק בהצלחה');
      } catch (error) {
        console.error('Error deleting payment:', error);
        this.ui.error('שגיאה במחיקת התשלום');
      }
    }
  }

  async uploadTransactions() {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      try {
        this.loading = true;

        // Import xlsx dynamically
        const XLSX = await import('xlsx');

        // Read the file
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          this.ui.error('הקובץ ריק או לא מכיל נתונים');
          return;
        }

        // Send to backend for processing
        const result = await PaymentController.processExcelTransactions(
          this.args.donationId,
          jsonData as any[]
        );

        // Reload payments
        await this.loadPayments();
        this.calculateTotals();

        // Show results
        let message = `נמצאו ${result.matched} תשלומים תואמים\n`;
        message += `נוצרו ${result.created} רשומות תשלום חדשות\n`;

        if (result.errors.length > 0) {
          message += `\nשגיאות:\n${result.errors.slice(0, 5).join('\n')}`;
          if (result.errors.length > 5) {
            message += `\n...ועוד ${result.errors.length - 5} שגיאות`;
          }
        }

        this.ui.info(message);

      } catch (error) {
        console.error('Error uploading Excel file:', error);
        this.ui.error('שגיאה בעיבוד קובץ האקסל: ' + (error instanceof Error ? error.message : 'שגיאה לא ידועה'));
      } finally {
        this.loading = false;
      }
    };

    input.click();
  }

  exportToExcel() {
    // TODO: Implement Excel export
    this.ui.info('ייצוא לאקסל יבוצע בהמשך');
  }

  closeModal() {
    this.dialogRef.close();
  }
}
