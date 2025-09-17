import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Donation, Donor, DonationMethod, Campaign } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { SharedComponentsModule } from '../../../shared/shared-components.module';

export interface DonorDonationsModalArgs {
  donorId: string;
  donationType: 'donations' | 'gifts' | 'receipts';
  donorName?: string;
}

@Component({
  selector: 'app-donor-donations-modal',
  templateUrl: './donor-donations-modal.component.html',
  styleUrls: ['./donor-donations-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    SharedComponentsModule
  ]
})
export class DonorDonationsModalComponent implements OnInit {
  args!: DonorDonationsModalArgs;
  shouldClose = false;

  donor?: Donor;
  donations: Donation[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];

  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);

  loading = false;

  // Filters
  filterText = '';
  filterCampaign = '';
  filterMethod = '';
  filterStatus = '';

  // Table configuration
  displayedColumns: string[] = ['donationDate', 'amount', 'currency', 'campaign', 'method', 'status', 'actions'];

  // Totals
  totalAmount = 0;
  totalDonations = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar
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

      // Load related data
      await Promise.all([
        this.loadDonations(),
        this.loadCampaigns(),
        this.loadDonationMethods()
      ]);

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
      case 'gifts':
        // Assuming gifts have a specific status or type
        whereClause.donationType = 'commitment';
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
    this.totalDonations = this.donations.length;
    this.totalAmount = this.donations.reduce((sum, donation) => sum + donation.amount, 0);
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

      const matchesStatus = !this.filterStatus ||
        donation.status === this.filterStatus;

      return matchesText && matchesCampaign && matchesMethod && matchesStatus;
    });
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

  async issueReceipt(donation: Donation) {
    if (donation.receiptIssued) {
      this.ui.info('קבלה כבר הוצאה לתרומה זו');
      return;
    }

    try {
      await donation.issueReceipt();
      await this.loadDonations();
      this.ui.info(`קבלה הוצאה בהצלחה - מספר: ${donation.receiptNumber}`);
    } catch (error) {
      console.error('Error issuing receipt:', error);
      this.ui.error('שגיאה בהוצאת הקבלה');
    }
  }

  exportToExcel() {
    // TODO: Implement Excel export
    this.ui.info('ייצוא לאקסל יבוצע בהמשך');
  }

  closeModal() {
    this.shouldClose = true;
  }
}