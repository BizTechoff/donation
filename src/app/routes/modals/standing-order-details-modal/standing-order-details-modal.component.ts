import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogRef } from '@angular/material/dialog';
import { StandingOrder, Donor, Campaign, DonationMethod, User } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';

export interface StandingOrderDetailsModalArgs {
  standingOrderId: string; // Can be 'new' for new standing order or standing order ID
  donorId?: string; // Optional donor ID for pre-selecting donor in new standing orders
}

@Component({
  selector: 'app-standing-order-details-modal',
  templateUrl: './standing-order-details-modal.component.html',
  styleUrls: ['./standing-order-details-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class StandingOrderDetailsModalComponent implements OnInit {
  args!: StandingOrderDetailsModalArgs;
  changed = false;

  standingOrder!: StandingOrder;
  originalStandingOrderData?: string; // To track changes
  donors: Donor[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];
  fundraisers: User[] = [];

  standingOrderRepo = remult.repo(StandingOrder);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  userRepo = remult.repo(User);

  loading = false;
  isNewStandingOrder = false;
  selectedDonor?: Donor;
  selectedCampaign?: Campaign;
  selectedPaymentMethod?: DonationMethod;
  selectedFundraiser?: User;

  // Payment methods for standing orders
  paymentTypes = [
    { value: 'creditCard', label: 'כרטיס אשראי' },
    { value: 'bankTransfer', label: 'הוראת קבע בנקאית' },
    { value: 'directDebit', label: 'הרשאה לחיוב חשבון' }
  ];

  // Frequency options
  frequencyOptions = [
    { value: 'monthly', label: 'חודשי' },
    { value: 'quarterly', label: 'רבעוני' },
    { value: 'semiAnnual', label: 'חצי שנתי' },
    { value: 'annual', label: 'שנתי' }
  ];

  // Day of month options (1-28 to avoid issues with February)
  dayOfMonthOptions: number[] = Array.from({ length: 28 }, (_, i) => i + 1);

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<StandingOrderDetailsModalComponent>
  ) {}

  async ngOnInit() {
    await this.initializeStandingOrder();
    await this.loadDropdownData();
  }

  private async initializeStandingOrder() {
    if (!this.args?.standingOrderId) return;

    this.loading = true;
    try {
      if (this.args.standingOrderId === 'new') {
        this.isNewStandingOrder = true;
        this.standingOrder = this.standingOrderRepo.create();
        this.standingOrder.startDate = new Date();
        this.standingOrder.currency = 'ILS';
        this.standingOrder.status = 'active';
        this.standingOrder.frequency = 'monthly';
        this.standingOrder.dayOfMonth = 1;
        this.standingOrder.paymentType = 'creditCard';
        this.standingOrder.isActive = true;
        this.standingOrder.autoRenewal = true;
        this.standingOrder.amount = 0;
        this.standingOrder.totalAmount = 0;
        this.standingOrder.processedAmount = 0;
        this.standingOrder.remainingAmount = 0;
        this.standingOrder.numberOfPayments = 12; // Default to 12 payments
        this.standingOrder.completedPayments = 0;
        this.standingOrder.failedPayments = 0;

        // Additional fields
        this.standingOrder.bankName = '';
        this.standingOrder.bankBranch = '';
        this.standingOrder.bankAccount = '';
        this.standingOrder.cardNumber = '';
        this.standingOrder.cardExpiry = '';
        this.standingOrder.cardHolderName = '';
        this.standingOrder.notes = '';

        // Pre-select donor if donorId is provided
        if (this.args.donorId) {
          this.standingOrder.donorId = this.args.donorId;
        }

        this.originalStandingOrderData = JSON.stringify(this.standingOrder);
      } else {
        this.isNewStandingOrder = false;
        const foundStandingOrder = await this.standingOrderRepo.findId(this.args.standingOrderId);
        if (foundStandingOrder) {
          this.standingOrder = foundStandingOrder;
          this.originalStandingOrderData = JSON.stringify(this.standingOrder);
        }
      }
    } catch (error) {
      console.error('Error initializing standing order:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDropdownData() {
    try {
      // Load donors
      this.donors = await this.donorRepo.find({
        where: { isActive: true },
        orderBy: { firstName: 'asc' }
      });

      // Load campaigns
      this.campaigns = await this.campaignRepo.find({
        orderBy: { name: 'asc' }
      });

      // Load donation methods (for reference, though standing orders have their own payment types)
      this.donationMethods = await this.donationMethodRepo.find({
        orderBy: { name: 'asc' }
      });

      // Load fundraisers (users with donator=true)
      this.fundraisers = await this.userRepo.find({
        where: { disabled: false, donator: true },
        orderBy: { name: 'asc' }
      });

      // Load selected donor if standing order has donorId
      await this.loadSelectedDonor();

      // Load selected options
      this.updateSelectedOptions();
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  }

  private updateSelectedOptions() {
    // Update selected campaign
    if (this.standingOrder?.campaignId) {
      this.selectedCampaign = this.campaigns.find(c => c.id === this.standingOrder.campaignId);
    } else {
      this.selectedCampaign = undefined;
    }

    // Update selected fundraiser
    if (this.standingOrder?.fundraiserId) {
      this.selectedFundraiser = this.fundraisers.find(f => f.id === this.standingOrder.fundraiserId);
    } else {
      this.selectedFundraiser = undefined;
    }
  }

  private hasChanges(): boolean {
    if (!this.standingOrder || !this.originalStandingOrderData) return false;
    return JSON.stringify(this.standingOrder) !== this.originalStandingOrderData;
  }

  async saveStandingOrder() {
    if (!this.standingOrder) return;

    try {
      // Calculate total amount based on amount and number of payments
      if (this.standingOrder.amount && this.standingOrder.numberOfPayments) {
        this.standingOrder.totalAmount = this.standingOrder.amount * this.standingOrder.numberOfPayments;
        this.standingOrder.remainingAmount = this.standingOrder.totalAmount - this.standingOrder.processedAmount;
      }

      // Set next payment date
      if (this.isNewStandingOrder) {
        this.standingOrder.nextPaymentDate = this.calculateNextPaymentDate();
      }

      const wasNew = this.isNewStandingOrder;
      await this.standingOrder.save();

      this.changed = wasNew || this.hasChanges();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving standing order:', error);
      alert('שגיאה בשמירת הוראת הקבע');
    }
  }

  calculateNextPaymentDate(): Date {
    const date = new Date(this.standingOrder.startDate);

    // Set the day of month
    date.setDate(this.standingOrder.dayOfMonth || 1);

    // If the start date is in the past or today, calculate the next payment date
    const today = new Date();
    if (date <= today) {
      switch (this.standingOrder.frequency) {
        case 'monthly':
          date.setMonth(date.getMonth() + 1);
          break;
        case 'quarterly':
          date.setMonth(date.getMonth() + 3);
          break;
        case 'semiAnnual':
          date.setMonth(date.getMonth() + 6);
          break;
        case 'annual':
          date.setFullYear(date.getFullYear() + 1);
          break;
      }
    }

    return date;
  }

  async deleteStandingOrder() {
    if (!this.standingOrder) return;

    const confirmMessage = `האם אתה בטוח שברצונך למחוק הוראת קבע על סך ${this.standingOrder.amount} ש"ח?`;
    if (confirm(confirmMessage)) {
      try {
        await this.standingOrder.delete();
        this.changed = true;
        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error deleting standing order:', error);
        alert('שגיאה במחיקת הוראת קבע');
      }
    }
  }

  async pauseStandingOrder() {
    if (!this.standingOrder) return;

    try {
      this.standingOrder.status = 'paused';
      await this.standingOrder.save();
      this.changed = true;
      alert('הוראת הקבע הושהתה בהצלחה');
    } catch (error) {
      console.error('Error pausing standing order:', error);
      alert('שגיאה בהשהיית הוראת קבע');
    }
  }

  async resumeStandingOrder() {
    if (!this.standingOrder) return;

    try {
      this.standingOrder.status = 'active';
      this.standingOrder.nextPaymentDate = this.calculateNextPaymentDate();
      await this.standingOrder.save();
      this.changed = true;
      alert('הוראת הקבע הופעלה מחדש בהצלחה');
    } catch (error) {
      console.error('Error resuming standing order:', error);
      alert('שגיאה בהפעלת הוראת קבע מחדש');
    }
  }

  async cancelStandingOrder() {
    if (!this.standingOrder) return;

    const confirmMessage = 'האם אתה בטוח שברצונך לבטל את הוראת הקבע?';
    if (confirm(confirmMessage)) {
      try {
        this.standingOrder.status = 'cancelled';
        this.standingOrder.endDate = new Date();
        await this.standingOrder.save();
        this.changed = true;
        alert('הוראת הקבע בוטלה בהצלחה');
      } catch (error) {
        console.error('Error cancelling standing order:', error);
        alert('שגיאה בביטול הוראת קבע');
      }
    }
  }

  getDonorDisplayName(donor?: Donor): string {
    if (!donor) return '';
    return `${donor.firstName} ${donor.lastName}`.trim();
  }

  getFundraiserDisplayName(fundraiser: User): string {
    return fundraiser.name;
  }

  async loadSelectedDonor() {
    if (this.standingOrder?.donorId) {
      try {
        this.selectedDonor = await this.donorRepo.findId(this.standingOrder.donorId) || undefined;
      } catch (error) {
        console.error('Error loading selected donor:', error);
      }
    }
  }

  closeModal(event?: MouseEvent) {
    // If clicking on overlay, close modal
    if (event && event.target === event.currentTarget) {
      this.dialogRef.close(this.changed);
    } else if (!event) {
      // Direct close button click
      this.dialogRef.close(this.changed);
    }
  }

  onCampaignChange() {
    this.updateSelectedOptions();
    console.log('Campaign changed to:', this.selectedCampaign?.name);
  }

  onFundraiserChange() {
    this.updateSelectedOptions();
    console.log('Fundraiser changed to:', this.selectedFundraiser?.name);
  }

  onPaymentTypeChange() {
    console.log('Payment type changed to:', this.standingOrder.paymentType);
  }

  onFrequencyChange() {
    console.log('Frequency changed to:', this.standingOrder.frequency);
    // Recalculate next payment date
    if (!this.isNewStandingOrder) {
      this.standingOrder.nextPaymentDate = this.calculateNextPaymentDate();
    }
  }

  async onDonorChange(donorId: string) {
    if (!donorId) {
      this.standingOrder.donorId = '';
      this.selectedDonor = undefined;
      return;
    }

    try {
      this.standingOrder.donorId = donorId;
      this.selectedDonor = await this.donorRepo.findId(donorId) || undefined;
    } catch (error) {
      console.error('Error in onDonorChange:', error);
    }
  }

  // Calculate remaining payments
  getRemainingPayments(): number {
    if (!this.standingOrder) return 0;
    return Math.max(0, this.standingOrder.numberOfPayments - this.standingOrder.completedPayments);
  }

  // Calculate progress percentage
  getProgressPercentage(): number {
    if (!this.standingOrder || this.standingOrder.numberOfPayments === 0) return 0;
    return Math.round((this.standingOrder.completedPayments / this.standingOrder.numberOfPayments) * 100);
  }

  // Get status display
  getStatusDisplay(): string {
    switch (this.standingOrder?.status) {
      case 'active': return 'פעיל';
      case 'paused': return 'מושהה';
      case 'cancelled': return 'מבוטל';
      case 'completed': return 'הושלם';
      default: return 'לא ידוע';
    }
  }

  // Get frequency display
  getFrequencyDisplay(): string {
    const option = this.frequencyOptions.find(o => o.value === this.standingOrder?.frequency);
    return option?.label || '';
  }

  // Check if standing order is editable
  get isEditable(): boolean {
    return this.standingOrder?.status === 'active' || this.isNewStandingOrder;
  }

  // Check if credit card payment
  get isCreditCardPayment(): boolean {
    return this.standingOrder?.paymentType === 'creditCard';
  }

  // Check if bank transfer payment
  get isBankTransferPayment(): boolean {
    return this.standingOrder?.paymentType === 'bankTransfer' ||
           this.standingOrder?.paymentType === 'directDebit';
  }

  // View payment history
  async viewPaymentHistory() {
    if (!this.standingOrder || this.isNewStandingOrder) return;

    try {
      console.log('Opening payment history for standing order:', this.standingOrder.id);
      // TODO: Implement payment history dialog
      alert('היסטוריית תשלומים תיושם בהמשך');
    } catch (error) {
      console.error('Error opening payment history:', error);
      alert('שגיאה בפתיחת היסטוריית תשלומים');
    }
  }

  // Process next payment manually
  async processNextPayment() {
    if (!this.standingOrder || this.isNewStandingOrder) return;

    const confirmMessage = `האם לבצע תשלום ידני על סך ${this.standingOrder.amount} ש"ח?`;
    if (confirm(confirmMessage)) {
      try {
        // TODO: Implement manual payment processing
        alert('ביצוע תשלום ידני ייושם בהמשך');
        console.log('Processing manual payment for standing order:', this.standingOrder.id);
      } catch (error) {
        console.error('Error processing payment:', error);
        alert('שגיאה בביצוע התשלום');
      }
    }
  }
}