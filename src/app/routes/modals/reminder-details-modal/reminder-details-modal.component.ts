import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Subscription } from 'rxjs';
import { Certificate, Donation, Donor, Reminder, User, DonorContact, DonorPlace, Place } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { GlobalFilterService } from '../../../services/global-filter.service';
import { HebrewDateService } from '../../../services/hebrew-date.service';
import { DonorService } from '../../../services/donor.service';
import { ReminderService } from '../../../services/reminder.service';

export interface ReminderDetailsModalArgs {
  reminderId?: string; // 'new' for new reminder or reminder ID for editing
  userId?: string; // Optional user ID to assign
  donorId?: string; // Optional donor ID to link
  donationId?: string; // Optional donation ID to link
  certificateId?: string; // Optional certificate ID to link
  reminderType?: 'donation_followup' | 'thank_you' | 'receipt' | 'birthday' | 'holiday' | 'general' | 'meeting' | 'phone_call' | 'memorialDay' | 'memorial'; // Optional reminder type to initialize
  reminderDate?: Date; // Optional date to initialize
  isRecurringYearly?: boolean; // Optional flag for yearly recurring reminder
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '80vw',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-reminder-details-modal',
  templateUrl: './reminder-details-modal.component.html',
  styleUrls: ['./reminder-details-modal.component.scss']
})
export class ReminderDetailsModalComponent implements OnInit, OnDestroy {
  args!: ReminderDetailsModalArgs;
  changed = false;

  reminder?: Reminder;

  reminderRepo = remult.repo(Reminder);
  donorRepo = remult.repo(Donor);
  donationRepo = remult.repo(Donation);
  userRepo = remult.repo(User);
  certificateRepo = remult.repo(Certificate);

  loading = false;
  isNewReminder = false;
  users: User[] = [];
  fundraisers: User[] = [];
  donors: Donor[] = [];
  donations: Donation[] = [];
  filteredDonations: Donation[] = [];

  // Track if data has been loaded
  private donorsLoaded = false;
  private donationsLoaded = false;

  // Maps for donor-related data
  donorEmailMap = new Map<string, string>();
  donorPhoneMap = new Map<string, string>();
  donorCountryIdMap = new Map<string, string>();
  donorPlaceMap = new Map<string, Place>();

  // Options will be populated with i18n values
  typeOptions: { value: string, label: string }[] = [];
  priorityOptions: { value: string, label: string }[] = [];
  alertMethodOptions: { value: string, label: string, disabled?: boolean }[] = [];
  recurringPatternOptions: { value: string, label: string }[] = [];
  weekDayOptions: { value: number, label: string }[] = [];
  monthOptions: { value: number, label: string }[] = [];

  // Day of month options (1-31)
  dayOfMonthOptions = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: (i + 1).toString() }));

  // Hebrew month options (1-13, including Adar I and Adar II for leap years)
  hebrewMonthOptions: { value: number, label: string }[] = [];

  // Hebrew day of month options (1-30) with Hebrew letters
  hebrewDayOfMonthOptions: { value: number, label: string }[] = [];

  // Special occasions (holidays and events)
  specialOccasionOptions: { value: string, label: string }[] = [];

  private filterSubscription?: Subscription;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private globalFilterService: GlobalFilterService,
    private hebrewDateService: HebrewDateService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<ReminderDetailsModalComponent>,
    private donorService: DonorService,
    private reminderService: ReminderService
  ) { }

  async ngOnInit() {
    this.loading = true;
    try {
      // Initialize options with i18n
      this.initializeOptions();

      // Load only fundraisers initially (much faster)
      // Donors and donations will be loaded on-demand when user clicks the dropdown
      await this.loadFundraisers();

      // Check if new or editing
      if (!this.args.reminderId || this.args.reminderId === 'new') {
        this.isNewReminder = true;
        this.reminder = this.reminderRepo.create();

        // Set default values
        this.reminder.type = this.args.reminderType || 'donation_followup';
        this.reminder.priority = 'normal';
        this.reminder.alertMethod = 'popup';
        this.reminder.sendAlert = true;
        this.reminder.isActive = true;
        this.reminder.status = 'pending';

        // Set due date from args or tomorrow by default
        if (this.args.reminderDate) {
          this.reminder.dueDate = this.args.reminderDate;
        } else {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(10, 0, 0, 0);
          this.reminder.dueDate = tomorrow;
        }

        // Set recurring pattern if specified
        if (this.args.isRecurringYearly) {
          this.reminder.isRecurring = true;
          this.reminder.recurringPattern = 'yearly';
          const hebDate = await this.hebrewDateService.convertGregorianToHebrew(this.reminder.dueDate)
          // console.log('this.reminder.dueDate',this.reminder.dueDate, 'hebDate',hebDate)
          this.reminder.recurringMonth = hebDate.month
          this.reminder.recurringDayOfMonth = hebDate.day
        }

        // Load related donation if provided
        if (this.args.donationId) {
          await this.loadDonation(this.args.donationId);
        }

        // Load related donor if provided
        if (this.args.donorId) {
          await this.loadDonor(this.args.donorId);
        }

        // Load related certificate if provided
        if (this.args.certificateId) {
          await this.loadCertificate(this.args.certificateId);
        }
      } else {
        // Edit existing reminder
        this.reminder = await this.reminderRepo.findId(this.args.reminderId, {
          include: {
            relatedDonation: true,
            relatedDonor: true,
            assignedTo: true,
            createdBy: true
          }
        }) || undefined;
        if (!this.reminder) {
          this.ui.error('התזכורת לא נמצאה');
          this.dialogRef.close(false);
          return;
        }

        // If reminder has a related donor, load fundraiser if exists
        if (this.reminder.relatedDonorId && this.reminder.relatedDonor) {
          // Load the full donor with fundraiser relation
          const donorWithFundraiser = await this.donorRepo.findId(this.reminder.relatedDonorId, {
            include: { fundraiser: true }
          });

          // If donor has a fundraiser, auto-fill it (always override if donor has fundraiser)
          if (donorWithFundraiser?.fundraiser) {
            this.reminder.assignedToId = donorWithFundraiser.fundraiser.id;
            this.reminder.assignedTo = donorWithFundraiser.fundraiser;
          }
        }
      }

      // Set user assignment from args or current user as default
      if (this.isNewReminder && !this.reminder.assignedToId) {
        if (this.args.userId) {
          // Use the provided userId
          this.reminder.assignedToId = this.args.userId;
          const assignedUser = this.fundraisers.find(u => u.id === this.args.userId);
          if (assignedUser) {
            this.reminder.assignedTo = assignedUser;
          }
        } else {
          // Default to current user if they are a donator (fundraiser)
          const currentUser = await remult.repo(User).findFirst({ name: remult.user?.name, donator: true });
          if (currentUser) {
            this.reminder.assignedToId = currentUser.id;
            this.reminder.assignedTo = currentUser;
          }
        }
      }

      // Subscribe to global filter changes
      this.filterSubscription = this.globalFilterService.filters$.subscribe(() => {
        this.applyGlobalFiltersToLists();
      });

      // Apply initial filters
      this.applyGlobalFiltersToLists();

    } catch (error) {
      console.error('Error loading reminder:', error);
      this.ui.error('שגיאה בטעינת התזכורת');
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
  }

  async loadDonation(donationId: string) {
    try {
      const loadedDonation = await this.donationRepo.findId(donationId, {
        include: {
          donor: true,
          campaign: true
        }
      }) || undefined;

      if (loadedDonation) {
        // Link to donation
        this.reminder!.relatedDonationId = loadedDonation.id;
        this.reminder!.relatedDonation = loadedDonation;

        if (loadedDonation.donor) {
          this.reminder!.relatedDonorId = loadedDonation.donor.id;
          this.reminder!.relatedDonor = loadedDonation.donor;

          // Load fundraiser from donor if exists (always override)
          if (loadedDonation.donor.fundraiserId) {
            const donorWithFundraiser = await this.donorRepo.findId(loadedDonation.donor.id, {
              include: { fundraiser: true }
            });
            if (donorWithFundraiser?.fundraiser) {
              this.reminder!.assignedToId = donorWithFundraiser.fundraiser.id;
              this.reminder!.assignedTo = donorWithFundraiser.fundraiser;
            }
          }
        }

        // Set title based on donation
        this.reminder!.title = `מעקב תרומה - ${this.reminder!.relatedDonor?.fullName || 'תורם'}`;
        this.reminder!.description = `סכום: ₪${loadedDonation.amount.toLocaleString()}`;
        if (loadedDonation.campaign) {
          this.reminder!.description += `\nקמפיין: ${loadedDonation.campaign.name}`;
        }
      }
    } catch (error) {
      console.error('Error loading donation:', error);
      this.ui.error('שגיאה בטעינת פרטי התרומה');
    }
  }

  async loadDonor(donorId: string) {
    try {
      const loadedDonor = await this.donorRepo.findId(donorId, {
        include: { fundraiser: true }
      }) || undefined;

      if (loadedDonor) {
        // Load contact info using DonorService
        const relatedData = await this.donorService.loadDonorRelatedData([loadedDonor.id]);
        this.donorEmailMap = relatedData.donorEmailMap;
        this.donorPhoneMap = relatedData.donorPhoneMap;

        this.reminder!.relatedDonorId = loadedDonor.id;
        this.reminder!.relatedDonor = loadedDonor;
        console.log('loadedDonor.relatedDonor',loadedDonor.firstName)

        // Auto-fill fundraiser (assignedTo) from donor's fundraiser if exists (always override)
        if (loadedDonor.fundraiser) {
          this.reminder!.assignedToId = loadedDonor.fundraiser.id;
          this.reminder!.assignedTo = loadedDonor.fundraiser;
          console.log('loadedDonor.fundraiser',loadedDonor.fundraiser.name)
        }

        // Set title and description based on donor and reminder type
        if (!this.reminder!.title || this.reminder!.title === '') {
          const donorName = loadedDonor.fullName || `${loadedDonor.firstName} ${loadedDonor.lastName}`;

          switch (this.reminder!.type) {
            case 'birthday':
              this.reminder!.title = `יום הולדת - ${donorName}`;
              break;
            case 'memorialDay':
              this.reminder!.title = `נציב יום - ${donorName}`;
              break;
            case 'memorial':
              this.reminder!.title = `נציב זכרון - ${donorName}`;
              break;
            case 'thank_you':
              this.reminder!.title = `מכתב תודה - ${donorName}`;
              break;
            case 'phone_call':
              this.reminder!.title = `שיחת טלפון - ${donorName}`;
              break;
            case 'meeting':
              this.reminder!.title = `פגישה - ${donorName}`;
              break;
            default:
              this.reminder!.title = `תזכורת - ${donorName}`;
          }
        }

        // Set description with donor details
        if (!this.reminder!.description || this.reminder!.description === '') {
          const descriptionParts: string[] = [];

          const phone = this.donorPhoneMap.get(loadedDonor.id);
          const email = this.donorEmailMap.get(loadedDonor.id);

          if (phone) {
            descriptionParts.push(`טלפון: ${phone}`);
          }
          if (email) {
            descriptionParts.push(`דוא"ל: ${email}`);
          }

          this.reminder!.description = descriptionParts.join('\n');
        }
      }
    } catch (error) {
      console.error('Error loading donor:', error);
      this.ui.error('שגיאה בטעינת פרטי התורם');
    }
  }

  async loadCertificate(certificateId: string) {
    try {
      const loadedCertificate = await this.certificateRepo.findId(certificateId, {
        include: { donor: true }
      }) || undefined;

      if (loadedCertificate) {
        console.log('loadCertificate')
        // Link to donor if exists
        if (loadedCertificate.donor) {
          this.reminder!.relatedDonorId = loadedCertificate.donor.id;
          this.reminder!.relatedDonor = loadedCertificate.donor;

          // Load fundraiser from donor if exists
          if (loadedCertificate.donor.fundraiserId) {
            const donorWithFundraiser = await this.donorRepo.findId(loadedCertificate.donor.id, {
              include: { fundraiser: true }
            });
            if (donorWithFundraiser?.fundraiser) {
              this.reminder!.assignedToId = donorWithFundraiser.fundraiser.id;
              this.reminder!.assignedTo = donorWithFundraiser.fundraiser;
            }
          }
        }

        console.log('this.reminder!.title',this.reminder!.title,'this.reminder!.description',this.reminder!.description)
        console.log('loadedCertificate.typeText',loadedCertificate.typeText,'loadedCertificate.mainTitle',loadedCertificate.mainTitle,'loadedCertificate.mainText',loadedCertificate.mainText)

        // Set title and description based on certificate
        if (!this.reminder!.title || this.reminder!.title === '') {
          const certificateType = loadedCertificate.typeText || this.getCertificateTypeLabel(loadedCertificate.type);
          const donorName = loadedCertificate.donor?.fullName || 'תורם';
          this.reminder!.title = `תעודה - ${certificateType} - ${donorName}`;
        }

        
        // Set description with certificate details
          const descriptionParts: string[] = this.reminder!.description.split('\n');

          // Add main title (כותרת)
          if (loadedCertificate.mainTitle) {
            descriptionParts.push(`סיבה: ${loadedCertificate.mainTitle}`);
          }

          // Add main text (תקציר)
          if (loadedCertificate.mainText) {
            descriptionParts.push(`תקציר: ${loadedCertificate.mainText}`);
          }

          this.reminder!.description = descriptionParts.join('\n');
      }
    } catch (error) {
      console.error('Error loading certificate:', error);
      this.ui.error('שגיאה בטעינת פרטי התעודה');
    }
  }

  getCertificateTypeLabel(type: string): string {
    switch (type) {
      case 'donation': return 'תעודת תרומה';
      case 'memorial': return 'תעודת זיכרון';
      case 'memorialDay': return 'תעודת הקדשה';
      case 'appreciation': return 'תעודת הוקרה';
      default: return 'תעודה';
    }
  }

  async save() {
    if (!this.reminder) return;

    // Validate required fields
    if (!this.reminder.title) {
      this.ui.error('נא להזין כותרת לתזכורת');
      return;
    }

    if (!this.reminder.dueDate) {
      this.ui.error('נא לבחור תאריך יעד');
      return;
    }

    this.loading = true;
    try {
      // Set alert date if needed
      if (this.reminder.sendAlert && this.reminder.alertMethod !== 'none') {
        const alertDate = new Date(this.reminder.dueDate);
        alertDate.setHours(alertDate.getHours() - 1); // Alert 1 hour before
        this.reminder.alertDate = alertDate;
      }

      // Calculate next reminder date if recurring
      if (this.reminder.isRecurring) {
        this.reminder.nextReminderDate = await this.reminderService.calculateNextReminderDate({
          isRecurring: this.reminder.isRecurring,
          recurringPattern: this.reminder.recurringPattern,
          dueDate: this.reminder.dueDate,
          completedDate: this.reminder.completedDate,
          recurringWeekDay: this.reminder.recurringWeekDay,
          recurringDayOfMonth: this.reminder.recurringDayOfMonth,
          recurringMonth: this.reminder.recurringMonth,
          yearlyRecurringType: this.reminder.yearlyRecurringType,
          specialOccasion: this.reminder.specialOccasion
        });
      }

      await this.reminder.save();

      // Show success message with next reminder info
      const nextDateInfo = this.getNextReminderInfo();
      this.ui.info(`התזכורת נוספה בהצלחה - ${nextDateInfo}`);

      this.changed = true;
      this.dialogRef.close(this.changed);
    } catch (error) {
      console.error('Error saving reminder:', error);
      this.ui.error('שגיאה בשמירת התזכורת');
    } finally {
      this.loading = false;
    }
  }

  getNextReminderInfo(): string {
    if (!this.reminder) return '';

    const dueDate = new Date(this.reminder.dueDate);
    const today = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const dateStr = dueDate.toLocaleDateString('he-IL');
    const timeStr = this.reminder.dueTime || '10:00';
    const dayName = dueDate.toLocaleDateString('he-IL', { weekday: 'long' });

    let daysText = '';
    if (daysDiff === 0) {
      daysText = 'היום';
    } else if (daysDiff === 1) {
      daysText = 'מחר';
    } else if (daysDiff < 0) {
      daysText = `לפני ${Math.abs(daysDiff)} ימים`;
    } else {
      daysText = `בעוד ${daysDiff} ימים`;
    }

    return `תזכורת הבאה: ${dateStr} בשעה ${timeStr}, ${dayName}, ${daysText}`;
  }

  cancel() {
    this.dialogRef.close(this.changed);
  }

  closeModal(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.cancel();
    }
  }

  onDueTimeChange() {
    if (!this.reminder?.dueTime) return;

    // Round dueTime to nearest 5-minute interval in real-time
    const [hours, minutes] = this.reminder.dueTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    const totalMinutes = hours * 60 + minutes;
    // Round to nearest 5 minutes
    const roundedMinutes = Math.round(totalMinutes / 5) * 5;
    const roundedHours = Math.floor(roundedMinutes / 60) % 24;
    const roundedMins = roundedMinutes % 60;

    const roundedTime = `${String(roundedHours).padStart(2, '0')}:${String(roundedMins).padStart(2, '0')}`;

    // Only update if value changed to avoid infinite loop
    if (this.reminder.dueTime !== roundedTime) {
      this.reminder.dueTime = roundedTime;
    }
  }

  async onHebrewMonthChange() {
    console.log('[onHebrewMonthChange] Selected month:', this.reminder?.recurringMonth);

    // Update Hebrew day options based on selected month
    await this.updateHebrewDayOptions();

    // If current selected day is invalid for new month, reset it
    if (this.reminder?.recurringDayOfMonth) {
      const maxDays = await this.getHebrewMonthDays(this.reminder.recurringMonth);
      console.log('[onHebrewMonthChange] Max days:', maxDays, 'Current day:', this.reminder.recurringDayOfMonth);
      if (this.reminder.recurringDayOfMonth > maxDays) {
        this.reminder.recurringDayOfMonth = undefined;
      }
    }
  }

  async updateHebrewDayOptions() {
    const maxDays = await this.getHebrewMonthDays(this.reminder?.recurringMonth);
    console.log('[updateHebrewDayOptions] Updating to', maxDays, 'days for month', this.reminder?.recurringMonth);
    this.hebrewDayOfMonthOptions = Array.from({ length: maxDays }, (_, i) => ({
      value: i + 1,
      label: this.hebrewDateService.getHebrewDayString(i + 1)
    }));
    console.log('[updateHebrewDayOptions] New options length:', this.hebrewDayOfMonthOptions.length);
  }

  async getHebrewMonthDays(month?: number): Promise<number> {
    if (!month) return 30; // Default to 30 days if no month selected

    // Convert to number if it's a string (from select element)
    const monthNum = typeof month === 'string' ? parseInt(month, 10) : month;

    // Use hebcal to get the correct number of days for the current Hebrew year
    const currentHebrewYear = await this.hebrewDateService.getCurrentHebrewYear();

    // Convert our internal month numbering (1-13) to hebcal month numbers
    const hebcalMonth = this.getHebcalMonthNumber(monthNum);

    if (!hebcalMonth) {
      console.warn('[getHebrewMonthDays] Invalid month:', month);
      return 30;
    }

    const daysInMonth = await this.hebrewDateService.getDaysInMonth(hebcalMonth, currentHebrewYear);
    console.log('[getHebrewMonthDays] month:', month, 'monthNum:', monthNum, 'hebcalMonth:', hebcalMonth, 'days:', daysInMonth);

    return daysInMonth;
  }

  getHebcalMonthNumber(internalMonth: number): number | null {
    // Map our internal numbering (1-13) to hebcal month numbers
    const mapping: { [key: number]: number } = {
      1: 7,   // תשרי = TISHREI
      2: 8,   // חשון = CHESHVAN
      3: 9,   // כסלו = KISLEV
      4: 10,  // טבת = TEVET
      5: 11,  // שבט = SHVAT
      6: 12,  // אדר = ADAR_I
      7: 13,  // אדר ב' = ADAR_II
      8: 1,   // ניסן = NISAN
      9: 2,   // אייר = IYYAR
      10: 3,  // סיון = SIVAN
      11: 4,  // תמוז = TAMUZ
      12: 5,  // אב = AV
      13: 6   // אלול = ELUL
    };

    return mapping[internalMonth] || null;
  }

  get formattedDueDate(): string {
    if (!this.reminder?.dueDate) return '';
    return new Date(this.reminder.dueDate).toLocaleDateString('he-IL');
  }

  get priorityColor(): string {
    switch (this.reminder?.priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'normal': return 'blue';
      case 'low': return 'gray';
      default: return 'blue';
    }
  }

  async loadUsers() {
    this.users = await this.userRepo.find({
      where: { disabled: false },
      orderBy: { name: 'asc' }
    });
  }

  async loadFundraisers() {
    this.fundraisers = await this.userRepo.find({
      where: { disabled: false, donator: true },
      orderBy: { name: 'asc' }
    });
  }

  async loadDonors() {
    if (this.donorsLoaded) return; // Skip if already loaded

    this.donors = await this.donorRepo.find({
      orderBy: { lastName: 'asc', firstName: 'asc' }
    });

    // Load primary place for each donor to get country
    const donorPlaceRepo = remult.repo(DonorPlace);
    const placePromises = this.donors.map(async (donor) => {
      const primaryPlace = await donorPlaceRepo.findFirst({
        donorId: donor.id,
        isPrimary: true,
        isActive: true
      }, {
        include: {
          place: { include: { country: true } }
        }
      });

      if (primaryPlace?.place) {
        this.donorPlaceMap.set(donor.id, primaryPlace.place);
        if (primaryPlace.place.countryId) {
          this.donorCountryIdMap.set(donor.id, primaryPlace.place.countryId);
        }
      }
    });

    await Promise.all(placePromises);
    this.donorsLoaded = true;
  }

  async loadDonations() {
    if (this.donationsLoaded) return; // Skip if already loaded

    this.donations = await this.donationRepo.find({
      include: {
        donor: true,
        campaign: true
      },
      orderBy: { donationDate: 'desc' }
    });
    this.filteredDonations = [...this.donations]; // Initialize with all donations
    this.donationsLoaded = true;
  }

  async onDonorSelectionChange(donorId: string) {
    if (donorId) {
      // Update the related donor
      const selectedDonor = this.donors.find(d => d.id === donorId);
      if (selectedDonor && this.reminder) {
        this.reminder.relatedDonorId = donorId;
        this.reminder.relatedDonor = selectedDonor;

        // Auto-fill fundraiser (assignedTo) from donor's fundraiser if exists
        if (selectedDonor.fundraiserId) {
          // Load the full donor with fundraiser relation
          const donorWithFundraiser = await this.donorRepo.findId(donorId, {
            include: { fundraiser: true }
          });
          if (donorWithFundraiser?.fundraiser) {
            this.reminder.assignedToId = donorWithFundraiser.fundraiser.id;
            this.reminder.assignedTo = donorWithFundraiser.fundraiser;
          }
        }
      }

      // Filter donations to show only those of the selected donor
      this.filteredDonations = this.donations.filter(donation => donation.donorId === donorId);

      // Clear donation selection if it doesn't belong to the selected donor
      if (this.reminder?.relatedDonationId) {
        const selectedDonation = this.donations.find(d => d.id === this.reminder?.relatedDonationId);
        if (selectedDonation && selectedDonation.donorId !== donorId) {
          this.reminder.relatedDonationId = '';
        }
      }
    } else {
      // Clear the related donor
      if (this.reminder) {
        this.reminder.relatedDonorId = '';
        this.reminder.relatedDonor = undefined;
      }
      // Show all donations if no donor is selected
      this.filteredDonations = [...this.donations];
    }

  }

  async onDonorDropdownOpen() {
    if (!this.donorsLoaded) {
      await this.loadDonors();
    }
  }

  async onDonationDropdownOpen() {
    if (!this.donationsLoaded) {
      await this.loadDonations();
    }
  }

  getDonationDisplayText(donation: Donation): string {
    const amount = `₪${donation.amount.toLocaleString()}`;
    const date = new Date(donation.donationDate).toLocaleDateString('he-IL');
    const donor = donation.donor?.fullName || 'תורם לא ידוע';
    return `${amount} - ${donor} (${date})`;
  }

  applyGlobalFiltersToLists() {
    const filters = this.globalFilterService.currentFilters;

    // Filter donors by country ID
    if (filters.countryIds && filters.countryIds.length > 0) {
      const filteredDonors = this.donors.filter(donor => {
        const countryId = this.donorCountryIdMap.get(donor.id);
        return countryId && filters.countryIds!.includes(countryId);
      });

      // Update filtered lists based on selected donor
      if (this.reminder?.relatedDonorId) {
        const selectedDonor = filteredDonors.find(d => d.id === this.reminder!.relatedDonorId);
        if (selectedDonor) {
          this.filteredDonations = this.donations.filter(d => d.donorId === this.reminder!.relatedDonorId);
        } else {
          // Current donor is not in the filtered list - show filtered donors' data
          const filteredDonorIds = filteredDonors.map(d => d.id);
          this.filteredDonations = this.donations.filter(d => filteredDonorIds.includes(d.donorId));
        }
      } else {
        // No donor selected - show all data from filtered donors
        const filteredDonorIds = filteredDonors.map(d => d.id);
        this.filteredDonations = this.donations.filter(d => filteredDonorIds.includes(d.donorId));
      }
    } else {
      // No country filter - show all or donor-specific data
      if (this.reminder?.relatedDonorId) {
        this.filteredDonations = this.donations.filter(d => d.donorId === this.reminder!.relatedDonorId);
      } else {
        this.filteredDonations = [...this.donations];
      }
    }
  }

  getDueDateLabel(): string {
    return this.i18n.terms.dueDate || 'תאריך יעד';
  }

  initializeOptions() {
    const terms = this.i18n.terms;

    this.typeOptions = [
      { value: 'donation_followup', label: terms.donationFollowUp },
      { value: 'thank_you', label: terms.thankYouLetter },
      { value: 'receipt', label: terms.receipt },
      { value: 'birthday', label: terms.birthdayType },
      { value: 'holiday', label: terms.holiday },
      { value: 'general', label: terms.generalType },
      { value: 'meeting', label: terms.meetingType },
      { value: 'phone_call', label: terms.phoneCallType },
      { value: 'memorialDay', label: 'נציב יום' },
      { value: 'memorial', label: 'נציב זכרון' }
    ];

    this.priorityOptions = [
      { value: 'low', label: terms.lowPriority },
      { value: 'normal', label: terms.normalPriority },
      { value: 'high', label: terms.highPriority },
      { value: 'urgent', label: terms.urgentPriority }
    ];

    this.alertMethodOptions = [
      { value: 'email', label: terms.emailAlert },
      { value: 'sms', label: terms.smsAlert, disabled: true },
      { value: 'popup', label: terms.popupAlert }
    ];

    this.recurringPatternOptions = [
      // { value: 'none', label: terms.noRepeat },
      { value: 'daily', label: terms.dailyRepeat },
      { value: 'weekly', label: terms.weeklyRepeat },
      { value: 'monthly', label: terms.monthlyRepeat },
      { value: 'yearly', label: terms.yearlyRepeat }
    ];

    this.weekDayOptions = [
      { value: 0, label: 'ראשון' },
      { value: 1, label: 'שני' },
      { value: 2, label: 'שלישי' },
      { value: 3, label: 'רביעי' },
      { value: 4, label: 'חמישי' },
      { value: 5, label: 'שישי' },
      { value: 6, label: 'שבת' }
    ];

    this.monthOptions = [
      { value: 1, label: 'ינואר' },
      { value: 2, label: 'פברואר' },
      { value: 3, label: 'מרץ' },
      { value: 4, label: 'אפריל' },
      { value: 5, label: 'מאי' },
      { value: 6, label: 'יוני' },
      { value: 7, label: 'יולי' },
      { value: 8, label: 'אוגוסט' },
      { value: 9, label: 'ספטמבר' },
      { value: 10, label: 'אוקטובר' },
      { value: 11, label: 'נובמבר' },
      { value: 12, label: 'דצמבר' }
    ];

    this.hebrewMonthOptions = [
      { value: 1, label: 'תשרי' },
      { value: 2, label: 'חשון' },
      { value: 3, label: 'כסלו' },
      { value: 4, label: 'טבת' },
      { value: 5, label: 'שבט' },
      { value: 6, label: 'אדר' },
      { value: 7, label: 'אדר ב\'' },
      { value: 8, label: 'ניסן' },
      { value: 9, label: 'אייר' },
      { value: 10, label: 'סיון' },
      { value: 11, label: 'תמוז' },
      { value: 12, label: 'אב' },
      { value: 13, label: 'אלול' }
    ];

    // Initialize Hebrew day of month options with Hebrew letters (will be updated based on selected month)
    this.updateHebrewDayOptions();

    this.specialOccasionOptions = [
      { value: '', label: '-- בחר זמן מיוחד --' },
      { value: 'ראש השנה', label: 'ראש השנה' },
      { value: 'ראש השנה ב\'', label: 'ראש השנה ב\'' },
      { value: 'צום גדליה', label: 'צום גדליה' },
      { value: 'יום כיפור', label: 'יום כיפור' },
      { value: 'סוכות', label: 'סוכות' },
      { value: 'חוה"מ סוכות', label: 'חול המועד סוכות' },
      { value: 'הוש"ר', label: 'הושענא רבה' },
      { value: 'שמ"ע/שמח"ת', label: 'שמיני עצרת / שמחת תורה' },
      { value: 'חנוכה', label: 'חנוכה' },
      { value: 'צום עשרה בטבת', label: 'צום עשרה בטבת' },
      { value: 'ט"ו בשבט', label: 'ט"ו בשבט' },
      { value: 'תענית אסתר', label: 'תענית אסתר' },
      { value: 'פורים', label: 'פורים' },
      { value: 'שושן פורים', label: 'שושן פורים' },
      { value: 'פסח', label: 'פסח' },
      { value: 'חוה"מ פסח', label: 'חול המועד פסח' },
      { value: 'שביעי פסח', label: 'שביעי של פסח' },
      { value: 'יום השואה', label: 'יום השואה' },
      { value: 'יום הזיכרון', label: 'יום הזיכרון' },
      { value: 'יום העצמאות', label: 'יום העצמאות' },
      { value: 'פסח שני', label: 'פסח שני' },
      { value: 'ל"ג בעומר', label: 'ל"ג בעומר' },
      { value: 'יום ירושלים', label: 'יום ירושלים' },
      { value: 'שבועות', label: 'שבועות' },
      { value: 'צום יז\' בתמוז', label: 'צום יז\' בתמוז' },
      { value: 'תשעה באב', label: 'תשעה באב' },
      { value: 'ט"ו באב', label: 'ט"ו באב' },
      { value: 'ראש חודש', label: 'ראש חודש' }
    ];
  }

  static async open(args: ReminderDetailsModalArgs): Promise<boolean> {
    const result = await openDialog(
      ReminderDetailsModalComponent,
      x => x.args = args
    );
    return !!result;
  }
}