import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { remult } from 'remult';
import { Subscription } from 'rxjs';
import { DonationController, DonationFilters } from '../../../shared/controllers/donation.controller';
import { CampaignController } from '../../../shared/controllers/campaign.controller';
import { DonorMapController } from '../../../shared/controllers/donor-map.controller';
import { Campaign, Donation, DonationMethod, DonorPlace, User } from '../../../shared/entity';
import { ContactPerson } from '../../../shared/entity/contact-person';
import { BusyService } from '../../common-ui-elements/src/angular/wait/busy-service';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { ExcelExportService, donorNameColumns } from '../../services/excel-export.service';
import { GlobalFilterService } from '../../services/global-filter.service';
import { isPaymentBased, isStandingOrder, calculatePeriodsElapsed } from '../../../shared/utils/donation-utils';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { PayerService } from '../../services/payer.service';
import { PrintService, LabelData, DonationPrintData } from '../../services/print.service';
import { PrintType, DonationPrintOptions } from '../../routes/modals/print-options-modal/print-options-modal.component';
import { FileUploadService } from '../../services/file-upload.service';
import { TableState, TableLoadRequest } from '../../common/table/table-state';

@Component({
  selector: 'app-donations-list',
  templateUrl: './donations-list.component.html',
  styleUrls: ['./donations-list.component.scss']
})
export class DonationsListComponent implements OnInit, OnDestroy {

  donations: Donation[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];
  donorPlacesMap = new Map<string, DonorPlace>();

  donationRepo = remult.repo(Donation);
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
  // P6 / W1 - sorting and paging come from the shared TableState. The five
  // related columns are ordered in SQL through the sqlExpression fields on
  // Donation (see donation.controller), which is what makes them sort the
  // whole list instead of just the page on screen.
  readonly table = new TableState({
    pageSize: 50,
    settingsKey: 'donationsList',
    sortableFields: ['donorName', 'donationDate', 'donationType',
                     'method', 'amount', 'currency', 'campaign', 'fundraiser', 'reason'],
    scrollContainer: () => this.scrollableTable?.nativeElement,
    load: req => this.loadDonations(req)
  });

  // Sorting

  // תצוגה מקדימה ונתונים נוספים
  showPreview = false;
  hebrewDate = '';
  fundraiserName = '';

  // Filter variables
  searchTerm = '';
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  // Scrollable table body handle - reset to top on each data refresh so paging
  // does not leave the user mid-page (Israel Glikson, 1.7.2026).
  @ViewChild('scrollableTable') scrollableTable?: ElementRef<HTMLElement>;
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  selectedMethodId = '';
  amountFrom: number | undefined;
  amountTo: number | undefined;   // K1
  selectedCampaignId = '';
  selectedDonationType = '';
  private filterTimeout: any;
  private subscriptions = new Subscription();

  // Header accordion state (סיכום + פילטרים) — two independent toggles per
  // client 30.6.2026. Persisted per-user in localStorage so the collapsed
  // choice survives page reloads.
  // Z12 - the summary block is hidden per client decision (Zoom 24.08.2026).
  // Flip to true to bring it back; nothing was deleted.
  showSummary = false;

  summaryExpanded = this.loadAccordionState('donations-list.summary', true);
  filtersExpanded = this.loadAccordionState('donations-list.filters', true);

  private loadAccordionState(key: string, defaultOpen: boolean): boolean {
    const saved = localStorage.getItem(`accordion.${key}`);
    if (saved === null) return defaultOpen;
    return saved === '1';
  }

  private saveAccordionState(key: string, open: boolean) {
    localStorage.setItem(`accordion.${key}`, open ? '1' : '0');
  }

  toggleSummaryExpanded() {
    this.summaryExpanded = !this.summaryExpanded;
    this.saveAccordionState('donations-list.summary', this.summaryExpanded);
  }

  toggleFiltersExpanded() {
    this.filtersExpanded = !this.filtersExpanded;
    this.saveAccordionState('donations-list.filters', this.filtersExpanded);
  }

  /**
   * Drives the small orange dot next to "פילטרים" when the filters section is
   * collapsed. True when any of the filter inputs has a non-default value, so
   * the user knows results are being narrowed even while the filters row is hidden.
   */
  get hasActiveFilter(): boolean {
    return !!(
      (this.searchTerm && this.searchTerm.trim()) ||
      this.dateFrom ||
      this.dateTo ||
      this.selectedMethodId ||
      this.amountFrom !== undefined ||
      this.amountTo !== undefined ||
      this.selectedCampaignId ||
      this.selectedDonationType
    );
  }

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
    private excelExportService: ExcelExportService,
    private fileUploadService: FileUploadService
  ) { }

  async ngOnInit() {
    // A global filter change alters the result set - back to page 1.
    this.subscriptions.add(
      this.globalFilterService.filters$.subscribe(() => {
        this.table.reloadFromFirstPage();
      })
    );

    // Saved sort first, then the first fetch - so the very first request
    // already carries the user's persisted sort (same order as donor-list).
    await this.table.loadSettings();
    await this.table.reload();
  }

  /**
   * Refresh data based on current filters and sorting
   * Called whenever filters or sorting changes
   * On first call, also loads base data (currency types, donors, campaigns, methods)
   */
  async refreshData() {
    await this.table.reload();
  }

  /** Fetches one page. TableState owns page/pageSize/sort; this component owns
   *  its rows. Scroll-to-top is handled by TableState. */
  private async loadDonations(req: TableLoadRequest) {
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
          amountTo: this.amountTo,
          selectedCampaignId: this.selectedCampaignId?.trim() || undefined,
          selectedDonationType: this.selectedDonationType?.trim() || undefined
        };

        // Get total count, total amount, commitments, and donations from server with all filters and sorting
        [this.table.totalCount, this.totalFullDonationsCount, this.donationsByCurrency, this.totalCommitmentCount, this.commitmentsByCurrency, this.donations] = await Promise.all([
          DonationController.countFilteredDonations(filters),
          DonationController.countFullDonations(filters),
          DonationController.sumFilteredDonationsByCurrency(filters),
          DonationController.countCommitments(filters),
          DonationController.sumCommitmentsByCurrency(filters),
          DonationController.findFilteredDonations(filters, req.page, req.pageSize, req.sort)
        ]);

        // Load payment totals for commitment and standing order donations
        const paymentBasedIds = this.donations
          .filter(d => isPaymentBased(d))
          .map(d => d.id);
        if (paymentBasedIds.length > 0) {
          this.commitmentPaymentTotals = await DonationController.getPaymentTotalsForCommitments(paymentBasedIds);
        } else {
          this.commitmentPaymentTotals = {};
        }
      } catch (error) {
        console.error('Error refreshing donations:', error);
        this.donations = [];
        this.table.totalCount = 0;
        this.totalFullDonationsCount = 0;
        this.donationsByCurrency = {};
        this.totalCommitmentCount = 0;
        this.commitmentsByCurrency = {};
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

    // Load reference data (campaigns, methods)
    await Promise.all([
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

    // Skip server search for very short text input (1 character matches too
    // many donations and makes typing feel laggy). Empty string is allowed -
    // clearing the search should reset the list. Other filters (dates, etc.)
    // still trigger immediately because they go through different controls.
    const trimmed = (this.searchTerm || '').trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      return;
    }

    // Set a new timeout to reload data after user stops typing/changing filters
    this.filterTimeout = setTimeout(async () => {
      // a filter changes the result set - back to page 1
      await this.table.reloadFromFirstPage();
      this.restoreSearchFocus();
    }, 800); // 800ms debounce (was 300ms - too fast for slow typists)
  }

  private restoreSearchFocus() {
    setTimeout(() => {
      const native = this.searchInput?.nativeElement;
      if (!native) return;
      const active = document.activeElement;
      const isInputAlready = active === native;
      const isOtherInteractive = active && (
        active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT'
      ) && active !== native;
      if (!isInputAlready && !isOtherInteractive) {
        native.focus();
        const len = native.value?.length ?? 0;
        try { native.setSelectionRange(len, len); } catch {}
      }
    }, 150);
  }

  async loadCampaigns() {
    // Load all campaigns (not just active) so users can filter by past campaigns too
    const data = await CampaignController.getCampaignsForSelection();
    this.campaigns = data.campaigns;
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

  /**
   * C2 - double-clicking a row opens that donor's donations list, the same as
   * double-clicking a row in the donor list. Guarded on donorId because a row
   * without a linked donor has nothing to open.
   */
  async openDonorDonationsFromRow(donation: Donation) {
    if (!donation.donorId) return;
    await this.ui.donorDonationsDialog(
      donation.donorId, 'donations', this.getDonorName(donation)
    );
  }

  /**
   * Z13 - a new donation for the donor on this row, prefilled, from the
   * donations list itself. Same call as donor-list.addDonationForDonor so the
   * two screens open the identical dialog in the identical state.
   */
  async addDonationForDonor(donation: Donation) {
    if (!donation.donorId) return;
    const changed = await this.ui.donationDetailsDialog('new', { donorId: donation.donorId });
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
      const result = await this.ui.letterPropertiesDialog(donation.id);

      if (result) {
      }
    } catch (error) {
      console.error('Error printing letter:', error);
      this.ui.error('שגיאה בהפקת מכתב');
    }
  }

  async printDonation(donation: Donation) {
    if (!donation?.id) return;

    try {
      await this.ui.donationPrintDialog(donation.id);
    } catch (error) {
      console.error('Error printing donation:', error);
      this.ui.error('שגיאה בהדפסת תרומה');
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
        symbol: this.currencyTypes[currency]?.symbol || '',
        amount
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get sorted array of commitment totals by currency for display
   */
  get commitmentTotalsByCurrency(): { currency: string; symbol: string; total: number; paid: number }[] {
    return Object.entries(this.commitmentsByCurrency)
      .map(([currency, data]) => ({
        currency,
        symbol: this.currencyTypes[currency]?.symbol || '',
        total: data.total,
        paid: data.paid
      }))
      .sort((a, b) => b.total - a.total);
  }

  getDonorName(donation: Donation): string {
    return donation.donor?.lastAndFirstName || '-';
  }

  /**
   * Z15 - the father's name, shown as a small sub-line under the donor's name,
   * ONLY when another donor shares that name. Both values are computed by the
   * DB on Donor (fatherName / hasDuplicateName), so the screen just reads them.
   */
  getFatherName(donation: Donation): string {
    const donor = donation.donor as any;
    if (!donor?.hasDuplicateName) return '';
    return donor.fatherName ? `בן ${donor.fatherName}` : '';
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

  // Sorting and paging live in `table` (TableState) - the block that used to
  // sit here was another drifted copy (P6/W1).

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
    // Count donations with scans for the dialog
    const donationIds = this.donations.map(d => d.id);
    const scansCount = donationIds.length > 0
      ? await DonationController.countDonationsWithFiles(donationIds)
      : 0;

    await this.ui.printOptionsDialog({
      onPrint: (printType: PrintType, donationOptions?: DonationPrintOptions) =>
        this.executePrint(printType, donationOptions),
      scansCount,
      totalCount: this.table.totalCount
    });
  }

  private async executePrint(printType: PrintType, donationOptions?: DonationPrintOptions) {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build filters (same as refreshData)
        const filters: DonationFilters = {
          searchTerm: this.searchTerm?.trim() || undefined,
          dateFrom: this.dateFrom ? this.formatDateForFilter(this.dateFrom) : undefined,
          dateTo: this.dateTo ? this.formatDateForFilter(this.dateTo) : undefined,
          selectedMethodId: this.selectedMethodId?.trim() || undefined,
          amountFrom: this.amountFrom,
          amountTo: this.amountTo,
          selectedCampaignId: this.selectedCampaignId?.trim() || undefined,
          selectedDonationType: this.selectedDonationType?.trim() || undefined
        };

        // Fetch ALL donations (no pagination)
        const allDonations = await DonationController.findFilteredDonations(
          filters,
          undefined,
          undefined,
          this.table.sortColumns
        );

        if (printType === 'donations') {
          const opts = donationOptions || { printDetails: true, printScans: false, tagPosition: 'top-right' as const };

          // Build donation print data
          const tagPos = opts.tagPosition || 'top-right';
          const donationPrintData: DonationPrintData[] = allDonations.map(donation => {
            const hebrewDate = donation.donationDate
              ? this.hebrewDateService.convertGregorianToHebrew(new Date(donation.donationDate)).formatted
              : '-';
            const currencySymbol = this.currencyTypes[donation.currencyId]?.symbol || '₪';

            return {
              donorName: donation.donor?.fullName || '-',
              donorNameEnglish: donation.donor?.fullNameEnglish || '-',
              amount: `${currencySymbol}${donation.amount.toLocaleString('he-IL')}`,
              hebrewDate,
              donationType: this.getDonationTypeDisplay(donation),
              method: this.getMethodName(donation),
              campaign: this.getCampaignName(donation),
              checkNumber: donation.checkNumber || '',
              reason: donation.reason || '',
              notes: donation.notes || '',
              scans: []
            };
          });

          // Load scan URLs if requested
          if (opts.printScans) {
            for (let i = 0; i < allDonations.length; i++) {
              const files = await this.fileUploadService.getFilesByDonation(allDonations[i].id);
              const imageFiles = files.filter(f => f.fileType.startsWith('image/'));
              for (const file of imageFiles) {
                const url = await this.fileUploadService.getDownloadUrl(file.id);
                if (url) donationPrintData[i].scans.push({ url, tagPosition: tagPos });
              }
            }
          }

          this.printService.printDonations(donationPrintData, opts.printDetails, opts.printScans);
        } else if (printType === 'labels' || printType === 'envelopes') {
          // Get addresses from backend
          const donationIds = allDonations.map(d => d.id);
          const addresses: LabelData[] = await DonationController.getAddressesForDonations(donationIds);

          if (addresses.length === 0) {
            this.ui.info('לא נמצאו כתובות להדפסה');
            return;
          }

          if (printType === 'labels') {
            this.printService.printLabels(addresses);
          } else {
            this.printService.printEnvelopes(addresses);
          }
        } else {
          // Table print (existing behavior)
          // Pre-load donor contacts so we can show phone + mobile phones + email columns.
          const printDonorIds = [...new Set(allDonations.map(d => d.donorId).filter(id => id))] as string[];
          const printContactData = printDonorIds.length > 0
            ? await DonorMapController.loadDonorsForExport(printDonorIds)
            : [];
          const printContactsMap = new Map(printContactData.map(d => [d.id, d]));

          const printData = allDonations.map(donation => {
            const hebrewDate = donation.donationDate
              ? this.hebrewDateService.convertGregorianToHebrew(new Date(donation.donationDate)).formatted
              : '-';
            const currencySymbol = this.currencyTypes[donation.currencyId]?.symbol || '₪';
            const contact = donation.donorId ? printContactsMap.get(donation.donorId) : undefined;

            return {
              // Z15 - the printout mirrors the screen: no address column, and
              // the father's name appended to the donor's name where the name
              // is shared. The full Excel export still carries the address.
              donorName: this.getDonorName(donation) +
                (this.getFatherName(donation) ? ` (${this.getFatherName(donation)})` : ''),
              phone: contact?.phone || '-',
              mobile: contact?.mobile || '-', // item 18
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
              { header: this.i18n.currentTerms.phone || 'טלפון', field: 'phone', align: 'left' },
              { header: this.i18n.currentTerms.mobileColumn || 'נייד', field: 'mobile', align: 'left' },
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
        }
      } catch (error) {
        console.error('Error printing donations:', error);
        this.ui.error('שגיאה בהדפסה');
      }
    });
  }

  // Helper method to translate marital status
  private getMaritalStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'married': this.i18n.currentTerms.married || 'נשוי/ה',
      'single': this.i18n.currentTerms.single || 'רווק/ה',
      'widowed': this.i18n.currentTerms.widowed || 'אלמן/ה',
      'divorced': this.i18n.currentTerms.divorced || 'גרוש/ה'
    };
    return statusMap[status] || '';
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
          amountTo: this.amountTo,
          selectedCampaignId: this.selectedCampaignId?.trim() || undefined,
          selectedDonationType: this.selectedDonationType?.trim() || undefined
        };

        // Fetch ALL donations (no pagination)
        const allDonations = await DonationController.findFilteredDonations(
          filters,
          undefined,
          undefined,
          this.table.sortColumns
        );

        // Load place data for all donors
        const donorIds = [...new Set(allDonations.map(d => d.donorId).filter(id => id))] as string[];
        const placesMap = await DonorPlace.getPrimaryForDonors(donorIds);

        // Load fundraisers and contact persons for lookup
        const [fundraisers, contactPersons] = await Promise.all([
          remult.repo(User).find({ where: { donator: true } }),
          remult.repo(ContactPerson).find()
        ]);
        const fundraiserMap = new Map(fundraisers.map(f => [f.id, f.name]));
        const contactPersonMap = new Map(contactPersons.map(cp => [cp.id, cp.name]));

        // Load donor contacts (phone + mobile phones + email) via shared
        // loadDonorsForExport - same source of truth used by donor-list.
        const contactExportData = donorIds.length > 0
          ? await DonorMapController.loadDonorsForExport(donorIds)
          : [];
        const contactsMap = new Map(contactExportData.map(d => [d.id, d]));

        // Prepare export data with place + contacts (item 18 - landlines / mobiles separately)
        const exportData = allDonations.map(d => ({
          donation: d,
          place: d.donorId ? placesMap.get(d.donorId)?.place : undefined,
          phone: d.donorId ? (contactsMap.get(d.donorId)?.phone || '-') : '-',
          mobile: d.donorId ? (contactsMap.get(d.donorId)?.mobile || '-') : '-',
          email: d.donorId ? (contactsMap.get(d.donorId)?.email || '-') : '-'
        }));

        await this.excelExportService.export({
          data: exportData,
          columns: [
            // Donor fields - Hebrew
            // Item 32 - name columns from the one definition: last name before first.
            ...donorNameColumns<any>((item: any) => item.donation.donor, this.i18n.currentTerms),
            // Fundraiser & Contact Person + donor phone / mobile (item 18)
            { header: this.i18n.currentTerms.fundraiser || 'מתרים', mapper: (item) => item.donation.donor?.fundraiserId ? fundraiserMap.get(item.donation.donor.fundraiserId) || '' : '', width: 15 },
            { header: this.i18n.currentTerms.contactPerson || 'איש קשר', mapper: (item) => item.donation.donor?.contactPersonId ? contactPersonMap.get(item.donation.donor.contactPersonId) || '' : '', width: 15 },
            { header: this.i18n.currentTerms.phone || 'טלפון', mapper: (item) => item.phone || '-', width: 20, align: 'left' },
            { header: this.i18n.currentTerms.mobileColumn || 'נייד', mapper: (item) => item.mobile || '-', width: 20, align: 'left' },
            // Donor characteristics
            { header: this.i18n.currentTerms.maritalStatus || 'מצב משפחתי', mapper: (item) => this.getMaritalStatusText(item.donation.donor?.maritalStatus || ''), width: 12 },
            { header: this.i18n.currentTerms.anash || 'אנ"ש', mapper: (item) => item.donation.donor?.isAnash ? '✓' : '', width: 8 },
            { header: this.i18n.currentTerms.alumni || 'תלמידנו', mapper: (item) => item.donation.donor?.isAlumni ? '✓' : '', width: 8 },
            // Z15 - the combined address column is gone here too, so the export
            // matches the screen and the printout. The granular address fields
            // below are untouched - they are the point of a full export.
            { header: 'שם האב', mapper: (item) => {
                const donor = item.donation.donor as any;
                return donor?.hasDuplicateName && donor?.fatherName ? donor.fatherName : '';
              }, width: 15 },
            // Address fields (granular)
            { header: this.i18n.currentTerms.country || 'מדינה', mapper: (item) => item.place?.country?.name || '', width: 12 },
            { header: this.i18n.currentTerms.city || 'עיר', mapper: (item) => item.place?.city || '', width: 15 },
            { header: this.i18n.currentTerms.state || 'מחוז', mapper: (item) => item.place?.state || '', width: 12 },
            { header: this.i18n.currentTerms.neighborhood || 'שכונה', mapper: (item) => item.place?.neighborhood || '', width: 15 },
            { header: this.i18n.currentTerms.street || 'רחוב', mapper: (item) => item.place?.street || '', width: 15 },
            { header: this.i18n.currentTerms.houseNumber || 'מספר', mapper: (item) => item.place?.houseNumber || '', width: 8 },
            { header: this.i18n.currentTerms.building || 'בניין', mapper: (item) => item.place?.building || '', width: 8 },
            { header: this.i18n.currentTerms.apartment || 'דירה', mapper: (item) => item.place?.apartment || '', width: 8 },
            { header: this.i18n.currentTerms.postcode || 'מיקוד', mapper: (item) => item.place?.postcode || '', width: 10 },
            { header: this.i18n.currentTerms.placeName || 'שם מקום', mapper: (item) => item.place?.placeName || '', width: 15 },
            // Donation fields
            { header: this.i18n.currentTerms.date || 'תאריך', mapper: (item) => item.donation.donationDate ? this.hebrewDateService.convertGregorianToHebrew(new Date(item.donation.donationDate)).formatted : '-', width: 15 },
            { header: this.i18n.currentTerms.donationType || 'סוג', mapper: (item) => this.getDonationTypeDisplay(item.donation), width: 12 },
            { header: this.i18n.currentTerms.donationMethodFilter || 'אופן תרומה', mapper: (item) => this.getMethodName(item.donation), width: 12 },
            { header: this.i18n.currentTerms.amount || 'סכום', mapper: (item) => `${this.currencyTypes[item.donation.currencyId]?.symbol || '₪'}${item.donation.amount.toLocaleString('he-IL')}`, width: 12 },
            { header: this.i18n.currentTerms.campaign || 'קמפיין', mapper: (item) => this.getCampaignName(item.donation), width: 15 },
            { header: this.i18n.currentTerms.fundraiserColumn || 'מגייס', mapper: (item) => item.donation.donor?.fundraiser?.name || '-', width: 12 },
            { header: this.i18n.currentTerms.reason || 'הקדשה', mapper: (item) => item.donation.reason || '-', width: 20 }
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