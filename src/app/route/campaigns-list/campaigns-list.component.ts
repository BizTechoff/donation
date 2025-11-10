import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { remult } from 'remult';
import { Campaign } from '../../../shared/entity/campaign';
import { User } from '../../../shared/entity/user';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';
import { GlobalFilterService } from '../../services/global-filter.service';
import { BusyService } from '../../common-ui-elements/src/angular/wait/busy-service';
import { CampaignController, CampaignFilters } from '../../../shared/controllers/campaign.controller';

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

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;

  // Sorting
  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [{ field: 'name', direction: 'asc' }];

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private globalFilterService: GlobalFilterService,
    private busy: BusyService
  ) {}

  async ngOnInit() {
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
  private async refreshData() {
    this.loading = true;
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build local filters
        const localFilters: CampaignFilters = {
          searchTerm: this.filterName?.trim() || this.searchTerm?.trim() || undefined,
          isActive: this.filterActive ? this.filterActive === 'true' : undefined
        };

        const globalFilters = this.globalFilterService.currentFilters;

        console.log('refreshData: Fetching campaigns with globalFilters:', globalFilters, 'localFilters:', localFilters, 'page:', this.currentPage, 'sorting:', this.sortColumns);

        // Get total count and campaigns from server
        [this.totalCount, this.campaigns] = await Promise.all([
          CampaignController.countFilteredCampaigns(globalFilters, localFilters),
          CampaignController.findFilteredCampaigns(globalFilters, localFilters, this.currentPage, this.pageSize, this.sortColumns)
        ]);

        this.totalPages = Math.ceil(this.totalCount / this.pageSize);

        // Calculate summary data
        this.activeCampaigns = this.campaigns.filter(c => c.isActive).length;
        this.totalTargetAmount = this.campaigns.reduce((sum, c) => sum + (c.targetAmount || 0), 0);
        this.totalRaisedAmount = this.campaigns.reduce((sum, c) => sum + (c.raisedAmount || 0), 0);

        console.log('refreshData: Loaded', this.campaigns.length, 'campaigns, total:', this.totalCount);

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
      await this.editingCampaign.save();
      await this.refreshData();
      this.closeModal();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert(this.i18n.currentTerms.campaignManagementError || 'Error saving campaign');
    }
  }

  async deleteCampaign(campaign: Campaign) {
    if (confirm(`${this.i18n.currentTerms.deleteCampaignConfirm || 'Are you sure you want to delete campaign'} ${campaign.name}?`)) {
      try {
        await campaign.delete();
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
}
