import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService, DialogConfig, openDialog } from 'common-ui-elements';
import { Donation, Donor, Campaign } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { DonationDetailsModalComponent } from '../donation-details-modal/donation-details-modal.component';
import { DonationController } from '../../../../shared/controllers/donation.controller';

export interface DonationSelectionModalArgs {
  title?: string;
  excludeIds?: string[];
  multiSelect?: boolean;
  selectedIds?: string[];
  filterByDonorId?: string; // Filter to show only donations of this donor
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '900px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-donation-selection-modal',
  templateUrl: './donation-selection-modal.component.html',
  styleUrls: ['./donation-selection-modal.component.scss']
})
export class DonationSelectionModalComponent implements OnInit {
  args!: DonationSelectionModalArgs;
  selectedDonation: Donation | null = null;
  selectedDonations: Donation[] = [];
  selectedDonationIds: Set<string> = new Set(); // Track selected donation IDs

  // Donations system
  availableDonations: Donation[] = [];
  filteredDonations: Donation[] = [];
  donationRepo = remult.repo(Donation);

  // Maps for donation-related data
  donorMap = new Map<string, Donor>();
  campaignMap = new Map<string, Campaign>();

  // Search/Filter
  filterText = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 0;
  Math = Math;

  // Sorting
  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private busy: BusyService
  ) {}

  async ngOnInit() {
    await this.loadDonations();
  }

  async loadDonations() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const data = await DonationController.getDonationsForSelection(this.args?.excludeIds);
        this.availableDonations = data.donations;

        // Convert Record to Map for easier lookup
        this.donorMap = new Map(Object.entries(data.donorMap));
        this.campaignMap = new Map(Object.entries(data.campaignMap));

        // Apply donor filter if specified
        if (this.args?.filterByDonorId) {
          this.availableDonations = this.availableDonations.filter(
            donation => donation.donorId === this.args.filterByDonorId
          );
        }

        // Pre-select donations if selectedIds provided (in multi-select mode)
        if (this.args?.multiSelect && this.args?.selectedIds && this.args.selectedIds.length > 0) {
          this.selectedDonationIds = new Set(this.args.selectedIds);
          this.selectedDonations = this.availableDonations.filter(donation =>
            this.selectedDonationIds.has(donation.id)
          );
        }

        // Apply filters and sorting
        this.applyFilters();
      } catch (error) {
        console.error('Error loading donations:', error);
      }
    });
  }

  // Apply filters to donations
  applyFilters() {
    let filtered = [...this.availableDonations];

    // Apply text filter
    if (this.filterText.trim()) {
      const term = this.filterText.toLowerCase();
      filtered = filtered.filter(donation => {
        const donor = this.getDonor(donation.donorId);
        const campaign = this.getCampaign(donation.campaignId);

        return donor?.fullName?.toLowerCase().includes(term) ||
               donor?.firstName?.toLowerCase().includes(term) ||
               donor?.lastName?.toLowerCase().includes(term) ||
               campaign?.name?.toLowerCase().includes(term) ||
               donation.amount.toString().includes(term);
      });
    }

    this.filteredDonations = filtered;
    this.totalCount = this.filteredDonations.length;
    this.totalPages = Math.ceil(this.totalCount / this.pageSize);

    // Reset to first page when filters change
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }

    // Apply sorting
    this.applySorting();
  }

  // Apply sorting to filtered donations
  applySorting() {
    if (this.sortColumns.length === 0) {
      return;
    }

    this.filteredDonations.sort((a, b) => {
      for (const sort of this.sortColumns) {
        let aValue: any;
        let bValue: any;

        switch (sort.field) {
          case 'donorName':
            aValue = this.getDonor(a.donorId)?.fullName?.toLowerCase() || '';
            bValue = this.getDonor(b.donorId)?.fullName?.toLowerCase() || '';
            break;
          case 'amount':
            aValue = a.amount;
            bValue = b.amount;
            break;
          case 'date':
            aValue = new Date(a.donationDate).getTime();
            bValue = new Date(b.donationDate).getTime();
            break;
          case 'campaign':
            aValue = this.getCampaign(a.campaignId)?.name?.toLowerCase() || '';
            bValue = this.getCampaign(b.campaignId)?.name?.toLowerCase() || '';
            break;
          default:
            continue;
        }

        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Toggle sort on column
  toggleSort(field: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
      // CTRL/CMD pressed - multi-column sort
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

    this.applySorting();
  }

  isSorted(field: string): boolean {
    return this.sortColumns.some(s => s.field === field);
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

  // Get paginated donations
  get paginatedDonations(): Donation[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredDonations.slice(startIndex, endIndex);
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  firstPage() {
    this.currentPage = 1;
  }

  lastPage() {
    this.currentPage = this.totalPages;
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

  // Helper methods to get donation-related data from maps
  getDonor(donorId: string): Donor | undefined {
    return this.donorMap.get(donorId);
  }

  getCampaign(campaignId: string): Campaign | undefined {
    return this.campaignMap.get(campaignId);
  }

  // Select donation and close dialog immediately (single select mode)
  // Or toggle donation selection in multi-select mode
  selectDonation(donation: Donation) {
    if (this.args.multiSelect) {
      this.toggleDonationSelection(donation);
    } else {
      this.selectedDonation = donation;
      setTimeout(() => {
        this.dialogRef.close(donation);
      }, 100);
    }
  }

  // Toggle donation selection in multi-select mode
  toggleDonationSelection(donation: Donation) {
    if (this.selectedDonationIds.has(donation.id)) {
      this.selectedDonationIds.delete(donation.id);
      const index = this.selectedDonations.findIndex(d => d.id === donation.id);
      if (index !== -1) {
        this.selectedDonations.splice(index, 1);
      }
    } else {
      this.selectedDonationIds.add(donation.id);
      this.selectedDonations.push(donation);
    }
  }

  // Check if donation is selected (for multi-select mode)
  isDonationSelected(donation: Donation): boolean {
    return this.selectedDonationIds.has(donation.id);
  }

  // Finish multi-select and close dialog with selected donations
  finishMultiSelect() {
    this.dialogRef.close(this.selectedDonations);
  }

  // Open create new donation modal
  async createNewDonation() {
    try {
      const dialogResult = await openDialog(
        DonationDetailsModalComponent,
        (modal: DonationDetailsModalComponent) => {
          modal.args = { donationId: 'new' };
        }
      );

      if (dialogResult) {
        await this.loadDonations();

        if (this.availableDonations.length > 0) {
          const newestDonation = this.availableDonations.reduce((prev, current) =>
            (current.createdDate > prev.createdDate) ? current : prev
          );
          this.selectDonation(newestDonation);
        }
      }
    } catch (error) {
      console.error('Error creating new donation:', error);
    }
  }

  // Clear search
  clearSearch() {
    this.filterText = '';
    this.applyFilters();
  }

  // Close dialog without selection
  closeDialog() {
    this.dialogRef.close(null);
  }

  // Get donation display text
  getDonationDisplayText(donation: Donation): string {
    const donor = this.getDonor(donation.donorId);
    const donorName = donor?.fullName || donor?.firstName || 'תורם לא ידוע';
    return `${donorName} - ${donation.amount} ${donation.currency}`;
  }

  // Format date
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('he-IL');
  }
}
