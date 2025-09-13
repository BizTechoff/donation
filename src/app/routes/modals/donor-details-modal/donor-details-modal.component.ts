import { Component, OnInit } from '@angular/core';
import { Donor, Donation, Event, DonorEvent, CompanyInfo } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';

export interface DonorDetailsModalArgs {
  donorId: string; // Can be 'new' for new donor or donor ID
}

// PersonalEvent interface is no longer needed - using DonorEvent entity instead

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
  eventRepo = remult.repo(Event);
  donorEventRepo = remult.repo(DonorEvent);
  loading = false;
  isNewDonor = false;
  
  // Events system
  availableEvents: Event[] = [];
  donorEvents: DonorEvent[] = [];
  
  // Custom personal dates (legacy - keeping for backward compatibility)
  customPersonalDates: { name: string; date: Date | null }[] = [];
  showAddDateDialog = false;
  newDateName = '';
  newEventDescription = '';
  
  // Event search and creation
  eventSearchTerm = '';
  showCreateNewEvent = false;

  constructor(public i18n: I18nService) {}

  async ngOnInit() {
    await this.loadAvailableEvents();
    await this.initializeDonor();
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
        this.donor.country = 'ישראל';
        this.donor.companies = [];
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
    if (this.newDateName.trim()) {
      this.customPersonalDates.push({
        name: this.newDateName.trim(),
        date: null
      });
      this.newDateName = '';
      this.showAddDateDialog = false;
      this.changed = true;
    }
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

  openAddDateDialog() {
    this.showAddDateDialog = true;
    this.newDateName = '';
  }

  closeAddDateDialog() {
    this.showAddDateDialog = false;
    this.newDateName = '';
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
      
      this.closeAddDateDialog();
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

  // Filter events based on search term
  getFilteredEvents(): Event[] {
    if (!this.eventSearchTerm.trim()) {
      return this.getAvailableEvents();
    }
    
    return this.getAvailableEvents().filter(event =>
      event.description.toLowerCase().includes(this.eventSearchTerm.toLowerCase())
    );
  }

  // Create a new event and save to database
  async createNewEvent() {
    if (!this.newEventDescription.trim()) {
      alert('יש להזין תיאור לאירוע החדש');
      return;
    }

    try {
      const newEvent = this.eventRepo.create({
        description: this.newEventDescription.trim(),
        type: 'personal',
        isRequired: false,
        isActive: true,
        sortOrder: 999,
        category: 'אישי'
      });

      await newEvent.save();
      
      // Add to available events list
      this.availableEvents.push(newEvent);
      
      // Reset form
      this.newEventDescription = '';
      this.showCreateNewEvent = false;
      
      // Add the new event to the donor
      await this.addEventFromDialog(newEvent);
      
    } catch (error) {
      console.error('Error creating new event:', error);
      alert('שגיאה ביצירת האירוע החדש');
    }
  }

  // Toggle create new event form
  toggleCreateNewEvent() {
    this.showCreateNewEvent = !this.showCreateNewEvent;
    if (this.showCreateNewEvent) {
      this.newEventDescription = '';
    }
  }

  // Clear search
  clearSearch() {
    this.eventSearchTerm = '';
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
      country: 'ישראל',
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
}