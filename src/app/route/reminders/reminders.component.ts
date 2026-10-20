import { inject, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UserSettingsService } from '../../services/user-settings.service';
import { remult } from 'remult';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Donor, Reminder, User } from '../../../shared/entity';
import { ContactPerson } from '../../../shared/entity/contact-person';
import { DialogConfig } from '../../common-ui-elements';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { ReminderCompleteModalComponent } from '../../routes/modals/reminder-complete-modal/reminder-complete-modal.component';
import { DonorService } from '../../services/donor.service';
import { GlobalFilterService } from '../../services/global-filter.service';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { ReminderService } from '../../services/reminder.service';
import { PrintService } from '../../services/print.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { BusyService } from '../../common-ui-elements/src/angular/wait/busy-service';
import { DonorController } from '../../../shared/controllers/donor.controller';
import { DonorMapController } from '../../../shared/controllers/donor-map.controller';
import { TableState, TableLoadRequest } from '../../common/table/table-state';
import { REMINDER_TYPE_LABELS, REMINDER_SOURCE_LABELS, REMINDER_SOURCE_MANUAL } from '../../../shared/enum/reminder-type';

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-reminders',
  templateUrl: './reminders.component.html',
  styleUrls: ['./reminders.component.scss']
})
export class RemindersComponent implements OnInit, OnDestroy {
  /** Item 33 - the one writer of user.settings. */
  private userSettings = inject(UserSettingsService);


  // P1 - the summary block is hidden per client request. Flip to true to restore.

  showSummary = false;


  reminders: Reminder[] = [];
  loading = false;

  // Remult repo
  reminderRepo = remult.repo(Reminder);

  // Expose Math to template

  // Maps for donor-related data
  donorPhoneMap = new Map<string, string>();
  donorMobileMap = new Map<string, string>(); // item 18
  donorCountryIdMap = new Map<string, string>();

  // Local filter properties
  searchTerm = '';
  filterDateFrom: Date | null = null;
  filterDateTo: Date | null = null;
  filterReminderType = '';
  filterDonorSearch = '';
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  // Scrollable content handle - reset to top on each data refresh so paging
  // does not leave the user mid-page (Israel Glikson, 1.7.2026).
  // Note: in reminders the scrollable area is .module-content (not .table-body).
  @ViewChild('scrollableTable') scrollableTable?: ElementRef<HTMLElement>;

  // Pagination
  // P5 - sorting and paging come from the shared TableState. 'donor' is ordered
  // in SQL through the donorName sqlExpression on Reminder (see
  // reminder.controller), which is what gives the donor column a sort at all.
  readonly table = new TableState({
    pageSize: 50,
    settingsKey: 'reminderList',
    sortableFields: ['dueDate', 'type', 'source', 'donor', 'title', 'priority', 'isCompleted'],
    scrollContainer: () => this.scrollableTable?.nativeElement,
    load: req => this.loadReminders(req)
  });

  // Sorting
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
  private donorSearchSubject = new Subject<string>();

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private globalFilterService: GlobalFilterService,
    private donorService: DonorService,
    private reminderService: ReminderService,
    private hebrewDateService: HebrewDateService,
    private printService: PrintService,
    private excelExportService: ExcelExportService,
    private busy: BusyService
  ) { }

  async ngOnInit() {
    // Load base data once
    await this.loadBase();

    // Saved sort first, then the first fetch - so the very first request
    // already carries the user's persisted sort (same order as donor-list).
    await this.table.loadSettings();
    await this.table.reload();
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

    // Debounce donor search: 800ms (was 300 - too fast for slow typists);
    // skip if input has 1 char only (too many matches, slows the experience).
    this.donorSearchSubject.pipe(
      debounceTime(800),
      distinctUntilChanged()
    ).subscribe(async (text) => {
      const trimmed = (text || '').trim();
      if (trimmed.length > 0 && trimmed.length < 2) return;
      await this.table.reloadFromFirstPage();
      this.restoreSearchFocus();
    });
  }

  private restoreSearchFocus() {
    setTimeout(() => {
      const native = this.searchInput?.nativeElement;
      if (!native) return;
      const active = document.activeElement;
      const isInputAlready = active === native;
      const isOtherInteractive = active && (
        active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT'
      ) && active !== native;
      if (!isInputAlready && !isOtherInteractive) {
        native.focus();
        const len = native.value?.length ?? 0;
        try { native.setSelectionRange(len, len); } catch {}
      }
    }, 150);
  }

  /**
   * Refresh data based on current filters and sorting
   * Called whenever filters or sorting changes
   */
  async refreshData() {
    await this.table.reload();
  }

  /** Fetches one page. TableState owns page/pageSize/sort and the scroll reset. */
  /**
   * The filters exactly as the server expects them - built in ONE place.
   *
   * This block used to be copied three times: once for the screen, once for
   * print and once for export. The copies drifted, which is how the tab
   * (היום / השבוע / באיחור) ended up applied on screen but missing from both
   * print and export - Yaakov would stand on "היום", see four reminders, press
   * print and get all of them.
   */
  private buildFilters(): any {
    const filters: any = {};
    if (this.filterDateFrom) filters.dateFrom = this.filterDateFrom;
    if (this.filterDateTo) filters.dateTo = this.filterDateTo;
    if (this.searchTerm?.trim()) filters.searchTerm = this.searchTerm;
    if (this.filterReminderType?.trim()) filters.reminderType = this.filterReminderType;
    if (this.filterDonorSearch?.trim()) filters.donorSearch = this.filterDonorSearch;
    // The tab is a filter like the rest, and the server applies it - so paging,
    // the total count, print and export all agree with what is on screen.
    filters.tab = this.activeTab;
    return filters;
  }

  private async loadReminders(req: TableLoadRequest) {
    this.loading = true;
    try {
      const filters = this.buildFilters();

      // Get count, summary stats, and reminders in a single server round-trip
      const { count, summary, reminders } = await this.reminderService.getRemindersData(
        filters, req.page, req.pageSize, req.sort
      );

      this.table.totalCount = count;
      this.todayCount = summary.todayCount;
      this.pendingCountStat = summary.pendingCount;
      this.overdueCountStat = summary.overdueCount;
      this.completedThisMonthCountStat = summary.completedThisMonthCount;
      this.reminders = reminders;

      // Load phone data for related donors
      const donorIds = this.reminders
        .filter(r => r.donor?.id)
        .map(r => r.donor!.id);

      if (donorIds.length > 0) {
        const relatedData = await this.donorService.loadDonorRelatedData(donorIds);
        this.donorPhoneMap = relatedData.donorPhoneMap;
        this.donorMobileMap = relatedData.donorMobileMap;
        this.donorCountryIdMap = relatedData.donorCountryIdMap;
      }


    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
    this.donorSearchSubject.complete();
  }

  // Summary stats
  todayCount = 0;
  pendingCountStat = 0;
  overdueCountStat = 0;
  completedThisMonthCountStat = 0;

  // The tabs are applied by the SERVER now (reminder.controller buildWhereClause).
  // applyLocalFilters used to filter this.reminders - one page - so a reminder
  // due today on page 3 never showed under "היום", and the count in the footer
  // ignored the tab entirely.


  onLocalFilterChange() {
    // A filter changes the result set - back to page 1, not just a reload of
    // whatever page the user happened to be on.
    this.table.reloadFromFirstPage();
  }

  onDonorSearchChange(text: string) {
    this.donorSearchSubject.next(text);
  }

  async createReminder() {
    const reminderCreated = await this.ui.reminderDetailsDialog('new', {
      hideDonorField: false // Show donor field when creating from reminders list
    });
    if (reminderCreated) {
      await this.refreshData();
    }
  }

  async editReminder(reminder: Reminder) {
    const reminderEdited = await this.ui.reminderDetailsDialog(reminder.id);
    if (reminderEdited) {
      await this.refreshData();
    }
  }

  async deleteReminder(reminder: Reminder) {
    const yes = await this.ui.yesNoQuestion(`${this.i18n.currentTerms.confirmDeleteDonor?.replace('{name}', reminder.title || '')}`)
    if (yes) {
      try {
        // No need to clean up source entity link - we use forward reference only
        await remult.repo(Reminder).delete(reminder);
        await this.refreshData();
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

      await this.refreshData();
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  }

  async snoozeReminder(reminder: Reminder, days: number) {
    try {
      await reminder.snooze(days);
      await this.refreshData();
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

  getReminderDonorMobile(reminder: Reminder): string {
    return reminder.donor?.id ? this.donorMobileMap.get(reminder.donor.id) || '' : '';
  }
  
getTypeText(type: string): string {
  // The Hebrew label falls back to shared/enum/reminder-type.ts, which is the
  // SAME map the typeLabel sqlExpression sorts by - so what is displayed and
  // what is ordered can never drift. i18n still wins when a term exists, so
  // the display stays translatable.
  const translated: Record<string, string | undefined> = {
    'donation_followup': this.i18n.terms.donationFollowUp,
    'thank_you': this.i18n.terms.thankYouLetter,
    'receipt': this.i18n.terms.receipt,
    'birthday': this.i18n.terms.birthdayType,
    'holiday': this.i18n.terms.holiday,
    'general': this.i18n.terms.generalType,
    'meeting': this.i18n.terms.meetingType,
    'phone_call': this.i18n.terms.phoneCallType,
    'gift': this.i18n.terms.giftReminderType,
    'memorialDay': this.i18n.terms.memorialDayType,
    'memorial': this.i18n.terms.memorialMonumentType,
    'yahrzeit': this.i18n.terms.yahrzeitType
  };
  return translated[type] || REMINDER_TYPE_LABELS[type] || type;
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
    // Reads the shared map that the sourceLabel sqlExpression is built from -
    // one list, so the column sorts by exactly what it displays.
    if (!reminder.sourceEntityType) return REMINDER_SOURCE_MANUAL;
    return REMINDER_SOURCE_LABELS[reminder.sourceEntityType] || REMINDER_SOURCE_MANUAL;
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
    // The tab changes the RESULT SET, so it goes back to the server and back to
    // page 1 - the same as any other filter.
    this.table.reloadFromFirstPage();
  }

  applyParashaFilter() {
    this.table.reloadFromFirstPage();
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

  // Sorting and paging live in `table` (TableState) - another drifted copy
  // removed (P5).

  async loadUserSettings() {
    try {
      const userRepo = remult.repo(User);
      const userId = remult.user?.id;
      if (userId) {
        const user = await userRepo.findId(userId);
        if (user) {
          this.currentUser = user;
          // the saved sort is loaded by TableState (settingsKey 'reminderList')
          // Load saved search term
          // The search text is deliberately NOT restored - see clearStoredSearchTerm.
          await this.clearStoredSearchTerm('reminderList');
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
        this.currentUser.settings.reminderList.sort = this.table.sortColumns;
      }

      await remult.repo(User).save(this.currentUser);
    } catch (error) {
      console.error('Error saving sort settings:', error);
    }
  }

  /**
   * A search box is a momentary action, not a preference, so the text is no
   * longer persisted: it used to be written to user.settings on the SERVER,
   * which meant yesterday's search came back on a different machine.
   *
   * The stored value is not read any more and is cleared once on load, so an
   * existing settings row does not keep resurfacing an old search.
   */
  private async clearStoredSearchTerm(key: 'donorList' | 'reminderList') {
    try {
      const settings: any = this.currentUser?.settings;
      if (!settings?.[key] || settings[key].searchTerm === undefined) return;
      delete settings[key].searchTerm;
      // Item 33 - remove this one field on the server, not save the whole row.
      await this.userSettings.merge(key, { searchTerm: null });
    } catch (error) {
      console.error('clearStoredSearchTerm', error);
    }
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

  async onPrint() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const filters = this.buildFilters();

        // Fetch ALL reminders (no pagination)
        const allReminders = await this.reminderService.findFiltered(
          filters,
          undefined,
          undefined,
          this.table.sortColumns
        );

        // item 18 - print carries the same phone columns as the Excel export
        const printDonorIds = [...new Set(allReminders.map(r => r.donor?.id).filter(id => id))] as string[];
        const printContactData = printDonorIds.length > 0
          ? await DonorMapController.loadDonorsForExport(printDonorIds)
          : [];
        const printContactsMap = new Map(printContactData.map(d => [d.id, d]));

        // Prepare data for print
        const printData = allReminders.map(reminder => ({
          date: this.formatHebrewDate(reminder.nextReminderDate),
          type: this.getTypeText(reminder.type),
          source: this.getSourceText(reminder),
          donor: this.getDonorName(reminder),
          phone: printContactsMap.get(reminder.donor?.id || '')?.phone || '-',
          mobile: printContactsMap.get(reminder.donor?.id || '')?.mobile || '-',
          title: reminder.title || '-',
          priority: this.getPriorityText(reminder.priority),
          status: reminder.isCompleted ? 'בוצעה' : 'לא בוצעה'
        }));

        this.printService.print({
          title: this.i18n.currentTerms.reminders || 'תזכורות',
          subtitle: `${allReminders.length} ${this.i18n.currentTerms.reminders || 'תזכורות'}`,
          columns: [
            { header: this.i18n.currentTerms.reminderDateHeader || 'תאריך תזכורת', field: 'date' },
            { header: this.i18n.currentTerms.typeHeader || 'סוג', field: 'type' },
            { header: 'מקור', field: 'source' },
            { header: this.i18n.currentTerms.donorHeader || 'תורם', field: 'donor' },
            { header: this.i18n.currentTerms.phone || 'טלפון', field: 'phone', align: 'left' },
            { header: this.i18n.currentTerms.mobileColumn || 'נייד', field: 'mobile', align: 'left' },
            { header: this.i18n.currentTerms.subjectHeader || 'נושא', field: 'title' },
            { header: this.i18n.currentTerms.priorityHeader || 'עדיפות', field: 'priority' },
            // Visible = exportable: the new status column prints too.
            { header: this.i18n.currentTerms.statusHeaderReminder || 'סטטוס', field: 'status' }
          ],
          data: printData,
          direction: 'rtl'
        });
      } catch (error) {
        console.error('Error printing reminders:', error);
        this.ui.error('שגיאה בהדפסה');
      }
    });
  }

  // Helper method to translate marital status
  private getMaritalStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'married': this.i18n.currentTerms.married || 'נשוי/ה',
      'single': this.i18n.currentTerms.single || 'רווק/ה',
      'widowed': this.i18n.currentTerms.widowed || 'אלמן/ה',
      'divorced': this.i18n.currentTerms.divorced || 'גרוש/ה'
    };
    return statusMap[status] || '';
  }

  async onExport() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const filters = this.buildFilters();

        // Fetch ALL reminders (no pagination)
        const allReminders = await this.reminderService.findFiltered(
          filters,
          undefined,
          undefined,
          this.table.sortColumns
        );

        // Load fundraisers and contact persons for lookup
        const { fundraisers, contactPersons } = await DonorController.getExportLookups();
        const fundraiserMap = new Map(fundraisers.map(f => [f.id, f.name]));
        const contactPersonMap = new Map(contactPersons.map(cp => [cp.id, cp.name]));

        // Load donor contacts (phone + mobile phones + email) for export columns
        const remDonorIds = [...new Set(allReminders.map(r => r.donor?.id).filter(id => id))] as string[];
        const remContactData = remDonorIds.length > 0
          ? await DonorMapController.loadDonorsForExport(remDonorIds)
          : [];
        const remContactsMap = new Map(remContactData.map(d => [d.id, d]));

        await this.excelExportService.export({
          data: allReminders,
          columns: [
            // Donor fields - Hebrew
            { header: this.i18n.currentTerms.title || 'תואר', mapper: (r) => r.donor?.title || '', width: 15 },
            { header: this.i18n.currentTerms.firstName || 'שם פרטי', mapper: (r) => r.donor?.firstName || '', width: 15 },
            { header: this.i18n.currentTerms.lastName || 'שם משפחה', mapper: (r) => r.donor?.lastName || '', width: 15 },
            { header: this.i18n.currentTerms.suffix || 'סיומת', mapper: (r) => r.donor?.suffix || '', width: 10 },
            // Donor fields - English
            { header: this.i18n.currentTerms.titleEnglish || 'Title', mapper: (r) => r.donor?.titleEnglish || '', width: 12 },
            { header: this.i18n.currentTerms.firstNameEnglish || 'First Name', mapper: (r) => r.donor?.firstNameEnglish || '', width: 15 },
            { header: this.i18n.currentTerms.lastNameEnglish || 'Last Name', mapper: (r) => r.donor?.lastNameEnglish || '', width: 15 },
            { header: this.i18n.currentTerms.suffixEnglish || 'Suffix', mapper: (r) => r.donor?.suffixEnglish || '', width: 10 },
            // Fundraiser & Contact Person + donor phone / mobile (item 18)
            { header: this.i18n.currentTerms.fundraiser || 'מתרים', mapper: (r) => r.donor?.fundraiserId ? fundraiserMap.get(r.donor.fundraiserId) || '' : '', width: 15 },
            { header: this.i18n.currentTerms.contactPerson || 'איש קשר', mapper: (r) => r.donor?.contactPersonId ? contactPersonMap.get(r.donor.contactPersonId) || '' : '', width: 15 },
            { header: this.i18n.currentTerms.phone || 'טלפון', mapper: (r) => remContactsMap.get(r.donor?.id || '')?.phone || '-', width: 20, align: 'left' },
            { header: this.i18n.currentTerms.mobileColumn || 'נייד', mapper: (r) => remContactsMap.get(r.donor?.id || '')?.mobile || '-', width: 20, align: 'left' },
            // Donor characteristics
            { header: this.i18n.currentTerms.maritalStatus || 'מצב משפחתי', mapper: (r) => this.getMaritalStatusText(r.donor?.maritalStatus || ''), width: 12 },
            { header: this.i18n.currentTerms.anash || 'אנ"ש', mapper: (r) => r.donor?.isAnash ? '✓' : '', width: 8 },
            { header: this.i18n.currentTerms.alumni || 'תלמידנו', mapper: (r) => r.donor?.isAlumni ? '✓' : '', width: 8 },
            // Reminder fields
            { header: this.i18n.currentTerms.reminderDateHeader || 'תאריך תזכורת', mapper: (r) => this.formatHebrewDate(r.nextReminderDate), width: 15 },
            { header: this.i18n.currentTerms.typeHeader || 'סוג', mapper: (r) => this.getTypeText(r.type), width: 15 },
            { header: 'מקור', mapper: (r) => this.getSourceText(r), width: 12 },
            { header: this.i18n.currentTerms.subjectHeader || 'נושא', mapper: (r) => r.title || '-', width: 25 },
            { header: this.i18n.currentTerms.priorityHeader || 'עדיפות', mapper: (r) => this.getPriorityText(r.priority), width: 12 },
            { header: this.i18n.currentTerms.statusHeaderReminder || 'סטטוס', mapper: (r) => r.isCompleted ? 'בוצעה' : 'לא בוצעה', width: 12 }
          ],
          sheetName: this.i18n.currentTerms.reminders || 'תזכורות',
          fileName: this.excelExportService.generateFileName(this.i18n.currentTerms.reminders || 'תזכורות')
        });
      } catch (error) {
        console.error('Error exporting reminders:', error);
        this.ui.error('שגיאה בייצוא');
      }
    });
  }

}