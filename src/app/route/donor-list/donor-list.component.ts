import { Component, OnDestroy, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Subscription } from 'rxjs';
import { DonorMapController, DonorMapData } from '../../../shared/controllers/donor-map.controller';
import { Donor, DonorPlace, User } from '../../../shared/entity';
import { BusyService } from '../../common-ui-elements/src/angular/wait/busy-service';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { DonorService } from '../../services/donor.service';
import { GlobalFilterService } from '../../services/global-filter.service';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { ActiveFilter, FilterOption, NavigationRecord } from '../../shared/modal-navigation-header/modal-navigation-header.component';

@Component({
  selector: 'app-donor-list',
  templateUrl: './donor-list.component.html',
  styleUrls: ['./donor-list.component.scss']
})
export class DonorListComponent implements OnInit, OnDestroy {

  donors: Donor[] = [];
  loading = false;
  private subscription = new Subscription();

  // Flag to track if base data was loaded
  private baseDataLoaded = false;

  // Expose Math to template
  Math = Math;

  // Map for donor stats from DonorMapController
  donorDataMap = new Map<string, DonorMapData>();


  // Navigation header properties
  allDonors: NavigationRecord[] = [];
  filterOptions: FilterOption[] = [];
  currentDonorRecord?: NavigationRecord;

  // Local filter properties
  searchTerm = '';

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;

  // Sorting
  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];
  private currentUser?: User;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private donorService: DonorService,
    private globalFilterService: GlobalFilterService,
    private busy: BusyService,
    private hebrewDateService: HebrewDateService
  ) { }

  async ngOnInit() {
    // Subscribe to filter changes
    this.subscription.add(
      this.globalFilterService.filters$.subscribe(() => {
        this.refreshData();
      })
    );

    // Initial data load (includes base data on first call)
    await this.refreshData();
  }

  /**
   * Refresh data based on current filters and sorting
   * Called whenever filters or sorting changes
   * On first call, also loads base data (user settings, mobile labels, etc.)
   */
  private async refreshData() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Load base data once on first call
        if (!this.baseDataLoaded) {
          await this.loadBaseData();
          this.baseDataLoaded = true;
        }

        // Prepare search term (trim and undefined if empty)
        const searchTerm = this.searchTerm?.trim() || undefined;

        // console.log('refreshData: Fetching donors with searchTerm:', searchTerm, 'page:', this.currentPage, 'sorting:', this.sortColumns);

        // Get total count for pagination with search term
        this.totalCount = await this.donorService.countFiltered(searchTerm);
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);

        // Fetch donors with current filters: global filters (auto), searchTerm, pagination, and sorting
        this.donors = await this.donorService.findFiltered(
          searchTerm,
          undefined,
          this.currentPage,
          this.pageSize,
          this.sortColumns
        );

        // console.log('refreshData 4: Loaded', this.donors.length, 'donors');

        // Load all related data using DonorMapController (same as map popup)
        const donorDataList = await DonorMapController.loadDonorsMapDataByIds(
          this.donors.map(d => d.id)
        );

        // Store in map for easy lookup
        this.donorDataMap.clear();
        donorDataList.forEach(data => {
          this.donorDataMap.set(data.donor.id, data);
        });

      } catch (error) {
        console.error('Error refreshing donors:', error);
      }
    });
  }

  /**
   * Load base data once - called only on first refreshData call
   */
  private async loadBaseData() {
    // Load current user and their settings
    await this.loadUserSettings();

    // Set CSS variables for mobile labels
    this.updateMobileLabels();

    // Listen for language changes
    this.i18n.terms$.subscribe(() => {
      this.updateMobileLabels();
    });

    // Load all donors for navigation header
    await this.loadAllDonors();
    this.setupFilterOptions();
  }

  private updateMobileLabels() {
    const root = document.documentElement;
    root.style.setProperty('--label-address', `'${this.i18n.terms.address}: '`);
    root.style.setProperty('--label-phone', `'${this.i18n.terms.phone}: '`);
    root.style.setProperty('--label-email', `'${this.i18n.terms.email}: '`);
    root.style.setProperty('--label-category', `'${this.i18n.terms.category}: '`);
    root.style.setProperty('--label-total-donations', `'${this.i18n.terms.totalDonations}: '`);
    root.style.setProperty('--label-last-donation', `'${this.i18n.terms.lastDonation}: '`);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    if (this.searchTermTimeout) {
      clearTimeout(this.searchTermTimeout);
    }
  }



  private searchTermTimeout: any;

  onLocalFilterChange() {
    // Debounce to avoid calling server on every keystroke
    if (this.searchTermTimeout) {
      clearTimeout(this.searchTermTimeout);
    }

    this.searchTermTimeout = setTimeout(() => {
      // Reset to first page when search changes
      this.currentPage = 1;

      // Refresh data with new search term
      this.refreshData();

      // Save search term to user settings
      this.saveSearchTerm();
    }, 500); // Wait 500ms after user stops typing
  }

  async createDonor() {
    const changed = await this.ui.donorDetailsDialog('new');
    if (changed) {
      await this.refreshData();
    }
  }

  async viewDonor(donor: Donor) {
    const changed = await this.ui.donorDetailsDialog(donor.id);
    if (changed) {
      await this.refreshData();
    }
  }

  async editDonor(donor: Donor) {
    const changed = await this.ui.donorDetailsDialog(donor.id);
    if (changed) {
      await this.refreshData();
    }
  }

  async deleteDonor(donor: Donor) {
    const confirmMessage = this.i18n.currentTerms.confirmDeleteDonor?.replace('{name}', donor.fullName || '') || '';
    const yes = await this.ui.yesNoQuestion(confirmMessage);
    if (yes) {
      try {
        await remult.repo(Donor).delete(donor);
        this.donors = this.donors.filter(d => d.id !== donor.id);
      } catch (error) {
        const msg = `Error deleting donor: ${JSON.stringify(error)}`
        console.error(msg);
        this.ui.error(msg)
      }
    }
  }

  async deactivateDonor(donor: Donor) {
    try {
      await donor.deactivate();
      await this.refreshData();
    } catch (error) {
      console.error('Error deactivating donor:', error);
    }
  }

  // Helper methods to get donor-related data from DonorMapData
  getDonorData(donorId: string): DonorMapData | undefined {
    return this.donorDataMap.get(donorId);
  }

  getDonorEmail(donorId: string): string {
    return this.donorDataMap.get(donorId)?.email || '-';
  }

  getDonorPhone(donorId: string): string {
    return this.donorDataMap.get(donorId)?.phone || '-';
  }

  getDonorAddress(donorId: string): string {
    return this.donorDataMap.get(donorId)?.fullAddress || '-';
  }

  getDonorAverageDonation(donorId: string): number {
    return this.donorDataMap.get(donorId)?.stats.averageDonation || 0;
  }

  getDonorAverageDonationCurrencySymbol(donorId: string): string {
    return this.donorDataMap.get(donorId)?.stats.averageDonationCurrencySymbol || '₪';
  }

  getDonorDonationsCount(donorId: string): number {
    return this.donorDataMap.get(donorId)?.stats.donationCount || 0;
  }

  getDonorLastDonationDate(donorId: string): Date | undefined {
    return this.donorDataMap.get(donorId)?.stats.lastDonationDate || undefined;
  }

  getDonorLastDonationAmount(donorId: string): number {
    return this.donorDataMap.get(donorId)?.stats.lastDonationAmount || 0;
  }

  getDonorLastDonationCurrencySymbol(donorId: string): string {
    return this.donorDataMap.get(donorId)?.stats.lastDonationCurrencySymbol || '₪';
  }

  isDonorLastDonationAsPartner(donorId: string): boolean {
    return this.donorDataMap.get(donorId)?.stats.lastDonationIsPartner || false;
  }

  getDonorLastDonationReason(donorId: string): string {
    return this.donorDataMap.get(donorId)?.stats.lastDonationReason || '-';
  }

  private async loadAllDonors() {
    try {
      const donorRepo = remult.repo(Donor);
      const donors = await donorRepo.find({
        limit: 1000,
        orderBy: { firstName: 'asc', lastName: 'asc' }
      });

      // Load primary DonorPlaces for all donors (בית first, then any other)
      const donorPlacesMap = await DonorPlace.getPrimaryForDonors(donors.map(d => d.id));

      // Create a map of donorId -> primary place
      const placesMap = new Map();
      for (const [donorId, dp] of donorPlacesMap) {
        placesMap.set(donorId, dp.place);
      }

      this.allDonors = donors.map(donor => {
        const place = placesMap.get(donor.id);
        return {
          id: donor.id,
          fullName: donor.fullName || donor.fullNameEnglish || '',
          name: donor.fullName || donor.fullNameEnglish || '',
          city: place?.city || '',
          country: place?.country || '',
          isActive: donor.isActive
        };
      });
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

  // Pagination methods
  async goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      await this.refreshData();
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.refreshData();
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.refreshData();
    }
  }

  async firstPage() {
    this.currentPage = 1;
    await this.refreshData();
  }

  async lastPage() {
    this.currentPage = this.totalPages;
    await this.refreshData();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfWindow = Math.floor(maxPagesToShow / 2);
      let startPage = Math.max(1, this.currentPage - halfWindow);
      let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  // Sorting methods
  async loadUserSettings() {
    try {
      const userRepo = remult.repo(User);
      const userId = remult.user?.id;
      if (userId) {
        const user = await userRepo.findId(userId, {useCache: false});
        if (user) {
          this.currentUser = user;
          // console.log('loadUserSettings',this.currentUser?.settings)
          // Load saved sort settings
          if (this.currentUser?.settings?.donorList?.sort) {
            this.sortColumns = this.currentUser.settings.donorList.sort;
          }
          // Load saved search term
          if (this.currentUser?.settings?.donorList?.searchTerm !== undefined) {
            this.searchTerm = this.currentUser.settings.donorList.searchTerm;
          }
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  }

  async saveSortSettings() {
    if (!this.currentUser) return;

    try {
      if (!this.currentUser.settings) {
        this.currentUser.settings = {} as any;
      }
      if (this.currentUser.settings && !this.currentUser.settings.donorList) {
        this.currentUser.settings.donorList = {};
      }
      if (this.currentUser.settings && this.currentUser.settings.donorList) {
        this.currentUser.settings.donorList.sort = this.sortColumns;
      }

      await remult.repo(User).save(this.currentUser);
    } catch (error) {
      console.error('Error saving sort settings:', error);
    }
  }

  async saveSearchTerm() {
    if (!this.currentUser) return;

    try {
      if (!this.currentUser.settings) {
        this.currentUser.settings = {} as any;
      }
      if (this.currentUser.settings && !this.currentUser.settings.donorList) {
        this.currentUser.settings.donorList = {};
      }
      if (this.currentUser.settings && this.currentUser.settings.donorList) {
        this.currentUser.settings.donorList.searchTerm = this.searchTerm;
      }

      await remult.repo(User).save(this.currentUser);
    } catch (error) {
      console.error('Error saving search term:', error);
    }
  }

  async toggleSort(field: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
      // CTRL/CMD pressed - multi-column sort
      const existingIndex = this.sortColumns.findIndex(s => s.field === field);
      if (existingIndex >= 0) {
        // Toggle direction or remove
        const current = this.sortColumns[existingIndex];
        if (current.direction === 'asc') {
          this.sortColumns[existingIndex].direction = 'desc';
        } else {
          // Remove from sort
          this.sortColumns.splice(existingIndex, 1);
        }
      } else {
        // Add new sort column
        this.sortColumns.push({ field, direction: 'asc' });
      }
    } else {
      // Single column sort
      const existing = this.sortColumns.find(s => s.field === field);
      if (existing && this.sortColumns.length === 1) {
        // Toggle direction
        existing.direction = existing.direction === 'asc' ? 'desc' : 'asc';
      } else {
        // Set as only sort column
        this.sortColumns = [{ field, direction: 'asc' }];
      }
    }

    // All sorting is now handled on server - just reload with new sort
    await this.refreshData();
    this.saveSortSettings();
  }

  getSortIcon(field: string): string {
    const sortIndex = this.sortColumns.findIndex(s => s.field === field);
    if (sortIndex === -1) return '';

    const sort = this.sortColumns[sortIndex];
    const arrow = sort.direction === 'asc' ? '↑' : '↓';

    // Show number if multiple sorts
    if (this.sortColumns.length > 1) {
      return `${arrow}${sortIndex + 1}`;
    }
    return arrow;
  }

  isSorted(field: string): boolean {
    return this.sortColumns.some(s => s.field === field);
  }

  formatHebrewDate(date: Date | undefined): string {
    if (!date) return '-';
    try {
      const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(date));
      return hebrewDate.formatted;
    } catch (error) {
      console.error('Error formatting Hebrew date:', error);
      return '-';
    }
  }

  async openDonorDonations(donor: Donor) {
    await this.ui.donorDonationsDialog(donor.id, 'donations', donor.fullName);
  }

  async openDonorGifts(donor: Donor) {
    await this.ui.donorDonationsDialog(donor.id, 'gifts', donor.fullName);
  }
}