import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { remult } from 'remult';
import { Subscription } from 'rxjs';
import { DonationController, DonationFilters } from '../../../shared/controllers/donation.controller';
import { Campaign, Donation, DonationMethod, Donor, DonorPlace } from '../../../shared/entity';
import { BusyService } from '../../common-ui-elements/src/angular/wait/busy-service';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { GlobalFilterService } from '../../services/global-filter.service';
import { isPaymentBased, isStandingOrder, calculatePeriodsElapsed } from '../../../shared/utils/donation-utils';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { PayerService } from '../../services/payer.service';
import { PrintService } from '../../services/print.service';

@Component({
  selector: 'app-donations-list',
  templateUrl: './donations-list.component.html',
  styleUrls: ['./donations-list.component.scss']
})
export class DonationsListComponent implements OnInit, OnDestroy {

  donations: Donation[] = [];
  donors: Donor[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];
  donorPlacesMap = new Map<string, DonorPlace>();

  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  donorPlaceRepo = remult.repo(DonorPlace);

  loading = false;
  showAddDonationModal = false;
  editingDonation?: Donation;
  today = new Date().toISOString().split('T')[0];

  // Flag to track if base data was loaded
  private baseDataLoaded = false;

  totalAmountCache = 0;
  totalCommitmentAmount = 0;
  totalCommitmentCount = 0;
  totalFullDonationsCount = 0; // Count of full donations only (for summary card)

  // Totals grouped by currency
  donationsByCurrency: Record<string, number> = {};
  commitmentsByCurrency: Record<string, { total: number; paid: number }> = {};

  // Map of donationId -> total paid amount for commitments
  commitmentPaymentTotals: Record<string, number> = {};

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;
  Math = Math; // Make Math available in template

  // Sorting
  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];

  // תצוגה מקדימה ונתונים נוספים
  showPreview = false;
  hebrewDate = '';
  fundraiserName = '';

  // Filter variables
  searchTerm = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  selectedMethodId = '';
  amountFrom: number | undefined;
  selectedCampaignId = '';
  selectedDonationType = '';
  private filterTimeout: any;
  private subscriptions = new Subscription();

  // Currency types with rates
  currencyTypes = this.payerService.getCurrencyTypesRecord()

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private route: ActivatedRoute,
    private globalFilterService: GlobalFilterService,
    private busy: BusyService,
    private payerService: PayerService,
    private hebrewDateService: HebrewDateService,
    private printService: PrintService,
    private excelExportService: ExcelExportService
  ) { }

  async ngOnInit() {
    // Listen for global filter changes
    this.subscriptions.add(
      this.globalFilterService.filters$.subscribe(() => {
        this.refreshData();
      })
    );

    // Initial data load (includes base data on first call)
    await this.refreshData();
  }

  /**
   * Refresh data based on current filters and sorting
   * Called whenever filters or sorting changes
   * On first call, also loads base data (currency types, donors, campaigns, methods)
   */
  async refreshData() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Load base data once on first call
        if (!this.baseDataLoaded) {
          await this.loadBaseData();
          this.baseDataLoaded = true;
        }

        // Build filters object with both local and global filters
        const filters: DonationFilters = {
          searchTerm: this.searchTerm?.trim() || undefined,
          dateFrom: this.dateFrom ? this.formatDateForFilter(this.dateFrom) : undefined,
          dateTo: this.dateTo ? this.formatDateForFilter(this.dateTo) : undefined,
          selectedMethodId: this.selectedMethodId?.trim() || undefined,
          amountFrom: this.amountFrom,
          selectedCampaignId: this.selectedCampaignId?.trim() || undefined,
          selectedDonationType: this.selectedDonationType?.trim() || undefined
        };

        // console.log('refreshData: Fetching donations with filters:', filters, 'page:', this.currentPage, 'sorting:', this.sortColumns);

        // Get total count, total amount, commitments, and donations from server with all filters and sorting
        [this.totalCount, this.totalFullDonationsCount, this.donationsByCurrency, this.totalCommitmentCount, this.commitmentsByCurrency, this.donations] = await Promise.all([
          DonationController.countFilteredDonations(filters),
          DonationController.countFullDonations(filters),
          DonationController.sumFilteredDonationsByCurrency(filters),
          DonationController.countCommitments(filters),
          DonationController.sumCommitmentsByCurrency(filters),
          DonationController.findFilteredDonations(filters, this.currentPage, this.pageSize, this.sortColumns)
        ]);

        this.totalPages = Math.ceil(this.totalCount / this.pageSize);

        // Load payment totals for commitment and standing order donations
        const paymentBasedIds = this.donations
          .filter(d => isPaymentBased(d))
          .map(d => d.id);
        if (paymentBasedIds.length > 0) {
          this.commitmentPaymentTotals = await DonationController.getPaymentTotalsForCommitments(paymentBasedIds);
        } else {
          this.commitmentPaymentTotals = {};
        }

        console.log('refreshData 3: Loaded', this.donations.length, 'donations, total:', this.totalCount, 'totalAmount:', this.totalAmountCache);
      } catch (error) {
        console.error('Error refreshing donations:', error);
        this.donations = [];
        this.totalCount = 0;
        this.totalFullDonationsCount = 0;
        this.donationsByCurrency = {};
        this.totalCommitmentCount = 0;
        this.commitmentsByCurrency = {};
        this.totalPages = 0;
      }
    });
  }

  /**
   * Load base data once - called only on first refreshData call
   */
  private async loadBaseData() {
    // Set CSS variables for mobile labels
    this.updateMobileLabels();

    // Listen for language changes
    this.subscriptions.add(
      this.i18n.terms$.subscribe(() => {
        this.updateMobileLabels();
      })
    );

    // Load reference data (donors, campaigns, methods)
    await Promise.all([
      this.loadDonors(),
      this.loadCampaigns(),
      this.loadDonationMethods()
    ]);
  }

  private updateMobileLabels() {
    const root = document.documentElement;
    root.style.setProperty('--label-donor', `'${this.i18n.terms.donor}: '`);
    root.style.setProperty('--label-amount', `'${this.i18n.terms.amount}: '`);
    root.style.setProperty('--label-currency', `'${this.i18n.terms.currency}: '`);
    root.style.setProperty('--label-payment', `'${this.i18n.terms.paymentMethod}: '`);
    root.style.setProperty('--label-campaign', `'${this.i18n.terms.campaign}: '`);
    root.style.setProperty('--label-fundraiser', `'${this.i18n.terms.fundraiser}: '`);
    root.style.setProperty('--label-receipt', `'${this.i18n.terms.receipt}: '`);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
  }

  private formatDateForFilter(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }



  onFilterChange() {
    // Clear any existing timeout
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }

    // Set a new timeout to reload data after user stops typing/changing filters
    this.filterTimeout = setTimeout(() => {
      console.log('Filter changed, reloading donations');
      this.currentPage = 1; // Reset to first page when filters change
      this.refreshData();
    }, 300); // 300ms debounce
  }

  async loadDonors() {
    this.donors = await this.donorRepo.find({
      where: { isActive: true },
      orderBy: { lastName: 'asc' }
    });
  }

  async loadCampaigns() {
    // Load all campaigns (not just active) so users can filter by past campaigns too
    this.campaigns = await this.campaignRepo.find({
      orderBy: { name: 'asc' }
    });
  }

  async loadDonationMethods() {
    this.donationMethods = await this.donationMethodRepo.find({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async createDonation() {
    const changed = await this.ui.donationDetailsDialog('new');
    if (changed) {
      await this.refreshData();
    }
  }

  async editDonation(donation: Donation) {
    const changed = await this.ui.donationDetailsDialog(donation.id);
    if (changed) {
      await this.refreshData();
    }
  }

  async openDonorDetails(donation: Donation) {
    if (!donation.donorId) return;
    const changed = await this.ui.donorDetailsDialog(donation.donorId);
    if (changed) {
      await this.refreshData();
    }
  }

  async saveDonation() {
    if (!this.editingDonation) return;

    try {
      await remult.repo(Donation).save(this.editingDonation);

      if (this.editingDonation.donationMethod) {
        await this.editingDonation.donationMethod.updateStats(this.editingDonation.amount);
      }

      // Note: Campaign raised amount is now calculated on demand, no need to update cached value

      await this.refreshData(); // This will also update the cache
      this.closeModal();
    } catch (error) {
      console.error('Error saving donation:', error);
    }
  }

  async deleteDonation(donation: Donation) {
    const confirmMessage = this.i18n.currentTerms.confirmDeleteDonation?.replace('{donor}', donation.donor?.fullName || '') || '';
    const yes = await this.ui.yesNoQuestion(confirmMessage);
    if (yes) {
      try {
        await remult.repo(Donation).delete(donation);
        await this.refreshData(); // This will also update the cache
      } catch (error) {
        console.error('Error deleting donation:', error);
      }
    }
  }

  async printLetter(donation: Donation) {
    if (!donation?.id) return;

    try {
      // Open letter properties modal
      console.log('Opening letter properties selection for donation:', donation.id);
      const result = await this.ui.letterPropertiesDialog(donation.id);

      if (result) {
        console.log('Letter generated successfully:', result);
      }
    } catch (error) {
      console.error('Error printing letter:', error);
      this.ui.error('שגיאה בהפקת מכתב');
    }
  }

  // async uploadTransactions(donation: Donation) {
  //   // Create file input element
  //   const input = document.createElement('input');
  //   input.type = 'file';
  //   input.accept = '.xlsx,.xls';

  //   input.onchange = async (e: any) => {
  //     const file = e.target?.files?.[0];
  //     if (!file) return;

  //     try {
  //       this.loading = true;

  //       // Import xlsx dynamically
  //       const XLSX = await import('xlsx');

  //       // Read the file
  //       const data = await file.arrayBuffer();
  //       const workbook = XLSX.read(data, { type: 'array' });

  //       // Get first sheet
  //       const firstSheetName = workbook.SheetNames[0];
  //       const worksheet = workbook.Sheets[firstSheetName];

  //       // Convert to JSON
  //       const jsonData = XLSX.utils.sheet_to_json(worksheet);

  //       if (jsonData.length === 0) {
  //         this.ui.error('הקובץ ריק או לא מכיל נתונים');
  //         return;
  //       }

  //       // Import PaymentController dynamically to avoid circular dependencies
  //       const { PaymentController } = await import('../../../shared/controllers/payment.controller');

  //       // Send to backend for processing
  //       const result = await PaymentController.processExcelTransactions(
  //         donation.id,
  //         jsonData as any[]
  //       );

  //       // Show results
  //       let message = `קליטת תנועות לתרומה של ${donation.donor?.fullName || 'תורם לא ידוע'}\n\n`;
  //       message += `נמצאו ${result.matched} תשלומים תואמים\n`;
  //       message += `נוצרו ${result.created} רשומות תשלום חדשות\n`;

  //       if (result.errors.length > 0) {
  //         message += `\nשגיאות:\n${result.errors.slice(0, 5).join('\n')}`;
  //         if (result.errors.length > 5) {
  //           message += `\n...ועוד ${result.errors.length - 5} שגיאות`;
  //         }
  //       }

  //       alert(message);

  //     } catch (error) {
  //       console.error('Error uploading Excel file:', error);
  //       this.ui.error('שגיאה בעיבוד קובץ האקסל: ' + (error instanceof Error ? error.message : 'שגיאה לא ידועה'));
  //     } finally {
  //       this.loading = false;
  //     }
  //   };

  //   input.click();
  // }

  closeModal() {
    this.showAddDonationModal = false;
    this.editingDonation = undefined;
    this.showPreview = false;
    this.hebrewDate = '';
    this.fundraiserName = '';
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  async saveDonationAndExit() {
    await this.saveDonation();
    // The saveDonation function already closes the modal if successful
  }

  getMethodDisplayName(method: string): string {
    if (!method) return '-';
    switch (method) {
      case 'cash': return this.i18n.currentTerms.cash || '';
      case 'check': return this.i18n.currentTerms.check || '';
      case 'credit': return this.i18n.currentTerms.creditCard || '';
      case 'transfer': return this.i18n.currentTerms.bankTransfer || '';
      case 'standing': return this.i18n.currentTerms.standingOrder || '';
      default: return '-';
    }
  }

  getCampaignDisplayName(campaign: string): string {
    if (!campaign) return '-';
    switch (campaign) {
      case 'general': return this.i18n.currentTerms.general || '';
      case 'torah': return this.i18n.currentTerms.torah || '';
      case 'charity': return this.i18n.currentTerms.charity || '';
      case 'building': return this.i18n.currentTerms.building || '';
      default: return '-';
    }
  }

  // Helper functions for preview
  getSelectedDonorName(): string {
    if (!this.editingDonation?.donorId) return '';
    const donor = this.donors.find(d => d.id === this.editingDonation!.donorId);
    return donor?.fullName || '';
  }

  getSelectedMethodName(): string {
    if (!this.editingDonation?.donationMethodId) return '-';
    const method = this.donationMethods.find(m => m.id === this.editingDonation!.donationMethodId);
    if (!method) return '-';

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

  getSelectedCampaignName(): string {
    if (!this.editingDonation?.campaignId) return '-';
    const campaign = this.campaigns.find(c => c.id === this.editingDonation!.campaignId);
    return campaign?.name || '-';
  }

  getCurrencySymbol(): string {
    switch (this.editingDonation?.currencyId) {
      case 'ILS': return '₪';
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return '₪';
    }
  }

  // Getter and setter for date input
  get donationDateForInput(): string {
    return this.editingDonation?.donationDate?.toISOString().split('T')[0] || '';
  }

  set donationDateForInput(value: string) {
    if (this.editingDonation && value) {
      this.editingDonation.donationDate = new Date(value);
    }
  }

  get totalAmount(): number {
    return this.totalAmountCache;
  }

  get pendingAmount(): number {
    return 0; // Status field removed
  }

  /**
   * Get sorted array of donation totals by currency for display
   */
  get donationTotalsByCurrency(): { currency: string; symbol: string; amount: number }[] {
    return Object.entries(this.donationsByCurrency)
      .map(([currency, amount]) => ({
        currency,
        symbol: this.currencyTypes[currency]?.symbol || currency,
        amount
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending
  }

  /**
   * Get sorted array of commitment totals by currency for display
   */
  get commitmentTotalsByCurrency(): { currency: string; symbol: string; total: number; paid: number }[] {
    return Object.entries(this.commitmentsByCurrency)
      .map(([currency, data]) => ({
        currency,
        symbol: this.currencyTypes[currency]?.symbol || currency,
        total: data.total,
        paid: data.paid
      }))
      .sort((a, b) => b.total - a.total); // Sort by total descending
  }

  getDonorName(donation: Donation): string {
    return donation.donor?.lastAndFirstName || '-';
  }

  getDonorHomeAddress(donation: Donation): string {
    if (!donation.donor) return '-';
    return (donation.donor as any).homeAddress || '-';
  }

  getAmountInShekel(donation: Donation): number {
    const rate = this.currencyTypes[donation.currencyId]?.rateInShekel || 1;
    return donation.amount * rate;
  }

  formatAmountInShekel(donation: Donation): string {
    const shekelAmount = this.getAmountInShekel(donation);
    return `₪${shekelAmount.toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
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

  getCampaignName(donation: Donation): string {
    return donation.campaign?.name || '-';
  }

  getMethodName(donation: Donation): string {
    // התחייבות לא שייך לה אופן תרומה
    if (donation.donationType === 'commitment') return '-';
    if (!donation.donationMethod) return '-';

    const typeLabels: { [key: string]: string } = {
      cash: this.i18n.terms.cash,
      check: this.i18n.terms.check,
      credit_card: this.i18n.terms.credit_card,
      bank_transfer: this.i18n.terms.bank_transfer,
      standing_order: this.i18n.terms.standingOrder,
      association: this.i18n.terms.organization
    };

    return typeLabels[donation.donationMethod.type] || donation.donationMethod.name;
  }

  getDonationTypeDisplay(donation: Donation): string {
    return donation.donationType === 'commitment'
      ? this.i18n.terms.commitment
      : this.i18n.terms.fullDonation;
  }



  // תרומות מסוננות - רק עם קמפיין
  get donationsWithCampaign(): Donation[] {
    return this.donations.filter(donation => donation.campaignId);
  }

  // רשימת תורמים מסוננת לפי פילטר גלובלי
  // Note: Global filtering is now handled in the backend via user.settings
  get filteredDonors(): Donor[] {
    return this.donors;
  }

  // מטפל בשינוי בשדה חיפוש תורם

  // Pagination methods
  async goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      await this.refreshData();
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.refreshData();
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.refreshData();
    }
  }

  async firstPage() {
    this.currentPage = 1;
    await this.refreshData();
  }

  async lastPage() {
    this.currentPage = this.totalPages;
    await this.refreshData();
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

  // Sorting methods
  toggleSort(field: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    console.log('toggleSort called with field:', field);

    // Find existing sort for this field
    const existingIndex = this.sortColumns.findIndex(s => s.field === field);

    if (existingIndex !== -1) {
      // Toggle direction or remove if descending
      const current = this.sortColumns[existingIndex];
      if (current.direction === 'asc') {
        this.sortColumns[existingIndex].direction = 'desc';
      } else {
        // Remove sort
        this.sortColumns.splice(existingIndex, 1);
      }
    } else {
      // Add new sort (ascending first)
      this.sortColumns.push({ field, direction: 'asc' });
    }

    console.log('sortColumns after toggle:', this.sortColumns);

    // Reset to first page when sorting changes
    this.currentPage = 1;

    // Reload with new sort
    this.refreshData();
  }

  isSorted(field: string): boolean {
    return this.sortColumns.some(s => s.field === field);
  }

  getSortIcon(field: string): string {
    const sort = this.sortColumns.find(s => s.field === field);
    if (!sort) return '';
    return sort.direction === 'asc' ? '↑' : '↓';
  }

  truncateReason(reason: string | undefined): string {
    if (!reason) return '-';
    return reason.length > 30 ? reason.substring(0, 30) + '...' : reason;
  }

  /**
   * Get display string for donation amount
   * For commitments: shows "paid / total" format
   * For regular donations: shows just the amount
   */
  getAmountDisplay(donation: Donation): string {
    if (donation.donationType === 'commitment') {
      const paidAmount = this.commitmentPaymentTotals[donation.id] || 0;
      return `${paidAmount.toLocaleString()} / ${donation.amount.toLocaleString()}`;
    }
    if (isStandingOrder(donation)) {
      const paidAmount = this.commitmentPaymentTotals[donation.id] || 0;
      if (donation.unlimitedPayments) {
        // הו"ק ללא הגבלה: בפועל / צפי (מספר תקופות צפויות × סכום לתשלום)
        const expectedPeriods = calculatePeriodsElapsed(donation);
        const expectedAmount = expectedPeriods * donation.amount;
        return `${paidAmount.toLocaleString()} / ${expectedAmount.toLocaleString()}`;
      }
      return `${paidAmount.toLocaleString()} / ${donation.amount.toLocaleString()}`;
    }
    return donation.amount.toLocaleString();
  }

  isStandingOrderDonation(donation: Donation): boolean {
    return isStandingOrder(donation);
  }

  getPerPeriodAmount(donation: Donation): number {
    if (donation.unlimitedPayments) {
      return donation.amount;
    }
    return donation.amount / (donation.numberOfPayments || 1);
  }

  getPaymentCount(donation: Donation): number {
    const total = this.commitmentPaymentTotals[donation.id] || 0;
    const perPeriod = this.getPerPeriodAmount(donation);
    return perPeriod > 0 ? Math.round(total / perPeriod) : 0;
  }

  // ===================================
  // Print & Export Methods
  // ===================================

  async onPrint() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build filters (same as refreshData)
        const filters: DonationFilters = {
          searchTerm: this.searchTerm?.trim() || undefined,
          dateFrom: this.dateFrom ? this.formatDateForFilter(this.dateFrom) : undefined,
          dateTo: this.dateTo ? this.formatDateForFilter(this.dateTo) : undefined,
          selectedMethodId: this.selectedMethodId?.trim() || undefined,
          amountFrom: this.amountFrom,
          selectedCampaignId: this.selectedCampaignId?.trim() || undefined,
          selectedDonationType: this.selectedDonationType?.trim() || undefined
        };

        // Fetch ALL donations (no pagination)
        const allDonations = await DonationController.findFilteredDonations(
          filters,
          undefined,
          undefined,
          this.sortColumns
        );

        // Prepare data for print
        const printData = allDonations.map(donation => {
          const hebrewDate = donation.donationDate
            ? this.hebrewDateService.convertGregorianToHebrew(new Date(donation.donationDate)).formatted
            : '-';
          const currencySymbol = this.currencyTypes[donation.currencyId]?.symbol || '₪';

          return {
            donorName: this.getDonorName(donation),
            address: this.getDonorHomeAddress(donation),
            date: hebrewDate,
            donationType: this.getDonationTypeDisplay(donation),
            method: this.getMethodName(donation),
            amount: `${currencySymbol}${donation.amount.toLocaleString('he-IL')}`,
            campaign: this.getCampaignName(donation),
            fundraiser: donation.donor?.fundraiser?.name || '-',
            reason: donation.reason || '-'
          };
        });

        this.printService.print({
          title: this.i18n.currentTerms.donations || 'תרומות',
          subtitle: `${allDonations.length} ${this.i18n.currentTerms.donations || 'תרומות'}`,
          columns: [
            { header: this.i18n.currentTerms.donor || 'תורם', field: 'donorName' },
            { header: this.i18n.currentTerms.address || 'כתובת', field: 'address', align: 'left' },
            { header: this.i18n.currentTerms.date || 'תאריך', field: 'date' },
            { header: this.i18n.currentTerms.donationType || 'סוג', field: 'donationType' },
            { header: this.i18n.currentTerms.donationMethodFilter || 'אופן תרומה', field: 'method' },
            { header: this.i18n.currentTerms.amount || 'סכום', field: 'amount' },
            { header: this.i18n.currentTerms.campaign || 'קמפיין', field: 'campaign' },
            { header: this.i18n.currentTerms.fundraiserColumn || 'מגייס', field: 'fundraiser' },
            { header: this.i18n.currentTerms.reason || 'הקדשה', field: 'reason' }
          ],
          data: printData,
          direction: 'rtl'
        });
      } catch (error) {
        console.error('Error printing donations:', error);
        this.ui.error('שגיאה בהדפסה');
      }
    });
  }

  async onExport() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build filters (same as refreshData)
        const filters: DonationFilters = {
          searchTerm: this.searchTerm?.trim() || undefined,
          dateFrom: this.dateFrom ? this.formatDateForFilter(this.dateFrom) : undefined,
          dateTo: this.dateTo ? this.formatDateForFilter(this.dateTo) : undefined,
          selectedMethodId: this.selectedMethodId?.trim() || undefined,
          amountFrom: this.amountFrom,
          selectedCampaignId: this.selectedCampaignId?.trim() || undefined,
          selectedDonationType: this.selectedDonationType?.trim() || undefined
        };

        // Fetch ALL donations (no pagination)
        const allDonations = await DonationController.findFilteredDonations(
          filters,
          undefined,
          undefined,
          this.sortColumns
        );

        await this.excelExportService.export({
          data: allDonations,
          columns: [
            { header: this.i18n.currentTerms.donor || 'תורם', mapper: (d) => this.getDonorName(d), width: 25 },
            { header: this.i18n.currentTerms.address || 'כתובת', mapper: (d) => this.getDonorHomeAddress(d), width: 30 },
            { header: this.i18n.currentTerms.date || 'תאריך', mapper: (d) => d.donationDate ? this.hebrewDateService.convertGregorianToHebrew(new Date(d.donationDate)).formatted : '-', width: 15 },
            { header: this.i18n.currentTerms.donationType || 'סוג', mapper: (d) => this.getDonationTypeDisplay(d), width: 12 },
            { header: this.i18n.currentTerms.donationMethodFilter || 'אופן תרומה', mapper: (d) => this.getMethodName(d), width: 12 },
            { header: this.i18n.currentTerms.amount || 'סכום', mapper: (d) => `${this.currencyTypes[d.currencyId]?.symbol || '₪'}${d.amount.toLocaleString('he-IL')}`, width: 12 },
            { header: this.i18n.currentTerms.campaign || 'קמפיין', mapper: (d) => this.getCampaignName(d), width: 15 },
            { header: this.i18n.currentTerms.fundraiserColumn || 'מגייס', mapper: (d) => d.donor?.fundraiser?.name || '-', width: 12 },
            { header: this.i18n.currentTerms.reason || 'הקדשה', mapper: (d) => d.reason || '-', width: 20 }
          ],
          sheetName: this.i18n.currentTerms.donations || 'תרומות',
          fileName: this.excelExportService.generateFileName(this.i18n.currentTerms.donations || 'תרומות')
        });
      } catch (error) {
        console.error('Error exporting donations:', error);
        this.ui.error('שגיאה בייצוא');
      }
    });
  }
}