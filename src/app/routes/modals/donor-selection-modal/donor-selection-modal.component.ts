import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService, DialogConfig, openDialog } from 'common-ui-elements';
import { Donor, Place } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { DonorDetailsModalComponent } from '../donor-details-modal/donor-details-modal.component';
import { DonorController } from '../../../../shared/controllers/donor.controller';

export interface DonorSelectionModalArgs {
  title?: string;
  excludeIds?: string[]; // IDs to exclude from selection (e.g., main donor and already selected partners)
  multiSelect?: boolean; // Enable multiple donor selection
  selectedIds?: string[]; // IDs of donors that should be pre-selected (only relevant in multiSelect mode)
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '800px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-donor-selection-modal',
  templateUrl: './donor-selection-modal.component.html',
  styleUrls: ['./donor-selection-modal.component.scss']
})
export class DonorSelectionModalComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  args!: DonorSelectionModalArgs;
  selectedDonor: Donor | null = null;
  selectedDonors: Donor[] = []; // For multi-select mode
  selectedDonorIds: Set<string> = new Set(); // Track selected donor IDs

  // Donors system
  availableDonors: Donor[] = [];
  filteredDonors: Donor[] = [];
  donorRepo = remult.repo(Donor);

  // Maps for donor-related data
  donorEmailMap = new Map<string, string>();
  donorPhoneMap = new Map<string, string>();
  donorPlaceMap = new Map<string, Place>();

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
    await this.loadDonors();
    this.setFocusOnSearch();
  }

  private setFocusOnSearch() {
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 100);
  }

  async loadDonors() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Get global filters
        // Call server-side method to get all data in one request
        // Global filters are fetched from user.settings in the backend
        const data = await DonorController.getDonorsForSelection(this.args?.excludeIds);

        // Set donors
        this.availableDonors = data.donors;

        // Convert Record to Map for easier lookup
        this.donorEmailMap = new Map(Object.entries(data.donorEmailMap));
        this.donorPhoneMap = new Map(Object.entries(data.donorPhoneMap));
        this.donorPlaceMap = new Map(Object.entries(data.donorPlaceMap));

        // Pre-select donors if selectedIds provided (in multi-select mode)
        if (this.args?.multiSelect && this.args?.selectedIds && this.args.selectedIds.length > 0) {
          this.selectedDonorIds = new Set(this.args.selectedIds);
          this.selectedDonors = this.availableDonors.filter(donor =>
            this.selectedDonorIds.has(donor.id)
          );
        }

        // Apply filters and sorting
        this.applyFilters();

      } catch (error) {
        console.error('Error loading donors:', error);
      }
    });
  }

  // Apply filters to donors
  applyFilters() {
    let filtered = [...this.availableDonors];

    // Apply text filter
    if (this.filterText.trim()) {
      const term = this.filterText.toLowerCase();
      filtered = filtered.filter(donor =>
        donor.lastAndFirstName?.toLowerCase().includes(term) ||
        this.getDonorPhone(donor.id)?.toLowerCase().includes(term) ||
        this.getDonorEmail(donor.id)?.toLowerCase().includes(term)
      );
    }

    this.filteredDonors = filtered;
    this.totalCount = this.filteredDonors.length;
    this.totalPages = Math.ceil(this.totalCount / this.pageSize);

    // Reset to first page when filters change
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }

    // Apply sorting
    this.applySorting();
  }

  // Apply sorting to filtered donors
  applySorting() {
    if (this.sortColumns.length === 0) {
      return;
    }

    this.filteredDonors.sort((a, b) => {
      for (const sort of this.sortColumns) {
        let aValue: any;
        let bValue: any;

        switch (sort.field) {
          case 'fullName':
            aValue = a.fullName?.toLowerCase() || '';
            bValue = b.fullName?.toLowerCase() || '';
            break;
          case 'phone':
            aValue = this.getDonorPhone(a.id)?.toLowerCase() || '';
            bValue = this.getDonorPhone(b.id)?.toLowerCase() || '';
            break;
          case 'email':
            aValue = this.getDonorEmail(a.id)?.toLowerCase() || '';
            bValue = this.getDonorEmail(b.id)?.toLowerCase() || '';
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

  // Get paginated donors
  get paginatedDonors(): Donor[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredDonors.slice(startIndex, endIndex);
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

  // Helper methods to get donor-related data from maps
  getDonorEmail(donorId: string): string {
    return this.donorEmailMap.get(donorId) || '';
  }

  getDonorPhone(donorId: string): string {
    return this.donorPhoneMap.get(donorId) || '';
  }

  getDonorPlace(donorId: string): Place | undefined {
    return this.donorPlaceMap.get(donorId);
  }

  // Select donor and close dialog immediately (single select mode)
  // Or toggle donor selection in multi-select mode
  selectDonor(donor: Donor) {
    if (this.args.multiSelect) {
      // Toggle selection in multi-select mode
      this.toggleDonorSelection(donor);
    } else {
      // Single select mode - close immediately
      this.selectedDonor = donor;
      setTimeout(() => {
        this.dialogRef.close(donor);
      }, 100);
    }
  }

  // Toggle donor selection in multi-select mode
  toggleDonorSelection(donor: Donor) {
    if (this.selectedDonorIds.has(donor.id)) {
      this.selectedDonorIds.delete(donor.id);
      const index = this.selectedDonors.findIndex(d => d.id === donor.id);
      if (index !== -1) {
        this.selectedDonors.splice(index, 1);
      }
    } else {
      this.selectedDonorIds.add(donor.id);
      this.selectedDonors.push(donor);
    }
  }

  // Check if donor is selected (for multi-select mode)
  isDonorSelected(donor: Donor): boolean {
    return this.selectedDonorIds.has(donor.id);
  }

  // Finish multi-select and close dialog with selected donors
  finishMultiSelect() {
    this.dialogRef.close(this.selectedDonors);
  }

  // Open create new donor modal
  async createNewDonor() {
    try {
      const dialogResult = await openDialog(
        DonorDetailsModalComponent,
        (modal: DonorDetailsModalComponent) => {
          modal.args = { donorId: 'new' };
        }
      );

      if (dialogResult) {
        // Reload donors list
        await this.loadDonors();

        // If a new donor was created, select it
        if (this.availableDonors.length > 0) {
          const newestDonor = this.availableDonors.reduce((prev, current) =>
            (current.createdDate > prev.createdDate) ? current : prev
          );
          this.selectDonor(newestDonor);
        }
      }
    } catch (error) {
      console.error('Error creating new donor:', error);
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

  // Get donor display name
  getDonorDisplayName(donor: Donor): string {
    return donor.lastAndFirstName
  }
}
