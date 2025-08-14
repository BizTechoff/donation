import { Component, OnInit } from '@angular/core';
import { Donor, Donation } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';

export interface DonorDetailsModalArgs {
  donorId: string; // Can be 'new' for new donor or donor ID
}

@Component({
  selector: 'app-donor-details-modal',
  templateUrl: './donor-details-modal.component.html',
  styleUrls: ['./donor-details-modal.component.scss']
})
export class DonorDetailsModalComponent implements OnInit {
  args!: DonorDetailsModalArgs;
  changed = false;

  donor?: Donor;
  originalDonorData?: string; // To track changes
  donations: Donation[] = [];
  donorRepo = remult.repo(Donor);
  donationRepo = remult.repo(Donation);
  loading = false;
  isNewDonor = false;

  constructor(public i18n: I18nService) {}

  async ngOnInit() {
    await this.initializeDonor();
  }

  private async initializeDonor() {
    if (!this.args?.donorId) return;
    
    this.loading = true;
    try {
      if (this.args.donorId === 'new') {
        this.isNewDonor = true;
        this.donor = this.donorRepo.create();
        this.donor.isActive = true;
        this.donor.wantsUpdates = true;
        this.donor.wantsTaxReceipts = true;
        this.donor.preferredLanguage = 'he';
        this.donor.country = 'ישראל';
        this.originalDonorData = JSON.stringify(this.donor);
      } else {
        this.isNewDonor = false;
        this.donor = await this.donorRepo.findId(this.args.donorId) || undefined;
        if (this.donor) {
          this.originalDonorData = JSON.stringify(this.donor);
          await this.loadDonations();
        }
      }
    } catch (error) {
      console.error('Error initializing donor:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDonations() {
    if (!this.donor || !this.donor.id) return;
    
    try {
      this.donations = await this.donationRepo.find({
        where: { donorId: this.donor.id },
        orderBy: { donationDate: 'desc' }
      });
    } catch (error) {
      console.error('Error loading donations:', error);
    }
  }

  private hasChanges(): boolean {
    if (!this.donor || !this.originalDonorData) return false;
    return JSON.stringify(this.donor) !== this.originalDonorData;
  }

  async saveDonor() {
    if (!this.donor) return;

    try {
      const wasNew = this.isNewDonor;
      await this.donor.save();
      
      this.changed = wasNew || this.hasChanges();
      // The dialog will automatically close and return this.changed
    } catch (error) {
      console.error('Error saving donor:', error);
    }
  }

  async deleteDonor() {
    if (!this.donor) return;

    const confirmMessage = this.i18n.currentTerms.confirmDeleteDonor?.replace('{name}', this.donor.fullName || '') || '';
    if (confirm(confirmMessage)) {
      try {
        await this.donor.delete();
        this.changed = true;
        // The dialog will automatically close and return this.changed
      } catch (error) {
        console.error('Error deleting donor:', error);
      }
    }
  }

  async deactivateDonor() {
    if (!this.donor) return;

    try {
      await this.donor.deactivate();
      this.changed = true;
    } catch (error) {
      console.error('Error deactivating donor:', error);
    }
  }

  async activateDonor() {
    if (!this.donor) return;

    try {
      await this.donor.activate();
      this.changed = true;
    } catch (error) {
      console.error('Error activating donor:', error);
    }
  }

  get totalDonations(): number {
    return this.donations.reduce((sum, donation) => sum + donation.amount, 0);
  }

  get donationCount(): number {
    return this.donations.length;
  }

  get lastDonationDate(): Date | undefined {
    return this.donations.length > 0 ? this.donations[0].donationDate : undefined;
  }
}