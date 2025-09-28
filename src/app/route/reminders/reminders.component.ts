import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Reminder, Donor } from '../../../shared/entity';
import { I18nService } from '../../i18n/i18n.service';
import { ReminderDetailsModalComponent } from '../../routes/modals/reminder-details-modal/reminder-details-modal.component';

@Component({
  selector: 'app-reminders',
  templateUrl: './reminders.component.html',
  styleUrls: ['./reminders.component.scss']
})
export class RemindersComponent implements OnInit {

  reminders: Reminder[] = [];
  donors: Donor[] = [];
  
  reminderRepo = remult.repo(Reminder);
  donorRepo = remult.repo(Donor);
  
  loading = false;
  showAddReminderModal = false;
  editingReminder?: Reminder;

  constructor(public i18n: I18nService) { }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadReminders(),
        this.loadDonors()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadReminders() {
    this.reminders = await this.reminderRepo.find({
      orderBy: { dueDate: 'asc' },
      include: {
        relatedDonor: true
      }
    });
  }

  async loadDonors() {
    this.donors = await this.donorRepo.find({
      where: { isActive: true },
      orderBy: { lastName: 'asc' }
    });
  }

  async createReminder() {
    const reminderCreated = await ReminderDetailsModalComponent.open({
      reminderId: 'new'
    });

    if (reminderCreated) {
      await this.loadData(); // Refresh the list
    }
  }

  async editReminder(reminder: Reminder) {
    const reminderEdited = await ReminderDetailsModalComponent.open({
      reminderId: reminder.id
    });

    if (reminderEdited) {
      await this.loadData(); // Refresh the list
    }
  }

  async saveReminder() {
    if (!this.editingReminder) return;

    try {
      await this.editingReminder.save();
      await this.loadReminders();
      this.closeModal();
    } catch (error) {
      console.error('Error saving reminder:', error);
    }
  }

  async deleteReminder(reminder: Reminder) {
    const donorName = reminder.relatedDonor?.displayName || this.i18n.terms.unknown;
    if (confirm(`${this.i18n.terms.confirmDeleteDonor?.replace('{name}', reminder.title || '')}`)) {
      try {
        await reminder.delete();
        await this.loadReminders();
      } catch (error) {
        console.error('Error deleting reminder:', error);
      }
    }
  }

  async completeReminder(reminder: Reminder) {
    try {
      await reminder.complete();
      await this.loadReminders();
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  }

  async snoozeReminder(reminder: Reminder, days: number) {
    try {
      await reminder.snooze(days);
      await this.loadReminders();
    } catch (error) {
      console.error('Error snoozing reminder:', error);
    }
  }

  closeModal() {
    this.showAddReminderModal = false;
    this.editingReminder = undefined;
  }

  getDonorName(reminder: Reminder): string {
    return reminder.relatedDonor?.displayName || this.i18n.terms.generalType;
  }

  getTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      'donation_followup': this.i18n.terms.donationFollowUp,
      'thank_you': this.i18n.terms.thankYouReminder,
      'birthday': this.i18n.terms.birthdayType,
      'memorial': this.i18n.terms.memorialType,
      'meeting': this.i18n.terms.meetingType,
      'phone_call': this.i18n.terms.phoneCallType,
      'email': this.i18n.terms.emailType,
      'general': this.i18n.terms.generalType
    };
    return typeMap[type] || type;
  }

  getPriorityText(priority: string): string {
    const priorityMap: Record<string, string> = {
      'low': this.i18n.terms.lowPriority,
      'normal': this.i18n.terms.normalPriority,
      'high': this.i18n.terms.highPriority,
      'urgent': this.i18n.terms.urgentPriority
    };
    return priorityMap[priority] || priority;
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': this.i18n.terms.pendingStatus,
      'completed': this.i18n.terms.completedStatusReminder,
      'snoozed': this.i18n.terms.overdueStatus
    };
    return statusMap[status] || status;
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'low': return 'priority-low';
      case 'normal': return 'priority-normal';
      case 'high': return 'priority-high';
      case 'urgent': return 'priority-urgent';
      default: return 'priority-normal';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'completed': return 'status-completed';
      case 'snoozed': return 'status-snoozed';
      default: return 'status-default';
    }
  }

  get pendingReminders(): Reminder[] {
    return this.reminders.filter(r => !r.isCompleted);
  }

  get overdueReminders(): Reminder[] {
    return this.reminders.filter(r => r.isOverdue);
  }

  get todayReminders(): Reminder[] {
    return this.reminders.filter(r => r.isDueToday);
  }

  get upcomingBirthdays(): Donor[] {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    return this.donors.filter(donor => {
      if (!donor.birthDate) return false;
      const thisYearBirthday = new Date(today.getFullYear(), donor.birthDate.getMonth(), donor.birthDate.getDate());
      return thisYearBirthday >= today && thisYearBirthday <= nextWeek;
    });
  }

  get donationCandidates(): Donor[] {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // This would need to be implemented with actual donation data
    // For now returning empty array as we'd need to join with donations
    return [];
  }

  get upcomingMeetings(): Reminder[] {
    return this.reminders.filter(r => r.type === 'meeting' && !r.isCompleted);
  }

  get completedRemindersCount(): number {
    return this.reminders.filter(r => r.isCompleted).length;
  }


}