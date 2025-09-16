import { Component, OnInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Donor, Donation, Event, DonorEvent, CompanyInfo, Country } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { ModalNavigationHeaderComponent, NavigationRecord, FilterOption, ActiveFilter } from '../../../shared/modal-navigation-header/modal-navigation-header.component';
import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { openDialog } from 'common-ui-elements';
import { DataAreaDialogComponent } from '../../../common/data-area-dialog/data-area-dialog.component';
import { UIToolsService } from '../../../common/UIToolsService';
import { OsmAddressInputComponent, AddressComponents } from '../../../common/osm-address-input/osm-address-input.component';

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
  countries: Country[] = [];
  donorRepo = remult.repo(Donor);
  donationRepo = remult.repo(Donation);
  eventRepo = remult.repo(Event);
  donorEventRepo = remult.repo(DonorEvent);
  countryRepo = remult.repo(Country);
  loading = false;
  isNewDonor = false;
  
  // Events system
  availableEvents: Event[] = [];
  donorEvents: DonorEvent[] = [];
  
  // Custom personal dates (legacy - keeping for backward compatibility)
  customPersonalDates: { name: string; date: Date | null }[] = [];
  
  // Navigation header properties
  allDonors: NavigationRecord[] = [];
  filterOptions: FilterOption[] = [];
  currentDonorRecord?: NavigationRecord;

  constructor(public i18n: I18nService, private ui: UIToolsService) {}

  async ngOnInit() {
    await this.loadAvailableEvents();
    await this.loadCountries();
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
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }

  private async setDefaultCountry() {
    const israelCountry = this.countries.find(c => c.name === 'ישראל');
    if (israelCountry && this.donor) {
      this.donor.countryId = israelCountry.id;
    }
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
        this.donor.countryId = ''; // Will be set after countries are loaded
        this.donor.companies = [];

        // Set default Israel country if available
        await this.setDefaultCountry();
        this.originalDonorData = JSON.stringify(this.donor);
      } else {
        this.isNewDonor = false;
        this.donor = await this.donorRepo.findId(this.args.donorId) || undefined;
        if (this.donor) {
          // Ensure companies array exists
          if (!this.donor.companies) {
            this.donor.companies = [];
          }
          this.originalDonorData = JSON.stringify(this.donor);
          await this.loadDonations();
          await this.loadDonorEvents();
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

  onAddressSelected(addressComponents: AddressComponents) {
    if (!this.donor) return;

    console.log('Address selected:', addressComponents);
    console.log('Available countries:', this.countries);

    // עדכון השדות מהכתובת שנבחרה
    this.donor.street1 = addressComponents.street || '';
    this.donor.houseNumber = addressComponents.houseNumber || '';
    this.donor.neighborhood = addressComponents.neighborhood || '';
    this.donor.city = addressComponents.city || '';
    this.donor.zipCode = addressComponents.postcode || '';

    // עדכון קואורדינטות
    if (addressComponents.latitude && addressComponents.longitude) {
      this.donor.latitude = addressComponents.latitude;
      this.donor.longitude = addressComponents.longitude;
    }

    // עדכון מדינה אם יש
    if (this.countries && this.countries.length > 0) {
      let foundCountry = null;

      // חיפוש לפי קוד מדינה
      if (addressComponents.countryCode) {
        foundCountry = this.countries.find(c =>
          c.code?.toLowerCase() === addressComponents.countryCode?.toLowerCase()
        );
      }

      // אם לא נמצא, חיפוש לפי שם המדינה באנגלית
      if (!foundCountry && addressComponents.country) {
        foundCountry = this.countries.find(c =>
          c.nameEn?.toLowerCase() === addressComponents.country?.toLowerCase()
        );
      }

      // אם לא נמצא, חיפוש לפי שם המדינה בעברית
      if (!foundCountry && addressComponents.country) {
        const countryMappings: { [key: string]: string } = {
          'israel': 'ישראל',
          'united states': 'ארצות הברית',
          'united kingdom': 'בריטניה',
          'france': 'צרפת',
          'germany': 'גרמניה',
          'canada': 'קנדה',
          'australia': 'אוסטרליה'
        };

        const hebrewName = countryMappings[addressComponents.country?.toLowerCase() || ''];
        if (hebrewName) {
          foundCountry = this.countries.find(c => c.name === hebrewName);
        }
      }

      // אם עדיין לא נמצא ואנחנו בישראל (קוד il), נגדיר ישראל כברירת מחדל
      if (!foundCountry && addressComponents.countryCode === 'IL') {
        foundCountry = this.countries.find(c => c.name === 'ישראל');
      }

      if (foundCountry) {
        this.donor.countryId = foundCountry.id;
        console.log('Found country:', foundCountry.name);
      } else {
        console.log('Country not found:', {
          countryCode: addressComponents.countryCode,
          country: addressComponents.country,
          availableCountries: this.countries.map(c => ({ name: c.name, code: c.code }))
        });
      }
    } else {
      console.log('Countries not loaded yet or empty, storing for later processing');
      // אם המדינות לא נטענו עדיין, נשמור את הנתונים ונעדכן מאוחר יותר
      if (addressComponents.countryCode === 'IL' || addressComponents.country === 'Israel') {
        // נמתין שהמדינות ייטענו ואז נעדכן
        setTimeout(() => {
          if (this.countries && this.countries.length > 0) {
            const israelCountry = this.countries.find(c => c.name === 'ישראל');
            if (israelCountry && this.donor) {
              this.donor.countryId = israelCountry.id;
              console.log('Delayed country update - set to Israel');
            }
          }
        }, 1000);
      }
    }

    console.log('Updated donor:', {
      street1: this.donor.street1,
      houseNumber: this.donor.houseNumber,
      neighborhood: this.donor.neighborhood,
      city: this.donor.city,
      zipCode: this.donor.zipCode,
      countryId: this.donor.countryId,
      latitude: this.donor.latitude,
      longitude: this.donor.longitude
    });
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
      street1: '',
      street2: '',
      neighborhood: '',
      city: '',
      zipCode: '',
      countryId: '',
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
  openGifts() {
    // TODO: Implement gifts functionality
    console.log('Opening gifts for donor:', this.donor?.id);
    alert('פונקציונליות מתנות תבוצע בהמשך');
  }

  openDonations() {
    // TODO: Implement donations functionality
    console.log('Opening donations for donor:', this.donor?.id);
    alert('פונקציונליות תרומות תבוצע בהמשך');
  }

  openReceipts() {
    // TODO: Implement receipts functionality
    console.log('Opening receipts for donor:', this.donor?.id);
    alert('פונקציונליות הוצאת קבלות תבוצע בהמשך');
  }
  
  closeModal(event?: MouseEvent) {
    // If clicking on overlay, close modal
    if (event && event.target === event.currentTarget) {
      this.changed = false;
      this.shouldClose = true;
    } else if (!event) {
      // Direct close button click
      this.changed = false;
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
}