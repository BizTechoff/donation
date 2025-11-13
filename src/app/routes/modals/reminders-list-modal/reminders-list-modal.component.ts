import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Reminder } from '../../../../shared/entity';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { ReminderService } from '../../../services/reminder.service';
import { ReminderSnoozeModalComponent, SnoozePeriod } from '../reminder-snooze-modal/reminder-snooze-modal.component';

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '90vw',
  maxHeight: '90vh',
  width: '800px'
})
@Component({
  selector: 'app-reminders-list-modal',
  templateUrl: './reminders-list-modal.component.html',
  styleUrls: ['./reminders-list-modal.component.scss']
})
export class RemindersListModalComponent implements OnInit {
  reminders: Reminder[] = [];
  loading = false;
  reminderRepo = remult.repo(Reminder);

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<RemindersListModalComponent>,
    private reminderService: ReminderService
  ) {}

  async ngOnInit() {
    await this.loadReminders();
  }

  async loadReminders() {
    this.loading = true;
    try {
      // Get global filters
      // Global filters are fetched from user.settings in the backend
      this.reminders = await this.reminderService.findActiveReminders();

    } catch (error) {
      console.error('Error loading reminders:', error);
      this.ui.error('שגיאה בטעינת התזכורות');
    } finally {
      this.loading = false;
    }
  }

  async markAsCompleted(reminder: Reminder) {
    try {
      // Get the reminder from repo to ensure methods are available
      const reminderFromRepo = await this.reminderRepo.findId(reminder.id);
      if (reminderFromRepo) {
        await reminderFromRepo.complete();
        this.ui.info('התזכורת סומנה כהושלמה');
        await this.loadReminders();
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
      this.ui.error('שגיאה בסימון התזכורת כהושלמה');
    }
  }

  async openSnoozeModal(reminder: Reminder) {
    try {
      const period = await ReminderSnoozeModalComponent.open(reminder.id);
      if (period) {
        await this.snoozeToPeriod(reminder, period);
      }
    } catch (error) {
      console.error('Error opening snooze modal:', error);
      this.ui.error('שגיאה בפתיחת תפריט דחייה');
    }
  }

  async snoozeToPeriod(reminder: Reminder, period: SnoozePeriod) {
    try {
      let hours: number;
      switch (period) {
        case 'tomorrow':
          hours = 24;
          break;
        case 'dayAfterTomorrow':
          hours = 48;
          break;
        case 'nextWeek':
          hours = 7 * 24;
          break;
        case 'nextMonth':
          hours = 30 * 24;
          break;
      }
      // Get the reminder from repo to ensure methods are available
      const reminderFromRepo = await this.reminderRepo.findId(reminder.id);
      if (reminderFromRepo) {
        await reminderFromRepo.snooze(hours);
        const periodText = {
          'tomorrow': 'למחר',
          'dayAfterTomorrow': 'למחרתיים',
          'nextWeek': 'לשבוע הבא',
          'nextMonth': 'לחודש הבא'
        }[period];
        this.ui.info(`התזכורת נדחתה ${periodText}`);
        await this.loadReminders();
      }
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      this.ui.error('שגיאה בדחיית התזכורת');
    }
  }

  async snoozeReminder(reminder: Reminder, hours: number) {
    try {
      // Get the reminder from repo to ensure methods are available
      const reminderFromRepo = await this.reminderRepo.findId(reminder.id);
      if (reminderFromRepo) {
        await reminderFromRepo.snooze(hours);
        this.ui.info(`התזכורת נדחתה ב-${hours} שעות`);
        await this.loadReminders();
      }
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      this.ui.error('שגיאה בדחיית התזכורת');
    }
  }

  async markAsSeen(reminder: Reminder) {
    try {
      // Get the reminder from repo to ensure methods are available
      const reminderFromRepo = await this.reminderRepo.findId(reminder.id);
      if (!reminderFromRepo) return;

      if (reminderFromRepo.isRecurring) {
        // Calculate next reminder date
        const nextDate = await this.reminderService.calculateNextReminderDate({
          isRecurring: reminderFromRepo.isRecurring,
          recurringPattern: reminderFromRepo.recurringPattern,
          dueDate: reminderFromRepo.dueDate,
          completedDate: reminderFromRepo.completedDate,
          recurringWeekDay: reminderFromRepo.recurringWeekDay,
          recurringDayOfMonth: reminderFromRepo.recurringDayOfMonth,
          recurringMonth: reminderFromRepo.recurringMonth,
          yearlyRecurringType: reminderFromRepo.yearlyRecurringType,
          specialOccasion: reminderFromRepo.specialOccasion
        });
        if (nextDate) {
          reminderFromRepo.nextReminderDate = nextDate;
          await reminderFromRepo.save();

          // Format the next occurrence info
          const date = new Date(nextDate);
          const dateStr = date.toLocaleDateString('he-IL');
          const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

          let patternText = '';
          switch (reminderFromRepo.recurringPattern) {
            case 'daily': patternText = 'יום'; break;
            case 'weekly': patternText = 'שבוע'; break;
            case 'monthly': patternText = 'חודש'; break;
            case 'yearly': patternText = 'שנה'; break;
          }

          this.ui.info(`התזכורת הזו תופיע שוב ב${patternText} הבאה בתאריך: ${dateStr} בשעה: ${timeStr}`);
          await this.loadReminders();
        }
      } else {
        // For non-recurring reminders, just complete them
        await reminderFromRepo.complete();
        this.ui.info('התזכורת הושלמה');
        await this.loadReminders();
      }
    } catch (error) {
      console.error('Error marking reminder as seen:', error);
      this.ui.error('שגיאה בסימון התזכורת');
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'normal': return 'priority-normal';
      case 'low': return 'priority-low';
      default: return 'priority-normal';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'urgent': return 'warning';
      case 'high': return 'priority_high';
      case 'normal': return 'info';
      case 'low': return 'low_priority';
      default: return 'info';
    }
  }

  close() {
    this.dialogRef.close();
  }

  static async open(): Promise<void> {
    await openDialog(RemindersListModalComponent);
  }
}
