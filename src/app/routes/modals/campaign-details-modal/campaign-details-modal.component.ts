import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Campaign, User, Place } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { DONOR_LEVELS_ARRAY, DonorLevel } from '../../../../shared/enum/donor-levels';
import { CampaignBlessingBookModalComponent, CampaignBlessingBookModalArgs } from '../campaign-blessing-book-modal/campaign-blessing-book-modal.component';
import { CampaignInvitedListModalComponent, CampaignInvitedListModalArgs } from '../campaign-invited-list-modal/campaign-invited-list-modal.component';
import { openDialog, DialogConfig } from 'common-ui-elements';

export interface CampaignDetailsModalArgs {
  campaignId: string; // Can be 'new' for new campaign or campaign ID
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-campaign-details-modal',
  templateUrl: './campaign-details-modal.component.html',
  styleUrls: ['./campaign-details-modal.component.scss']
})
export class CampaignDetailsModalComponent implements OnInit {
  args!: CampaignDetailsModalArgs;
  changed = false;

  campaign!: Campaign;
  originalCampaignData?: string; // To track changes
  users: User[] = [];

  campaignRepo = remult.repo(Campaign);
  userRepo = remult.repo(User);

  loading = false;
  isNewCampaign = false;
  selectedManager?: User;
  selectedCreatedBy?: User;

  // Available levels for multi-select from donor levels enum
  availableLevels = DONOR_LEVELS_ARRAY;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CampaignDetailsModalComponent>
  ) {}

  async ngOnInit() {
    await this.initializeCampaign();
    await this.loadDropdownData();
  }

  private async initializeCampaign() {
    if (!this.args?.campaignId) return;

    this.loading = true;
    try {
      if (this.args.campaignId === 'new') {
        this.isNewCampaign = true;
        this.campaign = this.campaignRepo.create();
        this.campaign.startDate = new Date();
        this.campaign.currency = 'ILS';
        this.campaign.campaignType = 'רגיל';
        this.campaign.isActive = true;
        this.campaign.targetAmount = 0;
        this.campaign.raisedAmount = 0;
        this.campaign.invitedDonorFilters = {};

        this.originalCampaignData = JSON.stringify(this.campaign);
      } else {
        this.isNewCampaign = false;
        const foundCampaign = await this.campaignRepo.findId(this.args.campaignId, {
          include: {
            eventLocation: { include: { country: true } }
          }
        });
        if (foundCampaign) {
          this.campaign = foundCampaign;
          this.originalCampaignData = JSON.stringify(this.campaign);
        } else {
          throw new Error(`Campaign with ID ${this.args.campaignId} not found`);
        }
      }
    } catch (error) {
      console.error('Error initializing campaign:', error);
      this.ui.error('שגיאה בטעינת נתוני הקמפיין');
    } finally {
      this.loading = false;
    }
  }

  async loadDropdownData() {
    try {
      // Load users for manager and created by fields - only donators
      this.users = await this.userRepo.find({
        where: { donator: true },
        orderBy: { name: 'asc' }
      });

      // Load selected manager and created by if they exist
      await this.loadSelectedUsers();
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  }

  async loadSelectedUsers() {
    // Manager field removed from Campaign entity

    if (this.campaign?.createdById) {
      try {
        this.selectedCreatedBy = await this.userRepo.findId(this.campaign.createdById) || undefined;
      } catch (error) {
        console.error('Error loading selected created by:', error);
      }
    }
  }

  async saveCampaign() {
    if (!this.campaign) return;

    try {
      this.loading = true;

      // Validate required fields
      if (!this.campaign.name?.trim()) {
        this.ui.error('שם הקמפיין הוא שדה חובה');
        return;
      }

      if (!this.campaign.startDate) {
        this.ui.error('תאריך התחלה הוא שדה חובה');
        return;
      }

      if (this.campaign.targetAmount < 0) {
        this.ui.error('יעד כספי חייב להיות חיובי');
        return;
      }

      // Set the current user as created by for new campaigns
      if (this.isNewCampaign && !this.campaign.createdById) {
        const currentUser = remult.user;
        if (currentUser?.id) {
          this.campaign.createdById = currentUser.id;
        }
      }

      await this.campaign.save();
      this.snackBar.open('הקמפיין נשמר בהצלחה', 'סגור', { duration: 3000 });
      this.originalCampaignData = JSON.stringify(this.campaign);
      this.changed = false;
      this.dialogRef.close(true);
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      this.ui.error('שגיאה בשמירת הקמפיין: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  async deleteCampaign() {
    if (!this.campaign) return;

    const confirmMessage = `האם אתה בטוח שברצונך למחוק את הקמפיין "${this.campaign.name}"?`;
    if (!confirm(confirmMessage)) return;

    try {
      this.loading = true;
      await this.campaign.delete();
      this.snackBar.open('הקמפיין נמחק בהצלחה', 'סגור', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      this.ui.error('שגיאה במחיקת הקמפיין: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  async activateCampaign() {
    if (!this.campaign) return;

    try {
      this.loading = true;
      await this.campaign.activate();
      this.snackBar.open('הקמפיין הופעל בהצלחה', 'סגור', { duration: 3000 });
      await this.loadSelectedUsers(); // Refresh data
    } catch (error: any) {
      console.error('Error activating campaign:', error);
      this.ui.error('שגיאה בהפעלת הקמפיין: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  async completeCampaign() {
    if (!this.campaign) return;

    const confirmMessage = `האם אתה בטוח שברצונך לסמן את הקמפיין "${this.campaign.name}" כהושלם?`;
    if (!confirm(confirmMessage)) return;

    try {
      this.loading = true;
      await this.campaign.complete();
      this.snackBar.open('הקמפיין סומן כהושלם', 'סגור', { duration: 3000 });
      await this.loadSelectedUsers(); // Refresh data
    } catch (error: any) {
      console.error('Error completing campaign:', error);
      this.ui.error('שגיאה בסימון הקמפיין כהושלם: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  async cancelCampaign() {
    if (!this.campaign) return;

    const confirmMessage = `האם אתה בטוח שברצונך לבטל את הקמפיין "${this.campaign.name}"?`;
    if (!confirm(confirmMessage)) return;

    try {
      this.loading = true;
      await this.campaign.cancel();
      this.snackBar.open('הקמפיין בוטל', 'סגור', { duration: 3000 });
      await this.loadSelectedUsers(); // Refresh data
    } catch (error: any) {
      console.error('Error cancelling campaign:', error);
      this.ui.error('שגיאה בביטול הקמפיין: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  closeModal(event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    // Check if there are unsaved changes
    const currentData = JSON.stringify(this.campaign);
    if (this.originalCampaignData !== currentData) {
      const confirmMessage = 'יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור?';
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    this.dialogRef.close(this.changed);
  }

  onManagerChange() {
    // The campaign.managerId is already updated by ngModel binding
    // Just mark as changed
    this.markAsChanged();
  }

  onCreatedByChange() {
    if (this.selectedCreatedBy) {
      this.campaign.createdById = this.selectedCreatedBy.id;
    } else {
      this.campaign.createdById = '';
    }
    this.markAsChanged();
  }

  markAsChanged() {
    this.changed = true;
  }

  async onEventPlaceSelected(place: Place | undefined) {
    if (!this.campaign) return;

    this.campaign.eventLocationId = place?.id || '';
    this.campaign.eventLocation = place;

    // Auto-select currency based on location
    if (place?.country?.code) {
      this.selectCurrencyByCountryCode(place.country.code);
    }

    this.markAsChanged();
  }

  private selectCurrencyByCountryCode(countryCode: string) {
    if (!this.campaign || !countryCode) return;

    const currencyMap: { [key: string]: string } = {
      'IL': 'ILS', // Israel
      'US': 'USD', // United States
      'CA': 'CAD', // Canada
      'GB': 'GBP', // United Kingdom
      'AU': 'AUD', // Australia
      'NZ': 'NZD', // New Zealand
      'CH': 'CHF', // Switzerland
      'JP': 'JPY', // Japan
      'CN': 'CNY', // China
      'IN': 'INR', // India
      'ZA': 'ZAR', // South Africa
      'BR': 'BRL', // Brazil
      'MX': 'MXN', // Mexico
      'AR': 'ARS', // Argentina
      'CL': 'CLP', // Chile
      'CO': 'COP', // Colombia
      'PE': 'PEN', // Peru
      'UY': 'UYU', // Uruguay
      'PY': 'PYG', // Paraguay
      'BO': 'BOB', // Bolivia
      'EC': 'USD', // Ecuador uses USD
      'PA': 'PAB', // Panama
      'CR': 'CRC', // Costa Rica
      'GT': 'GTQ', // Guatemala
      'HN': 'HNL', // Honduras
      'NI': 'NIO', // Nicaragua
      'SV': 'USD', // El Salvador uses USD
      'BZ': 'BZD', // Belize
      'JM': 'JMD', // Jamaica
      'TT': 'TTD', // Trinidad and Tobago
      'BB': 'BBD', // Barbados
      'BS': 'BSD', // Bahamas
      'KY': 'KYD', // Cayman Islands
      'VG': 'USD', // British Virgin Islands use USD
      'AG': 'XCD', // Antigua and Barbuda
      'DM': 'XCD', // Dominica
      'GD': 'XCD', // Grenada
      'KN': 'XCD', // Saint Kitts and Nevis
      'LC': 'XCD', // Saint Lucia
      'VC': 'XCD', // Saint Vincent and the Grenadines
      // Eurozone countries
      'AD': 'EUR', 'AT': 'EUR', 'BE': 'EUR', 'CY': 'EUR', 'EE': 'EUR',
      'FI': 'EUR', 'FR': 'EUR', 'DE': 'EUR', 'GR': 'EUR', 'IE': 'EUR',
      'IT': 'EUR', 'LV': 'EUR', 'LT': 'EUR', 'LU': 'EUR', 'MT': 'EUR',
      'MC': 'EUR', 'NL': 'EUR', 'PT': 'EUR', 'SM': 'EUR', 'SK': 'EUR',
      'SI': 'EUR', 'ES': 'EUR', 'VA': 'EUR', // Vatican
      // Other European countries
      'NO': 'NOK', 'SE': 'SEK', 'DK': 'DKK', 'IS': 'ISK',
      'CZ': 'CZK', 'PL': 'PLN', 'HU': 'HUF', 'RO': 'RON',
      'BG': 'BGN', 'HR': 'HRK', 'RS': 'RSD', 'BA': 'BAM',
      'MK': 'MKD', 'AL': 'ALL', 'ME': 'EUR', 'XK': 'EUR', // Kosovo
      'MD': 'MDL', 'UA': 'UAH', 'BY': 'BYN', 'RU': 'RUB',
      // Asian countries
      'TR': 'TRY', 'AE': 'AED', 'SA': 'SAR', 'QA': 'QAR',
      'KW': 'KWD', 'BH': 'BHD', 'OM': 'OMR', 'JO': 'JOD',
      'LB': 'LBP', 'SY': 'SYP', 'IQ': 'IQD', 'IR': 'IRR',
      'AF': 'AFN', 'PK': 'PKR', 'BD': 'BDT', 'LK': 'LKR',
      'MV': 'MVR', 'NP': 'NPR', 'BT': 'BTN', 'MM': 'MMK',
      'TH': 'THB', 'VN': 'VND', 'KH': 'KHR', 'LA': 'LAK',
      'MY': 'MYR', 'SG': 'SGD', 'BN': 'BND', 'ID': 'IDR',
      'PH': 'PHP', 'TW': 'TWD', 'HK': 'HKD', 'MO': 'MOP',
      'KR': 'KRW', 'KP': 'KPW', 'MN': 'MNT', 'KZ': 'KZT',
      'KG': 'KGS', 'TJ': 'TJS', 'UZ': 'UZS', 'TM': 'TMT',
      'GE': 'GEL', 'AM': 'AMD', 'AZ': 'AZN',
      // African countries
      'EG': 'EGP', 'LY': 'LYD', 'TN': 'TND', 'DZ': 'DZD',
      'MA': 'MAD', 'SD': 'SDG', 'SS': 'SSP', 'ET': 'ETB',
      'ER': 'ERN', 'DJ': 'DJF', 'SO': 'SOS', 'KE': 'KES',
      'UG': 'UGX', 'TZ': 'TZS', 'RW': 'RWF', 'BI': 'BIF',
      'CD': 'CDF', 'CF': 'XAF', 'TD': 'XAF', 'CM': 'XAF',
      'GQ': 'XAF', 'GA': 'XAF', 'CG': 'XAF', 'ST': 'STN',
      'AO': 'AOA', 'ZM': 'ZMW', 'ZW': 'ZWL', 'MW': 'MWK',
      'MZ': 'MZN', 'MG': 'MGA', 'MU': 'MUR', 'SC': 'SCR',
      'KM': 'KMF', 'BW': 'BWP', 'SZ': 'SZL', 'LS': 'LSL',
      'NA': 'NAD', 'GH': 'GHS', 'NG': 'NGN', 'BF': 'XOF',
      'ML': 'XOF', 'NE': 'XOF', 'CI': 'XOF', 'GN': 'GNF',
      'SN': 'XOF', 'MR': 'MRU', 'GM': 'GMD', 'GW': 'XOF',
      'CV': 'CVE', 'SL': 'SLL', 'LR': 'LRD', 'TG': 'XOF',
      'BJ': 'XOF'
    };

    const currency = currencyMap[countryCode.toUpperCase()];
    if (currency) {
      this.campaign.currency = currency;
      console.log(`Currency auto-selected: ${currency} for country code: ${countryCode}`);
    }
  }

  private selectCurrencyByLocation(location: string) {
    const locationLower = location.toLowerCase();

    // Check for common country/city patterns
    if (locationLower.includes('israel') || locationLower.includes('ישראל') ||
        locationLower.includes('jerusalem') || locationLower.includes('ירושלים') ||
        locationLower.includes('tel aviv') || locationLower.includes('תל אביב')) {
      this.campaign.currency = 'ILS';
    } else if (locationLower.includes('usa') || locationLower.includes('america') ||
               locationLower.includes('ארה"ב') || locationLower.includes('אמריקה') ||
               locationLower.includes('new york') || locationLower.includes('brooklyn') ||
               locationLower.includes('miami') || locationLower.includes('los angeles')) {
      this.campaign.currency = 'USD';
    } else if (locationLower.includes('canada') || locationLower.includes('קנדה') ||
               locationLower.includes('toronto') || locationLower.includes('montreal')) {
      this.campaign.currency = 'CAD';
    } else if (locationLower.includes('uk') || locationLower.includes('england') ||
               locationLower.includes('london') || locationLower.includes('בריטניה')) {
      this.campaign.currency = 'GBP';
    } else if (locationLower.includes('france') || locationLower.includes('צרפת') ||
               locationLower.includes('germany') || locationLower.includes('גרמניה') ||
               locationLower.includes('italy') || locationLower.includes('spain') ||
               locationLower.includes('netherlands') || locationLower.includes('belgium') ||
               locationLower.includes('paris') || locationLower.includes('berlin') ||
               locationLower.includes('rome') || locationLower.includes('madrid')) {
      this.campaign.currency = 'EUR';
    } else if (locationLower.includes('australia') || locationLower.includes('אוסטרליה') ||
               locationLower.includes('sydney') || locationLower.includes('melbourne')) {
      this.campaign.currency = 'AUD';
    }
  }

  getUserDisplayName(user?: User): string {
    if (!user) return '';
    return user.name || user.id || 'לא ידוע';
  }

  // Getters for status checks
  get isDraft(): boolean {
    // Status removed - use isActive instead
    return !this.campaign?.isActive && this.isNewCampaign;
  }

  get isActive(): boolean {
    return this.campaign?.isActive === true;
  }

  get isCompleted(): boolean {
    // Status removed - based on dates
    return this.campaign?.endDate ? new Date() > this.campaign.endDate : false;
  }

  get isCancelled(): boolean {
    // Status removed
    return false;
  }

  get canEdit(): boolean {
    return this.isDraft || this.isActive;
  }

  get canActivate(): boolean {
    return this.isDraft && !this.isNewCampaign;
  }

  get canComplete(): boolean {
    return this.isActive && !this.isNewCampaign;
  }

  get canCancel(): boolean {
    return (this.isDraft || this.isActive) && !this.isNewCampaign;
  }


  // Toggle campaign active status with confirmation
  toggleCampaignActive() {
    if (this.campaign.isActive) {
      // If trying to deactivate, show confirmation
      const confirmMessage = 'האם אתה בטוח שברצונך להפוך את הקמפיין ללא פעיל?';
      if (!confirm(confirmMessage)) {
        // Revert the change if user cancels
        this.campaign.isActive = true;
        return;
      }
    }
    this.markAsChanged();
  }

  // Open blessing book modal - save campaign first if needed
  async openBlessingBook() {
    if (!this.campaign) return;

    try {
      this.loading = true;

      // Save campaign first if it's new or has unsaved changes
      if (this.isNewCampaign || this.hasUnsavedChanges()) {
        // Validate required fields
        if (!this.campaign.name?.trim()) {
          this.ui.error('שם הקמפיין הוא שדה חובה');
          return;
        }

        if (!this.campaign.startDate) {
          this.ui.error('תאריך התחלה הוא שדה חובה');
          return;
        }

        // Save the campaign
        await this.campaign.save();
        this.snackBar.open('הקמפיין נשמר', 'סגור', { duration: 2000 });
        this.originalCampaignData = JSON.stringify(this.campaign);
        this.changed = false;
        this.isNewCampaign = false;
      }

      const args: CampaignBlessingBookModalArgs = {
        campaignId: this.campaign.id,
        campaignName: this.campaign.name
      };

      await openDialog(CampaignBlessingBookModalComponent, (dlg) => dlg.args = args);

    } catch (error) {
      console.error('Error opening blessing book:', error);
      this.ui.error('שגיאה בפתיחת ספר הברכות');
    } finally {
      this.loading = false;
    }
  }

  // Open invited list modal - save campaign first if needed
  async openInvitedList() {
    if (!this.campaign) return;

    try {
      this.loading = true;

      // Save campaign first if it's new or has unsaved changes
      if (this.isNewCampaign || this.hasUnsavedChanges()) {
        // Validate required fields
        if (!this.campaign.name?.trim()) {
          this.ui.error('שם הקמפיין הוא שדה חובה');
          return;
        }

        if (!this.campaign.startDate) {
          this.ui.error('תאריך התחלה הוא שדה חובה');
          return;
        }

        // Save the campaign
        await this.campaign.save();
        this.snackBar.open('הקמפיין נשמר', 'סגור', { duration: 2000 });
        this.originalCampaignData = JSON.stringify(this.campaign);
        this.changed = false;
        this.isNewCampaign = false;
      }

      // Open the new invited list modal
      const args: CampaignInvitedListModalArgs = {
        campaignId: this.campaign.id
      };

      const result = await openDialog(CampaignInvitedListModalComponent, (dlg) => dlg.args = args);

      if (result) {
        // Refresh campaign data if needed
        await this.reloadCampaign();
      }
    } catch (error: any) {
      console.error('Error opening invited list:', error);
      this.ui.error('שגיאה בפתיחת רשימת המוזמנים: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  // Helper method to check if there are unsaved changes
  private hasUnsavedChanges(): boolean {
    const currentData = JSON.stringify(this.campaign);
    return this.originalCampaignData !== currentData;
  }

  // Helper method to reload campaign data
  private async reloadCampaign() {
    if (!this.campaign?.id) return;

    try {
      const reloaded = await this.campaignRepo.findId(this.campaign.id, {
        useCache: false,
        include: {
          eventLocation: { include: { country: true } }
        }
      });
      if (reloaded) {
        this.campaign = reloaded;
        this.originalCampaignData = JSON.stringify(this.campaign);
        this.changed = false;
      }
    } catch (error) {
      console.error('Error reloading campaign:', error);
    }
  }

  // Open new donation modal with campaign pre-selected
  async openNewDonation() {
    if (!this.campaign) return;

    try {
      // Save campaign first if it's new or has unsaved changes
      if (this.isNewCampaign || this.hasUnsavedChanges()) {
        // Validate required fields
        if (!this.campaign.name?.trim()) {
          this.ui.error('שם הקמפיין הוא שדה חובה');
          return;
        }

        if (!this.campaign.startDate) {
          this.ui.error('תאריך התחלה הוא שדה חובה');
          return;
        }

        // Save the campaign
        await this.campaign.save();
        this.snackBar.open('הקמפיין נשמר', 'סגור', { duration: 2000 });
        this.originalCampaignData = JSON.stringify(this.campaign);
        this.changed = false;
        this.isNewCampaign = false;
      }

      // Open new donation dialog with campaign ID
      const result = await this.ui.donationDetailsDialog('new', { campaignId: this.campaign.id });

      if (result) {
        // Optionally refresh campaign data to update raised amount
        await this.reloadCampaign();
      }
    } catch (error: any) {
      console.error('Error opening new donation:', error);
      this.ui.error('שגיאה בפתיחת תרומה חדשה: ' + (error.message || error));
    }
  }
}