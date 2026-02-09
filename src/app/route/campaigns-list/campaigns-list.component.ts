import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { remult } from 'remult';
import { Campaign } from '../../../shared/entity/campaign';
import { User } from '../../../shared/entity/user';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';
import { GlobalFilterService } from '../../services/global-filter.service';
import { BusyService } from '../../common-ui-elements/src/angular/wait/busy-service';
import { CampaignController, CampaignFilters, CampaignRaisedByCurrency, CurrencyTotal } from '../../../shared/controllers/campaign.controller';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { Blessing } from '../../../shared/entity/blessing';
import { PayerService } from '../../services/payer.service';
import { PrintService } from '../../services/print.service';
import { ExcelExportService } from '../../services/excel-export.service';

@Component({
  selector: 'app-campaigns-list',
  templateUrl: './campaigns-list.component.html',
  styleUrls: ['./campaigns-list.component.scss']
})
export class CampaignsListComponent implements OnInit, OnDestroy {

  campaigns: Campaign[] = [];
  users: User[] = [];

  campaignRepo = remult.repo(Campaign);
  userRepo = remult.repo(User);

  showAddCampaignModal = false;
  editingCampaign?: Campaign;

  // Local filters
  searchTerm = '';
  filterName = '';
  filterActive = '';
  private filterTimeout: any;
  private subscriptions = new Subscription();

  // Expose Math to template
  Math = Math;

  // Loading state
  loading = false;

  // Summary cards data
  activeCampaigns = 0;
  totalTargetAmount = 0;
  totalRaisedAmount = 0;
  totalRaisedByCurrency: CurrencyTotal[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;

  // Sorting
  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [{ field: 'name', direction: 'asc' }];

  // Maps for campaign-related data
  campaignBlessingCountMap = new Map<string, number>();
  campaignRaisedByCurrencyMap = new Map<string, CurrencyTotal[]>();

  // Currency types for conversion
  currencyTypes: Record<string, { symbol: string; label: string; rateInShekel: number }> = {};

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private globalFilterService: GlobalFilterService,
    private busy: BusyService,
    private hebrewDateService: HebrewDateService,
    private payerService: PayerService,
    private printService: PrintService,
    private excelExportService: ExcelExportService
  ) {}

  async ngOnInit() {
    // Initialize currency types for conversion
    this.currencyTypes = this.payerService.getCurrencyTypesRecord();

    await this.loadBase();

    // Subscribe to global filter changes
    this.subscriptions.add(
      this.globalFilterService.filters$.subscribe(() => {
        this.refreshData();
      })
    );

    await this.refreshData();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
  }

  /**
   * Load base data once - called only on component initialization
   */
  private async loadBase() {
    await this.loadUsers();
  }

  /**
   * Refresh data based on current filters and sorting
   * Called whenever filters or sorting changes
   */
  async refreshData() {
    this.loading = true;
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build local filters
        const localFilters: CampaignFilters = {
          searchTerm: this.filterName?.trim() || this.searchTerm?.trim() || undefined,
          isActive: this.filterActive ? this.filterActive === 'true' : undefined
        };

        // console.log('refreshData: Fetching campaigns with localFilters:', localFilters, 'page:', this.currentPage, 'sorting:', this.sortColumns);

        // Get total count, summary data, and campaigns from server
        // Global filters are fetched from user.settings in the backend
        const [count, summary, campaigns] = await Promise.all([
          CampaignController.countFilteredCampaigns(localFilters),
          CampaignController.getSummaryForFilteredCampaigns(localFilters),
          CampaignController.findFilteredCampaigns(localFilters, this.currentPage, this.pageSize, this.sortColumns)
        ]);

        this.totalCount = count;
        this.campaigns = campaigns;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);

        // Use summary data from server (calculated from all filtered campaigns, not just current page)
        this.activeCampaigns = summary.activeCampaigns;
        this.totalTargetAmount = summary.totalTargetAmount;
        this.totalRaisedAmount = summary.totalRaisedAmount;
        this.totalRaisedByCurrency = summary.totalRaisedByCurrency || [];

        console.log('refreshData 1: Loaded', this.campaigns.length, 'campaigns, total:', this.totalCount, 'active:', this.activeCampaigns);

        // Load blessing counts and raised amounts by currency for all campaigns
        await Promise.all([
          this.loadBlessingCounts(),
          this.loadRaisedAmountsByCurrency()
        ]);

      } catch (error) {
        console.error('Error refreshing campaigns:', error);
        this.campaigns = [];
        this.totalCount = 0;
        this.totalPages = 0;
      } finally {
        this.loading = false;
      }
    });
  }

  /**
   * Load blessing counts for all campaigns in the current page
   */
  private async loadBlessingCounts() {
    if (this.campaigns.length === 0) return;

    const campaignIds = this.campaigns.map(c => c.id);
    const blessingRepo = remult.repo(Blessing);

    // Get all blessings for these campaigns with status 'אישר'
    const blessings = await blessingRepo.find({
      where: {
        campaignId: { $in: campaignIds },
        status: 'מאושר'
      }
    });

    // Count blessings per campaign
    this.campaignBlessingCountMap.clear();
    for (const blessing of blessings) {
      const count = this.campaignBlessingCountMap.get(blessing.campaignId) || 0;
      this.campaignBlessingCountMap.set(blessing.campaignId, count + 1);
    }
  }

  /**
   * Load raised amounts by currency for all campaigns in the current page
   */
  private async loadRaisedAmountsByCurrency() {
    if (this.campaigns.length === 0) return;

    const campaignIds = this.campaigns.map(c => c.id);
    const raisedByCurrency = await CampaignController.getRaisedAmountsByCurrency(campaignIds);

    this.campaignRaisedByCurrencyMap.clear();
    for (const item of raisedByCurrency) {
      this.campaignRaisedByCurrencyMap.set(item.campaignId, item.totals);
    }
  }

  /**
   * Get raised amounts by currency for a campaign
   */
  getRaisedByCurrency(campaign: Campaign): CurrencyTotal[] {
    return this.campaignRaisedByCurrencyMap.get(campaign.id) || [];
  }

  /**
   * Format raised amounts by currency for display
   */
  formatRaisedByCurrency(campaign: Campaign): string {
    const totals = this.getRaisedByCurrency(campaign);
    if (totals.length === 0) {
      return '₪0';
    }
    return totals.map(t => `${t.symbol}${t.total.toLocaleString('he-IL')}`).join(' + ');
  }

  async loadUsers() {
    this.users = await this.userRepo.find({
      where: { secretary: true },
      orderBy: { name: 'asc' }
    });
  }

  applyFilters() {
    // Clear any existing timeout
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }

    // Set a new timeout to reload data after user stops typing/changing filters
    this.filterTimeout = setTimeout(() => {
      console.log('Filter changed, reloading campaigns');
      this.currentPage = 1; // Reset to first page when filters change
      this.refreshData();
    }, 300); // 300ms debounce
  }

  onFilterChange() {
    this.applyFilters();
  }

  // Format helpers for template
  formatCurrency(amount: number | undefined): string {
    if (!amount) return '₪0';
    return `₪${amount.toLocaleString('he-IL')}`;
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

  getInviteesCount(campaign: Campaign): number {
    return campaign.invitedDonorIds?.length || 0;
  }

  getBlessingCount(campaign: Campaign): number {
    return this.campaignBlessingCountMap.get(campaign.id) || 0;
  }

  getProgressPercentage(campaign: Campaign): number {
    if (!campaign.targetAmount || campaign.targetAmount === 0) return 0;

    // Convert all raised amounts to ILS for accurate comparison
    const totals = this.getRaisedByCurrency(campaign);
    const raisedInILS = totals.reduce((sum, t) => {
      const rate = this.currencyTypes[t.currencyId]?.rateInShekel || 1;
      return sum + (t.total * rate);
    }, 0);

    // Convert target amount to ILS
    const targetRate = this.currencyTypes[campaign.currencyId]?.rateInShekel || 1;
    const targetInILS = campaign.targetAmount * targetRate;

    return Math.min(100, Math.round((raisedInILS / targetInILS) * 100));
  }

  // Modal event handlers
  onLocationChange() {
    // Handle location change if needed
  }

  onCampaignTypeChange() {
    // Handle campaign type change if needed
  }

  onStartDateChange(event: any) {
    // Handle start date change if needed
  }

  onEndDateChange(event: any) {
    // Handle end date change if needed
  }

  // Navigation methods for modal
  openBlessingsBook(campaign?: Campaign) {
    const campaignToUse = campaign || this.editingCampaign;
    if (campaignToUse) {
      this.ui.campaignBlessingBookDialog(campaignToUse.id);
    }
  }

  openDonors() {
    if (this.editingCampaign) {
      // Navigate to donors filtered by this campaign
      console.log('Open donors for campaign:', this.editingCampaign.id);
    }
  }

  openContacts() {
    if (this.editingCampaign) {
      // Navigate to contacts for this campaign
      console.log('Open contacts for campaign:', this.editingCampaign.id);
    }
  }

  async createCampaign() {
    const changed = await this.ui.campaignDetailsDialog('new');
    if (changed) {
      await this.refreshData();
    }
  }

  async editCampaign(campaign: Campaign) {
    const changed = await this.ui.campaignDetailsDialog(campaign.id);
    if (changed) {
      await this.refreshData();
    }
  }

  async saveCampaign() {
    if (!this.editingCampaign) return;

    try {
      await remult.repo(Campaign).save(this.editingCampaign);
      await this.refreshData();
      this.closeModal();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert(this.i18n.currentTerms.campaignManagementError || 'Error saving campaign');
    }
  }

  async deleteCampaign(campaign: Campaign) {
    const yes = await this.ui.yesNoQuestion(`${this.i18n.currentTerms.deleteCampaignConfirm || 'Are you sure you want to delete campaign'} ${campaign.name}?`);
    if (yes) {
      try {
        await remult.repo(Campaign).delete(campaign);
        await this.refreshData();
      } catch (error) {
        console.error('Error deleting campaign:', error);
        alert(this.i18n.currentTerms.campaignDeletionError || 'Error deleting campaign');
      }
    }
  }

  async activateCampaign(campaign: Campaign) {
    try {
      await campaign.activate();
      await this.refreshData();
    } catch (error) {
      console.error('Error activating campaign:', error);
    }
  }

  async completeCampaign(campaign: Campaign) {
    try {
      await campaign.complete();
      await this.refreshData();
    } catch (error) {
      console.error('Error completing campaign:', error);
    }
  }

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
  async toggleSort(field: string, event?: MouseEvent) {
    if (event && (event.ctrlKey || event.metaKey)) {
      // CTRL/CMD pressed - multi-column sort
      const existingIndex = this.sortColumns.findIndex(s => s.field === field);
      if (existingIndex >= 0) {
        // Toggle direction or remove
        const current = this.sortColumns[existingIndex];
        if (current.direction === 'asc') {
          this.sortColumns[existingIndex].direction = 'desc';
        } else {
          // Remove from sort
          this.sortColumns.splice(existingIndex, 1);
        }
      } else {
        // Add new sort column
        this.sortColumns.push({ field, direction: 'asc' });
      }
    } else {
      // Single column sort
      const existing = this.sortColumns.find(s => s.field === field);
      if (existing && this.sortColumns.length === 1) {
        // Toggle direction
        existing.direction = existing.direction === 'asc' ? 'desc' : 'asc';
      } else {
        // Set as only sort column
        this.sortColumns = [{ field, direction: 'asc' }];
      }
    }

    // Reload with new sort
    await this.refreshData();
  }

  getSortIcon(field: string): string {
    const sortIndex = this.sortColumns.findIndex(s => s.field === field);
    if (sortIndex === -1) return '';

    const sort = this.sortColumns[sortIndex];
    const arrow = sort.direction === 'asc' ? '↑' : '↓';

    // Show number if multiple sorts
    if (this.sortColumns.length > 1) {
      return `${arrow}${sortIndex + 1}`;
    }
    return arrow;
  }

  isSorted(field: string): boolean {
    return this.sortColumns.some(s => s.field === field);
  }

  // Modal methods
  openModal(campaign?: Campaign) {
    if (campaign) {
      this.editingCampaign = campaign;
    } else {
      this.editingCampaign = remult.repo(Campaign).create();
    }
    this.showAddCampaignModal = true;
  }

  closeModal() {
    this.showAddCampaignModal = false;
    this.editingCampaign = undefined;
  }

  async openBlessingBook(campaign: Campaign) {
    await this.ui.campaignBlessingBookDialog(campaign.id);
  }

  async openInvitedList(campaign: Campaign) {
    await this.ui.campaignInvitedListDialog(campaign.id);
  }

  async openCampaignDonations(campaign: Campaign) {
    await this.ui.campaignDonationsDialog(campaign.id, campaign.name);
    // Refresh data after closing donations modal
    await this.refreshData();
  }

  async onPrint() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build filters (same as refreshData)
        const localFilters: CampaignFilters = {
          searchTerm: this.filterName?.trim() || this.searchTerm?.trim() || undefined,
          isActive: this.filterActive ? this.filterActive === 'true' : undefined
        };

        // Fetch ALL campaigns (no pagination)
        const allCampaigns = await CampaignController.findFilteredCampaigns(
          localFilters,
          undefined,
          undefined,
          this.sortColumns
        );

        // Need to load raised amounts for printing
        const campaignIds = allCampaigns.map(c => c.id);
        const raisedByCurrency = await CampaignController.getRaisedAmountsByCurrency(campaignIds);
        const raisedMap = new Map<string, CurrencyTotal[]>();
        for (const item of raisedByCurrency) {
          raisedMap.set(item.campaignId, item.totals);
        }

        // Prepare data for print
        const printData = allCampaigns.map(campaign => {
          const totals = raisedMap.get(campaign.id) || [];
          const raisedStr = totals.length === 0
            ? '₪0'
            : totals.map(t => `${t.symbol}${t.total.toLocaleString('he-IL')}`).join(' + ');

          return {
            name: campaign.name || '-',
            targetAmount: this.formatCurrency(campaign.targetAmount),
            raised: raisedStr,
            progress: `${this.getProgressPercentageForCampaign(campaign, totals)}%`,
            invitees: campaign.invitedDonorIds?.length || 0,
            blessings: this.campaignBlessingCountMap.get(campaign.id) || 0,
            startDate: this.formatHebrewDate(campaign.startDate),
            endDate: this.formatHebrewDate(campaign.endDate)
          };
        });

        this.printService.print({
          title: this.i18n.currentTerms.campaigns || 'קמפיינים',
          subtitle: `${allCampaigns.length} ${this.i18n.currentTerms.campaigns || 'קמפיינים'}`,
          columns: [
            { header: this.i18n.currentTerms.campaignName || 'שם קמפיין', field: 'name' },
            { header: this.i18n.currentTerms.financialTarget || 'יעד כספי', field: 'targetAmount' },
            { header: this.i18n.currentTerms.collected || 'נגבה', field: 'raised' },
            { header: this.i18n.currentTerms.progressPercentage || 'אחוז התקדמות', field: 'progress' },
            { header: this.i18n.currentTerms.inviteesHeader || 'מוזמנים', field: 'invitees' },
            { header: this.i18n.currentTerms.blessingsHeader || 'ברכות', field: 'blessings' },
            { header: this.i18n.currentTerms.startDate || 'תאריך התחלה', field: 'startDate' },
            { header: this.i18n.currentTerms.endDate || 'תאריך סיום', field: 'endDate' }
          ],
          data: printData,
          direction: 'rtl'
        });
      } catch (error) {
        console.error('Error printing campaigns:', error);
        this.ui.error('שגיאה בהדפסה');
      }
    });
  }

  async onExport() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build filters (same as refreshData)
        const localFilters: CampaignFilters = {
          searchTerm: this.filterName?.trim() || this.searchTerm?.trim() || undefined,
          isActive: this.filterActive ? this.filterActive === 'true' : undefined
        };

        // Fetch ALL campaigns (no pagination)
        const allCampaigns = await CampaignController.findFilteredCampaigns(
          localFilters,
          undefined,
          undefined,
          this.sortColumns
        );

        // Need to load raised amounts for export
        const campaignIds = allCampaigns.map(c => c.id);
        const raisedByCurrency = await CampaignController.getRaisedAmountsByCurrency(campaignIds);
        const raisedMap = new Map<string, CurrencyTotal[]>();
        for (const item of raisedByCurrency) {
          raisedMap.set(item.campaignId, item.totals);
        }

        await this.excelExportService.export({
          data: allCampaigns,
          columns: [
            { header: this.i18n.currentTerms.campaignName || 'שם קמפיין', mapper: (c) => c.name || '-', width: 25 },
            { header: this.i18n.currentTerms.financialTarget || 'יעד כספי', mapper: (c) => this.formatCurrency(c.targetAmount), width: 15 },
            { header: this.i18n.currentTerms.collected || 'נגבה', mapper: (c) => {
              const totals = raisedMap.get(c.id) || [];
              return totals.length === 0
                ? '₪0'
                : totals.map(t => `${t.symbol}${t.total.toLocaleString('he-IL')}`).join(' + ');
            }, width: 15 },
            { header: this.i18n.currentTerms.progressPercentage || 'אחוז התקדמות', mapper: (c) => `${this.getProgressPercentageForCampaign(c, raisedMap.get(c.id) || [])}%`, width: 12 },
            { header: this.i18n.currentTerms.inviteesHeader || 'מוזמנים', mapper: (c) => c.invitedDonorIds?.length || 0, width: 10 },
            { header: this.i18n.currentTerms.blessingsHeader || 'ברכות', mapper: (c) => this.campaignBlessingCountMap.get(c.id) || 0, width: 10 },
            { header: this.i18n.currentTerms.startDate || 'תאריך התחלה', mapper: (c) => this.formatHebrewDate(c.startDate), width: 15 },
            { header: this.i18n.currentTerms.endDate || 'תאריך סיום', mapper: (c) => this.formatHebrewDate(c.endDate), width: 15 }
          ],
          sheetName: this.i18n.currentTerms.campaigns || 'קמפיינים',
          fileName: this.excelExportService.generateFileName(this.i18n.currentTerms.campaigns || 'קמפיינים')
        });
      } catch (error) {
        console.error('Error exporting campaigns:', error);
        this.ui.error('שגיאה בייצוא');
      }
    });
  }

  /**
   * Helper to get progress percentage for print/export (with provided totals)
   */
  private getProgressPercentageForCampaign(campaign: Campaign, totals: CurrencyTotal[]): number {
    if (!campaign.targetAmount || campaign.targetAmount === 0) return 0;

    // Convert all raised amounts to ILS for accurate comparison
    const raisedInILS = totals.reduce((sum, t) => {
      const rate = this.currencyTypes[t.currencyId]?.rateInShekel || 1;
      return sum + (t.total * rate);
    }, 0);

    // Convert target amount to ILS
    const targetRate = this.currencyTypes[campaign.currencyId]?.rateInShekel || 1;
    const targetInILS = campaign.targetAmount * targetRate;

    return Math.min(100, Math.round((raisedInILS / targetInILS) * 100));
  }
}
