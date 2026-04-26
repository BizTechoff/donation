import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { BusyService, DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Donor, Place } from '../../../../shared/entity';
import { I18nService } from '../../../i18n/i18n.service';
import { DonorDetailsModalComponent } from '../donor-details-modal/donor-details-modal.component';
import { DonorController } from '../../../../shared/controllers/donor.controller';

export interface DonorSelectionModalArgs {
  title?: string;
  excludeIds?: string[];
  multiSelect?: boolean;
  selectedIds?: string[];
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
  selectedDonors: Donor[] = [];
  selectedDonorIds: Set<string> = new Set();

  availableDonors: Donor[] = [];

  donorEmailMap = new Map<string, string>();
  donorPhoneMap = new Map<string, string>();
  donorPlaceMap = new Map<string, Place>();

  filterText = '';

  currentPage = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 0;
  Math = Math;

  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private busy: BusyService
  ) {}

  async ngOnInit() {
    // Pre-populate selection state from args (before first load)
    if (this.args?.multiSelect && this.args?.selectedIds?.length) {
      this.selectedDonorIds = new Set(this.args.selectedIds);
      // Preload selected donor objects so finishMultiSelect() can return them
      const preloaded = await remult.repo(Donor).find({
        where: { id: { $in: this.args.selectedIds } }
      });
      this.selectedDonors = preloaded;
    }

    // Debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadDonors();
    });

    await this.loadDonors();
    this.setFocusOnSearch();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setFocusOnSearch() {
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 100);
  }

  async loadDonors() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const dbSortColumns = this.sortColumns.filter(
          s => s.field !== 'phone' && s.field !== 'email'
        );

        const data = await DonorController.getDonorsForSelectionPage({
          search: this.filterText?.trim() || undefined,
          page: this.currentPage,
          pageSize: this.pageSize,
          excludeIds: this.args?.excludeIds,
          sortColumns: dbSortColumns
        });

        this.availableDonors = data.donors;
        this.totalCount = data.totalCount;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);

        this.donorEmailMap = new Map(Object.entries(data.donorEmailMap));
        this.donorPhoneMap = new Map(Object.entries(data.donorPhoneMap));
        this.donorPlaceMap = new Map(Object.entries(data.donorPlaceMap));

        // Merge any newly-seen pre-selected donors into selectedDonors
        if (this.selectedDonorIds.size > 0) {
          for (const donor of this.availableDonors) {
            if (this.selectedDonorIds.has(donor.id) &&
                !this.selectedDonors.some(s => s.id === donor.id)) {
              this.selectedDonors.push(donor);
            }
          }
        }

        // Apply client-side sort for phone/email (within current page)
        this.applySorting();

      } catch (error) {
        console.error('Error loading donors:', error);
      }
    });
  }

  onSearchChange() {
    this.searchSubject.next();
  }

  // Client-side sort for cross-entity fields (phone/email) — applied to current page only
  private applySorting() {
    const crossEntitySorts = this.sortColumns.filter(
      s => s.field === 'phone' || s.field === 'email'
    );
    if (crossEntitySorts.length === 0) return;

    this.availableDonors.sort((a, b) => {
      for (const sort of crossEntitySorts) {
        const aValue = (sort.field === 'phone'
          ? this.getDonorPhone(a.id)
          : this.getDonorEmail(a.id)).toLowerCase();
        const bValue = (sort.field === 'phone'
          ? this.getDonorPhone(b.id)
          : this.getDonorEmail(b.id)).toLowerCase();

        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

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

    if (field === 'phone' || field === 'email') {
      this.applySorting();
    } else {
      this.currentPage = 1;
      this.loadDonors();
    }
  }

  isSorted(field: string): boolean {
    return this.sortColumns.some(s => s.field === field);
  }

  getSortIcon(field: string): string {
    const sortIndex = this.sortColumns.findIndex(s => s.field === field);
    if (sortIndex === -1) return '';
    const sort = this.sortColumns[sortIndex];
    const arrow = sort.direction === 'asc' ? '↑' : '↓';
    return this.sortColumns.length > 1 ? `${arrow}${sortIndex + 1}` : arrow;
  }

  get paginatedDonors(): Donor[] {
    return this.availableDonors;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadDonors();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadDonors();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadDonors();
    }
  }

  firstPage() {
    if (this.currentPage !== 1) {
      this.currentPage = 1;
      this.loadDonors();
    }
  }

  lastPage() {
    if (this.currentPage !== this.totalPages) {
      this.currentPage = this.totalPages;
      this.loadDonors();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      const halfWindow = Math.floor(maxPagesToShow / 2);
      let startPage = Math.max(1, this.currentPage - halfWindow);
      let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      for (let i = startPage; i <= endPage; i++) pages.push(i);
    }

    return pages;
  }

  getDonorEmail(donorId: string): string {
    return this.donorEmailMap.get(donorId) || '';
  }

  getDonorPhone(donorId: string): string {
    return this.donorPhoneMap.get(donorId) || '';
  }

  getDonorPlace(donorId: string): Place | undefined {
    return this.donorPlaceMap.get(donorId);
  }

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

  toggleDonorSelection(donor: Donor) {
    if (this.selectedDonorIds.has(donor.id)) {
      this.selectedDonorIds.delete(donor.id);
      const index = this.selectedDonors.findIndex(d => d.id === donor.id);
      if (index !== -1) this.selectedDonors.splice(index, 1);
    } else {
      this.selectedDonorIds.add(donor.id);
      this.selectedDonors.push(donor);
    }
  }

  isDonorSelected(donor: Donor): boolean {
    return this.selectedDonorIds.has(donor.id);
  }

  areAllSelected(): boolean {
    return this.availableDonors.length > 0 &&
           this.availableDonors.every(d => this.selectedDonorIds.has(d.id));
  }

  toggleSelectAll() {
    if (this.areAllSelected()) {
      this.availableDonors.forEach(d => {
        this.selectedDonorIds.delete(d.id);
        const idx = this.selectedDonors.findIndex(s => s.id === d.id);
        if (idx !== -1) this.selectedDonors.splice(idx, 1);
      });
    } else {
      this.availableDonors.forEach(d => {
        if (!this.selectedDonorIds.has(d.id)) {
          this.selectedDonorIds.add(d.id);
          this.selectedDonors.push(d);
        }
      });
    }
  }

  finishMultiSelect() {
    this.dialogRef.close(this.selectedDonors);
  }

  async createNewDonor() {
    try {
      const dialogResult = await openDialog(
        DonorDetailsModalComponent,
        (modal: DonorDetailsModalComponent) => {
          modal.args = { donorId: 'new' };
        }
      );

      if (dialogResult) {
        await this.loadDonors();
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

  clearSearch() {
    this.filterText = '';
    this.currentPage = 1;
    this.loadDonors();
  }

  closeDialog() {
    this.dialogRef.close(null);
  }

  getDonorDisplayName(donor: Donor): string {
    return donor.lastAndFirstName;
  }
}
