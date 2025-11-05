import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { Donation, Donor, DonationMethod, Campaign, DonorGift, Gift } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';

export interface DonorDonationsModalArgs {
  donorId: string;
  donationType: 'donations' | 'gifts' | 'receipts';
  donorName?: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-donor-donations-modal',
  templateUrl: './donor-donations-modal.component.html',
  styleUrls: ['./donor-donations-modal.component.scss']
})
export class DonorDonationsModalComponent implements OnInit {
  args!: DonorDonationsModalArgs;

  donor?: Donor;
  donations: Donation[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];

  // For gifts mode
  donorGifts: DonorGift[] = [];
  gifts: Gift[] = [];

  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  donorGiftRepo = remult.repo(DonorGift);
  giftRepo = remult.repo(Gift);

  loading = false;

  // Filters
  filterText = '';
  filterCampaign = '';
  filterMethod = '';
  filterStatus = '';

  // Table configuration
  displayedColumns: string[] = ['donationDate', 'amount', 'currency', 'campaign', 'method', 'actions'];

  get currentDisplayedColumns(): string[] {
    if (this.isGiftsMode) {
      return ['deliveryDate', 'giftName', 'status', 'actions'];
    }
    return this.displayedColumns;
  }

  // Totals
  totalAmount = 0;
  totalDonations = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<DonorDonationsModalComponent>
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  get modalTitle(): string {
    const donorName = this.donor?.fullName || this.args.donorName || '';
    switch (this.args.donationType) {
      case 'donations':
        return `תרומות של ${donorName}`;
      case 'gifts':
        return `מתנות של ${donorName}`;
      case 'receipts':
        return `קבלות של ${donorName}`;
      default:
        return `רשימה של ${donorName}`;
    }
  }

  get modalIcon(): string {
    switch (this.args.donationType) {
      case 'donations':
        return 'attach_money';
      case 'gifts':
        return 'redeem';
      case 'receipts':
        return 'receipt_long';
      default:
        return 'list';
    }
  }

  async loadData() {
    this.loading = true;
    try {
      // Load donor
      this.donor = await this.donorRepo.findId(this.args.donorId) || undefined;

      // Load related data based on donation type
      if (this.args.donationType === 'gifts') {
        await this.loadDonorGifts();
      } else {
        await Promise.all([
          this.loadDonations(),
          this.loadCampaigns(),
          this.loadDonationMethods()
        ]);
      }

      this.calculateTotals();
    } catch (error) {
      console.error('Error loading donor donations:', error);
      this.ui.error('שגיאה בטעינת נתוני התרומות');
    } finally {
      this.loading = false;
    }
  }

  async loadDonations() {
    let whereClause: any = { donorId: this.args.donorId };

    // Apply filters based on donation type
    switch (this.args.donationType) {
      case 'donations':
        whereClause.donationType = 'full';
        break;
      case 'receipts':
        whereClause.receiptIssued = true;
        break;
    }

    this.donations = await this.donationRepo.find({
      where: whereClause,
      orderBy: { donationDate: 'desc' },
      include: {
        campaign: true,
        donationMethod: true
      }
    });
  }

  async loadDonorGifts() {
    this.donorGifts = await this.donorGiftRepo.find({
      where: { donorId: this.args.donorId },
      orderBy: { deliveryDate: 'desc' },
      include: {
        donor: true,
        gift: true
      }
    });
  }

  async loadCampaigns() {
    this.campaigns = await this.campaignRepo.find({
      orderBy: { name: 'asc' }
    });
  }

  async loadDonationMethods() {
    this.donationMethods = await this.donationMethodRepo.find({
      orderBy: { name: 'asc' }
    });
  }

  calculateTotals() {
    if (this.args.donationType === 'gifts') {
      this.totalDonations = this.donorGifts.length;
      this.totalAmount = 0; // Gifts don't have amounts
    } else {
      this.totalDonations = this.donations.length;
      this.totalAmount = this.donations.reduce((sum, donation) => sum + donation.amount, 0);
    }
  }

  get filteredDonations(): Donation[] {
    return this.donations.filter(donation => {
      const matchesText = !this.filterText ||
        donation.notes?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        donation.amount.toString().includes(this.filterText);

      const matchesCampaign = !this.filterCampaign ||
        donation.campaignId === this.filterCampaign;

      const matchesMethod = !this.filterMethod ||
        donation.donationMethodId === this.filterMethod;

      const matchesStatus = !this.filterStatus;

      return matchesText && matchesCampaign && matchesMethod && matchesStatus;
    });
  }

  get filteredDonorGifts(): DonorGift[] {
    return this.donorGifts.filter(dg => {
      const matchesText = !this.filterText ||
        dg.gift?.name?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        dg.notes?.toLowerCase().includes(this.filterText.toLowerCase());

      return matchesText;
    });
  }

  get isGiftsMode(): boolean {
    return this.args.donationType === 'gifts';
  }

  get deliveredGiftsCount(): number {
    return this.filteredDonorGifts.filter(dg => dg.isDelivered).length;
  }

  get pendingGiftsCount(): number {
    return this.filteredDonorGifts.filter(dg => !dg.isDelivered).length;
  }

  getFilteredTotal(): number {
    return this.filteredDonations.reduce((sum, donation) => sum + donation.amount, 0);
  }

  getCampaignName(campaignId: string): string {
    return this.campaigns.find(c => c.id === campaignId)?.name || '';
  }

  getMethodName(methodId: string): string {
    return this.donationMethods.find(m => m.id === methodId)?.name || '';
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'בהמתנה';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  async editDonation(donation: Donation) {
    // Open donation details modal
    const changed = await this.ui.donationDetailsDialog(donation.id);
    if (changed) {
      await this.loadDonations();
      this.calculateTotals();
    }
  }

  async deleteDonation(donation: Donation) {
    if (await this.ui.yesNoQuestion(`האם אתה בטוח שברצונך למחוק את התרומה של ${donation.amount} ${donation.currency}?`)) {
      try {
        await this.donationRepo.delete(donation);
        await this.loadDonations();
        this.calculateTotals();
        this.ui.info('התרומה נמחקה בהצלחה');
      } catch (error) {
        console.error('Error deleting donation:', error);
        this.ui.error('שגיאה במחיקת התרומה');
      }
    }
  }


  async addNew() {
    if (this.isGiftsMode) {
      // Add new gift
      const result = await this.ui.donorGiftDetailsDialog('new', {
        donorId: this.args.donorId
      });
      if (result) {
        await this.loadDonorGifts();
        this.calculateTotals();
      }
    } else {
      // Add new donation
      const result = await this.ui.donationDetailsDialog('new', {
        donorId: this.args.donorId
      });
      if (result) {
        await this.loadDonations();
        this.calculateTotals();
      }
    }
  }

  getPaymentMethodDisplayName(method: DonationMethod): string {
    const typeLabels: { [key: string]: string } = {
      cash: this.i18n.terms.cash,
      check: this.i18n.terms.check,
      credit_card: this.i18n.terms.credit_card,
      bank_transfer: this.i18n.terms.bank_transfer,
      standing_order: this.i18n.terms.standingOrder,
      association: this.i18n.terms.other
    };
    return typeLabels[method.type] || method.name;
  }

  // Gift-related methods
  async editDonorGift(donorGift: DonorGift) {
    // Open donor gift details modal
    const changed = await this.ui.donorGiftDetailsDialog(donorGift.id);
    if (changed) {
      await this.loadDonorGifts();
      this.calculateTotals();
    }
  }

  async deleteDonorGift(donorGift: DonorGift) {
    if (await this.ui.yesNoQuestion(`האם אתה בטוח שברצונך למחוק את המתנה "${donorGift.gift?.name}"?`)) {
      try {
        await this.donorGiftRepo.delete(donorGift);
        await this.loadDonorGifts();
        this.calculateTotals();
        this.ui.info('המתנה נמחקה בהצלחה');
      } catch (error) {
        console.error('Error deleting donor gift:', error);
        this.ui.error('שגיאה במחיקת המתנה');
      }
    }
  }

  getGiftStatusText(isDelivered: boolean): string {
    return isDelivered ? 'נמסרה' : 'ממתינה';
  }

  getGiftStatusClass(isDelivered: boolean): string {
    return isDelivered ? 'status-completed' : 'status-pending';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('he-IL');
  }

  closeModal() {
    this.dialogRef.close();
  }
}