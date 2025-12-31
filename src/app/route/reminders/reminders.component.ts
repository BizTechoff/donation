import { Component, OnDestroy, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Subscription } from 'rxjs';
import { Donor, Reminder, User } from '../../../shared/entity';
import { DialogConfig } from '../../common-ui-elements';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { ReminderCompleteModalComponent } from '../../routes/modals/reminder-complete-modal/reminder-complete-modal.component';
import { DonorService } from '../../services/donor.service';
import { GlobalFilterService } from '../../services/global-filter.service';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { ReminderService } from '../../services/reminder.service';

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
  filteredReminders: Reminder[] = [];
  loading = false;

  // Remult repo
  reminderRepo = remult.repo(Reminder);

  // Expose Math to template
  Math = Math;

  // Maps for donor-related data
  donorPhoneMap = new Map<string, string>();
  donorCountryIdMap = new Map<string, string>();

  // Local filter properties
  searchTerm = '';
  filterDateFrom: Date | null = null;
  filterDateTo: Date | null = null;
  filterReminderType = '';
  filterDonorSearch = '';

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;

  // Sorting
  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];
  private currentUser?: User;

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

  activeTab: 'today' | 'week' | 'overdue' | 'all' = 'all';

  private filterSubscription?: Subscription;
  private searchTermTimeout: any;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private globalFilterService: GlobalFilterService,
    private donorService: DonorService,
    private reminderService: ReminderService,
    private hebrewDateService: HebrewDateService
  ) { }

  async ngOnInit() {
    // Load base data once
    await this.loadBase();

    // Initial data load
    await this.refreshData();
  }

  /**
   * Load base data once - called only on component initialization
   */
  private async loadBase() {
    // Load current user and their settings
    await this.loadUserSettings();

    // Subscribe to global filter changes
    this.filterSubscription = this.globalFilterService.filters$.subscribe(() => {
      this.refreshData();
    });
  }

  /**
   * Refresh data based on current filters and sorting
   * Called whenever filters or sorting changes
   */
  private async refreshData() {
    await this.loadReminders();
  }

  ngOnDestroy() {
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
    if (this.searchTermTimeout) {
      clearTimeout(this.searchTermTimeout);
    }
  }

  // Summary stats
  todayCount = 0;
  pendingCountStat = 0;
  overdueCountStat = 0;
  completedThisMonthCountStat = 0;

  async loadReminders() {
    this.loading = true;
    try {
      // Build filters (local filters only)
      // Global filters are fetched from user.settings in the backend
      const filters: any = {};

      if (this.filterDateFrom) {
        filters.dateFrom = this.filterDateFrom;
      }
      if (this.filterDateTo) {
        filters.dateTo = this.filterDateTo;
      }
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        filters.searchTerm = this.searchTerm;
      }
      if (this.filterReminderType && this.filterReminderType.trim() !== '') {
        filters.reminderType = this.filterReminderType;
      }
      if (this.filterDonorSearch && this.filterDonorSearch.trim() !== '') {
        filters.donorSearch = this.filterDonorSearch;
      }

      // Get total count, summary stats, and reminders from server
      const [count, summary, reminders] = await Promise.all([
        this.reminderService.countFiltered(filters),
        this.reminderService.getSummary(filters),
        this.reminderService.findFiltered(filters, this.currentPage, this.pageSize, this.sortColumns)
      ]);

      this.totalCount = count;
      this.todayCount = summary.todayCount;
      this.pendingCountStat = summary.pendingCount;
      this.overdueCountStat = summary.overdueCount;
      this.completedThisMonthCountStat = summary.completedThisMonthCount;
      this.reminders = reminders;
      this.totalPages = Math.ceil(this.totalCount / this.pageSize);

      // Load phone data for related donors
      const donorIds = this.reminders
        .filter(r => r.donor?.id)
        .map(r => r.donor!.id);

      if (donorIds.length > 0) {
        const relatedData = await this.donorService.loadDonorRelatedData(donorIds);
        this.donorPhoneMap = relatedData.donorPhoneMap;
        this.donorCountryIdMap = relatedData.donorCountryIdMap;
      }

      // Initialize filteredReminders
      this.filteredReminders = [...this.reminders];

      // Apply local filters (tabs, parasha)
      this.applyLocalFilters();

    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      this.loading = false;
    }
  }

  applyLocalFilters() {
    let filtered = [...this.reminders];

    // Apply tab filter
    switch (this.activeTab) {
      case 'today':
        filtered = filtered.filter(r => r.isDueToday && !r.isCompleted);
        break;
      case 'week':
        const today = new Date();
        const oneWeekFromNow = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        filtered = filtered.filter(r =>
          !r.isCompleted &&
          r.dueDate >= today &&
          r.dueDate <= oneWeekFromNow
        );
        break;
      case 'overdue':
        filtered = filtered.filter(r => r.isOverdue);
        break;
      case 'all':
      default:
        // No additional filter
        break;
    }

    this.filteredReminders = filtered;
  }

  onLocalFilterChange() {
    // Reset to page 1 when filter changes
    this.currentPage = 1;
    this.loadReminders();

    // Debounce save searchTerm
    if (this.searchTermTimeout) {
      clearTimeout(this.searchTermTimeout);
    }
    this.searchTermTimeout = setTimeout(() => {
      this.saveSearchTerm();
    }, 500);
  }

  async createReminder() {
    const reminderCreated = await this.ui.reminderDetailsDialog('new', {
      hideDonorField: false // Show donor field when creating from reminders list
    });
    if (reminderCreated) {
      await this.loadReminders();
    }
  }

  async editReminder(reminder: Reminder) {
    const reminderEdited = await this.ui.reminderDetailsDialog(reminder.id);
    if (reminderEdited) {
      await this.loadReminders();
    }
  }

  async deleteReminder(reminder: Reminder) {
    const donorName = reminder.donor?.lastAndFirstName
    const yes = await this.ui.yesNoQuestion(`${this.i18n.terms.confirmDeleteDonor?.replace('{name}', reminder.title || '')}`)
    if (yes) {
      try {
        // No need to clean up source entity link - we use forward reference only
        await reminder.delete();
        await this.loadReminders();
      } catch (error) {
        console.error('Error deleting reminder:', error);
      }
    }
  }

  async completeReminder(reminder: Reminder) {
    try {
      // Open the complete modal
      const option = await ReminderCompleteModalComponent.open(reminder.isRecurring, reminder.title);
      if (!option) {
        return; // User cancelled
      }

      // Reload the reminder from the server to get the full entity with methods
      const fullReminder = await this.reminderRepo.findId(reminder.id);
      if (!fullReminder) {
        console.error('Reminder not found');
        return;
      }

      // Handle based on selected option
      if (option === 'completeAndRemindNext') {
        // For recurring: move to next occurrence
        await fullReminder.complete();
      } else {
        // completeFinal: mark as completed permanently
        await fullReminder.complete(undefined, true);
      }

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
    return reminder.donor?.lastAndFirstName || ''
  }

  getReminderDonorPhone(reminder: Reminder): string {
    return reminder.donor?.id ? this.donorPhoneMap.get(reminder.donor.id) || '' : '';
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

  getSourceText(reminder: Reminder): string {
    if (!reminder.sourceEntityType) {
      return 'ידנית';
    }

    switch (reminder.sourceEntityType) {
      case 'donation': return 'תרומה';
      case 'certificate': return 'תעודה';
      case 'donor_gift': return 'מתנה';
      case 'donor_event': return 'אירוע';
      default: return 'ידנית';
    }
  }

  getSourceIcon(reminder: Reminder): string {
    if (!reminder.sourceEntityType) {
      return '✍️';  // Manual/pen icon
    }

    switch (reminder.sourceEntityType) {
      case 'donation': return '💰';  // Money bag for donation
      case 'certificate': return '📜';  // Scroll for certificate
      case 'donor_gift': return '🎁';  // Gift box for donor_gift
      case 'donor_event': return '📅';  // Calendar for donor_event
      default: return '✍️';
    }
  }

  get pendingReminders(): { length: number } {
    // Return object with length property from server stats
    return { length: this.pendingCountStat };
  }

  get overdueReminders(): { length: number } {
    // Return object with length property from server stats
    return { length: this.overdueCountStat };
  }

  get todayReminders(): { length: number } {
    // Return object with length property from server stats
    return { length: this.todayCount };
  }

  get upcomingBirthdays(): Donor[] {
    // This would need to be implemented with donor birthdate data
    // For now returning empty array
    return [];
  }

  get donationCandidates(): Donor[] {
    // This would need to be implemented with actual donation data
    // For now returning empty array as we'd need to join with donations
    return [];
  }

  get upcomingMeetings(): Reminder[] {
    return this.reminders.filter(r => r.type === 'meeting' && !r.isCompleted);
  }

  get completedRemindersCount(): number {
    // Return from server stats
    return this.completedThisMonthCountStat;
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
    this.applyLocalFilters();
  }

  applyParashaFilter() {
    this.applyLocalFilters();
  }

  /**
   * Calculate parasha index for a date using Hebrew calendar
   */
  protected async getParashaIndex(date: Date): Promise<number> {
    if (!date) return 0;

    try {
      // Get the Saturday of the week containing this date
      const dayOfWeek = date.getDay();
      let daysUntilSaturday = (6 - dayOfWeek) % 7;
      if (daysUntilSaturday < 0) daysUntilSaturday += 7;

      const saturday = new Date(date);
      saturday.setDate(date.getDate() + daysUntilSaturday);

      // Get the parsha for that Saturday using the service
      const parshaName = await this.hebrewDateService.getParshaForDate(saturday, false);

      if (parshaName) {
        // parshaName might be in English or Hebrew, depending on hebcal's output

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

        // Try to get Hebrew name from map, or use the name directly if already in Hebrew
        const hebrewName = englishToHebrewMap[parshaName] || parshaName;
        // console.log('Parsha name:', parshaName, 'Hebrew:', hebrewName);

        if (hebrewName) {
          const index = this.torahPortions.indexOf(hebrewName);
          // console.log('Index found:', index);
          return index >= 0 ? index : 0;
        }
      }

      return 0;
    } catch (error) {
      console.error('Error calculating parasha index:', error, date);
      return 0;
    }
  }

  // Pagination methods
  async goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      await this.refreshData();
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.refreshData();
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.refreshData();
    }
  }

  async firstPage() {
    this.currentPage = 1;
    await this.refreshData();
  }

  async lastPage() {
    this.currentPage = this.totalPages;
    await this.refreshData();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfWindow = Math.floor(maxPagesToShow / 2);
      let startPage = Math.max(1, this.currentPage - halfWindow);
      let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  // Sorting methods
  async loadUserSettings() {
    try {
      const userRepo = remult.repo(User);
      const userId = remult.user?.id;
      if (userId) {
        const user = await userRepo.findId(userId);
        if (user) {
          this.currentUser = user;
          // Load saved sort settings
          if (this.currentUser?.settings?.reminderList?.sort) {
            this.sortColumns = this.currentUser.settings.reminderList.sort;
          }
          // Load saved search term
          if (this.currentUser?.settings?.reminderList?.searchTerm !== undefined) {
            this.searchTerm = this.currentUser.settings.reminderList.searchTerm;
          }
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  }

  async saveSortSettings() {
    if (!this.currentUser) return;

    try {
      if (!this.currentUser.settings) {
        this.currentUser.settings = {} as any;
      }
      if (this.currentUser.settings && !this.currentUser.settings.reminderList) {
        this.currentUser.settings.reminderList = {};
      }
      if (this.currentUser.settings && this.currentUser.settings.reminderList) {
        this.currentUser.settings.reminderList.sort = this.sortColumns;
      }

      await remult.repo(User).save(this.currentUser);
    } catch (error) {
      console.error('Error saving sort settings:', error);
    }
  }

  async saveSearchTerm() {
    if (!this.currentUser) return;

    try {
      if (!this.currentUser.settings) {
        this.currentUser.settings = {} as any;
      }
      if (this.currentUser.settings && !this.currentUser.settings.reminderList) {
        this.currentUser.settings.reminderList = {};
      }
      if (this.currentUser.settings && this.currentUser.settings.reminderList) {
        this.currentUser.settings.reminderList.searchTerm = this.searchTerm;
      }

      await remult.repo(User).save(this.currentUser);
    } catch (error) {
      console.error('Error saving search term:', error);
    }
  }

  async toggleSort(field: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
      // CTRL/CMD pressed - multi-column sort
      const existingIndex = this.sortColumns.findIndex(s => s.field === field);
      if (existingIndex >= 0) {
        const current = this.sortColumns[existingIndex];
        if (current.direction === 'asc') {
          this.sortColumns[existingIndex].direction = 'desc';
        } else {
          this.sortColumns.splice(existingIndex, 1);
        }
      } else {
        this.sortColumns.push({ field, direction: 'asc' });
      }
    } else {
      // Single column sort
      const existing = this.sortColumns.find(s => s.field === field);
      if (existing && this.sortColumns.length === 1) {
        existing.direction = existing.direction === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortColumns = [{ field, direction: 'asc' }];
      }
    }

    // Reload from server with new sort
    await this.refreshData();
    this.saveSortSettings();
  }

  getSortIcon(field: string): string {
    const sortIndex = this.sortColumns.findIndex(s => s.field === field);
    if (sortIndex === -1) return '';

    const sort = this.sortColumns[sortIndex];
    const arrow = sort.direction === 'asc' ? '↑' : '↓';

    if (this.sortColumns.length > 1) {
      return `${arrow}${sortIndex + 1}`;
    }
    return arrow;
  }

  isSorted(field: string): boolean {
    return this.sortColumns.some(s => s.field === field);
  }

  formatHebrewDate(date: Date | undefined): string {
    if (!date) return '-';
    try {
      const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(date));
      return hebrewDate.formatted;
    } catch (error) {
      console.error('Error formatting Hebrew date:', error);
      return '-';
    }
  }

  getMoedName(date: Date | undefined): string {
    if (!date) return '';
    try {
      const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(date));
      return hebrewDate.moed || '';
    } catch (error) {
      console.error('Error getting moed name:', error);
      return '';
    }
  }

}