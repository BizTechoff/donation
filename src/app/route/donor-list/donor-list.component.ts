import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Donor } from '../../../shared/entity';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';
import { DonorService } from '../../services/donor.service';
import { GlobalFilterService } from '../../services/global-filter.service';
import { NavigationRecord, FilterOption, ActiveFilter } from '../../shared/modal-navigation-header/modal-navigation-header.component';
import { remult } from 'remult';

@Component({
  selector: 'app-donor-list',
  templateUrl: './donor-list.component.html',
  styleUrls: ['./donor-list.component.scss']
})
export class DonorListComponent implements OnInit, OnDestroy {

  donors: Donor[] = [];
  loading = false;
  private subscription = new Subscription();

  // Navigation header properties
  allDonors: NavigationRecord[] = [];
  filterOptions: FilterOption[] = [];
  currentDonorRecord?: NavigationRecord;

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
    await this.loadAllDonors();
    this.setupFilterOptions();
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

  private async loadAllDonors() {
    try {
      const donorRepo = remult.repo(Donor);
      const donors = await donorRepo.find({
        limit: 1000,
        orderBy: { firstName: 'asc', lastName: 'asc' }
      });

      this.allDonors = donors.map(donor => ({
        id: donor.id,
        displayName: donor.fullName || donor.displayName,
        name: donor.fullName || donor.displayName,
        city: donor.homePlace?.city || '',
        country: donor.homePlace?.country || '',
        isActive: donor.isActive
      }));
    } catch (error) {
      console.error('Error loading all donors:', error);
    }
  }

  private setupFilterOptions() {
    this.filterOptions = [
      {
        key: 'isActive',
        label: 'סטטוס',
        type: 'select',
        options: [
          { value: 'true', label: 'פעיל' },
          { value: 'false', label: 'לא פעיל' }
        ]
      },
      {
        key: 'city',
        label: 'עיר',
        type: 'select',
        options: [] // Will be populated dynamically
      },
      {
        key: 'country',
        label: 'מדינה',
        type: 'select',
        options: [] // Will be populated dynamically
      }
    ];

    // Populate dynamic options
    this.populateDynamicFilterOptions();
  }

  private populateDynamicFilterOptions() {
    // Get unique cities
    const cities = new Set<string>();
    const countries = new Set<string>();

    this.allDonors.forEach(donor => {
      if (donor['city']) cities.add(donor['city']);
      if (donor['country']) countries.add(donor['country']);
    });

    // Update city filter options
    const cityFilter = this.filterOptions.find(f => f.key === 'city');
    if (cityFilter) {
      cityFilter.options = Array.from(cities).sort().map(city => ({
        value: city,
        label: city
      }));
    }

    // Update country filter options
    const countryFilter = this.filterOptions.find(f => f.key === 'country');
    if (countryFilter) {
      countryFilter.options = Array.from(countries).sort().map(country => ({
        value: country,
        label: country
      }));
    }
  }

  onRecordSelected(record: NavigationRecord) {
    const donor = this.donors.find(d => d.id === record.id);
    if (donor) {
      this.viewDonor(donor);
    }
  }

  onSearchChanged(searchTerm: string) {
    // Implement search logic here
    console.log('Search term changed:', searchTerm);
  }

  onFiltersChanged(filters: ActiveFilter[]) {
    // Implement filter logic here
    console.log('Filters changed:', filters);
  }

  onNavigateNext() {
    // Implement navigation logic
    console.log('Navigate to next');
  }

  onNavigatePrevious() {
    // Implement navigation logic
    console.log('Navigate to previous');
  }
}