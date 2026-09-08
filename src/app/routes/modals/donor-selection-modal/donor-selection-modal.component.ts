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
import { TableState, TableLoadRequest } from '../../../common/table/table-state';

export interface DonorSelectionModalArgs {
  title?: string;
  excludeIds?: string[];
  multiSelect?: boolean;
  selectedIds?: string[];
  /** Z5 - set false when the picker is used for filtering, where creating a
   *  new donor is meaningless. Defaults to allowed for every existing caller. */
  allowCreate?: boolean;
}

@DialogConfig({
  hasBackdrop: true,
  // Per client (Israel Glikson 1.7.2026): the donor picker used to top out at
  // 800px which was too narrow for a comfortable multi-column donor list -
  // names + addresses were getting squeezed. Widen to 95vw / 95vh so the modal
  // uses almost the whole viewport and many more rows fit at a glance.
  maxWidth: '75vw',
  maxHeight: '95vh',
  width: '75vw',
  height: '95vh'
})
@Component({
  selector: 'app-donor-selection-modal',
  templateUrl: './donor-selection-modal.component.html',
  styleUrls: ['./donor-selection-modal.component.scss']
})
export class DonorSelectionModalComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  // Handle to the scrollable table body so paging can reset scroll to the top
  // (per client Israel Glikson, 1.7.2026 - user was ending up mid-page on the
  // next page's data and having to scroll up manually).
  @ViewChild('scrollableTable') scrollableTable?: ElementRef<HTMLElement>;

  args!: DonorSelectionModalArgs;
  selectedDonor: Donor | null = null;
  selectedDonors: Donor[] = [];
  selectedDonorIds: Set<string> = new Set();

  availableDonors: Donor[] = [];

  donorEmailMap = new Map<string, string>();
  donorPhoneMap = new Map<string, string>();
  donorPlaceMap = new Map<string, Place>();

  filterText = '';

  // Sorting and paging come from the shared TableState. All four columns are
  // ordered by the DB now - phone and email map to sqlExpression fields on
  // Donor (see donor.controller), so the old in-memory sort of the CURRENT
  // PAGE only is gone.
  readonly table = new TableState({
    pageSize: 50,
    sortableFields: ['fullName', 'phone', 'email', 'address'],
    scrollContainer: () => this.scrollableTable?.nativeElement,
    load: req => this.loadDonorsPage(req)
  });

  // Tracks whether "select all" was clicked and applied to the whole current
  // filter (across all pages). Reset when the user unchecks any single donor
  // or when the filter changes (search / page navigation reload sets this via
  // recomputeAllInFilterFlag()). Used by areAllSelected() so the header
  // checkbox stays "checked" while paging through the results.
  private allInCurrentFilterSelected = false;


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
    await this.table.reload();
  }

  private async loadDonorsPage(req: TableLoadRequest) {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const data = await DonorController.getDonorsForSelectionPage({
          search: this.filterText?.trim() || undefined,
          page: req.page,
          pageSize: req.pageSize,
          excludeIds: this.args?.excludeIds,
          sortColumns: req.sort
        });

        this.availableDonors = data.donors;
        this.table.totalCount = data.totalCount;

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

      } catch (error) {
        console.error('Error loading donors:', error);
      }
    });
  }

  onSearchChange() {
    // Changing the search means the "current filter" changes too, so the
    // header checkbox must no longer report "all selected" until the user
    // presses it again for the new filter.
    this.allInCurrentFilterSelected = false;
    this.searchSubject.next();
  }

  // Sorting and paging live in `table` (TableState).

  get paginatedDonors(): Donor[] {
    return this.availableDonors;
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
      // Any single un-check breaks the "all in current filter" state.
      this.allInCurrentFilterSelected = false;
    } else {
      this.selectedDonorIds.add(donor.id);
      this.selectedDonors.push(donor);
    }
  }

  isDonorSelected(donor: Donor): boolean {
    return this.selectedDonorIds.has(donor.id);
  }

  /**
   * Header checkbox is "checked" when either:
   *   - The user pressed "select all" for the current filter (flag stays true
   *     across page navigation), OR
   *   - Every donor visible on the current page is already selected
   *     (backwards-compatible behavior for small result sets).
   */
  areAllSelected(): boolean {
    if (this.allInCurrentFilterSelected) return true;
    return this.availableDonors.length > 0 &&
           this.availableDonors.every(d => this.selectedDonorIds.has(d.id));
  }

  /**
   * "Select all" now spans every page of the current filter (per client
   * request 30.6.2026 - Israel Glikson). Single backend round-trip: the
   * controller returns full Donor objects (the server already loaded them
   * to compute the filter), so we can push them straight into selectedDonors
   * without a second .find() query.
   */
  async toggleSelectAll() {
    if (this.areAllSelected()) {
      // Uncheck - clear ALL selections (including from other pages).
      this.selectedDonorIds.clear();
      this.selectedDonors = [];
      this.allInCurrentFilterSelected = false;
      return;
    }

    await this.busy.doWhileShowingBusy(async () => {
      const allDonors = await DonorController.getAllDonorsForSelection({
        search: this.filterText?.trim() || undefined,
        excludeIds: this.args?.excludeIds
      });

      for (const donor of allDonors) {
        if (!this.selectedDonorIds.has(donor.id)) {
          this.selectedDonorIds.add(donor.id);
          this.selectedDonors.push(donor);
        }
      }

      this.allInCurrentFilterSelected = true;
    });
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
    this.table.reloadFromFirstPage();
  }

  closeDialog() {
    this.dialogRef.close(null);
  }

  getDonorDisplayName(donor: Donor): string {
    return donor.lastAndFirstName;
  }
}
