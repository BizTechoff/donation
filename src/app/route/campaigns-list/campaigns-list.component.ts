import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
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
import { campaignProgress } from '../../../shared/utils/campaign-utils';
import { TableState, TableLoadRequest } from '../../common/table/table-state';
import { PayerService } from '../../services/payer.service';
import { PrintService } from '../../services/print.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { DonorController } from '../../../shared/controllers/donor.controller';

@Component({
  selector: 'app-campaigns-list',
  templateUrl: './campaigns-list.component.html',
  styleUrls: ['./campaigns-list.component.scss']
})
export class CampaignsListComponent implements OnInit, OnDestroy {
  // Summary block hidden per client request (08.09.2026) - the counters at the
  // top of this list are not used day to day and cost vertical space.
  // Same switch as donations-list (Z12): flip to true to bring it back;
  // the markup itself was not removed.
  showSummary = false;


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
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  // Scrollable table body handle - reset to top on each data refresh so paging
  // does not leave the user mid-page (Israel Glikson, 1.7.2026).
  @ViewChild('scrollableTable') scrollableTable?: ElementRef<HTMLElement>;
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

  // Sorting and paging - the shared TableState, like every other list.
  // Default order (name asc) comes from the server when nothing is sorted.
  readonly table = new TableState({
    pageSize: 50,
    settingsKey: 'campaignList',
    sortableFields: ['name', 'targetAmount', 'collected', 'progress', 'invitees', 'blessings', 'startDate', 'endDate'],
    scrollContainer: () => this.scrollableTable?.nativeElement,
    load: req => this.loadPage(req)
  });

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

    await this.table.loadSettings();
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
    await this.table.reload();
  }

  /** TableState's loader - one page, with the sort the user chose. */
  private async loadPage(req: TableLoadRequest) {
    this.loading = true;
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build local filters
        const localFilters: CampaignFilters = {
          searchTerm: this.filterName?.trim() || this.searchTerm?.trim() || undefined,
          isActive: this.filterActive ? this.filterActive === 'true' : undefined
        };

        // console.log('refreshData: Fetching campaigns with localFilters:', localFilters, 'page:', this.currentPage, 'sorting:', this.table.sortColumns);

        // Get total count, summary data, and campaigns from server
        // Global filters are fetched from user.settings in the backend
        const [count, summary, campaigns] = await Promise.all([
          CampaignController.countFilteredCampaigns(localFilters),
          CampaignController.getSummaryForFilteredCampaigns(localFilters),
          CampaignController.findFilteredCampaigns(localFilters, req.page, req.pageSize, req.sort)
        ]);

        this.table.totalCount = count;
        this.campaigns = campaigns;

        // Use summary data from server (calculated from all filtered campaigns, not just current page)
        this.activeCampaigns = summary.activeCampaigns;
        this.totalTargetAmount = summary.totalTargetAmount;
        this.totalRaisedAmount = summary.totalRaisedAmount;
        this.totalRaisedByCurrency = summary.totalRaisedByCurrency || [];

        console.log('refreshData 1: Loaded', this.campaigns.length, 'campaigns, total:', this.table.totalCount, 'active:', this.activeCampaigns);

        // Load blessing counts and raised amounts by currency for all campaigns
        await Promise.all([
          this.loadBlessingCounts(),
          this.loadRaisedAmountsByCurrency()
        ]);

        // Scroll-to-top after each load is done by TableState.

      } catch (error) {
        console.error('Error refreshing campaigns:', error);
        this.campaigns = [];
        this.table.totalCount = 0;
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
    const { secretaries } = await DonorController.getExportLookups();
    this.users = secretaries as unknown as User[];
  }

  applyFilters() {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }

    // Skip server search for very short text input (1 char matches too many).
    // Empty string allowed - clearing the search resets the list.
    const trimmed = (this.filterName || '').trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      return;
    }

    this.filterTimeout = setTimeout(async () => {
      console.log('Filter changed, reloading campaigns');
      await this.table.reloadFromFirstPage();
      this.restoreSearchFocus();
    }, 800); // 800ms debounce (was 300ms - too fast for slow typists)
  }

  private restoreSearchFocus() {
    // 150ms delay so Angular finishes change-detection AND the BusyService
    // overlay closes BEFORE we try to focus. With 0ms the busy overlay was
    // still the active element on slower connections, so the focus restore
    // condition (active===body) was never met.
    setTimeout(() => {
      const native = this.searchInput?.nativeElement;
      if (!native) return;
      const active = document.activeElement;
      // Restore focus if it was lost (body) OR currently on the busy overlay /
      // a non-input element that took focus during loading.
      const isInputAlready = active === native;
      const isInteractive = active && (
        active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT'
      ) && active !== native;
      if (!isInputAlready && !isInteractive) {
        native.focus();
        const len = native.value?.length ?? 0;
        try { native.setSelectionRange(len, len); } catch {}
      }
    }, 150);
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
    // Shared with the server sort - see shared/utils/campaign-utils.
    return campaignProgress(campaign, this.getRaisedByCurrency(campaign), this.currencyTypes);
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

  // Paging and sorting: this.table (TableState) - the local copies of
  // goToPage/next/prev/first/last/getPageNumbers/toggleSort/getSortIcon/
  // isSorted were replaced by the shared implementation.

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
          this.table.sortColumns
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
          this.table.sortColumns
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
    return campaignProgress(campaign, totals, this.currencyTypes);
  }
}
