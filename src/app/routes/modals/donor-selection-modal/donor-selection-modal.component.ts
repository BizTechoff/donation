import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
export class DonorSelectionModalComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  args!: DonorSelectionModalArgs;
  selectedDonor: Donor | null = null;
  selectedDonors: Donor[] = []; // For multi-select mode
  selectedDonorIds: Set<string> = new Set(); // Track selected donor IDs

  filteredDonors: Donor[] = []; // Current page from server
  donorRepo = remult.repo(Donor);

  // Maps for donor-related data (populated per page)
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

  private searchSubject = new Subject<string>();

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private busy: BusyService
  ) {}

  async ngOnInit() {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.currentPage = 1;
      this.loadPage();
    });

    // Pre-resolve selected donors for multi-select mode
    if (this.args?.multiSelect && this.args?.selectedIds?.length) {
      this.selectedDonorIds = new Set(this.args.selectedIds);
      const resolved = await Promise.all(
        this.args.selectedIds.map(id => this.donorRepo.findId(id))
      );
      this.selectedDonors = resolved.filter((d): d is Donor => d !== null && d !== undefined);
    }

    await this.loadPage();
    this.setFocusOnSearch();
  }

  ngOnDestroy() {
    this.searchSubject.complete();
  }

  private setFocusOnSearch() {
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 100);
  }

  async loadPage() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const data = await DonorController.getDonorsForSelectionPage({
          search: this.filterText.trim() || undefined,
          page: this.currentPage,
          pageSize: this.pageSize,
          excludeIds: this.args?.excludeIds,
          sortColumns: this.sortColumns
        });

        this.filteredDonors = data.donors;
        this.totalCount = data.totalCount;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);

        this.donorEmailMap = new Map(Object.entries(data.donorEmailMap));
        this.donorPhoneMap = new Map(Object.entries(data.donorPhoneMap));
        this.donorPlaceMap = new Map(Object.entries(data.donorPlaceMap));
      } catch (error) {
        console.error('Error loading donors:', error);
      }
    });
  }

  // Keep loadDonors as alias for backward compatibility (called in createNewDonor flow)
  async loadDonors() {
    this.currentPage = 1;
    await this.loadPage();
  }

  // Trigger debounced server search
  applyFilters() {
    this.searchSubject.next(this.filterText);
  }

  // Toggle sort — triggers server reload
  toggleSort(field: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
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
      const existing = this.sortColumns.find(s => s.field === field);
      if (existing && this.sortColumns.length === 1) {
        existing.direction = existing.direction === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortColumns = [{ field, direction: 'asc' }];
      }
    }

    this.currentPage = 1;
    this.loadPage();
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

  // Server already paginates — return current page directly
  get paginatedDonors(): Donor[] {
    return this.filteredDonors;
  }

  // Pagination methods — each triggers a server call
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPage();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadPage();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPage();
    }
  }

  firstPage() {
    this.currentPage = 1;
    this.loadPage();
  }

  lastPage() {
    this.currentPage = this.totalPages;
    this.loadPage();
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
      this.toggleDonorSelection(donor);
    } else {
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

  // Check if all donors are selected (compares against server totalCount)
  areAllSelected(): boolean {
    return this.totalCount > 0 && this.selectedDonorIds.size === this.totalCount;
  }

  // Toggle select all — loads all matching donors (capped at 500) for select-all case
  async toggleSelectAll() {
    if (this.areAllSelected()) {
      this.selectedDonorIds.clear();
      this.selectedDonors = [];
    } else {
      const allData = await DonorController.getDonorsForSelectionPage({
        search: this.filterText.trim() || undefined,
        page: 1,
        pageSize: Math.min(this.totalCount, 500),
        excludeIds: this.args?.excludeIds
      });
      this.selectedDonorIds = new Set(allData.donors.map(d => d.id));
      this.selectedDonors = allData.donors;
    }
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
        // Load newest donor (by createdDate desc) to auto-select after creation
        const newestData = await DonorController.getDonorsForSelectionPage({
          page: 1,
          pageSize: 1,
          sortColumns: [{ field: 'createdDate', direction: 'desc' }]
        });
        await this.loadPage();
        if (newestData.donors.length > 0) {
          this.selectDonor(newestData.donors[0]);
        }
      }
    } catch (error) {
      console.error('Error creating new donor:', error);
    }
  }

  // Clear search
  clearSearch() {
    this.filterText = '';
    this.currentPage = 1;
    this.loadPage();
  }

  // Close dialog without selection
  closeDialog() {
    this.dialogRef.close(null);
  }

  // Get donor display name
  getDonorDisplayName(donor: Donor): string {
    return donor.lastAndFirstName;
  }
}
