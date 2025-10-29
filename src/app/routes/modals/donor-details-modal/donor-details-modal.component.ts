import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService, DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { DonorController } from '../../../../shared/controllers/donor.controller';
import { Circle, Company, CompanyInfo, Contact, Country, Donation, Donor, DonorAddress, DonorAddressType, DonorContact, DonorEvent, DonorNote, DonorPlace, DonorReceptionHour, DonorRelation, Event, NoteType, Place, User } from '../../../../shared/entity';
import { AddressComponents } from '../../../common/osm-address-input/osm-address-input.component';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { ActiveFilter, FilterOption, NavigationRecord } from '../../../shared/modal-navigation-header/modal-navigation-header.component';
import { CircleDetailsModalComponent } from '../circle-details-modal/circle-details-modal.component';
import { CircleSelectionModalComponent } from '../circle-selection-modal/circle-selection-modal.component';
import { CompanyDetailsModalComponent } from '../company-details-modal/company-details-modal.component';
import { CompanySelectionModalComponent } from '../company-selection-modal/company-selection-modal.component';
import { DonorDonationsModalArgs, DonorDonationsModalComponent } from '../donor-donations-modal/donor-donations-modal.component';
import { FamilyRelationDetailsModalComponent } from '../family-relation-details-modal/family-relation-details-modal.component';
import { NotesSelectionModalArgs, NotesSelectionModalComponent } from '../notes-selection-modal/notes-selection-modal.component';
import { DonorAddressTypeSelectionModalComponent } from '../donor-address-type-selection-modal/donor-address-type-selection-modal.component';

export interface DonorDetailsModalArgs {
  donorId: string; // Can be 'new' for new donor or donor ID
  initialPlace?: Place; // Optional Place to pre-fill for new donors
}

// PersonalEvent interface is no longer needed - using DonorEvent entity instead

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '80vw',
  maxHeight: '80vh',
  panelClass: 'donor-details-dialog-panel'
})
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
  countryRepo = remult.repo(Country);
  countries: Country[] = [];
  eventRepo = remult.repo(Event);
  donorEventRepo = remult.repo(DonorEvent);
  donorAddressRepo = remult.repo(DonorAddress);
  donorAddresses: DonorAddress[] = [];
  donorContactRepo = remult.repo(DonorContact);
  donorContacts: DonorContact[] = [];
  donorPlaceRepo = remult.repo(DonorPlace);
  donorPlaces: DonorPlace[] = [];
  donorNoteRepo = remult.repo(DonorNote);
  donorNotes: DonorNote[] = [];
  donorReceptionHourRepo = remult.repo(DonorReceptionHour);
  donorReceptionHours: DonorReceptionHour[] = [];
  noteTypeRepo = remult.repo(NoteType);
  contactRepo = remult.repo(Contact);
  userRepo = remult.repo(User);
  donorRelationRepo = remult.repo(DonorRelation);
  donorRelations: DonorRelation[] = [];
  isNewDonor = false;

  // Contact related
  contacts: Contact[] = [];
  selectedContact?: Contact;

  // Fundraisers (users with donator=true)
  fundraisers: User[] = [];

  // Family relationships
  allDonorsForFamily: Donor[] = [];
  selectedFamilyRelationships: Array<{
    donor: Donor;
    relationshipType: string;
    donorId: string;
    relationId: string; // ID of the DonorRelation record
    isReverse: boolean; // האם הקשר הזה מוצג בהיפוך (donor2->donor1)
  }> = [];
  newRelationshipType: string = '';

  // Companies
  companies: Company[] = [];
  selectedCompanies: Company[] = [];
  selectedCompanyIdForEdit: string = '';
  companyRepo = remult.repo(Company);

  // Circles
  circles: Circle[] = [];
  selectedCircles: Circle[] = [];
  circleRepo = remult.repo(Circle);

  // Phone prefix options (built once after loading countries)
  phonePrefixOptions: { value: string; label: string }[] = [];

  // Note types (loaded from database)
  noteTypes: NoteType[] = [];

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
    public dialogRef: MatDialogRef<any>,
    private busyService: BusyService
  ) { }

  async ngOnInit() {
    await this.busyService.doWhileShowingBusy(async () => {
      if (!this.args?.donorId) return;

      // Load all data from server in a single call
      const data = await DonorController.getDonorDetailsData(this.args.donorId);

      // Set all data
      this.availableEvents = data.events;
      this.countries = data.countries;
      this.contacts = data.contacts;
      this.fundraisers = data.fundraisers;
      this.allDonorsForFamily = data.allDonorsForFamily;
      this.companies = data.companies;
      this.circles = data.circles;
      this.noteTypes = data.noteTypes;

      // Convert allDonors to NavigationRecords
      this.allDonors = data.allDonors.map(d => ({
        id: d.id,
        displayName: d.displayName || '',
        isActive: d.isActive
      }));

      // Build phone prefix options from countries
      this.phonePrefixOptions = this.countries.map(c => ({
        value: c.phonePrefix,
        label: `${c.phonePrefix}`
      }));

      // Set donor data
      if (this.args.donorId === 'new') {
        this.isNewDonor = true;
        this.donor = this.donorRepo.create();

        // Set initial values
        this.donor.isActive = true;
        this.donor.wantsUpdates = true;
        this.donor.companyIds = [];
        this.donor.circleIds = [];
        this.donor.wantsTaxReceipts = true;
        this.donor.preferredLanguage = 'he';
        this.donor.companies = [];

        // Set initial place if provided
        if (this.args.initialPlace) {
          this.donor.homePlaceId = this.args.initialPlace.id;
          this.donor.homePlace = this.args.initialPlace;
        }

        // Set default to Israel if available
        const israelCountry = this.countries.find(c => c.code === 'IL' || c.name === 'ישראל');
        if (israelCountry) {
          this.donor.countryId = israelCountry.id;
          this.donor.country = israelCountry;
        }

        // Create default birth date event
        const birthDateEvent = this.availableEvents.find(e => e.description === 'יום הולדת');
        if (birthDateEvent) {
          const donorEvent = this.donorEventRepo.create({
            donorId: '',
            eventId: birthDateEvent.id,
            date: undefined,
            isActive: true
          });
          donorEvent.event = birthDateEvent;
          this.donorEvents.push(donorEvent);
        }

        // Create default contacts
        this.createDefaultContacts();

        // Create default places
        this.createDefaultPlaces();
      } else {
        // Existing donor
        this.donor = data.donor || undefined;
        this.donorEvents = data.donorEvents;
        this.donorNotes = data.donorNotes;
        this.donorPlaces = data.donorPlaces;
        this.donorReceptionHours = data.donorReceptionHours;
        this.donorAddresses = data.donorAddresses;
        this.donorContacts = data.donorContacts;
        this.donorRelations = data.donorRelations;

        // Build selectedFamilyRelationships from donorRelations
        this.buildSelectedFamilyRelationships();
      }

      // Store original data for change detection
      this.originalDonorData = JSON.stringify(this.donor);

      // Setup filters
      this.setupFilterOptions();
    });

    // Prevent accidental close for new donor
    if (this.isNewDonor) {
      this.dialogRef.disableClose = true;
    }
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

  private async loadNoteTypes() {
    try {
      this.noteTypes = await this.noteTypeRepo.find({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc', name: 'asc' }
      });
      console.log(`Loaded ${this.noteTypes.length} note types from database`);
    } catch (error) {
      console.error('Error loading note types:', error);
    }
  }

  private async loadCountries() {
    try {
      this.countries = await this.countryRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      console.log(`Loaded ${this.countries.length} countries from database`);

      // Build phone prefix options after loading countries
      this.buildPhonePrefixOptions();
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }

  private buildPhonePrefixOptions() {
    if (this.countries.length === 0) {
      this.phonePrefixOptions = [];
      return;
    }

    // Create a unique list of phone prefixes from countries
    const prefixMap = new Map<string, { name: string; nameEn: string }>();

    this.countries.forEach(country => {
      if (country.phonePrefix && country.phonePrefix.trim() !== '') {
        if (!prefixMap.has(country.phonePrefix)) {
          prefixMap.set(country.phonePrefix, {
            name: country.name,
            nameEn: country.nameEn || ''
          });
        }
      }
    });

    // Convert to array and sort by phone prefix
    this.phonePrefixOptions = Array.from(prefixMap.entries())
      .sort((a, b) => {
        // Sort by numeric value if possible
        const aNum = parseInt(a[0].replace(/[^0-9]/g, ''));
        const bNum = parseInt(b[0].replace(/[^0-9]/g, ''));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a[0].localeCompare(b[0]);
      })
      .map(([prefix, country]) => ({
        value: prefix,
        label: `${prefix} (${country.name}${country.nameEn ? ' / ' + country.nameEn : ''})`
      }));

    console.log(`Built ${this.phonePrefixOptions.length} phone prefix options`);
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

  private async createDefaultBirthDateEvent() {
    // Find the "יום הולדת" event
    const birthDateEvent = this.availableEvents.find(e => e.description === 'יום הולדת');

    if (birthDateEvent) {
      // Create a new DonorEvent (not saved to DB yet, just in memory)
      const donorEvent = this.donorEventRepo.create({
        donorId: '', // Will be set when donor is saved
        eventId: birthDateEvent.id,
        date: undefined,
        isActive: true
      });

      // Set the event relation manually
      donorEvent.event = birthDateEvent;

      // Add to the donorEvents array
      this.donorEvents.push(donorEvent);

      console.log('Created default birth date event for new donor');
    } else {
      console.warn('Birth date event not found in available events');
    }
  }

  private createDefaultContacts() {
    // Create default empty phone contact
    const phoneContact = this.donorContactRepo.create({
      donorId: '', // Will be set when donor is saved
      type: 'phone',
      phoneNumber: '',
      prefix: '+972',
      description: 'נייד',
      isPrimary: true,
      isActive: true
    });
    this.donorContacts.push(phoneContact);

    // Create default empty email contact
    const emailContact = this.donorContactRepo.create({
      donorId: '', // Will be set when donor is saved
      type: 'email',
      email: '',
      description: 'אישי',
      isPrimary: true,
      isActive: true
    });
    this.donorContacts.push(emailContact);

    console.log('Created default contacts for new donor');
  }

  private createDefaultPlaces() {
    // Create default "כתובת מגורים" place
    const homePlace = this.donorPlaceRepo.create({
      donorId: '', // Will be set when donor is saved
      description: 'כתובת מגורים',
      isPrimary: true,
      isActive: true
    });
    this.donorPlaces.push(homePlace);

    console.log('Created default place for new donor');
  }

  private async initializeDonor() {
    if (!this.args?.donorId) return;

    try {
      if (this.args.donorId === 'new') {
        console.log('Loading NEW donor');
        this.isNewDonor = true;
        this.donor = this.donorRepo.create();
        this.donor.isActive = true;
        this.donor.wantsUpdates = true;
        this.donor.companyIds = [];
        this.donor.circleIds = [];
        this.donor.wantsTaxReceipts = true;
        this.donor.preferredLanguage = 'he';
        // Country will be set via homePlace
        this.donor.companies = [];

        // Set default Israel country if available
        await this.setDefaultCountry();

        // If initial place is provided, set it
        if (this.args.initialPlace) {
          this.donor.homePlace = this.args.initialPlace;
          this.donor.homePlaceId = this.args.initialPlace.id;
          console.log('Set initial place for new donor:', this.args.initialPlace);
        }

        // Create default birth date event for new donor
        await this.createDefaultBirthDateEvent();

        // Create default empty phone and email contacts for new donor
        this.createDefaultContacts();

        // Create default places for new donor
        this.createDefaultPlaces();

        this.originalDonorData = JSON.stringify(this.donor);
      } else {
        this.isNewDonor = false;
        console.log('Loading existing donor with ID:', this.args.donorId);
        this.donor = await this.donorRepo.findId(this.args.donorId, {
          useCache: false,
          include: {
            homePlace: { include: { country: true } },
            vacationPlace: { include: { country: true } }
          }
        }) || undefined;

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
          await this.loadDonorAddresses();
          await this.loadDonorContacts();
          await this.loadDynamicDonorPlaces();
          await this.loadDonorNotes();
          await this.loadDonorReceptionHours();
          await this.loadDonorPlaces();
          await this.loadAllDonorsForFamily();
          await this.loadSelectedFamilyRelationships();
          await this.loadSelectedCompanies();
          await this.loadSelectedCircles();

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

  private async loadDonorAddresses() {
    if (!this.donor?.id) return;

    try {
      this.donorAddresses = await this.donorAddressRepo.find({
        where: { donorId: this.donor.id, isActive: true }
      });

      // Manually load the place details for each donor address
      for (const donorAddress of this.donorAddresses) {
        if (donorAddress.placeId) {
          const foundPlace = await remult.repo(Place).findId(donorAddress.placeId, {
            include: { country: true }
          });
          donorAddress.place = foundPlace || undefined;
        }
      }
    } catch (error) {
      console.error('Error loading donor addresses:', error);
    }
  }

  private async loadDonorContacts() {
    if (!this.donor?.id) return;

    try {
      this.donorContacts = await this.donorContactRepo.find({
        where: { donorId: this.donor.id, isActive: true }
      });
    } catch (error) {
      console.error('Error loading donor contacts:', error);
    }
  }

  private async loadDynamicDonorPlaces() {
    if (!this.donor?.id) return;

    try {
      this.donorPlaces = await this.donorPlaceRepo.find({
        where: { donorId: this.donor.id, isActive: true },
        include: {
          place: { include: { country: true } },
          addressType: true
        }
      });
      console.log(`Loaded ${this.donorPlaces.length} donor places`);
    } catch (error) {
      console.error('Error loading donor places:', error);
    }
  }

  private async loadDonorNotes() {
    if (!this.donor?.id) return;

    try {
      this.donorNotes = await this.donorNoteRepo.find({
        where: { donorId: this.donor.id, isActive: true }
      });
      console.log(`Loaded ${this.donorNotes.length} donor notes`);
    } catch (error) {
      console.error('Error loading donor notes:', error);
    }
  }

  private async loadDonorReceptionHours() {
    if (!this.donor?.id) return;

    try {
      this.donorReceptionHours = await this.donorReceptionHourRepo.find({
        where: { donorId: this.donor.id, isActive: true },
        orderBy: { sortOrder: 'asc' }
      });
      console.log(`Loaded ${this.donorReceptionHours.length} donor reception hours`);
    } catch (error) {
      console.error('Error loading donor reception hours:', error);
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
        const homePlace = await remult.repo(Place).findId(this.donor.homePlaceId, {
          include: { country: true }
        });
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
        const vacationPlace = await remult.repo(Place).findId(this.donor.vacationPlaceId, {
          include: { country: true }
        });
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
              const companyPlace = await remult.repo(Place).findId(company.placeRecordId, {
                include: { country: true }
              });
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

  private validateReceptionHours(): { valid: boolean; error?: string } {
    // Filter out reception hours with empty times (don't validate them)
    const filledReceptionHours = this.donorReceptionHours.filter(
      rh => rh.startTime && rh.endTime
    );

    // Check each reception hour for validity
    for (const receptionHour of filledReceptionHours) {
      // Convert times to comparable format (HH:MM)
      const start = receptionHour.startTime;
      const end = receptionHour.endTime;

      // Check if start time is before end time
      if (start >= end) {
        return {
          valid: false,
          error: `שעת הקבלה ${start} - ${end} אינה תקינה. שעת ההתחלה חייבת להיות לפני שעת הסיום.`
        };
      }
    }

    // Check for overlaps between reception hours
    for (let i = 0; i < filledReceptionHours.length; i++) {
      const hour1 = filledReceptionHours[i];

      for (let j = i + 1; j < filledReceptionHours.length; j++) {
        const hour2 = filledReceptionHours[j];

        // Check if times overlap
        const start1 = hour1.startTime;
        const end1 = hour1.endTime;
        const start2 = hour2.startTime;
        const end2 = hour2.endTime;

        // Two time ranges overlap if: start1 < end2 AND start2 < end1
        if (start1 < end2 && start2 < end1) {
          return {
            valid: false,
            error: `קיימת חפיפה בין שעות הקבלה: ${start1}-${end1} ו-${start2}-${end2}`
          };
        }
      }
    }

    return { valid: true };
  }

  async saveDonor() {
    if (!this.donor) return;

    try {
      // Validate reception hours before saving
      const validationResult = this.validateReceptionHours();
      if (!validationResult.valid) {
        this.ui.error(validationResult.error || 'שגיאה בשעות הקבלה');
        return;
      }

      const wasNew = this.isNewDonor;
      await remult.repo(Donor).save(this.donor);

      // Save all related entities (new and modified) - Unit of Work Pattern
      if (this.donor.id) {
        // Save donor events
        for (const donorEvent of this.donorEvents) {
          donorEvent.donorId = this.donor.id;
          await this.donorEventRepo.save(donorEvent);
        }

        // Save donor addresses
        for (const donorAddress of this.donorAddresses) {
          donorAddress.donorId = this.donor.id;
          await this.donorAddressRepo.save(donorAddress);
        }

        // Save donor contacts
        for (const donorContact of this.donorContacts) {
          donorContact.donorId = this.donor.id;
          await this.donorContactRepo.save(donorContact);
        }

        // Save donor places
        for (const donorPlace of this.donorPlaces) {
          donorPlace.donorId = this.donor.id;
          await this.donorPlaceRepo.save(donorPlace);
        }

        // Save donor notes
        for (const donorNote of this.donorNotes) {
          donorNote.donorId = this.donor.id;
          await this.donorNoteRepo.save(donorNote);
        }

        // Save reception hours (only if both times are filled)
        for (const receptionHour of this.donorReceptionHours) {
          if (receptionHour.startTime && receptionHour.endTime) {
            receptionHour.donorId = this.donor.id;
            await this.donorReceptionHourRepo.save(receptionHour);
          }
        }

        // Save donor relations (family relationships)
        for (const donorRelation of this.donorRelations) {
          await this.donorRelationRepo.save(donorRelation);
        }

        console.log('Saved all donor relations using Unit of Work pattern');
      }

      this.changed = wasNew || this.hasChanges();
      this.dialogRef.close(this.changed);
    } catch (error) {
      console.error('Error saving donor:', error);
    }
  }

  async onHomePlaceSelected(place: Place | undefined) {
    if (!this.donor) return;

    console.log('onHomePlaceSelected', place?.id || 'NULL', place?.placeId || 'NULL')

    this.donor.homePlaceId = place?.id || '';
    this.donor.homePlace = place;
    this.changed = true;

    // עדכון קידומת (country) בהתאם למדינה שנבחרה בכתובת
    if (place?.country?.code) {
      this.updateCountryByCode(place.country.code);
    }

    // Force UI update
    this.changeDetector.detectChanges();
  }

  async onVacationPlaceSelected(place: Place | undefined) {
    if (!this.donor) return;

    this.donor.vacationPlaceId = place?.id || '';
    this.donor.vacationPlace = place;
    this.changed = true;

    // Force UI update
    this.changeDetector.detectChanges();
  }

  async onDonorAddressPlaceSelected(donorAddress: DonorAddress, place: Place | undefined) {
    donorAddress.placeId = place?.id || '';
    donorAddress.place = place;
    this.changed = true;

    // If this is an existing address, save it immediately
    if (donorAddress.id) {
      try {
        await this.donorAddressRepo.save(donorAddress);
      } catch (error) {
        console.error('Error saving donor address:', error);
      }
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
    // Check if event already exists for this donor
    const existsAlready = this.donorEvents.find(de => de.eventId === event.id);
    if (existsAlready) {
      alert('האירוע כבר קיים עבור תורם זה');
      return;
    }

    try {
      const donorEvent = this.donorEventRepo.create({
        donorId: this.donor?.id || '',
        eventId: event.id,
        date: undefined,
        isActive: true
      });

      // Set the event relation manually
      donorEvent.event = event;

      // Add to local array - will be saved when donor is saved
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
        // If the event has an ID, it was already saved to DB and needs to be deleted
        if (donorEvent.id) {
          await this.donorEventRepo.delete(donorEvent);
        }

        // Remove from local array
        const index = this.donorEvents.findIndex(de => de === donorEvent);
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
      donorEvent.date = value || undefined;
      this.changed = true;
      // Changes will be saved when donor is saved
    } catch (error) {
      console.error('Error updating event date:', error);
    }
  }

  async addNewAddress() {
    const addressName = prompt('הזן שם לכתובת (למשל: בית, עבודה, קיץ):');
    if (!addressName || addressName.trim() === '') return;

    try {
      const newAddress = this.donorAddressRepo.create({
        donorId: this.donor?.id || '',
        placeId: '',
        addressName: addressName.trim(),
        isPrimary: this.donorAddresses.length === 0, // First address is primary by default
        isActive: true
      });

      this.donorAddresses.push(newAddress);
      this.changed = true;
    } catch (error) {
      console.error('Error adding address:', error);
      alert('שגיאה בהוספת הכתובת');
    }
  }

  async removeDonorAddress(donorAddress: DonorAddress) {
    if (confirm('האם אתה בטוח שברצונך להסיר את הכתובת?')) {
      try {
        if (!donorAddress.isNew()) {
          await this.donorAddressRepo.delete(donorAddress);
        }

        // Remove from local array
        const index = this.donorAddresses.findIndex(da => da.id === donorAddress.id);
        if (index > -1) {
          this.donorAddresses.splice(index, 1);
        }

        this.changed = true;
      } catch (error) {
        console.error('Error removing address:', error);
        alert('שגיאה בהסרת הכתובת');
      }
    }
  }

  async addNewContact(type: 'phone' | 'email') {
    try {
      const newContact = this.donorContactRepo.create({
        donorId: this.donor?.id || '',
        type: type,
        phoneNumber: type === 'phone' ? '' : undefined,
        email: type === 'email' ? '' : undefined,
        prefix: type === 'phone' ? '+972' : undefined,
        isPrimary: this.donorContacts.filter(c => c.type === type).length === 0,
        description: type === 'email'
          ? (this.donorContacts.filter(c => c.type === type).length
            ? ''
            : 'אישי')
          : (this.donorContacts.filter(c => c.type === type).length
            ? ''
            : 'נייד'),
        isActive: true
      });

      // Add to local array - will be saved when donor is saved
      this.donorContacts.push(newContact);
      this.changed = true;
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('שגיאה בהוספת איש הקשר');
    }
  }

  async removeDonorContact(donorContact: DonorContact) {
    if (confirm('האם אתה בטוח שברצונך להסיר את איש הקשר?')) {
      try {
        if (!donorContact.isNew()) {
          await this.donorContactRepo.delete(donorContact);
        }

        // Remove from local array
        const index = this.donorContacts.findIndex(dc => dc.id === donorContact.id);
        if (index > -1) {
          this.donorContacts.splice(index, 1);
        }

        this.changed = true;
      } catch (error) {
        console.error('Error removing contact:', error);
        alert('שגיאה בהסרת איש הקשר');
      }
    }
  }

  async onContactChange(donorContact: DonorContact) {
    this.changed = true;

    // If this is an existing contact, save it immediately
    if (donorContact.id) {
      try {
        await this.donorContactRepo.save(donorContact);
      } catch (error) {
        console.error('Error saving donor contact:', error);
      }
    }
  }

  getPhoneContacts(): DonorContact[] {
    return this.donorContacts.filter(c => c.type === 'phone');
  }

  getEmailContacts(): DonorContact[] {
    return this.donorContacts.filter(c => c.type === 'email');
  }

  // DonorPlace methods
  async addNewPlace() {
    try {
      // Open address type selection modal
      const selectedAddressType: DonorAddressType | undefined = await openDialog(
        DonorAddressTypeSelectionModalComponent,
        (modal: DonorAddressTypeSelectionModalComponent) => {
          modal.args = { title: 'בחר סוג כתובת' };
        }
      );

      if (!selectedAddressType) {
        return; // User cancelled
      }

      const newPlace = this.donorPlaceRepo.create({
        donorId: this.donor?.id || '',
        addressTypeId: selectedAddressType.id,
        addressType: selectedAddressType,
        description: selectedAddressType.name, // For backwards compatibility
        isPrimary: this.donorPlaces.length === 0,
        isActive: true
      });

      // Add to local array - will be saved when donor is saved
      this.donorPlaces.push(newPlace);
      this.changed = true;
    } catch (error) {
      console.error('Error adding place:', error);
      alert('שגיאה בהוספת כתובת');
    }
  }

  async removeDonorPlace(donorPlace: DonorPlace) {
    if (confirm('האם אתה בטוח שברצונך להסיר את הכתובת?')) {
      try {
        if (!donorPlace.isNew()) {
          await this.donorPlaceRepo.delete(donorPlace);
        }

        // Remove from local array
        const index = this.donorPlaces.findIndex(dp => dp.id === donorPlace.id);
        if (index > -1) {
          this.donorPlaces.splice(index, 1);
        }

        this.changed = true;
      } catch (error) {
        console.error('Error removing place:', error);
        alert('שגיאה בהסרת כתובת');
      }
    }
  }

  async onDonorPlaceSelected(donorPlace: DonorPlace, place: Place | undefined) {
    donorPlace.placeId = place?.id || '';
    donorPlace.place = place;
    this.changed = true;

    // If this is a home address, auto-populate phone prefixes from country
    if (place?.country?.phonePrefix) {
      // Update all phone contacts with the country's phone prefix
      const phonePrefix = place.country.phonePrefix;
      const phoneContacts = this.donorContacts.filter(c => c.type === 'phone');

      for (const contact of phoneContacts) {
        // Only update if prefix is empty or default
        contact.prefix = phonePrefix;
      }

      console.log(`Updated phone prefixes to ${phonePrefix} for home address`);
    }

    // Changes will be saved when donor is saved

    // Force UI update
    this.changeDetector.detectChanges();
  }

  // DonorNote methods
  async addNewNote() {
    try {
      // Open notes selection modal
      const args: NotesSelectionModalArgs = {
        noteTypes: this.noteTypes,
        title: 'בחר סוג הערה'
      };

      const result: any = await openDialog(
        NotesSelectionModalComponent,
        (modal: NotesSelectionModalComponent) => {
          modal.args = args;
        }
      );

      if (!result) {
        return;
      }

      // Update noteTypes if they were modified
      if (result.updatedNoteTypes) {
        this.noteTypes = result.updatedNoteTypes;
      }

      // Create new note with selected type
      const newNote = this.donorNoteRepo.create({
        donorId: this.donor?.id || '',
        noteType: result.noteType,
        noteTypeId: result.noteTypeId,
        content: '',
        isActive: true
      });

      // Add to local array - will be saved when donor is saved
      this.donorNotes.push(newNote);
      this.changed = true;
    } catch (error) {
      console.error('Error adding note:', error);
      alert('שגיאה בהוספת הערה');
    }
  }

  async removeDonorNote(donorNote: DonorNote) {
    if (confirm('האם אתה בטוח שברצונך להסיר את ההערה?')) {
      try {
        // Soft delete by setting isActive to false
        donorNote.isActive = false;
        await remult.repo(DonorNote).save(donorNote);

        // Remove from local array
        const index = this.donorNotes.findIndex(dn => dn.id === donorNote.id);
        if (index > -1) {
          this.donorNotes.splice(index, 1);
        }

        this.changed = true;
      } catch (error) {
        console.error('Error removing note:', error);
        alert('שגיאה בהסרת הערה');
      }
    }
  }

  async onNoteChange(donorNote: DonorNote) {
    this.changed = true;

    // If this is an existing note, save it immediately
    if (donorNote.id) {
      try {
        await this.donorNoteRepo.save(donorNote);
        console.log('Saved donor note:', donorNote.noteType);
      } catch (error) {
        console.error('Error saving donor note:', error);
      }
    }
  }

  // DonorReceptionHour methods
  async addNewReceptionHour() {
    try {
      const newReceptionHour = this.donorReceptionHourRepo.create({
        donorId: this.donor?.id || '',
        startTime: '',
        endTime: '',
        description: '',
        sortOrder: this.donorReceptionHours.length,
        isActive: true
      });

      // Don't save immediately - let user fill in the times
      // It will be saved when they change the times or when saving the donor
      this.donorReceptionHours.push(newReceptionHour);
      this.changed = true;
    } catch (error) {
      console.error('Error adding reception hour:', error);
      alert('שגיאה בהוספת טווח שעות');
    }
  }

  async removeDonorReceptionHour(receptionHour: DonorReceptionHour) {
    if (confirm('האם אתה בטוח שברצונך להסיר את טווח השעות?')) {
      try {
        if (!receptionHour.isNew()) {
          await this.donorReceptionHourRepo.delete(receptionHour);
        }

        // Remove from local array
        const index = this.donorReceptionHours.findIndex(rh => rh.id === receptionHour.id);
        if (index > -1) {
          this.donorReceptionHours.splice(index, 1);
        }

        this.changed = true;
      } catch (error) {
        console.error('Error removing reception hour:', error);
        alert('שגיאה בהסרת טווח שעות');
      }
    }
  }

  async onReceptionHourChange(receptionHour: DonorReceptionHour) {
    // Validate the time range
    const validationError = this.validateReceptionHour(receptionHour);
    if (validationError) {
      alert(validationError);
      return;
    }

    this.sortReceptionHours();
    this.changed = true;

    // Changes will be saved when donor is saved
  }

  // Validation function for reception hours
  validateReceptionHour(receptionHour: DonorReceptionHour): string | null {
    // Skip validation if times are empty
    if (!receptionHour.startTime || !receptionHour.endTime) {
      return null;
    }

    // Check if startTime < endTime
    if (receptionHour.startTime >= receptionHour.endTime) {
      return 'שעת הסיום חייבת להיות גדולה משעת ההתחלה';
    }

    // Check for overlaps with other reception hours (only with filled ones)
    for (const other of this.donorReceptionHours) {
      if (other.id === receptionHour.id) continue;

      // Skip checking against empty reception hours
      if (!other.startTime || !other.endTime) continue;

      // Check if there's an overlap
      if (
        (receptionHour.startTime >= other.startTime && receptionHour.startTime < other.endTime) ||
        (receptionHour.endTime > other.startTime && receptionHour.endTime <= other.endTime) ||
        (receptionHour.startTime <= other.startTime && receptionHour.endTime >= other.endTime)
      ) {
        return `קיימת חפיפה עם טווח שעות אחר (${other.startTime} - ${other.endTime})`;
      }
    }

    return null;
  }

  // Sort reception hours chronologically
  sortReceptionHours() {
    this.donorReceptionHours.sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });

    // Update sortOrder after sorting
    this.donorReceptionHours.forEach((rh, index) => {
      rh.sortOrder = index;
    });
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
          { value: 'en', label: 'English' },
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
      country: place.country! || '',
      countryCode: place.country?.code || '',
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
      country: place.country,
      countryCode: place.country?.code || '',
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
      country: undefined,
      countryCode: '',
      latitude: undefined,
      longitude: undefined,
      placeName: company.name || ''
    };

    console.log('getCompanyAddressComponents returning:', addressComponents);
    return addressComponents;
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

      // Auto-populate phone prefixes from country, but allow them to remain editable
      if (country.phonePrefix) {
        this.donor.homePhonePrefix = country.phonePrefix;
        this.donor.mobilePhonePrefix = country.phonePrefix;
      }

      console.log(`Updated country to: ${country.name} (${country.nameEn}) - ${country.phonePrefix}`);
      this.changed = true;
    } else {
      console.warn(`Country not found for code: ${countryCode}. Will be created automatically when place is saved.`);
    }
  }


  // Circle options (חוג)
  getCircleOptions(): { value: string; label: string }[] {
    return [
      { value: 'platinum', label: this.i18n.terms.platinum },
      { value: 'gold', label: this.i18n.terms.gold },
      { value: 'silver', label: this.i18n.terms.silver },
      { value: 'regular', label: this.i18n.terms.regular }
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

  // Company Management Functions
  private async loadCompanies() {
    try {
      this.companies = await this.companyRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      console.log(`Loaded ${this.companies.length} companies`);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  }

  async loadSelectedCompanies() {
    if (!this.donor?.companyIds || this.donor.companyIds.length === 0) {
      this.selectedCompanies = [];
      return;
    }

    try {
      this.selectedCompanies = [];
      for (const companyId of this.donor.companyIds) {
        const company = await this.companyRepo.findId(companyId);
        if (company) {
          this.selectedCompanies.push(company);
        }
      }
      console.log('Loaded selected companies:', this.selectedCompanies);
    } catch (error) {
      console.error('Error loading selected companies:', error);
    }
  }

  async addSelectedCompany() {
    if (!this.selectedCompanyIdForEdit || !this.donor) return;

    const company = this.companies.find(c => c.id === this.selectedCompanyIdForEdit);
    if (!company) return;

    // Check if already exists
    if (this.donor.companyIds?.includes(this.selectedCompanyIdForEdit)) {
      this.ui.info('חברה זו כבר נבחרה');
      return;
    }

    // Add to donor's companyIds
    if (!this.donor.companyIds) {
      this.donor.companyIds = [];
    }

    this.donor.companyIds.push(this.selectedCompanyIdForEdit);
    this.selectedCompanies.push(company);

    console.log('Added company:', company.name);
    this.changed = true;
    this.selectedCompanyIdForEdit = ''; // Reset selection
  }

  async editSelectedCompany() {
    if (!this.selectedCompanyIdForEdit) return;

    const company = this.companies.find(c => c.id === this.selectedCompanyIdForEdit);
    if (!company) return;

    try {
      const dialogResult = await openDialog(
        CompanyDetailsModalComponent,
        (modal: CompanyDetailsModalComponent) => {
          modal.args = { companyId: company.id };
        }
      );

      if (dialogResult) {
        // Reload the company
        const updatedCompany = await this.companyRepo.findId(company.id);
        if (updatedCompany) {
          // Update in selectedCompanies if it's already there
          const index = this.selectedCompanies.findIndex(c => c.id === company.id);
          if (index > -1) {
            this.selectedCompanies[index] = updatedCompany;
          }
        }
        await this.loadCompanies();
      }
    } catch (error) {
      console.error('Error editing company:', error);
    }
  }

  async addNewCompany() {
    if (!this.donor) return;

    try {
      // Get available companies that are not already selected
      const availableCompanies = this.companies.filter(
        c => !this.donor!.companyIds?.includes(c.id)
      );

      // Open company selection modal (with option to create new inside)
      const dialogResult = await openDialog(
        CompanySelectionModalComponent,
        (modal: CompanySelectionModalComponent) => {
          modal.args = {
            availableCompanies: availableCompanies,
            title: 'בחר חברה או צור חדשה'
          };
        }
      );

      if (dialogResult) {
        // Check if a new company was created
        if (typeof dialogResult === 'object' && 'newCompany' in dialogResult) {
          // A new company was created - reload companies and add it
          await this.loadCompanies();
          const newCompany = (dialogResult as any).newCompany as Company;

          if (!this.donor.companyIds) {
            this.donor.companyIds = [];
          }
          this.donor.companyIds.push(newCompany.id);
          this.selectedCompanies.push(newCompany);
          this.changed = true;
          console.log('Added newly created company:', newCompany.name);
        } else {
          // An existing company was selected
          const selectedCompany = dialogResult as Company;

          // Add to donor's companyIds
          if (!this.donor.companyIds) {
            this.donor.companyIds = [];
          }
          this.donor.companyIds.push(selectedCompany.id);
          this.selectedCompanies.push(selectedCompany);
          this.changed = true;
          console.log('Added existing company:', selectedCompany.name);
        }
      }
    } catch (error) {
      console.error('Error in addNewCompany:', error);
    }
  }

  async editCompany(company: Company) {
    try {
      const dialogResult = await openDialog(
        CompanyDetailsModalComponent,
        (modal: CompanyDetailsModalComponent) => {
          modal.args = { companyId: company.id };
        }
      );

      if (dialogResult) {
        // Reload the company
        const updatedCompany = await this.companyRepo.findId(company.id);
        if (updatedCompany) {
          const index = this.selectedCompanies.findIndex(c => c.id === company.id);
          if (index > -1) {
            this.selectedCompanies[index] = updatedCompany;
          }
        }
        await this.loadCompanies();
      }
    } catch (error) {
      console.error('Error editing company:', error);
    }
  }

  removeCompany(company: Company) {
    if (!this.donor?.companyIds) return;

    // Remove from donor's companyIds
    const index = this.donor.companyIds.indexOf(company.id);
    if (index > -1) {
      this.donor.companyIds.splice(index, 1);
    }

    // Remove from selectedCompanies
    const selectedIndex = this.selectedCompanies.findIndex(c => c.id === company.id);
    if (selectedIndex > -1) {
      this.selectedCompanies.splice(selectedIndex, 1);
    }

    console.log('Removed company:', company.name);
    this.changed = true;
  }

  getAvailableCompaniesForSelection(): Company[] {
    if (!this.donor || !this.donor.companyIds) {
      return this.companies;
    }
    return this.companies.filter(company => !this.donor!.companyIds!.includes(company.id));
  }

  // Circle Management Functions
  private async loadCircles() {
    try {
      this.circles = await this.circleRepo.find({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc', name: 'asc' }
      });
      console.log('Loaded circles:', this.circles.length);
    } catch (error) {
      console.error('Error loading circles:', error);
    }
  }

  async loadSelectedCircles() {
    if (!this.donor?.circleIds || this.donor.circleIds.length === 0) {
      this.selectedCircles = [];
      return;
    }

    try {
      this.selectedCircles = [];
      for (const circleId of this.donor.circleIds) {
        const circle = await this.circleRepo.findId(circleId);
        if (circle) {
          this.selectedCircles.push(circle);
        }
      }

      // Sort circles by sortOrder then by name
      this.selectedCircles.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        return (a.name || '').localeCompare(b.name || '', 'he');
      });

      console.log('Loaded selected circles:', this.selectedCircles);
    } catch (error) {
      console.error('Error loading selected circles:', error);
    }
  }

  async addNewCircle() {
    if (!this.donor) return;

    try {
      // Get available circles (not already selected)
      const availableCircles = this.circles.filter(
        c => !this.donor!.circleIds?.includes(c.id)
      );

      // Open circle selection modal
      const dialogResult = await openDialog(
        CircleSelectionModalComponent,
        (modal: CircleSelectionModalComponent) => {
          modal.args = {
            availableCircles: availableCircles,
            title: 'בחר חוג או צור חדש'
          };
        }
      );

      if (dialogResult) {
        console.log('-1-1', typeof dialogResult, dialogResult instanceof Circle)
        let circleToAdd: Circle | undefined;

        // Check if it's a new circle that was created
        if (typeof dialogResult === 'object') {
          if ('newCircle' in dialogResult) {
            // Reload circles list to include the new circle
            await this.loadCircles();
            circleToAdd = (dialogResult as any).newCircle;
          }
          else {
            circleToAdd = (dialogResult as Circle);
          }
        }


        // if (typeof dialogResult === 'object' && 'newCircle' in dialogResult) {
        //   console.log('00')
        //   // Reload circles list to include the new circle
        //   await this.loadCircles();
        //   circleToAdd = (dialogResult as any).newCircle;
        // } else if (dialogResult instanceof Circle) {
        //   console.log('11')
        //   // An existing circle was selected
        //   circleToAdd = dialogResult;
        // } else if (typeof dialogResult === 'object') {
        //   console.log('33')
        //   // An existing circle was selected
        //   circleToAdd = (dialogResult as Circle);
        // }

        console.log('dialogResult', dialogResult, circleToAdd)
        // Add the circle to donor's circleIds
        if (circleToAdd && !this.donor.circleIds?.includes(circleToAdd.id)) {
          if (!this.donor.circleIds) {
            this.donor.circleIds = [];
          }
          this.donor.circleIds.push(circleToAdd.id);
          // Create new array to trigger Angular change detection
          this.selectedCircles = [...this.selectedCircles, circleToAdd];

          // Save the updated circleIds to database only if this is an existing donor
          if (!this.isNewDonor && this.donor.id) {
            await remult.repo(Donor).save(this.donor);
          }

          this.changed = true;
          console.log('Added circle:', circleToAdd.name);
        }
      }
    } catch (error) {
      console.error('Error in addNewCircle:', error);
    }
  }

  async editCircle(circle: Circle) {
    try {
      const dialogResult = await openDialog(
        CircleDetailsModalComponent,
        (modal: CircleDetailsModalComponent) => {
          modal.args = { circleId: circle.id };
        }
      );

      if (dialogResult) {
        // Reload the circle
        const updatedCircle = await this.circleRepo.findId(circle.id);
        if (updatedCircle) {
          const index = this.selectedCircles.findIndex(c => c.id === circle.id);
          if (index > -1) {
            this.selectedCircles[index] = updatedCircle;
          }
        }
        await this.loadCircles();
      }
    } catch (error) {
      console.error('Error editing circle:', error);
    }
  }

  async removeCircle(circle: Circle, event?: MouseEvent) {
    if (event) {
      event.stopPropagation(); // Prevent triggering edit on tag click
    }

    if (!this.donor) return;

    // Remove from donor's circleIds
    if (this.donor.circleIds) {
      const index = this.donor.circleIds.indexOf(circle.id);
      if (index > -1) {
        this.donor.circleIds.splice(index, 1);
      }
    }

    // Save the updated circleIds to database only if this is an existing donor
    if (!this.isNewDonor && this.donor.id) {
      await remult.repo(Donor).save(this.donor);
    }

    // Remove from selectedCircles
    const selectedIndex = this.selectedCircles.findIndex(c => c.id === circle.id);
    if (selectedIndex > -1) {
      this.selectedCircles.splice(selectedIndex, 1);
    }

    console.log('Removed circle:', circle.name);
    this.changed = true;
  }

  // Family Relationships Functions
  private async loadAllDonorsForFamily() {
    try {
      this.allDonorsForFamily = await this.donorRepo.find({
        where: { isActive: true },
        orderBy: { firstName: 'asc' }
      });
      console.log(`Loaded ${this.allDonorsForFamily.length} donors for family relationships`);
    } catch (error) {
      console.error('Error loading donors for family:', error);
    }
  }

  async loadSelectedFamilyRelationships() {
    if (!this.donor?.id) {
      this.selectedFamilyRelationships = [];
      return;
    }

    try {
      this.selectedFamilyRelationships = [];

      // טען את כל הקשרים שבהם התורם הנוכחי מופיע או כ-donor1 או כ-donor2
      const relations = await this.donorRelationRepo.find({
        where: {
          $or: [
            { donor1Id: this.donor.id },
            { donor2Id: this.donor.id }
          ]
        },
        include: {
          donor1: true,
          donor2: true
        }
      });

      for (const relation of relations) {
        let relatedDonor: Donor | undefined;
        let relationshipType: string = '';
        let isReverse = false;

        // אם התורם הנוכחי הוא donor1, אזי נשתמש ב-relationshipType1
        if (relation.donor1Id === this.donor.id) {
          relatedDonor = relation.donor2;
          relationshipType = relation.relationshipType1;
          isReverse = false;
        }
        // אם התורם הנוכחי הוא donor2, אזי נחשב דינמית את הקשר ההופכי
        else if (relation.donor2Id === this.donor.id) {
          relatedDonor = relation.donor1;
          // חישוב דינמי של הקשר ההופכי לפי מגדר donor1
          relationshipType = this.getReverseRelationshipType(relation.relationshipType1, relation.donor1?.gender || '');
          isReverse = true;
        }

        if (relatedDonor && relationshipType) {
          this.selectedFamilyRelationships.push({
            donor: relatedDonor,
            relationshipType: relationshipType,
            donorId: relatedDonor.id,
            relationId: relation.id,
            isReverse: isReverse
          });
        }
      }

      console.log('Loaded selected family relationships:', this.selectedFamilyRelationships);
    } catch (error) {
      console.error('Error loading selected family relationships:', error);
    }
  }

  private buildSelectedFamilyRelationships() {
    if (!this.donor?.id) {
      this.selectedFamilyRelationships = [];
      return;
    }

    this.selectedFamilyRelationships = [];

    // Build from already loaded donorRelations
    for (const relation of this.donorRelations) {
      let relatedDonor: Donor | undefined;
      let relationshipType: string = '';
      let isReverse = false;

      // אם התורם הנוכחי הוא donor1, אזי נשתמש ב-relationshipType1
      if (relation.donor1Id === this.donor.id) {
        relatedDonor = relation.donor2;
        relationshipType = relation.relationshipType1;
        isReverse = false;
      }
      // אם התורם הנוכחי הוא donor2, אזי נחשב דינמית את הקשר ההופכי
      else if (relation.donor2Id === this.donor.id) {
        relatedDonor = relation.donor1;
        // חישוב דינמי של הקשר ההופכי לפי מגדר donor1
        relationshipType = this.getReverseRelationshipType(relation.relationshipType1, relation.donor1?.gender || '');
        isReverse = true;
      }

      if (relatedDonor && relationshipType) {
        this.selectedFamilyRelationships.push({
          donor: relatedDonor,
          relationshipType: relationshipType,
          donorId: relatedDonor.id,
          relationId: relation.id,
          isReverse: isReverse
        });
      }
    }

    console.log('Built selected family relationships from data:', this.selectedFamilyRelationships);
  }

  private getReverseRelationshipType(relationshipType: string, donorGender: 'male' | 'female' | ''): string {
    
  const reverseMap: { [key: string]: { male: string; female: string } } = {
    'בן': { male: 'אב', female: 'אם' },
    'בת': { male: 'אב', female: 'אם' },
    'אב': { male: 'בן', female: 'בת' },
    'אם': { male: 'בן', female: 'בת' },
    'נכד': { male: 'סבא', female: 'סבתא' },
    'נכדה': { male: 'סבא', female: 'סבתא' },
    'סבא': { male: 'נכד', female: 'נכדה' },
    'סבתא': { male: 'נכד', female: 'נכדה' },
    'אח': { male: 'אח', female: 'אחות' },
    'אחות': { male: 'אח', female: 'אחות' },
    'דוד': { male: 'אחיין', female: 'אחיינית' },
    'דודה': { male: 'אחיין', female: 'אחיינית' },
    'אחיין': { male: 'דוד', female: 'דודה' },
    'אחיינית': { male: 'דוד', female: 'דודה' },
    'חתן': { male: 'חותן', female: 'חותנת' },
    'כלה': { male: 'חותן', female: 'חותנת' },
    'חותן': { male: 'חתן', female: 'כלה' },
    'חותנת': { male: 'חתן', female: 'כלה' },
    'בעל': { male: '', female: 'אישה' },
    'אישה': { male: 'בעל', female: '' },
    'גיס': { male: 'גיס', female: 'גיסה' },
    'גיסה': { male: 'גיס', female: 'גיסה' },
  };

    const mapping = reverseMap[relationshipType];
    if (!mapping) return 'אחר';

    return donorGender === 'female' ? mapping.female : mapping.male;
  }

  async onFamilyMemberSelect(event: any) {
    const donorId = event.target.value;
    event.target.value = ''; // Reset selection

    if (!donorId || !this.newRelationshipType || !this.donor?.id) return;

    const selectedDonor = this.allDonorsForFamily.find(d => d.id === donorId);
    if (!selectedDonor) return;

    // Check if already exists
    const exists = this.selectedFamilyRelationships.some(r => r.donorId === donorId);
    if (exists) {
      this.ui.info('תורם זה כבר ברשימת הקשרים המשפחתיים');
      return;
    }

    try {
      // צור רשומת DonorRelation חדשה
      // relationshipType2 will be calculated dynamically when loading
      const newRelation = this.donorRelationRepo.create({
        donor1Id: this.donor.id,
        donor2Id: selectedDonor.id,
        relationshipType1: this.newRelationshipType
      });

      // await this.donorRelationRepo.save(newRelation);
console.log(' newRelation.id', newRelation.id)
      // Add to selectedFamilyRelationships for display
      this.selectedFamilyRelationships.push({
        donor: selectedDonor,
        relationshipType: this.newRelationshipType,
        donorId: selectedDonor.id,
        relationId: newRelation.id,
        isReverse: false
      });

      console.log('Added family relationship:', { donor: selectedDonor.fullName, type: this.newRelationshipType });
      this.changed = true;

      // Reset relationship type
      this.newRelationshipType = '';
    } catch (error) {
      console.error('Error adding family relationship:', error);
      this.ui.info('שגיאה בהוספת קשר משפחתי');
    }
  }

  async removeFamilyRelationship(relationship: { donor: Donor; relationshipType: string; donorId: string; relationId: string; isReverse: boolean }) {
    if (!confirm(`האם למחוק את הקשר המשפחתי עם ${relationship.donor.fullName}?`)) {
      return;
    }

    try {
      // מחק את רשומת ה-DonorRelation
      const relation = await this.donorRelationRepo.findId(relationship.relationId);
      if (relation) {
        await this.donorRelationRepo.delete(relation);
      }

      // Remove from selectedFamilyRelationships
      const selectedIndex = this.selectedFamilyRelationships.findIndex(r => r.relationId === relationship.relationId);
      if (selectedIndex > -1) {
        this.selectedFamilyRelationships.splice(selectedIndex, 1);
      }

      console.log('Removed family relationship:', relationship.donor.fullName);
      this.changed = true;
    } catch (error) {
      console.error('Error removing family relationship:', error);
      this.ui.info('שגיאה במחיקת קשר משפחתי');
    }
  }

  getAvailableDonorsForFamily(): Donor[] {
    if (!this.donor) return this.allDonorsForFamily;

    // Filter out current donor and already selected family members
    return this.allDonorsForFamily.filter(donor => {
      // Don't show current donor
      if (donor.id === this.donor?.id) return false;

      // Don't show already selected family members
      const alreadySelected = this.selectedFamilyRelationships.some(r => r.donorId === donor.id);
      return !alreadySelected;
    });
  }

  async addNewFamilyRelation() {
    if (!this.donor?.id) {
      this.ui.info('יש לשמור את התורם תחילה');
      return;
    }

    const result = await openDialog(FamilyRelationDetailsModalComponent, (dlg) => {
      dlg.args = {
        currentDonorId: this.donor!.id,
        allDonors: this.allDonorsForFamily,
        existingRelationDonorIds: this.selectedFamilyRelationships.map(r => r.donorId)
      };
    });

    if (result && result !== false) {
      // Add the new relation to local array - will be saved when donor is saved
      const newRelation = result as DonorRelation;

      // Load the related donor data if not already included
      if (!newRelation.donor2) {
        newRelation.donor2 = this.allDonorsForFamily.find(d => d.id === newRelation.donor2Id);
      }

      this.donorRelations.push(newRelation);

      // Rebuild the display list from local array
      this.buildSelectedFamilyRelationships();
      this.changed = true;
    }
  }

  async editFamilyRelation(relationship: { donor: Donor; relationshipType: string; donorId: string; relationId: string; isReverse: boolean }) {
    if (!this.donor?.id) return;

    const result = await openDialog(FamilyRelationDetailsModalComponent, (dlg) => {
      dlg.args = {
        relationId: relationship.relationId,
        currentDonorId: this.donor!.id,
        allDonors: this.allDonorsForFamily,
        existingRelationDonorIds: this.selectedFamilyRelationships
          .filter(r => r.relationId !== relationship.relationId)
          .map(r => r.donorId)
      };
    });

    if (result && result !== false) {
      // Update the relation in local array - will be saved when donor is saved
      const updatedRelation = result as DonorRelation;

      // Find and update the relation in local array
      const index = this.donorRelations.findIndex(r => r.id === updatedRelation.id);
      if (index > -1) {
        // Load the related donor data if not already included
        if (!updatedRelation.donor2) {
          updatedRelation.donor2 = this.allDonorsForFamily.find(d => d.id === updatedRelation.donor2Id);
        }

        this.donorRelations[index] = updatedRelation;
      }

      // Rebuild the display list from local array
      this.buildSelectedFamilyRelationships();
      this.changed = true;
    }
  }

  async openFamilyMemberDetails(donor: Donor, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    try {
      const dialogResult = await openDialog(
        DonorDetailsModalComponent,
        (modal: DonorDetailsModalComponent) => {
          modal.args = { donorId: donor.id };
        }
      );

      if (dialogResult) {
        // Reload the family member if it was modified
        const updatedDonor = await this.donorRepo.findId(donor.id);
        if (updatedDonor) {
          // Update in selectedFamilyRelationships
          const index = this.selectedFamilyRelationships.findIndex(r => r.donorId === donor.id);
          if (index > -1) {
            this.selectedFamilyRelationships[index].donor = updatedDonor;
          }
        }
      }
    } catch (error) {
      console.error('Error opening family member details:', error);
    }
  }

  // Scroll to specific section
  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('he-IL');
  }
}