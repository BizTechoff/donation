import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { CompanyInfo, Donation, Donor, DonorEvent, Event, Place, Contact, Country, User } from '../../../../shared/entity';
import { AddressComponents, OsmAddressInputComponent } from '../../../common/osm-address-input/osm-address-input.component';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { ActiveFilter, FilterOption, ModalNavigationHeaderComponent, NavigationRecord } from '../../../shared/modal-navigation-header/modal-navigation-header.component';
import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { DonorDonationsModalArgs, DonorDonationsModalComponent } from '../donor-donations-modal/donor-donations-modal.component';

export interface DonorDetailsModalArgs {
  donorId: string; // Can be 'new' for new donor or donor ID
}

// PersonalEvent interface is no longer needed - using DonorEvent entity instead

@Component({
  selector: 'app-donor-details-modal',
  templateUrl: './donor-details-modal.component.html',
  styleUrls: ['./donor-details-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ModalNavigationHeaderComponent,
    SharedComponentsModule,
    OsmAddressInputComponent
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class DonorDetailsModalComponent implements OnInit {
  args!: DonorDetailsModalArgs;
  changed = false;

  donor?: Donor;
  originalDonorData?: string; // To track changes
  donations: Donation[] = [];
  donorRepo = remult.repo(Donor);
  donationRepo = remult.repo(Donation);
  countryRepo = remult.repo(Country);
  countries: Country[] = [];
  eventRepo = remult.repo(Event);
  donorEventRepo = remult.repo(DonorEvent);
  contactRepo = remult.repo(Contact);
  userRepo = remult.repo(User);
  loading = false;
  isNewDonor = false;

  // Contact related
  contacts: Contact[] = [];
  selectedContact?: Contact;

  // Fundraisers (users with donator=true)
  fundraisers: User[] = [];

  // Events system
  availableEvents: Event[] = [];
  donorEvents: DonorEvent[] = [];

  // Custom personal dates (legacy - keeping for backward compatibility)
  customPersonalDates: { name: string; date: Date | null }[] = [];

  // Navigation header properties
  allDonors: NavigationRecord[] = [];
  filterOptions: FilterOption[] = [];
  currentDonorRecord?: NavigationRecord;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private changeDetector: ChangeDetectorRef,
    public dialogRef: MatDialogRef<DonorDetailsModalComponent>
  ) { }

  async ngOnInit() {
    await this.loadAvailableEvents();
    await this.loadCountries();
    await this.loadContacts();
    await this.loadFundraisers();
    await this.initializeDonor();
    await this.loadAllDonors();
    this.setupFilterOptions();
  }

  private async loadAvailableEvents() {
    try {
      this.availableEvents = await this.eventRepo.find({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc', description: 'asc' }
      });
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }

  private async loadCountries() {
    try {
      this.countries = await this.countryRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      console.log(`Loaded ${this.countries.length} countries from database`);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }

  private async loadContacts() {
    try {
      this.contacts = await this.contactRepo.find({
        orderBy: { firstName: 'asc', lastName: 'asc' }
      });
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }

  private async loadFundraisers() {
    try {
      this.fundraisers = await this.userRepo.find({
        where: { disabled: false, donator: true },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('Error loading fundraisers:', error);
    }
  }

  private async setDefaultCountry() {
    if (!this.donor) return;

    // Set default to Israel if available
    const israelCountry = this.countries.find(c => c.code === 'IL' || c.name === 'ישראל');
    if (israelCountry) {
      this.donor.countryId = israelCountry.id;
      this.donor.country = israelCountry;
      console.log('Set default country to Israel');
    }
  }

  private async initializeDonor() {
    if (!this.args?.donorId) return;

    this.loading = true;
    try {
      if (this.args.donorId === 'new') {
        console.log('Loading NEW donor');
        this.isNewDonor = true;
        this.donor = this.donorRepo.create();
        this.donor.isActive = true;
        this.donor.wantsUpdates = true;
        this.donor.wantsTaxReceipts = true;
        this.donor.preferredLanguage = 'he';
        // Country will be set via homePlace
        this.donor.companies = [];

        // Set default Israel country if available
        await this.setDefaultCountry();
        this.originalDonorData = JSON.stringify(this.donor);
      } else {
        this.isNewDonor = false;
        console.log('Loading existing donor with ID:', this.args.donorId);
        this.donor = await this.donorRepo.findId(this.args.donorId, { useCache: false }) || undefined;

        if (this.donor) {
          console.log('Donor loaded:', {
            id: this.donor.id,
            name: this.donor.fullName,
            homePlaceId: this.donor.homePlaceId,
            vacationPlaceId: this.donor.vacationPlaceId
          });

          // Ensure companies array exists
          if (!this.donor.companies) {
            this.donor.companies = [];
          }
          this.originalDonorData = JSON.stringify(this.donor);

          console.log('Starting to load related data...');
          await this.loadDonations();
          await this.loadDonorEvents();
          await this.loadDonorPlaces();

          // Force change detection after loading places
          console.log('Forcing change detection...');
          this.changeDetector.detectChanges();
          console.log('All loading completed');
        } else {
          console.error('Failed to load donor with ID:', this.args.donorId);
        }
      }

    } catch (error) {
      console.error('Error initializing donor:', error);
    } finally {
      this.loading = false;
    }
  }

  private async loadDonorEvents() {
    if (!this.donor?.id) return;

    try {
      this.donorEvents = await this.donorEventRepo.find({
        where: { donorId: this.donor.id, isActive: true }
      });

      // Manually load the event details for each donor event
      for (const donorEvent of this.donorEvents) {
        if (donorEvent.eventId) {
          const foundEvent = await this.eventRepo.findId(donorEvent.eventId);
          donorEvent.event = foundEvent || undefined;
        }
      }
    } catch (error) {
      console.error('Error loading donor events:', error);
    }
  }

  private async loadDonorPlaces() {
    if (!this.donor) return;

    console.log('loadDonorPlaces - Donor info:', {
      donorId: this.donor.id,
      homePlaceId: this.donor.homePlaceId,
      vacationPlaceId: this.donor.vacationPlaceId
    });

    try {
      // Load home place if homePlaceId exists
      if (this.donor.homePlaceId) {
        console.log('Attempting to load home place with ID:', this.donor.homePlaceId);
        const homePlace = await remult.repo(Place).findId(this.donor.homePlaceId);
        if (homePlace) {
          this.donor.homePlace = homePlace;
          console.log('Loaded home place successfully:', homePlace);
        } else {
          console.log('Home place not found in database with ID:', this.donor.homePlaceId);
        }
      } else {
        console.log('No homePlaceId found for donor');
      }

      // Load vacation place if vacationPlaceId exists
      if (this.donor.vacationPlaceId) {
        console.log('Attempting to load vacation place with ID:', this.donor.vacationPlaceId);
        const vacationPlace = await remult.repo(Place).findId(this.donor.vacationPlaceId);
        if (vacationPlace) {
          this.donor.vacationPlace = vacationPlace;
          console.log('Loaded vacation place successfully:', vacationPlace);
        } else {
          console.log('Vacation place not found in database with ID:', this.donor.vacationPlaceId);
        }
      } else {
        console.log('No vacationPlaceId found for donor');
      }

      // Load places for companies
      if (this.donor.companies && this.donor.companies.length > 0) {
        for (const company of this.donor.companies) {
          if (company.placeRecordId) {
            console.log('Attempting to load company place with ID:', company.placeRecordId);
            try {
              const companyPlace = await remult.repo(Place).findId(company.placeRecordId);
              if (companyPlace) {
                // עדכן את השדות של החברה עם המידע מה-Place
                company.address = companyPlace.fullAddress || company.address;
                company.neighborhood = companyPlace.neighborhood || company.neighborhood;
                company.location = companyPlace.city || company.location;
                company.placeId = companyPlace.placeId || company.placeId;
                console.log('Loaded company place successfully:', companyPlace);
              } else {
                console.log('Company place not found with ID:', company.placeRecordId);
              }
            } catch (error) {
              console.error('Error loading company place:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading donor places:', error);
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
      await this.donorRepo.save(this.donor);

      this.changed = wasNew || this.hasChanges();
      this.dialogRef.close(this.changed);
    } catch (error) {
      console.error('Error saving donor:', error);
    }
  }

  async onHomePlaceSelected(place: Place) {
    if (!this.donor) return;

    this.donor.homePlaceId = place?.id || '';
    this.donor.homePlace = place;
    this.changed = true;

    // עדכון קידומת (country) בהתאם למדינה שנבחרה בכתובת
    if (place?.countryCode) {
      this.updateCountryByCode(place.countryCode);
    }

    // Force UI update
    this.changeDetector.detectChanges();
  }

  async onVacationPlaceSelected(place: Place) {
    if (!this.donor) return;

    this.donor.vacationPlaceId = place?.id || '';
    this.donor.vacationPlace = place;
    this.changed = true;

    // Force UI update
    this.changeDetector.detectChanges();
  }

  onDateChange(field: string, value: Date | null) {
    if (this.donor && field in this.donor) {
      (this.donor as any)[field] = value;

      // Note: Birth date handling is now done through DonorEvent entities
    }
  }

  async deleteDonor() {
    if (!this.donor) return;

    const confirmMessage = this.i18n.currentTerms.confirmDeleteDonor?.replace('{name}', this.donor.fullName || '') || '';
    if (confirm(confirmMessage)) {
      try {
        await this.donor.delete();
        this.dialogRef.close(true);
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

  // Custom personal dates methods
  addCustomDate() {
    // This method is now handled by the UIToolsService dialog
  }

  removeCustomDate(index: number) {
    this.customPersonalDates.splice(index, 1);
    this.changed = true;
  }

  onCustomDateChange(index: number, value: Date | null) {
    if (this.customPersonalDates[index]) {
      this.customPersonalDates[index].date = value;
      this.changed = true;
    }
  }

  onFieldChange() {
    this.changed = true;
  }

  async openAddDateDialog(event: MouseEvent) {
    const availableEvents = this.getAvailableEvents();

    if (availableEvents.length === 0) {
      this.ui.info('אין אירועים זמינים להוספה');
      return;
    }

    try {
      const selectedEvent = await this.ui.selectEventDialog(availableEvents, 'בחר אירוע להוספה');
      if (selectedEvent) {
        await this.addEventFromDialog(selectedEvent);
      }
    } catch (error) {
      console.error('Error in openAddDateDialog:', error);
    }
  }


  // Events Management
  async addEventFromDialog(event: Event) {
    if (!this.donor?.id) {
      alert('אנא שמור את התורם קודם');
      return;
    }

    // Check if event already exists for this donor
    const existsAlready = this.donorEvents.find(de => de.eventId === event.id);
    if (existsAlready) {
      alert('האירוע כבר קיים עבור תורם זה');
      return;
    }

    try {
      const donorEvent = this.donorEventRepo.create({
        donorId: this.donor.id,
        eventId: event.id,
        hebrewDate: undefined,
        gregorianDate: undefined,
        isActive: true
      });

      await this.donorEventRepo.save(donorEvent);

      // Set the event relation manually
      donorEvent.event = event;

      // Add to the current list instead of reloading from DB
      this.donorEvents.push(donorEvent);

      this.changed = true;
    } catch (error) {
      console.error('Error adding event:', error);
      alert('שגיאה בהוספת האירוע');
    }
  }

  async removeDonorEvent(donorEvent: DonorEvent) {
    // Don't allow removing required events
    if (donorEvent.event?.isRequired) {
      alert('לא ניתן להסיר אירוע חובה');
      return;
    }

    if (confirm('האם אתה בטוח שברצונך להסיר את האירוע?')) {
      try {
        await donorEvent.delete();

        // Remove from local array instead of reloading
        const index = this.donorEvents.findIndex(de => de.id === donorEvent.id);
        if (index > -1) {
          this.donorEvents.splice(index, 1);
        }

        this.changed = true;
      } catch (error) {
        console.error('Error removing event:', error);
        alert('שגיאה בהסרת האירוע');
      }
    }
  }

  async onDonorEventDateChange(donorEvent: DonorEvent, value: Date | null) {
    try {
      // Update both Hebrew and Gregorian dates with the same value
      donorEvent.hebrewDate = value || undefined;
      donorEvent.gregorianDate = value || undefined;
      await this.donorEventRepo.save(donorEvent);
      this.changed = true;
    } catch (error) {
      console.error('Error updating event date:', error);
    }
  }

  getAvailableEvents() {
    return this.availableEvents.filter(event =>
      !this.donorEvents.find(donorEvent => donorEvent.eventId === event.id)
    );
  }

  trackDonorEventById(index: number, donorEvent: DonorEvent): string {
    return donorEvent.id;
  }

  getEventCategories(): string[] {
    const categories = new Set<string>();
    this.getAvailableEvents().forEach(event => {
      categories.add(event.category || 'אחר');
    });
    return Array.from(categories).sort();
  }

  getEventsByCategory(category: string): Event[] {
    return this.getAvailableEvents().filter(event =>
      (event.category || 'אחר') === category
    );
  }


  // Company management methods
  addCompany() {
    if (!this.donor) return;

    if (!this.donor.companies) {
      this.donor.companies = [];
    }

    const newCompany: CompanyInfo = {
      id: this.generateCompanyId(),
      name: '',
      number: '',
      role: '',
      address: '',
      neighborhood: '',
      location: '',
      phone: '',
      email: '',
      website: ''
    };

    this.donor.companies.push(newCompany);
  }

  removeCompany(index: number) {
    if (!this.donor || !this.donor.companies) return;

    if (confirm('האם אתה בטוח שברצונך להסיר חברה זו?')) {
      this.donor.companies.splice(index, 1);
    }
  }

  private generateCompanyId(): string {
    return 'company_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  trackByCompanyId(index: number, company: CompanyInfo): string {
    return company.id;
  }

  onOtherConnectionChange() {
    // Clear relationship fields if "קשר אחר" is unchecked
    if (this.donor && !this.donor.isOtherConnection) {
      this.donor.relationshipType = '';
      this.donor.relationshipOf = '';
    }
  }

  // Action button methods
  async openGifts() {
    if (!this.donor?.id) return;

    const args: DonorDonationsModalArgs = {
      donorId: this.donor.id,
      donationType: 'gifts',
      donorName: this.donor.fullName
    };

    await openDialog(DonorDonationsModalComponent, (dlg) => dlg.args = args);
  }

  async openDonations() {
    if (!this.donor?.id) return;

    const args: DonorDonationsModalArgs = {
      donorId: this.donor.id,
      donationType: 'donations',
      donorName: this.donor.fullName
    };

    await openDialog(DonorDonationsModalComponent, (dlg) => dlg.args = args);
  }

  async openReceipts() {
    if (!this.donor?.id) return;

    const args: DonorDonationsModalArgs = {
      donorId: this.donor.id,
      donationType: 'receipts',
      donorName: this.donor.fullName
    };

    await openDialog(DonorDonationsModalComponent, (dlg) => dlg.args = args);
  }

  closeModal(event?: MouseEvent) {
    // If clicking on overlay or direct close button click
    if ((event && event.target === event.currentTarget) || !event) {
      this.dialogRef.close(this.changed);
    }
  }

  // Navigation Header Methods
  private async loadAllDonors() {
    try {
      const donors = await this.donorRepo.find({
        where: { isActive: true },
        orderBy: { lastName: 'asc', firstName: 'asc' }
      });

      this.allDonors = donors.map(donor => ({
        ...donor,
        id: donor.id,
        displayName: donor.fullName || `${donor.firstName} ${donor.lastName}`
      }));

      // Set current donor record
      if (this.donor && this.donor.id) {
        this.currentDonorRecord = this.allDonors.find(d => d.id === this.donor!.id);
      }
    } catch (error) {
      console.error('Error loading all donors:', error);
    }
  }

  private setupFilterOptions() {
    this.filterOptions = [
      {
        key: 'isAnash',
        label: 'אנ"ש',
        type: 'boolean'
      },
      {
        key: 'isAlumni',
        label: 'בוגר',
        type: 'boolean'
      },
      {
        key: 'isOtherConnection',
        label: 'קשר אחר',
        type: 'boolean'
      },
      {
        key: 'level',
        label: 'רמת תורם',
        type: 'select',
        options: [
          { value: 'platinum', label: 'פלטינום' },
          { value: 'gold', label: 'זהב' },
          { value: 'silver', label: 'כסף' },
          { value: 'regular', label: 'רגיל' }
        ]
      },
      {
        key: 'preferredLanguage',
        label: 'שפה מועדפת',
        type: 'select',
        options: [
          { value: 'he', label: 'עברית' },
          { value: 'en', label: 'אנגלית' },
          { value: 'yi', label: 'יידיש' }
        ]
      },
      {
        key: 'age',
        label: 'גיל',
        type: 'range',
        min: 0,
        max: 120
      },
      {
        key: 'totalDonationAmount',
        label: 'סכום תרומות',
        type: 'amount'
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
    if (record.id !== this.donor?.id) {
      this.args.donorId = record.id;
      this.initializeDonor();
    }
  }

  onSearchChanged(searchTerm: string) {
    // Search is handled by the navigation header component
    console.log('Search term changed:', searchTerm);
  }


  onFiltersChanged(filters: ActiveFilter[]) {
    // Filters are applied by the navigation header component
    console.log('Filters changed:', filters);
  }

  onNavigateNext() {
    // Navigation is handled by the navigation header component
    console.log('Navigate to next donor');
  }

  onNavigatePrevious() {
    // Navigation is handled by the navigation header component
    console.log('Navigate to previous donor');
  }

  // Convert Place to AddressComponents for the address input component
  getHomeAddressComponents(): AddressComponents | undefined {
    console.log('getHomeAddressComponents called - donor.homePlace:', this.donor?.homePlace);
    if (!this.donor?.homePlace) {
      console.log('No homePlace found, returning undefined');
      return undefined;
    }

    const place = this.donor.homePlace;
    const addressComponents = {
      fullAddress: place.fullAddress || '',
      placeId: place.placeId || '',
      placeRecordId: place.id, // החשוב - המזהה שלנו ב-DB
      street: place.street || '',
      houseNumber: place.houseNumber || '',
      neighborhood: place.neighborhood || '',
      city: place.city || '',
      state: place.state || '',
      postcode: place.postcode || '',
      country: place.country || '',
      countryCode: place.countryCode || '',
      latitude: place.latitude,
      longitude: place.longitude,
      placeName: place.placeName || ''
    };

    console.log('getHomeAddressComponents - returning address components:', addressComponents);
    return addressComponents;
  }

  getVacationAddressComponents(): AddressComponents | undefined {
    if (!this.donor?.vacationPlace) return undefined;

    const place = this.donor.vacationPlace;
    return {
      fullAddress: place.fullAddress || '',
      placeId: place.placeId || '',
      placeRecordId: place.id, // החשוב - המזהה שלנו ב-DB
      street: place.street || '',
      houseNumber: place.houseNumber || '',
      neighborhood: place.neighborhood || '',
      city: place.city || '',
      state: place.state || '',
      postcode: place.postcode || '',
      country: place.country || '',
      countryCode: place.countryCode || '',
      latitude: place.latitude,
      longitude: place.longitude,
      placeName: place.placeName || ''
    };
  }

  getCompanyAddressComponents(company: CompanyInfo): AddressComponents | undefined {
    console.log('getCompanyAddressComponents called with company:', company);

    // אם יש כתובת או נתונים, צור AddressComponents
    if (!company.address && !company.neighborhood && !company.location && !company.placeRecordId) {
      console.log('No address data found for company');
      return undefined;
    }

    // בנה כתובת מלאה מהשדות הקיימים
    const addressParts = [];
    if (company.address) addressParts.push(company.address);
    if (company.neighborhood) addressParts.push(company.neighborhood);
    if (company.location) addressParts.push(company.location);

    const fullAddress = addressParts.join(', ');

    const addressComponents = {
      fullAddress: fullAddress,
      placeId: company.placeId || '',
      placeRecordId: company.placeRecordId,
      street: company.address || '', // השדה address מכיל את הרחוב
      houseNumber: '',
      neighborhood: company.neighborhood || '',
      city: company.location || '', // השדה location מכיל את העיר
      state: '',
      postcode: '',
      country: '',
      countryCode: '',
      latitude: undefined,
      longitude: undefined,
      placeName: company.name || ''
    };

    console.log('getCompanyAddressComponents returning:', addressComponents);
    return addressComponents;
  }

  async onCompanyPlaceSelected(company: CompanyInfo, place: Place) {
    company.placeRecordId = place?.id || '';
    company.placeId = place?.placeId || '';

    // עדכון השדות הישנים לתאימות לאחור
    company.address = place?.getDisplayAddress() || '';
    company.neighborhood = place?.neighborhood || '';
    company.location = place?.city || '';

    this.changed = true;

    // Force UI update
    this.changeDetector.detectChanges();
  }

  // Title options based on platform language
  getTitleOptions(): string[] {
    if (this.i18n.lang.language === 'en') {
      return [
        'Family',
        'Mr.',
        'Mrs.',
        'Mr. & Mrs.',
        'Rabbi',
        'Rabbi & Mrs.',
        'Dr.',
        'Dr. & Mrs.'
      ];
    } else {
      // Hebrew titles
      return [
        'גב\'',
        'הבחור המופלג בתויר"ש כמר',
        'הגאון החסיד ר\'',
        'הגאון הרב',
        'הגאון רבי',
        'הגה"ח ר\'',
        'החתן המופלג בתויר"ש כמר',
        'המשגיח הרה"ח ר\'',
        'הנגיד הרה"ח ר\'',
        'הר"ר',
        'הרב',
        'הרבנית',
        'הרה"ג ר\'',
        'הרה"ח ר\'',
        'הרה"צ ר\'',
        'כ"ק אדמו"ר רבי',
        'כ"ק מרן',
        'כמר',
        'מג"ש בישיבתנו הרב',
        'מוהרה"ח ר\'',
        'מורינו הרה"ח ר\'',
        'מר',
        'מרן',
        'מרת',
        'משפחת',
        'ראש הישיבה',
        'תלמידנו הרה"ח ר\''
      ];
    }
  }

  getTitlePlaceholder(): string {
    if (this.i18n.lang.language === 'en') {
      return '-- Select Title --';
    } else {
      return '-- בחר תואר --';
    }
  }

  // Suffix options - primarily Hebrew religious suffixes
  getSuffixOptions(): string[] {
    return [
      'הי"ד',
      'הי"ו',
      'ז"ל',
      'זי"ע',
      'זצ"ל',
      'זצוק"ל',
      'זצוקללה"ה',
      'נ"י',
      'ע"ה',
      'שיחי\'',
      'שליט"א',
      'תחי\''
    ];
  }

  getSuffixPlaceholder(): string {
    if (this.i18n.lang.language === 'en') {
      return '-- Select Suffix --';
    } else {
      return '-- בחר סיומת --';
    }
  }

  // Update country based on country code from address
  private updateCountryByCode(countryCode: string) {
    if (!this.donor || !countryCode) return;

    // חיפוש מדינה לפי קוד
    const country = this.countries.find(c => c.code?.toUpperCase() === countryCode.toUpperCase());

    if (country) {
      this.donor.countryId = country.id;
      this.donor.country = country;
      console.log(`Updated country to: ${country.name} (${country.nameEn}) - ${country.phonePrefix}`);
      this.changed = true;
    } else {
      console.warn(`Country not found for code: ${countryCode}. Will be created automatically when place is saved.`);
    }
  }

  // Circle options (חוג)
  getCircleOptions(): { value: string; label: string }[] {
    return [
      { value: 'platinum', label: 'פלטינום' },
      { value: 'gold', label: 'זהב' },
      { value: 'silver', label: 'כסף' },
      { value: 'regular', label: 'רגיל' }
    ];
  }

  // Level options (רמה)
  getLevelOptions(): { value: string; label: string; icon: string }[] {
    return [
      { value: 'quarter', label: 'רבע', icon: '🔸' },
      { value: 'half', label: 'חצי', icon: '🔹' },
      { value: 'full', label: 'שלם', icon: '⭕' },
      { value: 'bronze_lords', label: 'אדני נחושת', icon: '🥉' },
      { value: 'silver_stones', label: 'אבני כסף', icon: '🥈' },
      { value: 'gold_pillars', label: 'עמודי זהב', icon: '🥇' },
      { value: 'sapphire_diamond', label: 'ספיר ויהלום', icon: '💎' },
      { value: 'platinum', label: 'פלטיניום', icon: '👑' },
      { value: 'patron', label: 'פטרון', icon: '🏆' },
      { value: 'torah_holder', label: 'מחזיק תורה', icon: '📜' },
      { value: 'supreme_level_1', label: 'עץ חיים', icon: '🌳' },
      { value: 'supreme_level_2', label: 'כתר תורה', icon: '👑' }
    ];
  }
}