import { Component, OnDestroy, OnInit } from '@angular/core';
import { remult, repo } from 'remult';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CertificateController, CertificateFilters } from '../../../shared/controllers/certificate.controller';
import { Certificate } from '../../../shared/entity/certificate';
import { User } from '../../../shared/entity/user';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { GlobalFilterService } from '../../services/global-filter.service';

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
  filterDateFrom = '';
  filterDateTo = '';
  donorSearchText = '';
  private donorSearchSubject = new Subject<string>();
  private filterTimeout: any;

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;

  // Sorting
  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];
  private currentUser?: User;

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
    private globalFilterService: GlobalFilterService
  ) { }

  async ngOnInit() {
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

    await this.loadCertificates();
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
  }

  async loadCertificates() {
    this.loading = true;
    try {
      // Build filters object for server-side filtering
      const filters: CertificateFilters = {
        certificateType: this.filterCertificateType?.trim() || undefined,
        dateFrom: this.filterDateFrom?.trim() || undefined,
        dateTo: this.filterDateTo?.trim() || undefined,
        donorSearchText: this.donorSearchText?.trim() || undefined,
        fromParasha: this.filterFromParasha?.trim() || undefined,
        toParasha: this.filterToParasha?.trim() || undefined
      };

      // Get total count and certificates from server
      [this.totalCount, this.certificates] = await Promise.all([
        CertificateController.countFilteredCertificates(filters),
        CertificateController.findFilteredCertificates(filters, this.currentPage, this.pageSize, this.sortColumns)
      ]);

      this.totalPages = Math.ceil(this.totalCount / this.pageSize);
    } catch (error) {
      console.error('Error in loadCertificates:', error);
      this.certificates = [];
      this.totalCount = 0;
      this.totalPages = 0;
    } finally {
      this.loading = false;
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
      this.loadCertificates();
    }, 300);
  }

  async openCreateModal() {
    if (await this.ui.certificateDetailsDialog('new')) {
      await this.loadCertificates();
    }
  }

  async openEditModal(certificate: Certificate) {
    if (await this.ui.certificateDetailsDialog(certificate.id)) {
      await this.loadCertificates();
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
      await this.loadCertificates();
    } catch (error) {
      console.error('Error updating certificate status:', error);
    }
  }

  getDonorName(certificate: Certificate): string {
    return certificate.donor?.fullName || this.i18n.terms.unknown;
  }

  async createReminder(certificate: Certificate) {
    // Check if reminder already exists
    const reminderId = certificate.reminderId || 'new';

    const reminderSaved = await this.ui.reminderDetailsDialog(reminderId, {
      donorId: certificate.donorId
    });

    if (reminderSaved) {
      await this.loadCertificates(); // Reload to get updated reminder
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
        await this.loadCertificates();
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
      await this.loadCertificates();
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.loadCertificates();
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadCertificates();
    }
  }

  async firstPage() {
    this.currentPage = 1;
    await this.loadCertificates();
  }

  async lastPage() {
    this.currentPage = this.totalPages;
    await this.loadCertificates();
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
    await this.loadCertificates();
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

}