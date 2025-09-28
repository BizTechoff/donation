import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Donation, Donor, Campaign, DonationMethod, User, DonationPartner, DonationFile, Country } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { SharedComponentsModule } from '../../../shared/shared-components.module';

export interface DonationDetailsModalArgs {
  donationId: string; // Can be 'new' for new donation or donation ID
  donorId?: string; // Optional donor ID for pre-selecting donor in new donations
  campaignId?: string; // Optional campaign ID for pre-selecting campaign in new donations
}

@Component({
  selector: 'app-donation-details-modal',
  templateUrl: './donation-details-modal.component.html',
  styleUrls: ['./donation-details-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SharedComponentsModule
  ]
})
export class DonationDetailsModalComponent implements OnInit {
  args!: DonationDetailsModalArgs;
  changed = false;
  shouldClose = false;

  donation!: Donation;
  originalDonationData?: string; // To track changes
  donors: Donor[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];
  fundraisers: User[] = [];
  availablePartners: Donor[] = [];
  selectedPartners: Donor[] = [];
  
  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  userRepo = remult.repo(User);
  donationPartnerRepo = remult.repo(DonationPartner);
  fileRepo = remult.repo(DonationFile);
  countryRepo = remult.repo(Country);
  
  loading = false;
  isNewDonation = false;
  selectedDonor?: Donor;
  selectedCampaign?: Campaign;
  selectedPaymentMethod?: DonationMethod;
  selectedFundraiser?: User;

  // Country to currency mapping
  private countryCurrencyMap: { [countryCode: string]: string } = {
    // מדינות עיקריות
    'IL': 'ILS', // ישראל
    'US': 'USD', // ארצות הברית
    'GB': 'GBP', // בריטניה
    'CA': 'CAD', // קנדה
    'AU': 'AUD', // אוסטרליה

    // אירופה - יורו
    'FR': 'EUR', // צרפת
    'DE': 'EUR', // גרמניה
    'IT': 'EUR', // איטליה
    'ES': 'EUR', // ספרד
    'NL': 'EUR', // הולנד
    'BE': 'EUR', // בלגיה
    'AT': 'EUR', // אוסטריה
    'PT': 'EUR', // פורטוגל
    'IE': 'EUR', // אירלנד
    'LU': 'EUR', // לוקסמבורג
    'FI': 'EUR', // פינלנד
    'GR': 'EUR', // יוון
    'MT': 'EUR', // מלטה
    'EE': 'EUR', // אסטוניה
    'LV': 'EUR', // לטביה
    'LT': 'EUR', // ליטא
    'SK': 'EUR', // סלובקיה
    'SI': 'EUR', // סלובניה
    'CY': 'EUR', // קפריסין

    // אירופה - מטבעות מקומיים
    'CH': 'CHF', // שוויץ
    'DK': 'DKK', // דנמרק
    'SE': 'SEK', // שוודיה
    'NO': 'NOK', // נורווגיה
    'PL': 'PLN', // פולין
    'HU': 'HUF', // הונגריה
    'CZ': 'CZK', // צ'כיה
    'RO': 'RON', // רומניה
    'BG': 'BGN', // בולגריה
    'HR': 'HRK', // קרואטיה
    'IS': 'ISK', // איסלנד
    'UA': 'UAH', // אוקראינה
    'RS': 'RSD', // סרביה
    'MK': 'MKD', // מקדוניה הצפונית
    'AL': 'ALL', // אלבניה
    'MD': 'MDL', // מולדובה
    'BY': 'BYN', // בלארוס
    'RU': 'RUB', // רוסיה
    'TR': 'TRY', // טורקיה

    // אמריקה הלטינית
    'BR': 'BRL', // ברזיל
    'AR': 'ARS', // ארגנטינה
    'MX': 'MXN', // מקסיקו
    'CL': 'CLP', // צ'ילה
    'CO': 'COP', // קולומביה
    'PE': 'PEN', // פרו
    'VE': 'VES', // ונצואלה
    'UY': 'UYU', // אורוגוואי
    'PA': 'PAB', // פנמה
    'CR': 'CRC', // קוסטה ריקה

    // אסיה
    'CN': 'CNY', // סין
    'JP': 'JPY', // יפן
    'IN': 'INR', // הודו
    'KR': 'KRW', // קוריאה הדרומית
    'TH': 'THB', // תאילנד
    'SG': 'SGD', // סינגפור
    'MY': 'MYR', // מלזיה
    'ID': 'IDR', // אינדונזיה
    'PH': 'PHP', // פיליפינים
    'VN': 'VND', // וייטנאם
    'HK': 'HKD', // הונג קונג
    'TW': 'TWD', // טייוואן
    'PK': 'PKR', // פקיסטן
    'BD': 'BDT', // בנגלדש
    'LK': 'LKR', // סרי לנקה
    'NP': 'NPR', // נפאל
    'MM': 'MMK', // מיאנמר
    'KH': 'KHR', // קמבודיה
    'MN': 'MNT', // מונגוליה

    // המזרח התיכון
    'AE': 'AED', // איחוד האמירויות
    'SA': 'SAR', // ערב הסעודית
    'JO': 'JOD', // ירדן
    'EG': 'EGP', // מצרים
    'LB': 'LBP', // לבנון
    'MA': 'MAD', // מרוקו
    'TN': 'TND', // תוניסיה
    'BH': 'BHD', // בחריין
    'KW': 'KWD', // כווית
    'QA': 'QAR', // קטאר
    'OM': 'OMR', // עומאן
    'GE': 'GEL', // גאורגיה
    'AZ': 'AZN', // אזרבייג'ן
    'AM': 'AMD', // ארמניה
    'KZ': 'KZT', // קזחסטן
    'AF': 'AFN', // אפגניסטן
    'IQ': 'IQD', // עיראק
    'IR': 'IRR', // איראן
    'SY': 'SYP', // סוריה
    'YE': 'YER', // תימן

    // אפריקה
    'ZA': 'ZAR', // דרום אפריקה
    'NG': 'NGN', // ניגריה
    'KE': 'KES', // קניה
    'ET': 'ETB', // אתיופיה
    'UG': 'UGX', // אוגנדה
    'TZ': 'TZS', // טנזניה
    'ZW': 'ZWL', // זימבבואה
    'GH': 'GHS', // גאנה
    'DZ': 'DZD', // אלג'יריה
    'LY': 'LYD', // לוב
    'SD': 'SDG', // סודן

    // אוקיאניה
    'NZ': 'NZD', // ניו זילנד
  };

  constructor(public i18n: I18nService, private ui: UIToolsService) {}

  async ngOnInit() {
    await this.initializeDonation();
    await this.loadDropdownData();
  }

  private async initializeDonation() {
    if (!this.args?.donationId) return;
    
    this.loading = true;
    try {
      if (this.args.donationId === 'new') {
        this.isNewDonation = true;
        this.donation = this.donationRepo.create();
        this.donation.donationDate = new Date();
        // this.donation.notes = 'נו?'
        this.donation.currency = 'ILS';
        this.donation.status = 'pending';

        // Initialize additional fields for dynamic payment methods
        this.donation.bankName = '';
        this.donation.checkNumber = '';
        this.donation.voucherNumber = '';
        this.donation.fundraiserId = '';
        this.donation.partnerIds = [];

        // Pre-select donor if donorId is provided
        if (this.args.donorId) {
          this.donation.donorId = this.args.donorId;
        }

        // Pre-select campaign if campaignId is provided
        if (this.args.campaignId) {
          this.donation.campaignId = this.args.campaignId;
        }

        this.originalDonationData = JSON.stringify(this.donation);
      } else {
        this.isNewDonation = false;
        const foundDonation = await this.donationRepo.findId(this.args.donationId);
        if (foundDonation) {
          this.donation = foundDonation;

          // Set default values for existing donations that don't have these fields
          if (!this.donation.donationType) {
            this.donation.donationType = 'full';
          }
          if (!this.donation.partnerIds) {
            this.donation.partnerIds = [];
          }

          this.originalDonationData = JSON.stringify(this.donation);
        }
      }
    } catch (error) {
      console.error('Error initializing donation:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDropdownData() {
    try {
      // Load donors
      this.donors = await this.donorRepo.find({
        where: { isActive: true },
        orderBy: { firstName: 'asc' }
      });

      // Load campaigns
      this.campaigns = await this.campaignRepo.find({
        orderBy: { name: 'asc' }
      });

      // Load donation methods and filter out unwanted ones
      const allMethods = await this.donationMethodRepo.find({
        orderBy: { name: 'asc' }
      });

      // Filter out paypal and cash, keep others
      this.donationMethods = allMethods.filter(method =>
        method.name !== 'paypal' && method.name !== 'מזומן'
      );

      // Add "עמותה" and "הו"ק" if they don't exist
      const hasOrganization = this.donationMethods.some(m => m.name === 'עמותה');
      const hasBankTransfer = this.donationMethods.some(m => m.name === 'הו"ק');

      if (!hasOrganization) {
        const orgMethod = this.donationMethodRepo.create();
        orgMethod.name = 'עמותה';
        this.donationMethods.push(orgMethod);
      }

      if (!hasBankTransfer) {
        const transferMethod = this.donationMethodRepo.create();
        transferMethod.name = 'הו"ק';
        this.donationMethods.push(transferMethod);
      }

      // Re-sort after adding new methods
      this.donationMethods.sort((a, b) => a.name.localeCompare(b.name, 'he'));

      // Load fundraisers (users with donator=true)
      this.fundraisers = await this.userRepo.find({
        where: { disabled: false, donator: true },
        orderBy: { name: 'asc' }
      });

      // Load available partners (all active donors)
      this.availablePartners = await this.donorRepo.find({
        where: { isActive: true },
        orderBy: { firstName: 'asc' }
      });

      // Load selected donor if donation has donorId
      await this.loadSelectedDonor();

      // Load selected campaign and payment method
      this.updateSelectedOptions();

      // If campaign was pre-selected, trigger onCampaignChange to set defaults
      if (this.isNewDonation && this.selectedCampaign) {
        this.onCampaignChange();
      }

      // Load selected partners if donation has partnerIds
      await this.loadSelectedPartners();
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  }

  private updateSelectedOptions() {
    // Update selected campaign
    if (this.donation?.campaignId) {
      this.selectedCampaign = this.campaigns.find(c => c.id === this.donation.campaignId);
    } else {
      this.selectedCampaign = undefined;
    }

    // Update selected payment method
    if (this.donation?.donationMethodId) {
      this.selectedPaymentMethod = this.donationMethods.find(m => m.id === this.donation.donationMethodId);
    } else {
      this.selectedPaymentMethod = undefined;
    }

    // Update selected fundraiser
    if (this.donation?.fundraiserId) {
      this.selectedFundraiser = this.fundraisers.find(f => f.id === this.donation.fundraiserId);
    } else {
      this.selectedFundraiser = undefined;
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
      await this.donation.save();
      
      this.changed = wasNew || this.hasChanges();
      // The dialog will automatically close and return this.changed
    } catch (error) {
      console.error('Error saving donation:', error);
    }
  }

  async deleteDonation() {
    if (!this.donation) return;

    const confirmMessage = this.i18n.currentTerms.confirmDeleteDonation?.replace('{amount}', this.donation.amount.toString()) || '';
    if (confirm(confirmMessage)) {
      try {
        await this.donation.delete();
        this.changed = true;
        // The dialog will automatically close and return this.changed
      } catch (error) {
        console.error('Error deleting donation:', error);
      }
    }
  }

  async issueReceipt() {
    if (!this.donation) return;

    try {
      await this.donation.issueReceipt();
      this.changed = true;
    } catch (error) {
      console.error('Error issuing receipt:', error);
    }
  }

  async cancelDonation() {
    if (!this.donation) return;

    const confirmMessage = this.i18n.currentTerms.confirmCancelDonation || '';
    if (confirm(confirmMessage)) {
      try {
        await this.donation.cancelDonation();
        this.changed = true;
      } catch (error) {
        console.error('Error cancelling donation:', error);
      }
    }
  }

  getDonorDisplayName(donor?: Donor): string {
    if (!donor) return '';
    return `${donor.firstName} ${donor.lastName}`.trim();
  }

  getFundraiserDisplayName(fundraiser: User): string {
    return fundraiser.name;
  }

  onFundraiserChange() {
    this.updateSelectedOptions();
    console.log('Fundraiser changed to:', this.selectedFundraiser?.name);
  }

  async loadSelectedPartners() {
    if (!this.donation?.partnerIds || this.donation.partnerIds.length === 0) {
      this.selectedPartners = [];
      return;
    }

    try {
      this.selectedPartners = [];
      for (const partnerId of this.donation.partnerIds) {
        const partner = await this.donorRepo.findId(partnerId);
        if (partner) {
          this.selectedPartners.push(partner);
        }
      }
    } catch (error) {
      console.error('Error loading selected partners:', error);
    }
  }

  addPartner(partner: Donor) {
    if (!this.donation.partnerIds.includes(partner.id)) {
      this.donation.partnerIds.push(partner.id);
      this.selectedPartners.push(partner);
      console.log('Added partner:', partner.fullName);
    }
  }

  removePartner(partner: Donor) {
    const index = this.donation.partnerIds.indexOf(partner.id);
    if (index > -1) {
      this.donation.partnerIds.splice(index, 1);
      const selectedIndex = this.selectedPartners.findIndex(p => p.id === partner.id);
      if (selectedIndex > -1) {
        this.selectedPartners.splice(selectedIndex, 1);
      }
      console.log('Removed partner:', partner.fullName);
    }
  }

  isPartnerSelected(partner: Donor): boolean {
    if (!this.donation || !this.donation.partnerIds) {
      return false;
    }
    return this.donation.partnerIds.includes(partner.id);
  }

  getAvailablePartnersForSelection(): Donor[] {
    if (!this.donation || !this.donation.partnerIds) {
      return this.availablePartners;
    }
    return this.availablePartners.filter(partner =>
      !this.donation.partnerIds.includes(partner.id)
    );
  }

  getPartnerDisplayName(partner: Donor): string {
    return partner.fullName;
  }

  onPartnerSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    const partnerId = select.value;

    if (partnerId) {
      const partner = this.availablePartners.find(p => p.id === partnerId);
      if (partner) {
        this.addPartner(partner);
        // Reset the select to empty value
        select.value = '';
      }
    }
  }

  async openPartnerDonorDetails(partner: Donor, event?: Event) {
    // נמנע מהפעלת פונקציות אחרות (כמו הסרת שותף)
    if (event) {
      event.stopPropagation();
    }

    try {
      // השותף הוא תורם בפני עצמו - פשוט נפתח את המודל שלו
      console.log('Opening donor details for partner:', partner.fullName);
      await this.ui.donorDetailsDialog(partner.id);
    } catch (error) {
      console.error('Error opening donor details for partner:', error);
      alert('שגיאה בפתיחת פרטי התורם');
    }
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

  async loadSelectedDonor() {
    if (this.donation?.donorId) {
      try {
        this.selectedDonor = await this.donorRepo.findId(this.donation.donorId) || undefined;

        // Auto-update currency for new donations when loading existing donor
        if (this.isNewDonation && this.selectedDonor) {
          await this.updateCurrencyBasedOnCountry(this.selectedDonor);
        }
      } catch (error) {
        console.error('Error loading selected donor:', error);
      }
    }
  }

  async printLetter() {
    if (!this.donation) return;

    try {
      // First save the donation data
      console.log('Saving donation before printing letter...');
      await this.saveDonation();

      // Then open letter properties selection
      console.log('Opening letter properties selection for donation:', this.donation.id);
      // TODO: Implement letter properties dialog
      alert('פתיחת מאפייני מכתב תבוצע בהמשך');
    } catch (error) {
      console.error('Error printing letter:', error);
      alert('שגיאה בהדפסת מכתב');
    }
  }

  async addReminder() {
    if (!this.donation) return;

    try {
      console.log('Adding reminder for donation:', this.donation.id);
      // TODO: Implement reminder functionality
      alert('פונקציונליות תזכורת תבוצע בהמשך');
    } catch (error) {
      console.error('Error adding reminder:', error);
      alert('שגיאה בהוספת תזכורת');
    }
  }

  onCampaignChange() {
    this.updateSelectedOptions();
    console.log('Campaign changed to:', this.selectedCampaign?.name);

    if (this.selectedCampaign) {
      // Update default donation amount only if the amount field is empty or 0
      if ((!this.donation.amount || this.donation.amount === 0) && this.selectedCampaign.defaultDonationAmount > 0) {
        this.donation.amount = this.selectedCampaign.defaultDonationAmount;
        this.changed = true;
      }

      // Update currency to match campaign currency
      if (this.selectedCampaign.currency) {
        this.donation.currency = this.selectedCampaign.currency;
        this.changed = true;
      }

      // Set donation date to today if not already set
      if (!this.donation.donationDate) {
        this.donation.donationDate = new Date();
        this.changed = true;
      }
    }
  }

  onPaymentMethodChange() {
    this.updateSelectedOptions();
    console.log('Payment method changed to:', this.selectedPaymentMethod?.name);
    console.log('Payment method type:', this.selectedPaymentMethod?.type);
    console.log('isCheckPayment:', this.isCheckPayment);
    console.log('isTransferPayment:', this.isTransferPayment);
    console.log('isOrganizationPayment:', this.isOrganizationPayment);
    console.log('isCreditCardPayment:', this.isCreditCardPayment);
    console.log('isStandingOrderPayment:', this.isStandingOrderPayment);
    console.log('isCashPayment:', this.isCashPayment);

    // Handle special payment methods
    if (this.selectedPaymentMethod?.name === 'כרטיס אשראי') {
      this.openPaymentModal();
    } else if (this.selectedPaymentMethod?.name === 'הוק') {
      this.openStandingOrderModal();
    }
  }

  // Getter methods for template conditionals
  get isCheckPayment(): boolean {
    return this.selectedPaymentMethod?.type === 'check' ||
           this.selectedPaymentMethod?.name === 'צק' ||
           this.selectedPaymentMethod?.name?.includes('צ\'ק') || false;
  }

  get isTransferPayment(): boolean {
    return this.selectedPaymentMethod?.type === 'bank_transfer' ||
           this.selectedPaymentMethod?.name === 'העברה' ||
           this.selectedPaymentMethod?.name?.includes('העברה') || false;
  }

  get isOrganizationPayment(): boolean {
    return this.selectedPaymentMethod?.name === 'עמותה' ||
           this.selectedPaymentMethod?.name?.includes('עמותה') ||
           this.selectedPaymentMethod?.name?.includes('ארגון') || false;
  }

  get isCreditCardPayment(): boolean {
    return this.selectedPaymentMethod?.type === 'credit_card' ||
           this.selectedPaymentMethod?.name === 'כרטיס אשראי' ||
           this.selectedPaymentMethod?.name?.includes('כרטיס') ||
           this.selectedPaymentMethod?.name?.includes('אשראי') || false;
  }

  get isStandingOrderPayment(): boolean {
    return this.selectedPaymentMethod?.name === 'הוק' ||
           this.selectedPaymentMethod?.name?.includes('הוראת קבע') ||
           this.selectedPaymentMethod?.name?.includes('הו"ק') || false;
  }

  get isCashPayment(): boolean {
    return this.selectedPaymentMethod?.type === 'cash' ||
           this.selectedPaymentMethod?.name === 'מזומן' ||
           this.selectedPaymentMethod?.name?.includes('מזומן') || false;
  }

  get isOnlinePayment(): boolean {
    return this.selectedPaymentMethod?.isOnline ||
           this.selectedPaymentMethod?.name === 'תשלום מקוון' ||
           this.selectedPaymentMethod?.name === 'PayPal' ||
           this.selectedPaymentMethod?.name === 'Stripe' ||
           this.selectedPaymentMethod?.name?.includes('מקוון') || false;
  }

  getDaysOfMonth(): number[] {
    return Array.from({ length: 31 }, (_, i) => i + 1);
  }

  getDaysOfWeek(): { value: number; name: string }[] {
    return [
      { value: 0, name: 'ראשון' },
      { value: 1, name: 'שני' },
      { value: 2, name: 'שלישי' },
      { value: 3, name: 'רביעי' },
      { value: 4, name: 'חמישי' },
      { value: 5, name: 'שישי' },
      { value: 6, name: 'שבת' }
    ];
  }

  openCampaignContacts() {
    if (!this.selectedCampaign) return;

    try {
      console.log('Opening campaign contacts for:', this.selectedCampaign.name);
      // TODO: Implement campaign contacts functionality
      alert(`פתיחת אנשי קשר ופעילים עבור קמפיין: ${this.selectedCampaign.name}`);
    } catch (error) {
      console.error('Error opening campaign contacts:', error);
      alert('שגיאה בפתיחת אנשי קשר ופעילים');
    }
  }

  openPaymentModal() {
    try {
      console.log('Opening payment modal for credit card');
      // TODO: Implement payment modal
      // alert('פתיחת מודל תשלום לכרטיס אשראי תבוצע בהמשך');
      // this.ui.info('פתיחת מודל תשלום לכרטיס אשראי תבוצע בהמשך');
    } catch (error) {
      console.error('Error opening payment modal:', error);
      alert('שגיאה בפתיחת מודל תשלום');
    }
  }

  async openStandingOrderModal() {
    try {
      console.log('Opening StandingOrderModal for הו"ק');

      // Open the standing order modal for creating a new standing order
      const donorId = this.donation?.donorId;
      const result = await this.ui.standingOrderDetailsDialog('new', donorId ? { donorId } : undefined);

      if (result) {
        console.log('Standing order created successfully');
      }
    } catch (error) {
      console.error('Error opening StandingOrderModal:', error);
      alert('שגיאה בפתיחת הוראת קבע');
    }
  }

  async scanFile() {
    if (!this.donation) return;

    try {
      console.log('Opening file scan for donation:', this.donation.id);

      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf';
      input.multiple = true;

      input.onchange = async (event: any) => {
        const files = event.target.files;
        if (files && files.length > 0) {
          await this.uploadFiles(files);
        }
      };

      input.click();
    } catch (error) {
      console.error('Error opening file scan:', error);
      alert('שגיאה בפתיחת סריקת קבצים');
    }
  }

  async uploadFiles(files: FileList) {
    try {
      // First save the donation if it's new
      if (this.isNewDonation) {
        await this.saveDonation();
      }

      for (let i = 0; i < files.length; i++) {
        const uploadedFile = files[i];
        await this.uploadSingleFile(uploadedFile);
      }

      alert(`הועלו ${files.length} קבצים בהצלחה`);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('שגיאה בהעלאת קבצים');
    }
  }

  async uploadSingleFile(uploadedFile: File) {
    try {
      // Create file entity
      const fileEntity = this.fileRepo.create();
      fileEntity.fileName = uploadedFile.name;
      fileEntity.fileType = uploadedFile.type;
      fileEntity.fileSize = uploadedFile.size;
      fileEntity.donationId = this.donation.id;
      fileEntity.description = `סריקת קובץ עבור תרומה`;
      fileEntity.isActive = true;

      // For now, we'll save just the metadata
      // In a real implementation, you would upload the file to storage
      // and save the file path
      fileEntity.filePath = `/uploads/donations/${this.donation.id}/${uploadedFile.name}`;

      await fileEntity.save();
      console.log('File metadata saved:', fileEntity.fileName);
    } catch (error) {
      console.error('Error uploading single file:', error);
      throw error;
    }
  }

  // Update currency based on selected donor's country
  async onDonorChange(donorId: string) {
    if (!donorId) {
      // If no donor selected, default to ILS
      this.donation.currency = 'ILS';
      this.selectedDonor = undefined;
      return;
    }

    try {
      // Load the selected donor
      this.selectedDonor = await this.donorRepo.findId(donorId) || undefined;

      if (this.selectedDonor) {
        await this.updateCurrencyBasedOnCountry(this.selectedDonor);
      }
    } catch (error) {
      console.error('Error in onDonorChange:', error);
      // Default to ILS on error
      this.donation.currency = 'ILS';
    }
  }

  // Helper function to update currency based on donor's country
  private async updateCurrencyBasedOnCountry(donor: Donor) {
    try {
      // Load the country to get the country code - removed countryId reference
      if (donor.homePlace) {
        // Country lookup disabled for now - this.countries not available

        // Country-based currency update disabled
        // if (country?.code) {
          // Map country code to currency
          // const currency = this.countryCurrencyMap[country.code];
          // if (currency) {
          //   this.donation.currency = currency;
          //   console.log(`Updated currency to ${currency} based on country ${country.name} (${country.code})`);
          // } else {
          //   // Default to ILS if no mapping found
          //   this.donation.currency = 'ILS';
          //   console.log(`No currency mapping found for country ${country.code}, defaulting to ILS`);
          // }
        // Default to ILS
        this.donation.currency = 'ILS';
      } else {
        // Default to ILS if donor has no country
        this.donation.currency = 'ILS';
      }
    } catch (error: any) {
      console.error('Error updating currency based on donor country:', error);
      // Default to ILS on error
      this.donation.currency = 'ILS';
    }
  }
}