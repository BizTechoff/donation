import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TableState, TableLoadRequest } from '../../../common/table/table-state';
import { sortRows, pageRows } from '../../../common/table/table-sort';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService, DialogConfig, openDialog } from 'common-ui-elements';
import { Donation, Donor, Campaign } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { DonationDetailsModalComponent } from '../donation-details-modal/donation-details-modal.component';
import { DonationController } from '../../../../shared/controllers/donation.controller';
import { PayerService } from '../../../services/payer.service';

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

  // Scrollable table body handle - reset to top on every page change so paging
  // does not leave the user mid-page (Israel Glikson, 1.7.2026).
  // Pagination here is client-side (slice), so the reset lives in the paging
  // methods rather than in loadDonations().
  @ViewChild('scrollableTable') scrollableTable?: ElementRef<HTMLElement>;

  // Sorting and paging - the shared TableState. The rows are all in the
  // browser here, so the loader sorts and slices them in memory with the
  // same comparator the server uses (table-query sortRows/pageRows).
  readonly table = new TableState({
    pageSize: 20,
    sortableFields: ['donorName', 'amount', 'date', 'campaign'],
    scrollContainer: () => this.scrollableTable?.nativeElement,
    load: req => this.loadPage(req)
  });

  /** The rows of the current page - filled by loadPage. */
  paginatedDonations: Donation[] = [];

currencyTypes = this.payer.getCurrencyTypesRecord()


  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private busy: BusyService,
    private payer: PayerService
  ) {}

  async ngOnInit() {
    await this.loadDonations();
  }

  async loadDonations() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Global filters are fetched from user.settings in the backend
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
    // A filter change starts at page 1 (TableState convention).
    this.table.reloadFromFirstPage();
  }

  /** TableState's loader: sort the filtered rows, take one page. */
  private async loadPage(req: TableLoadRequest) {
    // The value each column shows; createdDate (the tie-breaker) and amount
    // are read from the row itself.
    const sorted = sortRows(this.filteredDonations, req.sort, {
      donorName: d => this.getDonor(d.donorId)?.fullName,
      date: d => d.donationDate ? new Date(d.donationDate) : undefined,
      campaign: d => this.getCampaign(d.campaignId)?.name
    });
    this.table.totalCount = sorted.length;
    this.paginatedDonations = pageRows(sorted, req.page, req.pageSize);
  }

  // Sorting and paging: this.table (TableState) - the local applySorting/
  // toggleSort/isSorted/getSortIcon/paging methods were replaced by it.

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
    return `${donorName} - ${donation.amount} ${this.currencyTypes[donation.currencyId]?.symbol || donation.currencyId}`;
  }

  // Format date
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('he-IL');
  }
}
