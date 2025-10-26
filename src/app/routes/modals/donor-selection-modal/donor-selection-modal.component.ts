import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { Donor } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { DonorDetailsModalComponent } from '../donor-details-modal/donor-details-modal.component';

export interface DonorSelectionModalArgs {
  title?: string;
  excludeIds?: string[]; // IDs to exclude from selection (e.g., main donor and already selected partners)
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

  // Donors system
  availableDonors: Donor[] = [];
  donorRepo = remult.repo(Donor);

  // Search
  searchTerm = '';
  loading = false;

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>
  ) {}

  async ngOnInit() {
    await this.loadDonors();
  }

  async loadDonors() {
    this.loading = true;
    try {
      let allDonors = await this.donorRepo.find({
        where: { isActive: true },
        orderBy: { firstName: 'asc' }
      });

      // Exclude specified donor IDs
      if (this.args?.excludeIds && this.args.excludeIds.length > 0) {
        allDonors = allDonors.filter(donor => !this.args.excludeIds!.includes(donor.id));
      }

      this.availableDonors = allDonors;
    } catch (error) {
      console.error('Error loading donors:', error);
    } finally {
      this.loading = false;
    }
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

  // Select donor and close dialog immediately
  selectDonor(donor: Donor) {
    this.selectedDonor = donor;
    setTimeout(() => {
      this.dialogRef.close(donor);
    }, 100);
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
