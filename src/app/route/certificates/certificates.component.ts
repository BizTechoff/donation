import { Component, OnDestroy, OnInit } from '@angular/core';
import { remult, repo } from 'remult';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CertificateController, CertificateFilters } from '../../../shared/controllers/certificate.controller';
import { Certificate } from '../../../shared/entity/certificate';
import { User } from '../../../shared/entity/user';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { GlobalFilterService } from '../../services/global-filter.service';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { PrintService } from '../../services/print.service';
import { Reminder } from '../../../shared/entity/reminder';
import { Blessing } from '../../../shared/entity/blessing';
import { BusyService } from '../../common-ui-elements/src/angular/wait/busy-service';

@Component({
  selector: 'app-certificates',
  templateUrl: './certificates.component.html',
  styleUrls: ['./certificates.component.scss']
})
export class CertificatesComponent implements OnInit, OnDestroy {

  certificates: Certificate[] = [];
  loading = false;

  // Expose Math to template
  Math = Math;

  // Filters
  filterFromParasha = '';
  filterToParasha = '';
  filterCertificateType = '';
  filterDateFrom: Date | null = null;
  filterDateTo: Date | null = null;
  donorSearchText = '';
  private donorSearchSubject = new Subject<string>();
  private filterTimeout: any;
  private subscriptions = new Subscription();

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;

  // Sorting
  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];
  private currentUser?: User;

  // Maps for certificate-related data
  certificateReminderMap = new Map<string, Date>();
  certificateBlessingCountMap = new Map<string, { received: number; total: number }>();

  parashotList = [
    'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ', 'ויגש', 'ויחי',
    'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה', 'כי תשא', 'ויקהל', 'פקודי',
    'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות', 'קדושים', 'אמור', 'בהר', 'בחוקותי',
    'במדבר', 'נשא', 'בהעלותך', 'שלח לך', 'קרח', 'חקת', 'בלק', 'פינחס', 'מטות', 'מסעי',
    'דברים', 'ואתחנן', 'עקב', 'ראה', 'שופטים', 'כי תצא', 'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'
  ];

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private globalFilterService: GlobalFilterService,
    private hebrewDateService: HebrewDateService,
    private printService: PrintService,
    private excelExportService: ExcelExportService,
    private busy: BusyService
  ) { }

  async ngOnInit() {
    // Load base data once
    await this.loadBase();

    // Listen for global filter changes
    this.subscriptions.add(
      this.globalFilterService.filters$.subscribe(() => {
        this.refreshData();
      })
    );

    // Initial data load
    await this.refreshData();
  }

  /**
   * Load base data once - called only on component initialization
   */
  private async loadBase() {
    // Load user settings
    await this.loadUserSettings();

    // הגדרת debounce לחיפוש תורם
    this.donorSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchText => {
      this.onFilterChange();
    });

    // Set CSS variables for mobile labels
    this.updateMobileLabels();

    // Listen for language changes
    this.i18n.terms$.subscribe(() => {
      this.updateMobileLabels();
    });
  }

  /**
   * Refresh data based on current filters and sorting
   * Called whenever filters or sorting changes
   */
  async refreshData() {
    this.loading = true;
    try {
      // Build filters object for server-side filtering (local filters only)
      // Global filters are fetched from user.settings in the backend
      const filters: CertificateFilters = {
        certificateType: this.filterCertificateType?.trim() || undefined,
        dateFrom: this.filterDateFrom ? this.formatDateForFilter(this.filterDateFrom) : undefined,
        dateTo: this.filterDateTo ? this.formatDateForFilter(this.filterDateTo) : undefined,
        donorSearchText: this.donorSearchText?.trim() || undefined,
        fromParasha: this.filterFromParasha?.trim() || undefined,
        toParasha: this.filterToParasha?.trim() || undefined
      };

      // Get total count, summary, and certificates from server
      const [count, summary, certificates] = await Promise.all([
        CertificateController.countFilteredCertificates(filters),
        CertificateController.getSummaryForFilteredCertificates(filters),
        CertificateController.findFilteredCertificates(filters, this.currentPage, this.pageSize, this.sortColumns)
      ]);

      this.totalCount = count;
      this.certificates = certificates;
      this.totalPages = Math.ceil(this.totalCount / this.pageSize);

      // Use summary data from server
      this.memorialCertificatesCount = summary.memorialCertificates;
      this.memorialDayCertificatesCount = summary.memorialDayCertificates;

      // Load related data for certificates
      await this.loadRelatedData();
    } catch (error) {
      console.error('Error in refreshData:', error);
      this.certificates = [];
      this.totalCount = 0;
      this.totalPages = 0;
      this.memorialCertificatesCount = 0;
      this.memorialDayCertificatesCount = 0;
    } finally {
      this.loading = false;
    }
  }

  private updateMobileLabels() {
    const root = document.documentElement;
    root.style.setProperty('--label-number', `'${this.i18n.currentLanguage === 'he' ? 'מספר' : 'Number'}: '`);
    root.style.setProperty('--label-date', `'${this.i18n.terms.date}: '`);
    root.style.setProperty('--label-recipient', `'${this.i18n.currentLanguage === 'he' ? 'נמען' : 'Recipient'}: '`);
    root.style.setProperty('--label-donor', `'${this.i18n.terms.donor}: '`);
    root.style.setProperty('--label-type', `'${this.i18n.currentLanguage === 'he' ? 'סוג' : 'Type'}: '`);
    root.style.setProperty('--label-event-amount', `'${this.i18n.currentLanguage === 'he' ? 'אירוע/סכום' : 'Event/Amount'}: '`);
    root.style.setProperty('--label-status', `'${this.i18n.terms.status}: '`);
  }

  ngOnDestroy() {
    this.donorSearchSubject.complete();
    this.subscriptions.unsubscribe();
  }

  // Summary data
  memorialCertificatesCount = 0;
  memorialDayCertificatesCount = 0;

  /**
   * Load reminders and blessing counts for all certificates
   */
  private async loadRelatedData() {
    if (this.certificates.length === 0) return;

    // Load reminders
    await this.loadReminders();

    // Load blessing counts
    await this.loadBlessingCounts();
  }

  /**
   * Load reminders for certificates by sourceEntityType/sourceEntityId
   */
  private async loadReminders() {
    if (this.certificates.length === 0) return;

    const certificateIds = this.certificates.map(c => c.id).filter(id => id);
    if (certificateIds.length === 0) return;

    const reminderRepo = remult.repo(Reminder);

    const reminders = await reminderRepo.find({
      where: {
        sourceEntityType: 'certificate',
        sourceEntityId: { $in: certificateIds }
      }
    });

    // Store reminder dates
    this.certificateReminderMap.clear();
    for (const reminder of reminders) {
      if (reminder.sourceEntityId) {
        this.certificateReminderMap.set(reminder.sourceEntityId, reminder.nextReminderDate || reminder.dueDate);
      }
    }
  }

  /**
   * Load blessing counts for donors related to certificates
   */
  private async loadBlessingCounts() {
    const donorIds = [...new Set(this.certificates.map(c => c.donorId).filter(id => id))];
    if (donorIds.length === 0) return;

    const blessingRepo = remult.repo(Blessing);

    // Get all blessings for these donors
    const blessings = await blessingRepo.find({
      where: { donorId: { $in: donorIds } }
    });

    // Count blessings per donor
    this.certificateBlessingCountMap.clear();
    for (const donorId of donorIds) {
      const donorBlessings = blessings.filter(b => b.donorId === donorId);
      const receivedCount = donorBlessings.filter(b => b.status === 'מאושר').length;
      const totalCount = donorBlessings.length;

      // Store for all certificates with this donor
      this.certificates
        .filter(c => c.donorId === donorId)
        .forEach(c => {
          this.certificateBlessingCountMap.set(c.id, {
            received: receivedCount,
            total: totalCount
          });
        });
    }
  }

  onDonorSearchChange(searchText: string) {
    this.donorSearchText = searchText;
    this.donorSearchSubject.next(searchText);
  }

  onFilterChange() {
    // Clear any existing timeout
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }

    // Reset to page 1 when filter changes
    this.currentPage = 1;

    // Debounce the filter change
    this.filterTimeout = setTimeout(() => {
      this.refreshData();
    }, 300);
  }

  async openCreateModal() {
    if (await this.ui.certificateDetailsDialog('new')) {
      await this.refreshData();
    }
  }

  async openEditModal(certificate: Certificate) {
    if (await this.ui.certificateDetailsDialog(certificate.id)) {
      await this.refreshData();
    }
  }

  async updateCertificateStatus(certificate: Certificate, status: string) {
    try {
      switch (status) {
        case 'printed':
          await certificate.markAsPrinted();
          break;
        case 'delivered':
          await certificate.markAsDelivered();
          break;
        case 'ready':
          await certificate.markAsReady();
          break;
        case 'draft':
          await certificate.backToDraft();
          break;
      }
      await this.refreshData();
    } catch (error) {
      console.error('Error updating certificate status:', error);
    }
  }

  getDonorName(certificate: Certificate): string {
    return certificate.donor?.lastAndFirstName || '-';
  }

  getCertificateTypeText(certificate: Certificate): string {
    // If typeText is already set, use it
    if (certificate.typeText) {
      return certificate.typeText;
    }

    // Otherwise, determine based on type
    switch (certificate.type) {
      case 'donation':
        return this.i18n.currentTerms.donationCertificate;
      case 'memorial':
        return this.i18n.currentTerms.memorialCertificate;
      case 'memorialDay':
        return this.i18n.currentTerms.memorialDay;
      case 'appreciation':
        return this.i18n.currentTerms.appreciation;
      default:
        return '';
    }
  }

  async createReminder(certificate: Certificate) {
    // Check if reminder already exists by querying
    const existingReminder = await remult.repo(Reminder).findFirst({
      sourceEntityType: 'certificate',
      sourceEntityId: certificate.id
    });
    const reminderId = existingReminder?.id || 'new';

    const reminderSaved = await this.ui.reminderDetailsDialog(reminderId, {
      donorId: certificate.donorId,
      sourceEntityType: 'certificate',
      sourceEntityId: certificate.id
    });

    if (reminderSaved) {
      await this.refreshData(); // Reload to get updated reminder
      if (reminderId === 'new') {
        this.ui.info('תזכורת נוצרה בהצלחה');
      }
    }
  }

  async deleteCertificate(certificate: Certificate) {
    if (await this.ui.yesNoQuestion(this.i18n.terms.deleteConfirmation || 'האם למחוק תעודה זו?')) {
      try {
        await repo(Certificate).delete(certificate);
        this.ui.info(this.i18n.terms.deleteSuccess || 'נמחק בהצלחה');
        await this.refreshData();
      } catch (error) {
        console.error('Error deleting certificate:', error);
        this.ui.error(this.i18n.terms.deleteError || 'שגיאה במחיקה');
      }
    }
  }

  onFromParashaChange() {
    // כאשר נבחרה פרשה ב"מפרשה" ו"עד פרשה" ריק, העתק את הערך ל"עד פרשה"
    if (this.filterFromParasha && !this.filterToParasha) {
      this.filterToParasha = this.filterFromParasha;
    }
    this.onFilterChange();
  }

  onToParashaChange() {
    // כאשר נבחרה פרשה ב"עד פרשה" ו"מפרשה" ריק, העתק את הערך ל"מפרשה"
    if (this.filterToParasha && !this.filterFromParasha) {
      this.filterFromParasha = this.filterToParasha;
    }
    this.onFilterChange();
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
          if (this.currentUser?.settings?.certificateList?.sort) {
            this.sortColumns = this.currentUser.settings.certificateList.sort;
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
      if (this.currentUser.settings && !this.currentUser.settings.certificateList) {
        this.currentUser.settings.certificateList = {};
      }
      if (this.currentUser.settings && this.currentUser.settings.certificateList) {
        this.currentUser.settings.certificateList.sort = this.sortColumns;
      }

      await remult.repo(User).save(this.currentUser);
    } catch (error) {
      console.error('Error saving sort settings:', error);
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

  getParashaForDate(date: Date | undefined): string | null {
    if (!date) return null;
    try {
      return this.hebrewDateService.getParshaForDate(new Date(date));
    } catch (error) {
      console.error('Error getting parasha:', error);
      return null;
    }
  }

  getNextReminderDate(certificate: Certificate): string {
    const reminderDate = this.certificateReminderMap.get(certificate.id);
    return this.formatHebrewDate(reminderDate);
  }

  getBlessingCount(certificate: Certificate): string {
    const counts = this.certificateBlessingCountMap.get(certificate.id);
    if (!counts || counts.total === 0) return '-';
    return `${counts.received}/${counts.total}`;
  }

  private formatDateForFilter(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ===================================
  // Print & Export Methods
  // ===================================

  async onPrint() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build filters (same as refreshData)
        const filters: CertificateFilters = {
          certificateType: this.filterCertificateType?.trim() || undefined,
          dateFrom: this.filterDateFrom ? this.formatDateForFilter(this.filterDateFrom) : undefined,
          dateTo: this.filterDateTo ? this.formatDateForFilter(this.filterDateTo) : undefined,
          donorSearchText: this.donorSearchText?.trim() || undefined,
          fromParasha: this.filterFromParasha?.trim() || undefined,
          toParasha: this.filterToParasha?.trim() || undefined
        };

        // Fetch ALL certificates (no pagination)
        const allCertificates = await CertificateController.findFilteredCertificates(
          filters,
          undefined,
          undefined,
          this.sortColumns
        );

        // Prepare data for print
        const printData = allCertificates.map(cert => ({
          recipientName: cert.recipientName || '-',
          type: cert.type === 'memorial' ? this.i18n.currentTerms.memorialCertificate : this.i18n.currentTerms.memorialDayType,
          eventDate: this.formatHebrewDate(cert.eventDate),
          amount: cert.amount ? `₪${cert.amount.toLocaleString('he-IL')}` : '-',
          reminder: this.getNextReminderDate(cert),
          blessings: this.getBlessingCount(cert),
          mainText: cert.mainText || '-'
        }));

        this.printService.print({
          title: this.i18n.currentTerms.certificates || 'תעודות',
          subtitle: `${allCertificates.length} ${this.i18n.currentTerms.certificates || 'תעודות'}`,
          columns: [
            { header: this.i18n.currentTerms.recipientName || 'נמען', field: 'recipientName' },
            { header: this.i18n.currentTerms.certificateType || 'סוג', field: 'type' },
            { header: this.i18n.currentTerms.eventDate || 'תאריך אירוע', field: 'eventDate' },
            { header: this.i18n.currentTerms.amount || 'סכום', field: 'amount' },
            { header: this.i18n.currentTerms.nextReminderColumn || 'תזכורת הבאה', field: 'reminder' },
            { header: this.i18n.currentTerms.blessingsColumn || 'ברכות', field: 'blessings' },
            { header: this.i18n.currentTerms.mainText || 'טקסט ראשי', field: 'mainText' }
          ],
          data: printData,
          direction: 'rtl'
        });
      } catch (error) {
        console.error('Error printing certificates:', error);
        this.ui.error('שגיאה בהדפסה');
      }
    });
  }

  async onExport() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build filters (same as refreshData)
        const filters: CertificateFilters = {
          certificateType: this.filterCertificateType?.trim() || undefined,
          dateFrom: this.filterDateFrom ? this.formatDateForFilter(this.filterDateFrom) : undefined,
          dateTo: this.filterDateTo ? this.formatDateForFilter(this.filterDateTo) : undefined,
          donorSearchText: this.donorSearchText?.trim() || undefined,
          fromParasha: this.filterFromParasha?.trim() || undefined,
          toParasha: this.filterToParasha?.trim() || undefined
        };

        // Fetch ALL certificates (no pagination)
        const allCertificates = await CertificateController.findFilteredCertificates(
          filters,
          undefined,
          undefined,
          this.sortColumns
        );

        await this.excelExportService.export({
          data: allCertificates,
          columns: [
            { header: this.i18n.currentTerms.recipientName || 'נמען', mapper: (c) => c.recipientName || '-', width: 25 },
            { header: this.i18n.currentTerms.certificateType || 'סוג', mapper: (c) => c.type === 'memorial' ? this.i18n.currentTerms.memorialCertificate : this.i18n.currentTerms.memorialDayType, width: 15 },
            { header: this.i18n.currentTerms.eventDate || 'תאריך אירוע', mapper: (c) => this.formatHebrewDate(c.eventDate), width: 15 },
            { header: this.i18n.currentTerms.amount || 'סכום', mapper: (c) => c.amount ? `₪${c.amount.toLocaleString('he-IL')}` : '-', width: 12 },
            { header: this.i18n.currentTerms.nextReminderColumn || 'תזכורת הבאה', mapper: (c) => this.getNextReminderDate(c), width: 15 },
            { header: this.i18n.currentTerms.blessingsColumn || 'ברכות', mapper: (c) => this.getBlessingCount(c), width: 10 },
            { header: this.i18n.currentTerms.mainText || 'טקסט ראשי', mapper: (c) => c.mainText || '-', width: 30 }
          ],
          sheetName: this.i18n.currentTerms.certificates || 'תעודות',
          fileName: this.excelExportService.generateFileName(this.i18n.currentTerms.certificates || 'תעודות')
        });
      } catch (error) {
        console.error('Error exporting certificates:', error);
        this.ui.error('שגיאה בייצוא');
      }
    });
  }
}