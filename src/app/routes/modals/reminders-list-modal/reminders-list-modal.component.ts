import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Reminder } from '../../../../shared/entity';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { ReminderService } from '../../../services/reminder.service';

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
      const today = new Date();
      this.reminders = await this.reminderRepo.find({
        where: {
          nextReminderDate: { $lte: today },
          isCompleted: false,
          isActive: true
        },
        include: {
          relatedDonor: true,
          assignedTo: true,
          relatedDonation: true
        },
        orderBy: {
          priority: 'asc',
          nextReminderDate: 'asc'
        }
      });
    } catch (error) {
      console.error('Error loading reminders:', error);
      this.ui.error('שגיאה בטעינת התזכורות');
    } finally {
      this.loading = false;
    }
  }

  async markAsCompleted(reminder: Reminder) {
    try {
      await reminder.complete();
      this.ui.info('התזכורת סומנה כהושלמה');
      await this.loadReminders();
    } catch (error) {
      console.error('Error completing reminder:', error);
      this.ui.error('שגיאה בסימון התזכורת כהושלמה');
    }
  }

  async snoozeReminder(reminder: Reminder, hours: number) {
    try {
      await reminder.snooze(hours);
      this.ui.info(`התזכורת נדחתה ב-${hours} שעות`);
      await this.loadReminders();
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      this.ui.error('שגיאה בדחיית התזכורת');
    }
  }

  async markAsSeen(reminder: Reminder) {
    try {
      if (reminder.isRecurring) {
        // Calculate next reminder date
        const nextDate = await this.reminderService.calculateNextReminderDate({
          isRecurring: reminder.isRecurring,
          recurringPattern: reminder.recurringPattern,
          dueDate: reminder.dueDate,
          completedDate: reminder.completedDate,
          recurringWeekDay: reminder.recurringWeekDay,
          recurringDayOfMonth: reminder.recurringDayOfMonth,
          recurringMonth: reminder.recurringMonth,
          yearlyRecurringType: reminder.yearlyRecurringType,
          specialOccasion: reminder.specialOccasion
        });
        if (nextDate) {
          reminder.nextReminderDate = nextDate;
          await reminder.save();
          this.ui.info('התזכורת הבאה נקבעה');
          await this.loadReminders();
        }
      } else {
        // For non-recurring reminders, just complete them
        await reminder.complete();
        this.ui.info('התזכורת סומנה כנראתה');
        await this.loadReminders();
      }
    } catch (error) {
      console.error('Error marking reminder as seen:', error);
      this.ui.error('שגיאה בסימון התזכורת כנראתה');
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
