import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Reminder, Donor, Donation, User } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { SharedComponentsModule } from '../../../shared/shared-components.module';

export interface ReminderDetailsModalArgs {
  reminderId?: string; // 'new' for new reminder or reminder ID for editing
  donationId?: string; // Optional donation ID to link
  donorId?: string; // Optional donor ID to link
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
export class ReminderDetailsModalComponent implements OnInit {
  args!: ReminderDetailsModalArgs;
  changed = false;
  shouldClose = false;

  reminder?: Reminder;
  donor?: Donor;
  donation?: Donation;

  reminderRepo = remult.repo(Reminder);
  donorRepo = remult.repo(Donor);
  donationRepo = remult.repo(Donation);
  userRepo = remult.repo(User);

  loading = false;
  isNewReminder = false;
  users: User[] = [];

  // Reminder type options
  typeOptions = [
    { value: 'donation_followup', label: 'מעקב תרומה' },
    { value: 'thank_you', label: 'מכתב תודה' },
    { value: 'receipt', label: 'קבלה' },
    { value: 'birthday', label: 'יום הולדת' },
    { value: 'holiday', label: 'חג' },
    { value: 'general', label: 'כללי' },
    { value: 'meeting', label: 'פגישה' },
    { value: 'phone_call', label: 'שיחת טלפון' }
  ];

  // Priority options
  priorityOptions = [
    { value: 'low', label: 'נמוך' },
    { value: 'normal', label: 'רגיל' },
    { value: 'high', label: 'גבוה' },
    { value: 'urgent', label: 'דחוף' }
  ];

  // Alert method options
  alertMethodOptions = [
    { value: 'email', label: 'אימייל' },
    { value: 'sms', label: 'SMS' },
    { value: 'popup', label: 'התראה במערכת' },
    { value: 'none', label: 'ללא' }
  ];

  // Recurring pattern options
  recurringPatternOptions = [
    { value: 'none', label: 'ללא' },
    { value: 'daily', label: 'יומי' },
    { value: 'weekly', label: 'שבועי' },
    { value: 'monthly', label: 'חודשי' },
    { value: 'yearly', label: 'שנתי' }
  ];

  // Weekday options (0=Sunday to 6=Saturday)
  weekDayOptions = [
    { value: 0, label: 'ראשון' },
    { value: 1, label: 'שני' },
    { value: 2, label: 'שלישי' },
    { value: 3, label: 'רביעי' },
    { value: 4, label: 'חמישי' },
    { value: 5, label: 'שישי' },
    { value: 6, label: 'שבת' }
  ];

  // Month options
  monthOptions = [
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

  // Day of month options (1-31)
  dayOfMonthOptions = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: (i + 1).toString() }));

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService
  ) {}

  async ngOnInit() {
    this.loading = true;
    try {
      // Load users for assignment
      this.users = await this.userRepo.find({
        where: { disabled: false },
        orderBy: { name: 'asc' }
      });

      // Check if new or editing
      if (!this.args.reminderId || this.args.reminderId === 'new') {
        this.isNewReminder = true;
        this.reminder = this.reminderRepo.create();

        // Set default values
        this.reminder.type = 'donation_followup';
        this.reminder.priority = 'normal';
        this.reminder.alertMethod = 'popup';
        this.reminder.sendAlert = true;
        this.reminder.isActive = true;
        this.reminder.status = 'pending';

        // Set due date to tomorrow by default
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        this.reminder.dueDate = tomorrow;

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
            relatedDonor: true,
            assignedTo: true,
            createdBy: true
          }
        }) || undefined;
        if (!this.reminder) {
          this.ui.error('התזכורת לא נמצאה');
          this.shouldClose = true;
          return;
        }
        this.donor = this.reminder.relatedDonor;
      }

      // Set current user as default assignee if new
      if (this.isNewReminder && !this.reminder.assignedToId) {
        const currentUser = await remult.repo(User).findFirst({ name: remult.user?.name });
        if (currentUser) {
          this.reminder.assignedToId = currentUser.id;
          this.reminder.assignedTo = currentUser;
        }
      }

    } catch (error) {
      console.error('Error loading reminder:', error);
      this.ui.error('שגיאה בטעינת התזכורת');
    } finally {
      this.loading = false;
    }
  }

  async loadDonation(donationId: string) {
    try {
      this.donation = await this.donationRepo.findId(donationId, {
        include: {
          donor: true,
          campaign: true
        }
      }) || undefined;

      if (this.donation) {
        this.donor = this.donation.donor;
        if (this.donor) {
          this.reminder!.relatedDonorId = this.donor.id;
          this.reminder!.relatedDonor = this.donor;
        }

        // Link to donation
        this.reminder!.relatedDonationId = this.donation.id;
        this.reminder!.relatedDonation = this.donation;

        // Set title based on donation
        this.reminder!.title = `מעקב תרומה - ${this.donor?.fullName || 'תורם'}`;
        this.reminder!.description = `סכום: ₪${this.donation.amount.toLocaleString()}`;
        if (this.donation.campaign) {
          this.reminder!.description += `\nקמפיין: ${this.donation.campaign.name}`;
        }
      }
    } catch (error) {
      console.error('Error loading donation:', error);
      this.ui.error('שגיאה בטעינת פרטי התרומה');
    }
  }

  async loadDonor(donorId: string) {
    try {
      this.donor = await this.donorRepo.findId(donorId) || undefined;
      if (this.donor) {
        this.reminder!.relatedDonorId = this.donor.id;
        this.reminder!.relatedDonor = this.donor;
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
      this.shouldClose = true;
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
    this.shouldClose = true;
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

  static async open(args: ReminderDetailsModalArgs): Promise<boolean> {
    const result = await openDialog(
      ReminderDetailsModalComponent,
      x => x.args = args,
      x => x.shouldClose
    );
    return result;
  }
}