import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Donor } from '../../../shared/entity';

@Component({
  selector: 'app-donor-list',
  templateUrl: './donor-list.component.html',
  styleUrls: ['./donor-list.component.scss']
})
export class DonorListComponent implements OnInit {
  
  donors: Donor[] = [];
  donorRepo = remult.repo(Donor);
  loading = false;

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
    const newDonor = this.donorRepo.create();
    this.donors.unshift(newDonor);
  }

  async saveDonor(donor: Donor) {
    try {
      await donor.save();
      await this.loadDonors();
    } catch (error) {
      console.error('Error saving donor:', error);
    }
  }

  async deleteDonor(donor: Donor) {
    if (confirm(`האם אתה בטוח שברצונך למחוק את ${donor.fullName}?`)) {
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