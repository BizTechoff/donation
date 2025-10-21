import { Component, OnInit, OnDestroy } from '@angular/core';
import { remult } from 'remult';
import { Reminder, Donor } from '../../../shared/entity';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';
import { GlobalFilterService } from '../../services/global-filter.service';
import { Subscription } from 'rxjs';
import { HDate, HebrewCalendar, ParshaEvent, Sedra } from '@hebcal/core';
import { DialogConfig } from '../../common-ui-elements';

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-reminders',
  templateUrl: './reminders.component.html',
  styleUrls: ['./reminders.component.scss']
})
export class RemindersComponent implements OnInit, OnDestroy {

  reminders: Reminder[] = [];
  donors: Donor[] = [];
  filteredReminders: Reminder[] = [];

  reminderRepo = remult.repo(Reminder);
  donorRepo = remult.repo(Donor);

  loading = false;
  activeTab: 'today' | 'week' | 'overdue' | 'all' = 'all';

  // Parasha filter
  fromParasha: string = '';
  toParasha: string = '';

  torahPortions = [
    'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ', 'ויגש', 'ויחי',
    'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה', 'כי תשא', 'ויקהל', 'פקודי',
    'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות', 'קדושים', 'אמור', 'בהר', 'בחוקותי',
    'במדבר', 'נשא', 'בהעלותך', 'שלח', 'קרח', 'חוקת', 'בלק', 'פנחס', 'מטות', 'מסעי',
    'דברים', 'ואתחנן', 'עקב', 'ראה', 'שופטים', 'כי תצא', 'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'
  ];

  private filterSubscription?: Subscription;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private globalFilterService: GlobalFilterService
  ) { }

  async ngOnInit() {
    await this.loadData();

    // Subscribe to global filter changes
    this.filterSubscription = this.globalFilterService.filters$.subscribe(() => {
      this.applyGlobalFilters();
    });
  }

  ngOnDestroy() {
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
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
      orderBy: { dueDate: 'asc', dueTime: 'asc' },
      include: {
        relatedDonor: true
      }
    });
    this.applyGlobalFilters();
  }

  applyGlobalFilters() {
    const filters = this.globalFilterService.currentFilters;
    let filtered = [...this.reminders];

    // Apply country filter - filter by donor's country ID
    if (filters.countryIds && filters.countryIds.length > 0) {
      filtered = filtered.filter(reminder =>
        reminder.relatedDonor?.countryId &&
        filters.countryIds!.includes(reminder.relatedDonor.countryId)
      );
    }

    this.reminders = filtered;
    this.applyTabFilter();
  }

  async loadDonors() {
    this.donors = await this.donorRepo.find({
      where: { isActive: true },
      orderBy: { lastName: 'asc' }
    });
  }

  async createReminder() {
    const reminderCreated = await this.ui.reminderDetailsDialog('new');

    if (reminderCreated) {
      await this.loadData(); // Refresh the list
    }
  }

  async editReminder(reminder: Reminder) {
    const reminderEdited = await this.ui.reminderDetailsDialog(reminder.id);

    if (reminderEdited) {
      await this.loadData(); // Refresh the list
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

  get thisWeekReminders(): Reminder[] {
    const today = new Date();
    const oneWeekFromNow = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
    return this.reminders.filter(r =>
      !r.isCompleted &&
      r.dueDate >= today &&
      r.dueDate <= oneWeekFromNow
    );
  }

  switchTab(tab: 'today' | 'week' | 'overdue' | 'all') {
    this.activeTab = tab;
    this.applyTabFilter();
  }

  applyTabFilter() {
    let filtered = [...this.reminders];

    // Apply tab filter
    switch (this.activeTab) {
      case 'today':
        filtered = filtered.filter(r => r.isDueToday && !r.isCompleted);
        break;
      case 'week':
        filtered = this.thisWeekReminders;
        break;
      case 'overdue':
        filtered = this.overdueReminders;
        break;
      case 'all':
      default:
        // No additional filter
        break;
    }

    // Apply parasha filter
    if (this.fromParasha !== '' || this.toParasha !== '') {
      filtered = this.filterByParasha(filtered);
    }

    this.filteredReminders = filtered;
  }

  applyParashaFilter() {
    this.applyTabFilter();
  }

  /**
   * Calculate parasha index for a date using Hebrew calendar
   */
  protected getParashaIndex(date: Date): number {
    if (!date) return 0;

    try {
      // Get the Saturday of the week containing this date
      const dayOfWeek = date.getDay();
      let daysUntilSaturday = (6 - dayOfWeek) % 7;
      if (daysUntilSaturday < 0) daysUntilSaturday += 7;

      const saturday = new Date(date);
      saturday.setDate(date.getDate() + daysUntilSaturday);

      // Convert Saturday to Hebrew date
      const hSaturday = new HDate(saturday);
      const hyear = hSaturday.getFullYear();

      // Create Sedra for that year
      const sedra = new Sedra(hyear, false); // false = diaspora

      // Get the parsha for that Saturday
      const parsha = sedra.get(hSaturday);

      console.log('Date:', date, 'Saturday:', saturday, 'Parsha:', parsha);

      if (parsha && parsha.length > 0) {
        // parsha is an array of parsha names (in English)
        const parshaEnglish = parsha[0];

        // Map English parsha names to Hebrew
        const englishToHebrewMap: { [key: string]: string } = {
          'Bereshit': 'בראשית',
          'Noach': 'נח',
          'Lech-Lecha': 'לך לך',
          'Vayera': 'וירא',
          'Chayei Sara': 'חיי שרה',
          'Toldot': 'תולדות',
          'Vayetzei': 'ויצא',
          'Vayishlach': 'וישלח',
          'Vayeshev': 'וישב',
          'Miketz': 'מקץ',
          'Vayigash': 'ויגש',
          'Vayechi': 'ויחי',
          'Shemot': 'שמות',
          'Vaera': 'וארא',
          'Bo': 'בא',
          'Beshalach': 'בשלח',
          'Yitro': 'יתרו',
          'Mishpatim': 'משפטים',
          'Terumah': 'תרומה',
          'Tetzaveh': 'תצוה',
          'Ki Tisa': 'כי תשא',
          'Vayakhel': 'ויקהל',
          'Pekudei': 'פקודי',
          'Vayikra': 'ויקרא',
          'Tzav': 'צו',
          'Shmini': 'שמיני',
          'Tazria': 'תזריע',
          'Metzora': 'מצורע',
          'Achrei Mot': 'אחרי מות',
          'Kedoshim': 'קדושים',
          'Emor': 'אמור',
          'Behar': 'בהר',
          'Bechukotai': 'בחוקותי',
          'Bamidbar': 'במדבר',
          'Nasso': 'נשא',
          'Beha\'alotcha': 'בהעלותך',
          'Sh\'lach': 'שלח',
          'Korach': 'קרח',
          'Chukat': 'חוקת',
          'Balak': 'בלק',
          'Pinchas': 'פנחס',
          'Matot': 'מטות',
          'Masei': 'מסעי',
          'Devarim': 'דברים',
          'Vaetchanan': 'ואתחנן',
          'Eikev': 'עקב',
          'Re\'eh': 'ראה',
          'Shoftim': 'שופטים',
          'Ki Teitzei': 'כי תצא',
          'Ki Tavo': 'כי תבוא',
          'Nitzavim': 'נצבים',
          'Vayeilech': 'וילך',
          'Ha\'Azinu': 'האזינו',
          'Vezot Haberakhah': 'וזאת הברכה'
        };

        const hebrewName = englishToHebrewMap[parshaEnglish];
        console.log('English:', parshaEnglish, 'Hebrew:', hebrewName);

        if (hebrewName) {
          const index = this.torahPortions.indexOf(hebrewName);
          console.log('Index found:', index);
          return index >= 0 ? index : 0;
        }
      }

      return 0;
    } catch (error) {
      console.error('Error calculating parasha index:', error, date);
      return 0;
    }
  }

  private filterByParasha(reminders: Reminder[]): Reminder[] {
    const fromIndex = this.fromParasha !== '' ? parseInt(this.fromParasha) : 0;
    const toIndex = this.toParasha !== '' ? parseInt(this.toParasha) : 53;

    return reminders.filter(reminder => {
      const parashaIndex = this.getParashaIndex(reminder.dueDate);
      return parashaIndex >= fromIndex && parashaIndex <= toIndex;
    });
  }

}