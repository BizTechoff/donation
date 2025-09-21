import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Donor } from '../../../shared/entity';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';
import { DonorService } from '../../services/donor.service';
import { GlobalFilterService } from '../../services/global-filter.service';

@Component({
  selector: 'app-donor-list',
  templateUrl: './donor-list.component.html',
  styleUrls: ['./donor-list.component.scss']
})
export class DonorListComponent implements OnInit, OnDestroy {

  donors: Donor[] = [];
  loading = false;
  private subscription = new Subscription();

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private donorService: DonorService,
    private filterService: GlobalFilterService
  ) {}

  async ngOnInit() {
    // Subscribe to filter changes
    this.subscription.add(
      this.filterService.filters$.subscribe(() => {
        this.loadDonors();
      })
    );
    await this.loadDonors();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async loadDonors() {
    this.loading = true;
    try {
      // Use the new service which automatically applies global filters
      this.donors = await this.donorService.findFiltered();
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