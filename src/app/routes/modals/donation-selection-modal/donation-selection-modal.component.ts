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

  // Donations system
  availableDonations: Donation[] = [];
  donationRepo = remult.repo(Donation);

  // Maps for donation-related data
  donorMap = new Map<string, Donor>();
  campaignMap = new Map<string, Campaign>();

  // Search
  searchTerm = '';

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

        // Pre-select donations if selectedIds provided (in multi-select mode)
        if (this.args?.multiSelect && this.args?.selectedIds && this.args.selectedIds.length > 0) {
          this.selectedDonations = this.availableDonations.filter(donation =>
            this.args.selectedIds!.includes(donation.id)
          );
        }
      } catch (error) {
        console.error('Error loading donations:', error);
      }
    });
  }

  // Filter donations based on search term
  getFilteredDonations(): Donation[] {
    if (!this.searchTerm.trim()) {
      return this.availableDonations;
    }

    const term = this.searchTerm.toLowerCase();
    return this.availableDonations.filter(donation => {
      const donor = this.getDonor(donation.donorId);
      const campaign = this.getCampaign(donation.campaignId);

      return donor?.fullName?.toLowerCase().includes(term) ||
             donor?.firstName?.toLowerCase().includes(term) ||
             donor?.lastName?.toLowerCase().includes(term) ||
             campaign?.name?.toLowerCase().includes(term) ||
             donation.amount.toString().includes(term);
    });
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
    const index = this.selectedDonations.findIndex(d => d.id === donation.id);
    if (index === -1) {
      this.selectedDonations.push(donation);
    } else {
      this.selectedDonations.splice(index, 1);
    }
  }

  // Check if donation is selected (for multi-select mode)
  isDonationSelected(donation: Donation): boolean {
    return this.selectedDonations.some(d => d.id === donation.id);
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
    this.searchTerm = '';
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
