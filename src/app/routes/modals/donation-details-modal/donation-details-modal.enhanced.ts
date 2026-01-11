import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Donation, Donor, Campaign, DonationMethod } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../services/ui-tools.service';
import {
  ModalNavigationHeaderComponent,
  NavigationRecord,
  FilterOption,
  ActiveFilter
} from '../../../shared/modal-navigation-header/modal-navigation-header.component';

export interface DonationDetailsModalArgs {
  donationId: string;
  donorId?: string;
}

@Component({
  selector: 'app-donation-details-modal',
  templateUrl: './donation-details-modal.component.html',
  styleUrls: ['./donation-details-modal.component.scss']
})
export class DonationDetailsModalComponent implements OnInit {
  args!: DonationDetailsModalArgs;
  changed = false;

  donation!: Donation;
  originalDonationData?: string;
  
  // Dropdown data
  donors: Donor[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];
  
  // Navigation header properties
  allDonations: NavigationRecord[] = [];
  filterOptions: FilterOption[] = [];
  currentDonationRecord?: NavigationRecord;
  
  // Repositories
  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  
  loading = false;
  isNewDonation = false;

  constructor(public i18n: I18nService, private ui: UIToolsService) {}

  async ngOnInit() {
    await this.loadDropdownData();
    await this.initializeDonation();
    await this.loadAllDonations();
    this.setupFilterOptions();
  }

  private async loadAllDonations() {
    try {
      const donations = await this.donationRepo.find({
        orderBy: { donationDate: 'desc' }
      });
      
      this.allDonations = await Promise.all(donations.map(async donation => {
        const donor = await this.donorRepo.findId(donation.donorId);
        const campaign = donation.campaignId ? await this.campaignRepo.findId(donation.campaignId) : null;
        
        return {
          ...donation,
          id: donation.id,
          displayName: `₪${donation.amount.toLocaleString()} - ${donor?.fullName || 'תורם לא ידוע'} - ${
            new Date(donation.donationDate).toLocaleDateString('he-IL')
          }${campaign ? ` - ${campaign.name}` : ''}`
        };
      }));
      
      // Set current donation record
      if (this.donation && this.donation.id) {
        this.currentDonationRecord = this.allDonations.find(d => d.id === this.donation.id);
      }
    } catch (error) {
      console.error('Error loading all donations:', error);
    }
  }

  private setupFilterOptions() {
    this.filterOptions = [
      {
        key: 'amount',
        label: 'סכום תרומה',
        type: 'amount'
      },
      {
        key: 'paymentMethodId',
        label: 'אמצעי תשלום',
        type: 'select',
        options: this.donationMethods.map(method => ({
          value: method.id,
          label: method.name
        }))
      },
      {
        key: 'campaignId',
        label: 'קמפיין',
        type: 'select',
        options: [
          { value: '', label: 'ללא קמפיין' },
          ...this.campaigns.map(campaign => ({
            value: campaign.id,
            label: campaign.name
          }))
        ]
      },
      {
        key: 'isRecurring',
        label: 'תרומה חוזרת',
        type: 'boolean'
      },
      {
        key: 'isAnonymous',
        label: 'תרומה אנונימית',
        type: 'boolean'
      },
      {
        key: 'status',
        label: 'סטטוס',
        type: 'select',
        options: [
          { value: 'pending', label: 'ממתין' },
          { value: 'approved', label: 'אושר' },
          { value: 'completed', label: 'הושלם' },
          { value: 'cancelled', label: 'בוטל' }
        ]
      },
      {
        key: 'receiptIssued',
        label: 'קבלה הונפקה',
        type: 'boolean'
      }
    ];
    
    // Add dynamic donor filter
    const donorFilter: FilterOption = {
      key: 'donorId',
      label: 'תורם',
      type: 'select',
      options: this.donors.map(donor => ({
        value: donor.id,
        label: donor.fullName || `${donor.firstName} ${donor.lastName}`
      }))
    };
    this.filterOptions.unshift(donorFilter);
  }

  private async initializeDonation() {
    if (!this.args?.donationId) return;
    
    this.loading = true;
    try {
      if (this.args.donationId === 'new') {
        this.isNewDonation = true;
        this.donation = this.donationRepo.create();
        this.donation.donationDate = new Date();
        this.donation.amount = 0;
        this.donation.status = 'pending';
        
        // Pre-select donor if provided
        if (this.args.donorId) {
          this.donation.donorId = this.args.donorId;
        }
        
        this.originalDonationData = JSON.stringify(this.donation);
      } else {
        this.isNewDonation = false;
        this.donation = await this.donationRepo.findId(this.args.donationId) || this.donationRepo.create();
        this.originalDonationData = JSON.stringify(this.donation);
      }
    } catch (error) {
      console.error('Error initializing donation:', error);
    } finally {
      this.loading = false;
    }
  }

  private async loadDropdownData() {
    try {
      const [donors, campaigns, methods] = await Promise.all([
        this.donorRepo.find({ where: { isActive: true }, orderBy: { lastName: 'asc', firstName: 'asc' } }),
        this.campaignRepo.find({ where: { isActive: true }, orderBy: { name: 'asc' } }),
        this.donationMethodRepo.find({ orderBy: { name: 'asc' } })
      ]);
      
      this.donors = donors;
      this.campaigns = campaigns;
      this.donationMethods = methods;
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  }

  // Navigation Header Event Handlers
  onRecordSelected(record: NavigationRecord) {
    if (record.id !== this.donation?.id) {
      this.args.donationId = record.id;
      this.initializeDonation();
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
    console.log('Navigate to next donation');
  }

  onNavigatePrevious() {
    // Navigation is handled by the navigation header component
    console.log('Navigate to previous donation');
  }

  // Quick Action Methods
  async issueTaxReceipt() {
    if (!this.donation || this.donation.receiptIssued) return;
    
    try {
      // Issue tax receipt logic here
      this.donation.receiptIssued = true;
      this.donation.receiptDate = new Date();
      await remult.repo(Donation).save(this.donation);
      alert('קבלה הונפקה בהצלחה');
    } catch (error) {
      console.error('Error issuing receipt:', error);
      alert('שגיאה בהנפקת קבלה');
    }
  }

  async sendThankYouLetter() {
    if (!this.donation) return;
    
    try {
      // Send thank you letter logic here
      alert('מכתב תודה נשלח בהצלחה');
    } catch (error) {
      console.error('Error sending thank you letter:', error);
      alert('שגיאה בשליחת מכתב תודה');
    }
  }

  async duplicateDonation() {
    if (!this.donation) return;
    
    try {
      const newDonation = this.donationRepo.create({
        ...this.donation,
        id: undefined,
        donationDate: new Date(),
        status: 'pending',
        receiptIssued: false,
        receiptDate: undefined
      });
      
      await remult.repo(Donation).save(newDonation);
      this.args.donationId = newDonation.id;
      await this.initializeDonation();
      await this.loadAllDonations();
      
      alert('התרומה שוכפלה בהצלחה');
    } catch (error) {
      console.error('Error duplicating donation:', error);
      alert('שגיאה בשכפול התרומה');
    }
  }

  private hasChanges(): boolean {
    if (!this.donation || !this.originalDonationData) return false;
    return JSON.stringify(this.donation) !== this.originalDonationData;
  }

  async saveDonation() {
    if (!this.donation) return;

    try {
      const wasNew = this.isNewDonation;
      await remult.repo(Donation).save(this.donation);
      
      this.changed = wasNew || this.hasChanges();
      
      if (wasNew) {
        // Reload all donations to include the new one
        await this.loadAllDonations();
      }
      
      alert('התרומה נשמרה בהצלחה');
    } catch (error) {
      console.error('Error saving donation:', error);
      alert('שגיאה בשמירת התרומה');
    }
  }

  async deleteDonation() {
    if (!this.donation) return;

    const yes = await this.ui.yesNoQuestion('האם אתה בטוח שברצונך למחוק תרומה זו?');
    if (yes) {
      try {
        await remult.repo(Donation).delete(this.donation);
        this.changed = true;
        // The dialog will automatically close
      } catch (error) {
        console.error('Error deleting donation:', error);
        alert('שגיאה במחיקת התרומה');
      }
    }
  }

  closeModal(event?: MouseEvent) {
    if (event && event.target === event.currentTarget) {
      this.changed = false;
    } else if (!event) {
      this.changed = false;
    }
  }
}