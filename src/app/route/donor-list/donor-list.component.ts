import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Donor } from '../../../shared/entity';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';

@Component({
  selector: 'app-donor-list',
  templateUrl: './donor-list.component.html',
  styleUrls: ['./donor-list.component.scss']
})
export class DonorListComponent implements OnInit {
  
  donors: Donor[] = [];
  donorRepo = remult.repo(Donor);
  loading = false;
  
  constructor(public i18n: I18nService, private ui: UIToolsService) {}

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
    const changed = await this.ui.donorDetailsDialog('new');
    if (changed) {
      await this.loadDonors();
    }
  }

  async viewDonor(donor: Donor) {
    const changed = await this.ui.donorDetailsDialog(donor.id);
    if (changed) {
      await this.loadDonors();
    }
  }

  async editDonor(donor: Donor) {
    const changed = await this.ui.donorDetailsDialog(donor.id);
    if (changed) {
      await this.loadDonors();
    }
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
}