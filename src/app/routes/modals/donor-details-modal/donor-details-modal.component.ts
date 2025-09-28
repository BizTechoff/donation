import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { CompanyInfo, Donation, Donor, DonorEvent, Event, Place, Contact } from '../../../../shared/entity';
import { Country } from '../../../../shared/enum/country.enum';
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
  shouldClose = false;

  donor?: Donor;
  originalDonorData?: string; // To track changes
  donations: Donation[] = [];
  donorRepo = remult.repo(Donor);
  donationRepo = remult.repo(Donation);
  countryOptions = [
    Country.israel,
    Country.usa,
    Country.uk,
    Country.scotland,
    Country.france,
    Country.belgium,
    Country.switzerland,
    Country.canada,
    Country.australia,
    Country.germany,
    Country.netherlands,
    Country.argentina,
    Country.brazil,
    Country.mexico,
    Country.southAfrica,
    Country.russia,
    Country.ukraine,
    Country.spain,
    Country.italy,
    Country.poland,
    Country.austria
  ];
  eventRepo = remult.repo(Event);
  donorEventRepo = remult.repo(DonorEvent);
  contactRepo = remult.repo(Contact);
  loading = false;
  isNewDonor = false;

  // Contact related
  contacts: Contact[] = [];
  selectedContact?: Contact;

  // Events system
  availableEvents: Event[] = [];
  donorEvents: DonorEvent[] = [];

  // Custom personal dates (legacy - keeping for backward compatibility)
  customPersonalDates: { name: string; date: Date | null }[] = [];

  // Navigation header properties
  allDonors: NavigationRecord[] = [];
  filterOptions: FilterOption[] = [];
  currentDonorRecord?: NavigationRecord;

  constructor(public i18n: I18nService, private ui: UIToolsService, private changeDetector: ChangeDetectorRef) { }

  async ngOnInit() {
    await this.loadAvailableEvents();
    await this.loadCountries();
    await this.loadContacts();
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
    // Country is a ValueListFieldType, not an entity
    // Countries are already available as static properties
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

  private async setDefaultCountry() {
    // Default country is already set in the entity definition
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

          // Load primary contact if exists
          if (this.donor.primaryContactId) {
            this.selectedContact = await this.contactRepo.findId(this.donor.primaryContactId) || undefined;
          }

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
      await this.donor.save();

      this.changed = wasNew || this.hasChanges();
      this.shouldClose = true;
      // The dialog will automatically close and return this.changed
    } catch (error) {
      console.error('Error saving donor:', error);
    }
  }

  async onHomeAddressSelected(addressComponents: AddressComponents) {
    if (!this.donor) return;

    console.log('Home address selected:', addressComponents);
    console.log('PlaceId:', addressComponents.placeId);
    console.log('FullAddress:', addressComponents.fullAddress);

    try {
      // השתמש ב-Place שכבר נשמר או צור חדש אם צריך
      if (addressComponents.placeRecordId) {
        // המקום כבר נשמר ברגע הבחירה
        console.log('Using existing Place ID:', addressComponents.placeRecordId);
        this.donor.homePlaceId = addressComponents.placeRecordId;

        // טען את המקום מהשרת להצגה
        const place = await remult.repo(Place).findId(addressComponents.placeRecordId);
        if (place) {
          this.donor.homePlace = place;
        }

        // Save donor to persist the homePlaceId
        await this.donor.save();
        this.changed = true;
        console.log('Home place ID assigned to donor:', addressComponents.placeRecordId);
      } else if (addressComponents.placeId) {
        // fallback - אם מסיבה כלשהי לא נשמר, צור כעת
        const placeData = {
          placeId: addressComponents.placeId,
          fullAddress: addressComponents.fullAddress,
          placeName: addressComponents.placeName,
          street: addressComponents.street,
          houseNumber: addressComponents.houseNumber,
          neighborhood: addressComponents.neighborhood,
          city: addressComponents.city,
          state: addressComponents.state,
          postcode: addressComponents.postcode,
          country: addressComponents.country,
          countryCode: addressComponents.countryCode,
          latitude: addressComponents.latitude,
          longitude: addressComponents.longitude
        };

        console.log('Fallback: creating Place now:', placeData);
        const place = await Place.findOrCreate(placeData, remult.repo(Place));
        this.donor.homePlaceId = place.id;
        this.donor.homePlace = place;

        // Save donor to persist the homePlaceId
        await this.donor.save();
        this.changed = true;
        console.log('Home place saved and donor updated:', place);
      }
    } catch (error) {
      console.error('Error saving home place:', error);
    }

    // Force UI update
    this.changeDetector.detectChanges();
  }

  async onVacationAddressSelected(addressComponents: AddressComponents) {
    if (!this.donor) return;

    console.log('Vacation address selected:', addressComponents);

    try {
      // השתמש ב-Place שכבר נשמר או צור חדש אם צריך
      if (addressComponents.placeRecordId) {
        // המקום כבר נשמר ברגע הבחירה
        console.log('Using existing Place ID:', addressComponents.placeRecordId);
        this.donor.vacationPlaceId = addressComponents.placeRecordId;

        // טען את המקום מהשרת להצגה
        const place = await remult.repo(Place).findId(addressComponents.placeRecordId);
        if (place) {
          this.donor.vacationPlace = place;
        }

        // Save donor to persist the vacationPlaceId
        await this.donor.save();
        this.changed = true;
        console.log('Vacation place ID assigned to donor:', addressComponents.placeRecordId);
      } else if (addressComponents.placeId) {
        // fallback - אם מסיבה כלשהי לא נשמר, צור כעת
        const placeData = {
          placeId: addressComponents.placeId,
          fullAddress: addressComponents.fullAddress,
          placeName: addressComponents.placeName,
          street: addressComponents.street,
          houseNumber: addressComponents.houseNumber,
          neighborhood: addressComponents.neighborhood,
          city: addressComponents.city,
          state: addressComponents.state,
          postcode: addressComponents.postcode,
          country: addressComponents.country,
          countryCode: addressComponents.countryCode,
          latitude: addressComponents.latitude,
          longitude: addressComponents.longitude
        };

        console.log('Fallback: creating Place now:', placeData);
        const place = await Place.findOrCreate(placeData, remult.repo(Place));
        this.donor.vacationPlaceId = place.id;
        this.donor.vacationPlace = place;

        // Save donor to persist the vacationPlaceId
        await this.donor.save();
        this.changed = true;
        console.log('Vacation place saved and donor updated:', place);
      }
    } catch (error) {
      console.error('Error saving vacation place:', error);
    }

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

      await donorEvent.save();

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
      await donorEvent.save();
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
    // If clicking on overlay, close modal
    if (event && event.target === event.currentTarget) {
      // Don't reset changed - let parent handle it
      this.shouldClose = true;
    } else if (!event) {
      // Direct close button click
      // Don't reset changed - let parent handle it
      this.shouldClose = true;
    }
  }

  // Navigation Header Methods
  private async loadAllDonors() {
    try {
      const donors = await this.donorRepo.find({
        where: { isActive: true },
        orderBy: { fullName: 'asc' }
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

  onContactChange() {
    if (this.donor?.primaryContactId) {
      this.selectedContact = this.contacts.find(c => c.id === this.donor!.primaryContactId);
    } else {
      this.selectedContact = undefined;
    }
    this.changed = true;
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

  async onCompanyAddressSelected(company: CompanyInfo, addressComponents: AddressComponents) {
    console.log('Company address selected:', addressComponents);

    try {
      // עדכון פרטי החברה עם הכתובת החדשה
      if (addressComponents.placeRecordId) {
        // המקום כבר נשמר ברגע הבחירה
        console.log('Using existing Place ID for company:', addressComponents.placeRecordId);
        company.placeRecordId = addressComponents.placeRecordId;
        company.placeId = addressComponents.placeId;
      } else if (addressComponents.placeId) {
        // fallback - אם מסיבה כלשהי לא נשמר, צור כעת
        const placeData = {
          placeId: addressComponents.placeId,
          fullAddress: addressComponents.fullAddress,
          placeName: addressComponents.placeName,
          street: addressComponents.street,
          houseNumber: addressComponents.houseNumber,
          neighborhood: addressComponents.neighborhood,
          city: addressComponents.city,
          state: addressComponents.state,
          postcode: addressComponents.postcode,
          country: addressComponents.country,
          countryCode: addressComponents.countryCode,
          latitude: addressComponents.latitude,
          longitude: addressComponents.longitude
        };

        console.log('Fallback: creating Place for company:', placeData);
        const place = await Place.findOrCreate(placeData, remult.repo(Place));
        company.placeRecordId = place.id;
        company.placeId = place.placeId;
      }

      // עדכון השדות הישנים לתאימות לאחור
      company.address = addressComponents.fullAddress || '';
      company.neighborhood = addressComponents.neighborhood || '';
      company.location = addressComponents.city || '';

      this.changed = true;
      console.log('Company address updated:', company);
    } catch (error) {
      console.error('Error saving company address:', error);
    }

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
}