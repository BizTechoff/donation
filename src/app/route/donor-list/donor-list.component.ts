import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Donor } from '../../../shared/entity';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-donor-list',
  templateUrl: './donor-list.component.html',
  styleUrls: ['./donor-list.component.scss']
})
export class DonorListComponent implements OnInit {
  
  donors: Donor[] = [];
  donorRepo = remult.repo(Donor);
  loading = false;
  
  // Modal state
  showAddDonorModal = false;
  editingDonor: Donor | null = null;

  constructor(public i18n: I18nService) {}

  async ngOnInit() {
    await this.loadDonors();
  }

  async loadDonors() {
    this.loading = true;
    try {
      this.donors = await this.donorRepo.find({
        orderBy: { lastName: 'asc' },
        where: { isActive: true }
      });
    } catch (error) {
      console.error('Error loading donors:', error);
    } finally {
      this.loading = false;
    }
  }

  async createDonor() {
    this.editingDonor = this.donorRepo.create();
    this.editingDonor.isActive = true; // Default to active
    this.editingDonor.wantsUpdates = true; // Default preferences
    this.editingDonor.wantsTaxReceipts = true;
    this.editingDonor.preferredLanguage = 'he'; // Default to Hebrew
    this.editingDonor.country = 'ישראל'; // Default country
    this.showAddDonorModal = true;
  }

  closeModal() {
    this.showAddDonorModal = false;
    this.editingDonor = null;
  }

  async saveDonorModal() {
    if (!this.editingDonor || !this.isValidDonor()) {
      return;
    }

    try {
      await this.editingDonor.save();
      await this.loadDonors(); // Refresh the list
      this.closeModal();
    } catch (error) {
      console.error('Error saving donor:', error);
      // TODO: Show error message to user
    }
  }

  isValidDonor(): boolean {
    if (!this.editingDonor) return false;
    
    // Check required fields
    return !!(this.editingDonor.firstName?.trim() && this.editingDonor.lastName?.trim());
  }


  async deleteDonor(donor: Donor) {
    const confirmMessage = this.i18n.currentTerms.confirmDeleteDonor?.replace('{name}', donor.fullName || '') || '';
    if (confirm(confirmMessage)) {
      try {
        await donor.delete();
        this.donors = this.donors.filter(d => d.id !== donor.id);
      } catch (error) {
        console.error('Error deleting donor:', error);
      }
    }
  }

  async deactivateDonor(donor: Donor) {
    try {
      await donor.deactivate();
      await this.loadDonors();
    } catch (error) {
      console.error('Error deactivating donor:', error);
    }
  }

  viewDonor(donor: Donor) {
    // Navigate to donor details - will be implemented with routing
    console.log('Viewing donor:', donor.displayName);
  }

  editDonor(donor: Donor) {
    // Enable inline editing or navigate to edit form
    console.log('Editing donor:', donor.displayName);
  }
}