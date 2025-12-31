import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Reminder } from '../../../../shared/entity';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { ReminderService } from '../../../services/reminder.service';
import { ReminderSnoozeModalComponent, SnoozePeriod } from '../reminder-snooze-modal/reminder-snooze-modal.component';
import { ReminderCompleteModalComponent } from '../reminder-complete-modal/reminder-complete-modal.component';

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
      // Open the complete modal
      const option = await ReminderCompleteModalComponent.open(reminder.isRecurring, reminder.title);
      if (!option) {
        return; // User cancelled
      }

      // Get the reminder from repo to ensure methods are available
      const reminderFromRepo = await this.reminderRepo.findId(reminder.id);
      if (!reminderFromRepo) {
        return;
      }

      // Handle based on selected option
      if (option === 'completeAndRemindNext') {
        // For recurring: move to next occurrence
        await reminderFromRepo.complete();
        this.ui.info('התזכורת סומנה כהושלמה ותופיע שוב במועד הבא');
      } else {
        // completeFinal: mark as completed permanently
        await reminderFromRepo.complete(undefined, true);
        this.ui.info('התזכורת סומנה כהושלמה');
      }

      await this.loadReminders();
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
    // Use the same flow as markAsCompleted - open the modal
    await this.markAsCompleted(reminder);
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
