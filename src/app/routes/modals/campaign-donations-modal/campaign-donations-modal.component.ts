import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { Donation, Donor, DonationMethod, Campaign } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { HebrewDateService } from '../../../services/hebrew-date.service';

export interface CampaignDonationsModalArgs {
  campaignId: string;
  campaignName?: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-campaign-donations-modal',
  templateUrl: './campaign-donations-modal.component.html',
  styleUrls: ['./campaign-donations-modal.component.scss']
})
export class CampaignDonationsModalComponent implements OnInit {
  args!: CampaignDonationsModalArgs;

  campaign?: Campaign;
  donations: Donation[] = [];
  donors: Donor[] = [];
  donationMethods: DonationMethod[] = [];

  donationRepo = remult.repo(Donation);
  campaignRepo = remult.repo(Campaign);
  donorRepo = remult.repo(Donor);
  donationMethodRepo = remult.repo(DonationMethod);

  loading = false;

  // Filters
  filterText = '';
  filterDonor = '';
  filterMethod = '';
  filterType = '';

  // Sorting
  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [
    { field: 'donationDate', direction: 'desc' }
  ];

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;
  Math = Math; // Expose Math to template

  // Table configuration
  displayedColumns: string[] = ['donationDate', 'donor', 'amount', 'currency', 'method', 'type', 'actions'];

  // Totals
  totalAmount = 0;
  totalDonations = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private hebrewDateService: HebrewDateService,
    public dialogRef: MatDialogRef<CampaignDonationsModalComponent>
  ) {}

  async ngOnInit() {
    await this.loadCampaign();
    await this.loadDropdownData();
    await this.loadDonations();
  }

  async loadCampaign() {
    if (!this.args?.campaignId) return;

    try {
      const foundCampaign = await this.campaignRepo.findId(this.args.campaignId);
      if (!foundCampaign) {
        this.ui.error('הקמפיין לא נמצא');
        this.dialogRef.close();
        return;
      }
      this.campaign = foundCampaign;
    } catch (error) {
      console.error('Error loading campaign:', error);
      this.ui.error('שגיאה בטעינת הקמפיין');
    }
  }

  async loadDropdownData() {
    try {
      // Load donation methods for filter
      this.donationMethods = await this.donationMethodRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  }

  async loadDonations() {
    if (!this.args?.campaignId) return;

    this.loading = true;
    try {
      // Build where clause
      const where: any = {
        campaignId: this.args.campaignId
      };

      // Apply filters
      if (this.filterDonor) {
        where.donorId = this.filterDonor;
      }

      if (this.filterMethod) {
        where.donationMethodId = this.filterMethod;
      }

      if (this.filterType) {
        where.donationType = this.filterType;
      }

      // Get total count
      this.totalCount = await this.donationRepo.count(where);
      this.totalPages = Math.ceil(this.totalCount / this.pageSize);

      // Build order by from sortColumns
      const orderBy: any = {};
      this.sortColumns.forEach(sort => {
        orderBy[sort.field] = sort.direction;
      });

      // Get donations with includes
      this.donations = await this.donationRepo.find({
        where,
        orderBy,
        limit: this.pageSize,
        page: this.currentPage,
        include: {
          donor: true,
          donationMethod: true,
          campaign: true
        }
      });

      // Calculate totals
      this.totalDonations = this.totalCount;
      this.totalAmount = this.donations.reduce((sum, d) => sum + (d.amount || 0), 0);

      // Load unique donors for filter dropdown
      const uniqueDonorIds = [...new Set(this.donations.map(d => d.donorId))];
      if (uniqueDonorIds.length > 0) {
        this.donors = await this.donorRepo.find({
          where: { id: { $in: uniqueDonorIds } },
          orderBy: { lastName: 'asc', firstName: 'asc' }
        });
      }

    } catch (error) {
      console.error('Error loading donations:', error);
      this.ui.error('שגיאה בטעינת התרומות');
      this.donations = [];
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadDonations();
  }

  clearFilters() {
    this.filterText = '';
    this.filterDonor = '';
    this.filterMethod = '';
    this.filterType = '';
    this.applyFilters();
  }

  // Sorting
  async toggleSort(field: string, event?: MouseEvent) {
    if (event && (event.ctrlKey || event.metaKey)) {
      // Multi-column sort
      const existingIndex = this.sortColumns.findIndex(s => s.field === field);
      if (existingIndex >= 0) {
        const current = this.sortColumns[existingIndex];
        if (current.direction === 'asc') {
          this.sortColumns[existingIndex].direction = 'desc';
        } else {
          this.sortColumns.splice(existingIndex, 1);
        }
      } else {
        this.sortColumns.push({ field, direction: 'asc' });
      }
    } else {
      // Single column sort
      const existing = this.sortColumns.find(s => s.field === field);
      if (existing && this.sortColumns.length === 1) {
        existing.direction = existing.direction === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortColumns = [{ field, direction: 'asc' }];
      }
    }

    await this.loadDonations();
  }

  getSortIcon(field: string): string {
    const sortIndex = this.sortColumns.findIndex(s => s.field === field);
    if (sortIndex === -1) return '';

    const sort = this.sortColumns[sortIndex];
    const arrow = sort.direction === 'asc' ? '↑' : '↓';

    if (this.sortColumns.length > 1) {
      return `${arrow}${sortIndex + 1}`;
    }
    return arrow;
  }

  isSorted(field: string): boolean {
    return this.sortColumns.some(s => s.field === field);
  }

  // Pagination
  async goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      await this.loadDonations();
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.loadDonations();
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadDonations();
    }
  }

  async firstPage() {
    this.currentPage = 1;
    await this.loadDonations();
  }

  async lastPage() {
    this.currentPage = this.totalPages;
    await this.loadDonations();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfWindow = Math.floor(maxPagesToShow / 2);
      let startPage = Math.max(1, this.currentPage - halfWindow);
      let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  // Format helpers
  formatCurrency(amount: number, currency?: string): string {
    if (!amount) return '₪0';
    const currencySymbol = this.getCurrencySymbol(currency || 'ILS');
    return `${currencySymbol}${amount.toLocaleString('he-IL')}`;
  }

  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      'ILS': '₪',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    return symbols[currency] || currency;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('he-IL');
  }

  formatHebrewDate(date: Date | undefined): string {
    if (!date) return '-';
    try {
      const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(date));
      return hebrewDate.formatted;
    } catch (error) {
      console.error('Error formatting Hebrew date:', error);
      return '-';
    }
  }

  getDonorName(donation: Donation): string {
    return donation.donor?.fullName || 'לא ידוע';
  }

  getMethodName(donation: Donation): string {
    return donation.donationMethod?.name || 'לא ידוע';
  }

  getDonationType(donation: Donation): string {
    if (donation.donationType === 'full') return 'תרומה מלאה';
    if (donation.donationType === 'commitment') return 'התחייבות';
    return donation.donationType || '';
  }

  // Actions
  async openNewDonation() {
    if (!this.campaign) return;

    try {
      const result = await this.ui.donationDetailsDialog('new', { campaignId: this.campaign.id });

      if (result) {
        await this.loadDonations();
        // Optionally reload campaign to update raised amount
        await this.loadCampaign();
      }
    } catch (error: any) {
      console.error('Error opening new donation:', error);
      this.ui.error('שגיאה בפתיחת תרומה חדשה: ' + (error.message || error));
    }
  }

  async editDonation(donation: Donation) {
    try {
      const result = await this.ui.donationDetailsDialog(donation.id);

      if (result) {
        await this.loadDonations();
        await this.loadCampaign();
      }
    } catch (error: any) {
      console.error('Error editing donation:', error);
      this.ui.error('שגיאה בעריכת התרומה: ' + (error.message || error));
    }
  }

  async deleteDonation(donation: Donation) {
    const confirmMessage = `האם אתה בטוח שברצונך למחוק את התרומה של ${this.getDonorName(donation)}?`;
    if (!confirm(confirmMessage)) return;

    try {
      this.loading = true;
      await donation.delete();
      this.snackBar.open('התרומה נמחקה בהצלחה', 'סגור', { duration: 3000 });
      await this.loadDonations();
      await this.loadCampaign();
    } catch (error: any) {
      console.error('Error deleting donation:', error);
      this.ui.error('שגיאה במחיקת התרומה: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  closeModal() {
    this.dialogRef.close(true);
  }
}
