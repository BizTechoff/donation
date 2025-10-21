import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Bank, Campaign, Country, Donation, DonationFile, DonationMethod, DonationPartner, Donor, Organization, User } from '../../../../shared/entity';
import { Letter } from '../../../../shared/enum/letter';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { LetterService } from '../../../services/letter.service';
import { BankDetailsModalComponent } from '../bank-details-modal/bank-details-modal.component';
import { DonorDetailsModalComponent } from '../donor-details-modal/donor-details-modal.component';
import { OrganizationDetailsModalComponent } from '../organization-details-modal/organization-details-modal.component';
import { ReminderDetailsModalComponent } from '../reminder-details-modal/reminder-details-modal.component';

export interface DonationDetailsModalArgs {
  donationId: string; // Can be 'new' for new donation or donation ID
  donorId?: string; // Optional donor ID for pre-selecting donor in new donations
  campaignId?: string; // Optional campaign ID for pre-selecting campaign in new donations
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '80vw',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-donation-details-modal',
  templateUrl: './donation-details-modal.component.html',
  styleUrls: ['./donation-details-modal.component.scss']
})
export class DonationDetailsModalComponent implements OnInit {
  args!: DonationDetailsModalArgs;
  changed = false;

  donation!: Donation;
  originalDonationData?: string; // To track changes
  donors: Donor[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];
  fundraisers: User[] = [];
  availablePartners: Donor[] = [];
  selectedPartners: Donor[] = [];
  organizations: Organization[] = [];
  banks: Bank[] = [];

  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  userRepo = remult.repo(User);
  donationPartnerRepo = remult.repo(DonationPartner);
  fileRepo = remult.repo(DonationFile);
  countryRepo = remult.repo(Country);
  organizationRepo = remult.repo(Organization);
  bankRepo = remult.repo(Bank);

  loading = false;
  isNewDonation = false;
  selectedDonor?: Donor;
  selectedCampaign?: Campaign;
  selectedPaymentMethod?: DonationMethod;
  selectedFundraiser?: User;
  selectedOrganization?: Organization;
  selectedBank?: Bank;

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

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private cdr: ChangeDetectorRef,
    private letter: LetterService,
    public dialogRef: MatDialogRef<DonationDetailsModalComponent>
  ) { }

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

        // Initialize standing order defaults
        this.donation.standingOrderType = 'bank';
        this.donation.unlimitedPayments = true; // Default to unlimited
        this.donation.numberOfPayments = 0; // 0 when unlimited is true

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
      this.donationMethods = await this.donationMethodRepo.find({
        orderBy: { name: 'asc' }
      });

      // Filter out paypal and cash, keep others
      // this.donationMethods = allMethods.filter(method =>
      //   method.name !== 'paypal' && method.name !== 'מזומן'
      // );

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
      // this.donationMethods.sort((a, b) => a.name.localeCompare(b.name, 'he'));

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

      // Load organizations (active only)
      this.organizations = await this.organizationRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });

      // Load banks (active only)
      this.banks = await this.bankRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });

      // Load selected organization and bank
      await this.loadSelectedOrganizationAndBank();
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
    if (!this.donation) return false;

    // Validate required fields
    if (!this.donation.donorId) {
      this.ui.error('נא לבחור תורם');
      return false;
    }

    if (!this.donation.donationType) {
      this.ui.error('נא לבחור סוג תרומה');
      return false;
    }

    if (!this.donation.amount || this.donation.amount <= 0) {
      this.ui.error('נא להזין סכום תרומה חיובי');
      return false;
    }

    if (!this.donation.donationDate) {
      this.ui.error('נא לבחור תאריך תרומה');
      return false;
    }

    if (!this.donation.donationMethodId) {
      this.ui.error('נא לבחור אמצעי תשלום');
      return false;
    }

    try {
      const wasNew = this.isNewDonation;

      // Use remult.repo() for saving in the app (client side)
      await this.donationRepo.save(this.donation);

      this.changed = wasNew || this.hasChanges();
      this.dialogRef.close(this.changed);
      return true
    } catch (error) {
      console.error('Error saving donation:', error);
      this.ui.error('שגיאה בשמירת התרומה');
      return false
    }
  }

  async deleteDonation() {
    if (!this.donation) return;

    const confirmMessage = this.i18n.currentTerms.confirmDeleteDonation?.replace('{amount}', this.donation.amount.toString()) || '';
    if (confirm(confirmMessage)) {
      try {
        // Use remult.repo() for deleting in the app (client side)
        await this.donationRepo.delete(this.donation);
        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error deleting donation:', error);
        this.ui.error('שגיאה במחיקת התרומה');
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
    return partner.fullName || '';
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
    // If clicking on overlay or direct close button click
    if ((event && event.target === event.currentTarget) || !event) {
      this.dialogRef.close(this.changed);
    }
  }

  async loadSelectedDonor() {
    if (this.donation?.donorId) {
      try {
        this.selectedDonor = await this.donorRepo.findId(this.donation.donorId, {
          include: { fundraiser: true }
        }) || undefined;

        // Auto-update currency for new donations when loading existing donor
        if (this.isNewDonation && this.selectedDonor) {
          await this.updateCurrencyBasedOnCountry(this.selectedDonor);

          // Auto-fill fundraiser if donor has one and donation doesn't have fundraiser yet
          if (this.selectedDonor.fundraiser && !this.donation.fundraiserId) {
            this.donation.fundraiserId = this.selectedDonor.fundraiser.id;
          }
        }
      } catch (error) {
        console.error('Error loading selected donor:', error);
      }
    }
  }

  async loadSelectedOrganizationAndBank() {
    try {
      if (this.donation?.organizationId) {
        this.selectedOrganization = await this.organizationRepo.findId(this.donation.organizationId) || undefined;
      }
      if (this.donation?.bankId) {
        this.selectedBank = await this.bankRepo.findId(this.donation.bankId) || undefined;
      }
    } catch (error) {
      console.error('Error loading selected organization and bank:', error);
    }
  }

  async printLetter() {
    if (!this.donation) return;

    try {
      // Validate required fields before saving
      if (!this.donation.donorId) {
        this.ui.error('נא לבחור תורם');
        return;
      }

      if (!this.donation.donationType) {
        this.ui.error('נא לבחור סוג תרומה');
        return;
      }

      if (!this.donation.amount || this.donation.amount <= 0) {
        this.ui.error('נא להזין סכום תרומה חיובי');
        return;
      }

      if (!this.donation.donationDate) {
        this.ui.error('נא לבחור תאריך תרומה');
        return;
      }

      if (!this.donation.donationMethodId) {
        this.ui.error('נא לבחור אמצעי תשלום');
        return;
      }

      // Save the donation WITHOUT closing the modal
      console.log('Saving donation before printing letter...');
      const wasNew = this.isNewDonation;

      // Use remult.repo() for saving in the app (client side)
      await this.donationRepo.save(this.donation);

      this.changed = wasNew || this.hasChanges();

      // Update the original data to reflect the saved state
      this.originalDonationData = JSON.stringify(this.donation);

      // If it was new, it's not new anymore
      if (this.isNewDonation) {
        this.isNewDonation = false;
      }

      // Then open letter properties modal
      console.log('Opening letter properties selection for donation:', this.donation.id);
      const result = await this.ui.letterPropertiesDialog(this.donation.id);

      if (result) {
        console.log('Letter generated successfully:', result);
      }
    } catch (error) {
      console.error('Error printing letter:', error);
      this.ui.error('שגיאה בהפקת מכתב');
    }
  }

  async addReminder() {
    if (!this.donation) return;

    try {
      const reminderCreated = await this.ui.reminderDetailsDialog('new', {
        donationId: this.donation.id
      });

      if (reminderCreated) {
        console.log('Reminder created successfully for donation:', this.donation.id);
      }
    } catch (error) {
      console.error('Error opening reminder modal:', error);
      this.ui.error('שגיאה בפתיחת מודל התזכורת');
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

  getPaymentMethodDisplayName(method: DonationMethod): string {
    const typeLabels: { [key: string]: string } = {
      cash: this.i18n.terms.cash,
      check: this.i18n.terms.check,
      credit_card: this.i18n.terms.credit_card,
      bank_transfer: this.i18n.terms.bank_transfer,
      standing_order: this.i18n.terms.standingOrder,
      association: this.i18n.terms.organizationStandingOrder
    };
    return typeLabels[method.type] || method.name;
  }

  onUnlimitedPaymentsChange() {
    if (this.donation.unlimitedPayments) {
      // When unlimited is selected, clear the number of payments
      this.donation.numberOfPayments = 0;
    } else {
      // When limited is selected, set a default value if it's 0
      if (!this.donation.numberOfPayments || this.donation.numberOfPayments === 0) {
        this.donation.numberOfPayments = 12; // Default to 12 payments
      }
    }
    this.changed = true;
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

      // Use remult.repo() for saving in the app (client side)
      await this.fileRepo.save(fileEntity);
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
      // Load the selected donor with fundraiser relation
      this.selectedDonor = await this.donorRepo.findId(donorId, {
        include: { fundraiser: true }
      }) || undefined;

      if (this.selectedDonor) {
        // Update currency based on country
        await this.updateCurrencyBasedOnCountry(this.selectedDonor);

        // Auto-fill fundraiser if donor has one
        if (this.selectedDonor.fundraiser) {
          this.donation.fundraiserId = this.selectedDonor.fundraiser.id;
        }
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

  // Organization and Bank handlers
  onOrganizationChange() {
    if (this.donation?.organizationId) {
      this.selectedOrganization = this.organizations.find(o => o.id === this.donation.organizationId);
      console.log('Organization changed to:', this.selectedOrganization?.name);

      // Auto-populate organization fields
      if (this.selectedOrganization) {
        this.donation.payerName = this.selectedOrganization.name;
        this.donation.bankAccount = this.selectedOrganization.accountNumber || '';
        // Note: voucherNumber is typically filled manually per donation, not from organization
      }
    } else {
      this.selectedOrganization = undefined;
      // Clear fields when no organization selected
      this.donation.payerName = '';
      this.donation.bankAccount = '';
    }
  }

  onBankChange() {
    if (this.donation?.bankId) {
      this.selectedBank = this.banks.find(b => b.id === this.donation.bankId);
      console.log('Bank changed to:', this.selectedBank?.name);

      // Auto-populate bank fields
      if (this.selectedBank) {
        this.donation.bankName = this.selectedBank.name;
        this.donation.bankBranch = this.selectedBank.branchCode || '';
        this.donation.bankAccount = this.selectedBank.bankCode || '';
      }
    } else {
      this.selectedBank = undefined;
      // Clear fields when no bank selected
      this.donation.bankName = '';
      this.donation.bankBranch = '';
      this.donation.bankAccount = '';
    }
  }

  async addNewOrganization() {
    try {
      // Open organization details modal for new organization
      const result = await this.ui.organizationDetailsDialog(undefined);

      // If the modal closed with changes (organization was saved)
      if (result) {
        // Refresh organizations list
        this.organizations = await this.organizationRepo.find({
          where: { isActive: true },
          orderBy: { name: 'asc' }
        });

        // Find and select the newly added organization (it should be the last one if sorted by creation date)
        if (this.organizations.length > 0) {
          // Get the most recently created organization
          const newestOrg = this.organizations.reduce((prev, current) =>
            (current.createdDate > prev.createdDate) ? current : prev
          );

          this.donation.organizationId = newestOrg.id;
          this.selectedOrganization = newestOrg;

          this.ui.info(`עמותה "${newestOrg.name}" נוספה בהצלחה`);
          console.log('New organization added:', newestOrg.name);
        }
      }
    } catch (error) {
      console.error('Error adding new organization:', error);
      this.ui.error('שגיאה בהוספת עמותה חדשה');
    }
  }

  async addNewBank() {
    try {
      // Open bank details modal for new bank
      const result = await this.ui.bankDetailsDialog(undefined);

      // If the modal closed with changes (bank was saved)
      if (result) {
        // Refresh banks list
        this.banks = await this.bankRepo.find({
          where: { isActive: true },
          orderBy: { name: 'asc' }
        });

        // Find and select the newly added bank (it should be the last one if sorted by creation date)
        if (this.banks.length > 0) {
          // Get the most recently created bank
          const newestBank = this.banks.reduce((prev, current) =>
            (current.createdDate > prev.createdDate) ? current : prev
          );

          this.donation.bankId = newestBank.id;
          this.selectedBank = newestBank;

          this.ui.info(`בנק "${newestBank.name}" נוסף בהצלחה`);
          console.log('New bank added:', newestBank.name);
        }
      }
    } catch (error) {
      console.error('Error adding new bank:', error);
      this.ui.error('שגיאה בהוספת בנק חדש');
    }
  }

  async editBank() {
    if (!this.donation.bankId) {
      this.ui.info('אנא בחר בנק לעריכה');
      return;
    }

    try {
      // Open bank details modal for editing existing bank
      const result = await this.ui.bankDetailsDialog(this.donation.bankId);

      // If the modal closed with changes (bank was updated)
      if (result) {
        // Refresh banks list
        this.banks = await this.bankRepo.find({
          where: { isActive: true },
          orderBy: { name: 'asc' }
        });

        // Reload the selected bank
        await this.loadSelectedOrganizationAndBank();

        this.ui.info('הבנק עודכן בהצלחה');
      }
    } catch (error) {
      console.error('Error editing bank:', error);
      this.ui.error('שגיאה בעריכת הבנק');
    }
  }

  async editOrganization() {
    if (!this.donation.organizationId) {
      this.ui.info('אנא בחר עמותה לעריכה');
      return;
    }

    try {
      // Open organization details modal for editing existing organization
      const result = await this.ui.organizationDetailsDialog(this.donation.organizationId);

      // If the modal closed with changes (organization was updated)
      if (result) {
        // Refresh organizations list
        this.organizations = await this.organizationRepo.find({
          where: { isActive: true },
          orderBy: { name: 'asc' }
        });

        // Reload the selected organization
        await this.loadSelectedOrganizationAndBank();

        this.ui.info('העמותה עודכנה בהצלחה');
      }
    } catch (error) {
      console.error('Error editing organization:', error);
      this.ui.error('שגיאה בעריכת העמותה');
    }
  }

  async openDonorDetails() {
    if (!this.donation?.donorId) return;

    try {
      // Open donor details modal
      const result = await openDialog(DonorDetailsModalComponent, (dlg) => {
        dlg.args = { donorId: this.donation.donorId };
      });

      // If the modal closed with changes (donor was updated)
      if (result) {
        // Refresh donors list
        this.donors = await this.donorRepo.find({
          orderBy: { lastName: 'asc', firstName: 'asc' },
          limit: 1000
        });

        // Reload the selected donor
        await this.loadSelectedDonor();

        this.ui.info('התורם עודכן בהצלחה');
      }
    } catch (error) {
      console.error('Error opening donor details:', error);
      this.ui.error('שגיאה בפתיחת פרטי התורם');
    }
  }

  /**
   * Get currency name based on currency code
   */
  getCurrencyName(code: string): string {
    const key = `currency${code}` as keyof typeof this.i18n.terms;
    return this.i18n.terms[key] as string || code;
  }
}