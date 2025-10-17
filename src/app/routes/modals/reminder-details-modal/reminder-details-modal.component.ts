import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Donation, Donor, Reminder, User, Contact } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { GlobalFilterService } from '../../../services/global-filter.service';
import { Subscription } from 'rxjs';

export interface ReminderDetailsModalArgs {
  reminderId?: string; // 'new' for new reminder or reminder ID for editing
  userId?: string; // Optional user ID to assign
  donorId?: string; // Optional donor ID to link
  donationId?: string; // Optional donation ID to link
  reminderType?: 'donation_followup' | 'thank_you' | 'receipt' | 'birthday' | 'holiday' | 'general' | 'meeting' | 'phone_call' | 'dedication' | 'memorial'; // Optional reminder type to initialize
  reminderDate?: Date; // Optional date to initialize
  isRecurringYearly?: boolean; // Optional flag for yearly recurring reminder
}

@Component({
  selector: 'app-reminder-details-modal',
  templateUrl: './reminder-details-modal.component.html',
  styleUrls: ['./reminder-details-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    SharedComponentsModule
  ]
})
export class ReminderDetailsModalComponent implements OnInit, OnDestroy {
  args!: ReminderDetailsModalArgs;
  changed = false;

  reminder?: Reminder;

  reminderRepo = remult.repo(Reminder);
  donorRepo = remult.repo(Donor);
  donationRepo = remult.repo(Donation);
  userRepo = remult.repo(User);
  contactRepo = remult.repo(Contact);

  loading = false;
  isNewReminder = false;
  users: User[] = [];
  fundraisers: User[] = [];
  donors: Donor[] = [];
  donations: Donation[] = [];
  contacts: Contact[] = [];
  filteredDonations: Donation[] = [];
  filteredContacts: Contact[] = [];

  // Options will be populated with i18n values
  typeOptions: { value: string, label: string }[] = [];
  priorityOptions: { value: string, label: string }[] = [];
  alertMethodOptions: { value: string, label: string }[] = [];
  recurringPatternOptions: { value: string, label: string }[] = [];
  weekDayOptions: { value: number, label: string }[] = [];
  monthOptions: { value: number, label: string }[] = [];

  // Day of month options (1-31)
  dayOfMonthOptions = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: (i + 1).toString() }));

  // Hebrew month options (1-13, including Adar I and Adar II for leap years)
  hebrewMonthOptions: { value: number, label: string }[] = [];

  // Hebrew day of month options (1-30)
  hebrewDayOfMonthOptions = Array.from({ length: 30 }, (_, i) => ({ value: i + 1, label: (i + 1).toString() }));

  // Special occasions (holidays and events)
  specialOccasionOptions: { value: string, label: string }[] = [];

  private filterSubscription?: Subscription;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private globalFilterService: GlobalFilterService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<ReminderDetailsModalComponent>
  ) { }

  async ngOnInit() {
    this.loading = true;
    try {
      // Initialize options with i18n
      this.initializeOptions();

      // Load data in parallel
      await Promise.all([
        this.loadFundraisers(),
        this.loadDonors(),
        this.loadDonations()
      ]);

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
        }

        // Load related donation if provided
        if (this.args.donationId) {
          await this.loadDonation(this.args.donationId);
        }

        // Load related donor if provided
        if (this.args.donorId) {
          await this.loadDonor(this.args.donorId);
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
        // relatedDonor is already loaded from the include
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
      const loadedDonor = await this.donorRepo.findId(donorId) || undefined;
      if (loadedDonor) {
        this.reminder!.relatedDonorId = loadedDonor.id;
        this.reminder!.relatedDonor = loadedDonor;
      }
    } catch (error) {
      console.error('Error loading donor:', error);
      this.ui.error('שגיאה בטעינת פרטי התורם');
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
      if (this.reminder.isRecurring && this.reminder.recurringPattern !== 'none') {
        this.reminder.nextReminderDate = this.reminder.calculateNextReminderDate();
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
    this.donors = await this.donorRepo.find({
      orderBy: { lastName: 'asc', firstName: 'asc' }
    });
  }

  async loadDonations() {
    this.donations = await this.donationRepo.find({
      include: {
        donor: true,
        campaign: true
      },
      orderBy: { donationDate: 'desc' }
    });
    this.filteredDonations = [...this.donations]; // Initialize with all donations
  }

  async loadContacts() {
    this.contacts = await this.contactRepo.find({
      include: {
        donor: true
      },
      orderBy: { lastName: 'asc', firstName: 'asc' }
    });
    this.filteredContacts = [...this.contacts]; // Initialize with all contacts
  }

  onDonorSelectionChange(donorId: string) {
    if (donorId) {
      // Update the related donor
      const selectedDonor = this.donors.find(d => d.id === donorId);
      if (selectedDonor && this.reminder) {
        this.reminder.relatedDonorId = donorId;
        this.reminder.relatedDonor = selectedDonor;
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

  getDonationDisplayText(donation: Donation): string {
    const amount = `₪${donation.amount.toLocaleString()}`;
    const date = new Date(donation.donationDate).toLocaleDateString('he-IL');
    const donor = donation.donor?.fullName || 'תורם לא ידוע';
    return `${amount} - ${donor} (${date})`;
  }

  getContactDisplayText(contact: Contact): string {
    const fullName = `${contact.firstName} ${contact.lastName}`;
    const position = contact.position ? ` - ${contact.position}` : '';
    const phone = contact.phone ? ` (${contact.phone})` : '';
    return `${fullName}${position}${phone}`;
  }

  applyGlobalFiltersToLists() {
    const filters = this.globalFilterService.currentFilters;

    // Filter donors by country
    if (filters.countryNames && filters.countryNames.length > 0) {
      const filteredDonors = this.donors.filter(donor =>
        donor.country?.caption && filters.countryNames!.includes(donor.country.caption)
      );

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
      { value: 'dedication', label: 'נציב יום' },
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
      { value: 'sms', label: terms.smsAlert },
      { value: 'popup', label: terms.popupAlert },
      { value: 'none', label: terms.noAlert }
    ];

    this.recurringPatternOptions = [
      { value: 'none', label: terms.noRepeat },
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
      { value: 8, label: 'נישן' },
      { value: 9, label: 'אייר' },
      { value: 10, label: 'סיוון' },
      { value: 11, label: 'תמוז' },
      { value: 12, label: 'אב' },
      { value: 13, label: 'אלול' }
    ];

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