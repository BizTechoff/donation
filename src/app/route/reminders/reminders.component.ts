import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Reminder, Donor } from '../../../shared/entity';

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
    this.editingReminder = this.reminderRepo.create();
    this.showAddReminderModal = true;
  }

  async editReminder(reminder: Reminder) {
    this.editingReminder = reminder;
    this.showAddReminderModal = true;
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
    const donorName = reminder.relatedDonor?.displayName || 'לא ידוע';
    if (confirm(`האם אתה בטוח שברצונך למחוק את התזכורת "${reminder.title}"?`)) {
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
    return reminder.relatedDonor?.displayName || 'כללי';
  }

  getTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      'donation_followup': 'מעקב תרומה',
      'thank_you': 'תודה',
      'birthday': 'יום הולדת',
      'memorial': 'יום זיכרון',
      'meeting': 'פגישה',
      'phone_call': 'שיחת טלפון',
      'email': 'אימייל',
      'general': 'כללי'
    };
    return typeMap[type] || type;
  }

  getPriorityText(priority: string): string {
    const priorityMap: Record<string, string> = {
      'low': 'נמוכה',
      'normal': 'רגילה',
      'high': 'גבוהה',
      'urgent': 'דחופה'
    };
    return priorityMap[priority] || priority;
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'ממתין',
      'completed': 'הושלם',
      'snoozed': 'נדחה'
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

  constructor() { }

}