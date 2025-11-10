import { Component, OnInit } from '@angular/core';
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
  args!: DonorSelectionModalArgs;
  selectedDonor: Donor | null = null;
  selectedDonors: Donor[] = []; // For multi-select mode

  // Donors system
  availableDonors: Donor[] = [];
  donorRepo = remult.repo(Donor);

  // Maps for donor-related data
  donorEmailMap = new Map<string, string>();
  donorPhoneMap = new Map<string, string>();
  donorPlaceMap = new Map<string, Place>();

  // Search
  searchTerm = '';

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private busy: BusyService
  ) {}

  async ngOnInit() {
    await this.loadDonors();
  }

  async loadDonors() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Call server-side method to get all data in one request
        const data = await DonorController.getDonorsForSelection(this.args?.excludeIds);

        // Set donors
        this.availableDonors = data.donors;

        // Convert Record to Map for easier lookup
        this.donorEmailMap = new Map(Object.entries(data.donorEmailMap));
        this.donorPhoneMap = new Map(Object.entries(data.donorPhoneMap));
        this.donorPlaceMap = new Map(Object.entries(data.donorPlaceMap));

        // Pre-select donors if selectedIds provided (in multi-select mode)
        if (this.args?.multiSelect && this.args?.selectedIds && this.args.selectedIds.length > 0) {
          this.selectedDonors = this.availableDonors.filter(donor =>
            this.args.selectedIds!.includes(donor.id)
          );
        }

      } catch (error) {
        console.error('Error loading donors:', error);
      }
    });
  }

  // Filter donors based on search term
  getFilteredDonors(): Donor[] {
    if (!this.searchTerm.trim()) {
      return this.availableDonors;
    }

    const term = this.searchTerm.toLowerCase();
    return this.availableDonors.filter(donor =>
      donor.firstName?.toLowerCase().includes(term) ||
      donor.lastName?.toLowerCase().includes(term) ||
      donor.fullName?.toLowerCase().includes(term)
    );
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
    const index = this.selectedDonors.findIndex(d => d.id === donor.id);
    if (index === -1) {
      this.selectedDonors.push(donor);
    } else {
      this.selectedDonors.splice(index, 1);
    }
  }

  // Check if donor is selected (for multi-select mode)
  isDonorSelected(donor: Donor): boolean {
    return this.selectedDonors.some(d => d.id === donor.id);
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
    this.searchTerm = '';
  }

  // Close dialog without selection
  closeDialog() {
    this.dialogRef.close(null);
  }

  // Get donor display name
  getDonorDisplayName(donor: Donor): string {
    return donor.fullName || `${donor.firstName || ''} ${donor.lastName || ''}`.trim();
  }
}
