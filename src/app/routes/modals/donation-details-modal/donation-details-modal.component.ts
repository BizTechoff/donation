import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { DonationController } from '../../../../shared/controllers/donation.controller';
import { Bank, Campaign, Company, Country, Donation, DonationBank, DonationFile, DonationMethod, DonationOrganization, DonationPartner, Donor, Organization, User } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { DonorService } from '../../../services/donor.service';
import { LetterService } from '../../../services/letter.service';
import { BankSelectionModalComponent } from '../bank-selection-modal/bank-selection-modal.component';
import { DonorDetailsModalComponent } from '../donor-details-modal/donor-details-modal.component';
import { DonorSelectionModalComponent } from '../donor-selection-modal/donor-selection-modal.component';
import { OrganizationSelectionModalComponent } from '../organization-selection-modal/organization-selection-modal.component';

export interface DonationDetailsModalArgs {
  donationId: string; // Can be 'new' for new donation or donation ID
  donorId?: string; // Optional donor ID for pre-selecting donor in new donations
  campaignId?: string; // Optional campaign ID for pre-selecting campaign in new donations
  amount?: number; // Optional amount for pre-setting donation amount
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
  availablePartners: Donor[] = [];
  selectedPartners: Donor[] = [];
  organizations: Organization[] = [];
  banks: Bank[] = [];
  payerCompanies: Company[] = [];
  payerOrganizations: Organization[] = [];
  donationBanks: DonationBank[] = [];
  donationOrganizations: DonationOrganization[] = [];
  payerOptions: Array<{ value: string; label: string }> = [];

  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  userRepo = remult.repo(User);
  donationPartnerRepo = remult.repo(DonationPartner);
  donationBankRepo = remult.repo(DonationBank);
  donationOrganizationRepo = remult.repo(DonationOrganization);
  fileRepo = remult.repo(DonationFile);
  countryRepo = remult.repo(Country);
  organizationRepo = remult.repo(Organization);
  bankRepo = remult.repo(Bank);

  loading = false;
  isNewDonation = false;
  selectedDonor?: Donor;
  selectedCampaign?: Campaign;
  selectedPaymentMethod?: DonationMethod;
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
    private donorService: DonorService,
    public dialogRef: MatDialogRef<DonationDetailsModalComponent>
  ) { }

  async ngOnInit() {
    this.loading = true;
    try {
      await this.ui.busy.doWhileShowingBusy(async () => {
        if (!this.args?.donationId) return;

        // Load all data from server in a single call
        const data = await DonationController.getDonationDetailsData(
          this.args.donationId,
          this.args.donorId
        );

        // Initialize donation
        if (this.args.donationId === 'new') {
          this.isNewDonation = true;
          this.donation = this.donationRepo.create();
          this.donation.donationDate = new Date();
          this.donation.currency = 'ILS';

          // Set amount from args if provided
          if (this.args.amount) {
            this.donation.amount = this.args.amount;
          }

          // Initialize additional fields for dynamic payment methods
          this.donation.checkNumber = '';
          this.donation.voucherNumber = '';
          this.donation.partnerIds = [];

          // Initialize standing order defaults
          this.donation.standingOrderType = 'bank';
          this.donation.frequency = 'monthly';
          this.donation.dayOfMonth = 10;
          this.donation.unlimitedPayments = false;
          this.donation.numberOfPayments = 12;
          this.donation.donationMethod = data.donationMethods.find(itm => itm.name === 'מזומן')
          this.donation.donationMethodId = this.donation.donationMethod?.id || ''

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
          if (data.donation) {
            this.donation = data.donation;

            // Set default values for existing donations that don't have these fields
            if (!this.donation.donationType) {
              this.donation.donationType = 'full';
            }
            if (!this.donation.partnerIds) {
              this.donation.partnerIds = [];
            }

            // Set default standing order values if not set
            if (!this.donation.frequency) {
              this.donation.frequency = 'monthly';
            }
            if (!this.donation.dayOfMonth) {
              this.donation.dayOfMonth = 10;
            }
            if (this.donation.unlimitedPayments === undefined || this.donation.unlimitedPayments === null) {
              this.donation.unlimitedPayments = false;
            }
            if (!this.donation.numberOfPayments) {
              this.donation.numberOfPayments = 12;
            }

            // Auto-fill payerName if not set (for existing donations)
            if (data.donation.donor && !this.donation.payerName) {
              this.selectedDonor = data.donation.donor;
              this.donation.payerName = `${data.donation.donor.firstName || ''} ${data.donation.donor.lastName || ''}`.trim();
            }

            this.originalDonationData = JSON.stringify(this.donation);
          }
        }

        // Set all data from controller
        this.donors = data.donors;
        this.campaigns = data.campaigns;
        this.donationMethods = data.donationMethods;
        this.availablePartners = data.availablePartners;
        this.organizations = data.organizations;
        this.banks = data.banks;
        this.payerCompanies = data.payerCompanies;
        this.donationBanks = data.donationBanks;
        this.donationOrganizations = data.donationOrganizations;

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

        // Trigger change detection after loading banks and organizations
        if (!this.isNewDonation && this.donation?.id) {
          this.cdr.detectChanges();
        }

        // Load selected organization and bank
        await this.loadSelectedOrganizationAndBank();

        // Update payer options
        this.updatePayerOptions();
      });
    } catch (error) {
      console.error('Error loading donation data:', error);
    } finally {
      this.loading = false;
    }

    // Prevent accidental close for new donation
    if (this.isNewDonation) {
      this.dialogRef.disableClose = true;
    }
  }

  private async loadDonationBanks() {
    try {
      if (!this.donation?.id) return;

      this.donationBanks = await this.donationBankRepo.find({
        where: { donationId: this.donation.id, isActive: true },
        include: { bank: true },
        orderBy: { createdDate: 'asc' }
      });

      // Log donation banks for debugging
      console.log('Loaded donation banks:', this.donationBanks.map(db => ({
        bankName: db.bank?.name,
        payerName: db.payerName,
        payerNameLength: db.payerName?.length,
        payerNameCharCodes: db.payerName?.split('').map(c => c.charCodeAt(0))
      })));
    } catch (error) {
      console.error('Error loading donation banks:', error);
    }
  }

  private async loadDonationOrganizations() {
    try {
      if (!this.donation?.id) return;

      this.donationOrganizations = await this.donationOrganizationRepo.find({
        where: { donationId: this.donation.id, isActive: true },
        include: { organization: true },
        orderBy: { createdDate: 'asc' }
      });
    } catch (error) {
      console.error('Error loading donation organizations:', error);
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

      // Save all related entities - Unit of Work Pattern
      if (this.donation.id) {
        // Save donation banks
        for (const donationBank of this.donationBanks) {
          donationBank.donationId = this.donation.id;
          await this.donationBankRepo.save(donationBank);
        }

        // Save donation organizations
        for (const donationOrg of this.donationOrganizations) {
          donationOrg.donationId = this.donation.id;
          await this.donationOrganizationRepo.save(donationOrg);
        }

        console.log('Saved all donation relations using Unit of Work pattern');
      }

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


  getDonorDisplayName(donor?: Donor): string {
    if (!donor) return '';
    return `${donor.firstName} ${donor.lastName}`.trim();
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

  async addNewPartner() {
    try {
      // Build list of IDs to exclude (main donor + already selected partners)
      const excludeIds: string[] = [];
      if (this.donation.donorId) {
        excludeIds.push(this.donation.donorId);
      }
      excludeIds.push(...this.donation.partnerIds);

      // Open donor selection modal
      const selectedDonor = await openDialog(
        DonorSelectionModalComponent,
        (modal: DonorSelectionModalComponent) => {
          modal.args = {
            title: 'בחר שותף לתרומה',
            excludeIds: excludeIds
          };
        }
      ) as Donor | null;

      if (selectedDonor) {
        this.addPartner(selectedDonor);
        this.ui.info(`שותף "${selectedDonor.fullName}" נוסף בהצלחה`);
        console.log('New partner added:', selectedDonor.fullName);
      }
    } catch (error) {
      console.error('Error adding new partner:', error);
      this.ui.error('שגיאה בהוספת שותף');
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

  async openPaymentList() {
    if (this.donation?.id) {
      await this.ui.paymentListDialog(this.donation.id, this.donation.amount);
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
        console.log('loadSelectedDonor: Loading donor with ID:', this.donation.donorId);
        this.selectedDonor = await this.donorRepo.findId(this.donation.donorId) || undefined;
        console.log('loadSelectedDonor: Loaded donor:', this.selectedDonor?.firstName, this.selectedDonor?.lastName);

        // Load companies for payer selection
        await this.loadPayerCompanies();

        // Auto-update currency for new donations when loading existing donor
        if (this.isNewDonation && this.selectedDonor) {
          await this.updateCurrencyBasedOnCountry(this.selectedDonor);
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
    }
    // Standing order (הוק) feature removed
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

  onUnlimitedPaymentsChange() {
    // if (this.donation.unlimitedPayments) {
    //   // When unlimited is selected, clear the number of payments
    //   this.donation.numberOfPayments = 0;
    // } else {
    //   // When limited is selected, set a default value if it's 0
    //   if (!this.donation.numberOfPayments || this.donation.numberOfPayments === 0) {
    //     this.donation.numberOfPayments = 12; // Default to 12 payments
    //   }
    // }
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
        // Update currency based on country
        await this.updateCurrencyBasedOnCountry(this.selectedDonor);

        // Load companies for payer selection
        await this.loadPayerCompanies();

        // Set default payer to personal (donor themselves) if not already set
        if (!this.donation.payerName) {
          await this.onPayerChange(null);
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
      // Country-based currency update disabled - always use ILS
      // This method could be enhanced in the future to:
      // 1. Load home place from DonorPlace entities
      // 2. Get country from the place
      // 3. Map country code to currency using countryCurrencyMap

      // Default to ILS
      this.donation.currency = 'ILS';
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
        // Note: voucherNumber is typically filled manually per donation, not from organization
      }
    } else {
      this.selectedOrganization = undefined;
      // Clear fields when no organization selected
      this.donation.payerName = '';
    }
  }

  onBankChange() {
    if (this.donation?.bankId) {
      this.selectedBank = this.banks.find(b => b.id === this.donation.bankId);
      console.log('Bank changed to:', this.selectedBank?.name);
    } else {
      this.selectedBank = undefined;
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
      // First, save the donation if it's new
      if (this.isNewDonation && !this.donation.id) {
        await this.saveDonation();
        if (!this.donation.id) {
          this.ui.error('יש לשמור את התרומה לפני הוספת בנק');
          return;
        }
      }

      // Ensure selectedDonor and payerCompanies are loaded
      if (this.donation.donorId) {
        await this.loadSelectedDonor();
        // Trigger change detection to ensure dropdown is updated
        this.cdr.detectChanges();
      }

      // Open bank selection modal
      const selectedBank = await openDialog(
        BankSelectionModalComponent,
        (modal: BankSelectionModalComponent) => {
          modal.args = {
            donationId: this.donation.id,
            title: 'בחר בנק'
          };
        }
      ) as Bank | null;

      // If a bank was selected, create a new DonationBank record
      if (selectedBank) {
        const donationBank = this.donationBankRepo.create();
        donationBank.donationId = this.donation.id;
        donationBank.bankId = selectedBank.id;

        // Set default payer name to donor
        const donorName = this.selectedDonor
          ? `${this.selectedDonor.firstName || ''} ${this.selectedDonor.lastName || ''}`.trim()
          : '';
        donationBank.payerName = this.donation.payerName || donorName || '';
        donationBank.reference = '';
        donationBank.isActive = true;

        await this.donationBankRepo.save(donationBank);

        // Reload donation banks
        await this.loadDonationBanks();

        // Trigger change detection
        this.cdr.detectChanges();

        this.ui.info(`בנק "${selectedBank.name}" נוסף בהצלחה`);
        console.log('New donation bank added:', selectedBank.name);
      }
    } catch (error) {
      console.error('Error adding new bank:', error);
      this.ui.error('שגיאה בהוספת בנק');
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

  async removeDonationBank(donationBank: DonationBank) {
    try {
      if (!confirm(`האם אתה בטוח שברצונך להסיר את הבנק "${donationBank.bank?.name}"?`)) {
        return;
      }

      // Mark as inactive instead of deleting
      donationBank.isActive = false;
      await this.donationBankRepo.save(donationBank);

      // Reload donation banks
      await this.loadDonationBanks();

      // Trigger change detection
      this.cdr.detectChanges();

      this.ui.info('הבנק הוסר בהצלחה');
    } catch (error) {
      console.error('Error removing donation bank:', error);
      this.ui.error('שגיאה בהסרת הבנק');
    }
  }

  /**
   * Open bank details modal for viewing/editing
   */
  async viewBankDetails(bankId: string) {
    try {
      const result = await this.ui.bankDetailsDialog(bankId);

      if (result) {
        // Reload donation banks to reflect any changes
        await this.loadDonationBanks();

        // Trigger change detection
        this.cdr.detectChanges();

        this.ui.info('הבנק עודכן בהצלחה');
      }
    } catch (error) {
      console.error('Error viewing bank details:', error);
      this.ui.error('שגיאה בטעינת פרטי הבנק');
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

  async addOrganizationToDonation() {
    try {
      // First, save the donation if it's new
      if (this.isNewDonation && !this.donation.id) {
        await this.saveDonation();
        if (!this.donation.id) {
          this.ui.error('יש לשמור את התרומה לפני הוספת עמותה');
          return;
        }
      }

      // Ensure selectedDonor and payerCompanies are loaded
      if (this.donation.donorId) {
        await this.loadSelectedDonor();
        // Trigger change detection to ensure dropdown is updated
        this.cdr.detectChanges();
      }

      // Open organization selection modal
      const selectedOrganization = await openDialog(
        OrganizationSelectionModalComponent,
        (modal: OrganizationSelectionModalComponent) => {
          modal.args = {
            donationId: this.donation.id,
            title: 'בחר עמותה'
          };
        }
      ) as Organization | null;
      console.log('addOrganizationToDonation', 1)
      // If an organization was selected, create a new DonationOrganization record
      if (selectedOrganization) {
        console.log('addOrganizationToDonation', 2, selectedOrganization.id)
        const donationOrganization = this.donationOrganizationRepo.create();
        donationOrganization.donationId = this.donation.id;
        donationOrganization.organizationId = selectedOrganization.id;

        // Set default payer name to donor
        const donorName = this.selectedDonor
          ? `${this.selectedDonor.firstName || ''} ${this.selectedDonor.lastName || ''}`.trim()
          : '';
        donationOrganization.payerName = this.donation.payerName || donorName || '';
        donationOrganization.reference = '';
        donationOrganization.isActive = true;

        await this.donationOrganizationRepo.save(donationOrganization);

        // Reload donation organizations
        await this.loadDonationOrganizations();

        // Trigger change detection
        this.cdr.detectChanges();

        this.ui.info(`עמותה "${selectedOrganization.name}" נוספה בהצלחה`);
        console.log('New donation organization added:', selectedOrganization.name);
      }
    } catch (error) {
      console.error('Error adding organization to donation:', error);
      this.ui.error('שגיאה בהוספת עמותה');
    }
  }

  async removeDonationOrganization(donationOrganization: DonationOrganization) {
    try {
      if (!confirm(`האם אתה בטוח שברצונך להסיר את העמותה "${donationOrganization.organization?.name}"?`)) {
        return;
      }

      // Mark as inactive instead of deleting
      donationOrganization.isActive = false;
      await this.donationOrganizationRepo.save(donationOrganization);

      // Reload donation organizations
      await this.loadDonationOrganizations();

      // Trigger change detection
      this.cdr.detectChanges();

      this.ui.info('העמותה הוסרה בהצלחה');
    } catch (error) {
      console.error('Error removing donation organization:', error);
      this.ui.error('שגיאה בהסרת העמותה');
    }
  }

  /**
   * Open organization details modal for viewing/editing
   */
  async viewOrganizationDetails(organizationId: string) {
    try {
      const result = await this.ui.organizationDetailsDialog(organizationId);

      if (result) {
        // Reload donation organizations to reflect any changes
        await this.loadDonationOrganizations();

        // Trigger change detection
        this.cdr.detectChanges();

        this.ui.info('העמותה עודכנה בהצלחה');
      }
    } catch (error) {
      console.error('Error viewing organization details:', error);
      this.ui.error('שגיאה בטעינת פרטי העמותה');
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

  /**
   * Load companies associated with the selected donor
   */
  async loadPayerCompanies() {
    this.payerCompanies = [];

    if (!this.selectedDonor?.companyIds?.length) {
      console.log('loadPayerCompanies: No company IDs found for donor');
      this.updatePayerOptions();
      return;
    }

    try {
      console.log('loadPayerCompanies: Loading companies with IDs:', this.selectedDonor.companyIds);
      this.payerCompanies = await remult.repo(Company).find({
        where: { id: { $in: this.selectedDonor.companyIds } },
        include: { place: true }
      });
      console.log('loadPayerCompanies: Loaded', this.payerCompanies.length, 'companies:', this.payerCompanies.map(c => c.name));

      // Update payer options after loading companies
      this.updatePayerOptions();
    } catch (error) {
      console.error('Error loading payer companies:', error);
    }
  }

  /**
   * Update payer options for dropdown (donor + related companies)
   */
  private updatePayerOptions() {
    this.payerOptions = [];

    // Add donor as first option
    if (this.selectedDonor) {
      const donorName = `${this.selectedDonor.firstName || ''} ${this.selectedDonor.lastName || ''}`.trim();
      const genderText = this.selectedDonor.gender === 'female' ? 'התורמת עצמה' : 'התורם עצמו';
      const relatedText = this.selectedDonor.gender === 'female' ? 'קשור לתורמת' : 'קשור לתורם';

      this.payerOptions.push({
        value: donorName,
        label: `${donorName} (${genderText})`
      });

      // Add related companies
      this.payerCompanies.forEach(company => {
        this.payerOptions.push({
          value: company.name,
          label: `${company.name} (${relatedText})`
        });
      });

      // Set default payer name to donor if not already set
      if (!this.donation.payerName && donorName) {
        this.donation.payerName = donorName;
      }
    }

    console.log('updatePayerOptions called, set', this.payerOptions.length, 'options:', this.payerOptions.map(o => ({
      value: o.value,
      valueLength: o.value.length,
      valueCharCodes: o.value.split('').map(c => c.charCodeAt(0)),
      label: o.label
    })));
  }

  /**
   * Handle payer selection change
   */
  async onPayerChange(payerCompanyId: string | null) {
    if (!payerCompanyId) {
      // Personal payer (the donor themselves)
      if (this.selectedDonor) {
        this.donation.payerName = `${this.selectedDonor.firstName || ''} ${this.selectedDonor.lastName || ''}`.trim();
      }
    } else {
      // Company payer
      const company = this.payerCompanies.find(c => c.id === payerCompanyId);
      if (company) {
        this.donation.payerName = company.name;
      }
    }
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Get currency symbol based on currency code
   */
  getCurrencySymbol(code: string): string {
    const symbolMap: { [key: string]: string } = {
      'ILS': '₪',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
      'JPY': '¥',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr',
      'PLN': 'zł',
      'HUF': 'Ft',
      'CZK': 'Kč',
      'RON': 'lei',
      'BGN': 'лв',
      'HRK': 'kn',
      'ISK': 'kr',
      'UAH': '₴',
      'RUB': '₽',
      'TRY': '₺',
      'CNY': '¥',
      'INR': '₹',
      'KRW': '₩',
      'THB': '฿',
      'SGD': 'S$',
      'MYR': 'RM',
      'IDR': 'Rp',
      'PHP': '₱',
      'VND': '₫',
      'HKD': 'HK$',
      'TWD': 'NT$',
      'PKR': '₨',
      'BDT': '৳',
      'LKR': 'Rs',
      'BRL': 'R$',
      'ARS': '$',
      'MXN': '$',
      'CLP': '$',
      'COP': '$',
      'PEN': 'S/',
      'UYU': '$U',
      'AED': 'د.إ',
      'SAR': 'ر.س',
      'JOD': 'د.ا',
      'EGP': 'E£',
      'LBP': 'ل.ل',
      'BHD': 'ب.د',
      'KWD': 'د.ك',
      'QAR': 'ر.ق',
      'OMR': 'ر.ع',
      'ZAR': 'R',
      'NGN': '₦',
      'KES': 'KSh',
      'ETB': 'Br',
      'GHS': '₵',
      'NZD': 'NZ$'
    };
    return symbolMap[code] || code;
  }

  /**
   * Get payment amount per installment
   */
  getPaymentAmount(): string {
    if (!this.donation || !this.donation.amount || !this.donation.numberOfPayments || this.donation.numberOfPayments <= 0) {
      return '';
    }

    const amountPerPayment = this.donation.unlimitedPayments
      ? this.donation.amount
      : this.donation.amount / this.donation.numberOfPayments;
    return amountPerPayment.toFixed(2);
  }

}