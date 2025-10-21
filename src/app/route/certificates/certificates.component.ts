import { Component, OnInit, OnDestroy } from '@angular/core';
import { Certificate } from '../../../shared/entity/certificate';
import { Donor } from '../../../shared/entity/donor';
import { repo } from 'remult';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';
import { ReminderDetailsModalComponent } from '../../routes/modals/reminder-details-modal/reminder-details-modal.component';
import { GlobalFilterService } from '../../services/global-filter.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-certificates',
  templateUrl: './certificates.component.html',
  styleUrls: ['./certificates.component.scss']
})
export class CertificatesComponent implements OnInit, OnDestroy {

  certificates: Certificate[] = [];
  allCertificates: Certificate[] = [];
  filterFromParasha = '';
  filterToParasha = '';
  filterCertificateType = '';
  filterDateFrom = '';
  filterDateTo = '';
  donorSearchText = '';
  private donorSearchSubject = new Subject<string>();

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
    // הגדרת debounce לחיפוש תורם
    this.donorSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchText => {
      this.filterCertificates();
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
    const query: any = {
      include: {
        donor: true,
        createdBy: true,
        reminder: true
      },
      orderBy: { createdDate: 'desc' }
    };

    // Apply global filters
    const filteredQuery = this.globalFilterService.applyFiltersToQuery(query);

    this.allCertificates = await repo(Certificate).find(filteredQuery);
    this.filterCertificates();
  }

  onDonorSearchChange(searchText: string) {
    this.donorSearchText = searchText;
    this.donorSearchSubject.next(searchText);
  }

  filterCertificates() {
    let filtered = [...this.allCertificates];

    // סינון לפי סוג תעודה
    if (this.filterCertificateType) {
      filtered = filtered.filter(cert => cert.type === this.filterCertificateType);
    }

    // סינון לפי תאריך מ
    if (this.filterDateFrom) {
      const dateFrom = new Date(this.filterDateFrom);
      filtered = filtered.filter(cert =>
        cert.eventDate && new Date(cert.eventDate) >= dateFrom
      );
    }

    // סינון לפי תאריך עד
    if (this.filterDateTo) {
      const dateTo = new Date(this.filterDateTo);
      filtered = filtered.filter(cert =>
        cert.eventDate && new Date(cert.eventDate) <= dateTo
      );
    }

    // חיפוש לפי שם תורם (שם פרטי, משפחה, עברי ואנגלי)
    if (this.donorSearchText && this.donorSearchText.trim()) {
      const searchLower = this.donorSearchText.toLowerCase().trim();
      filtered = filtered.filter(cert => {
        if (!cert.donor) return false;
        const donor = cert.donor;
        return (
          donor.firstName?.toLowerCase().includes(searchLower) ||
          donor.lastName?.toLowerCase().includes(searchLower) ||
          donor.fullName?.toLowerCase().includes(searchLower) ||
          (donor.firstName + ' ' + donor.lastName)?.toLowerCase().includes(searchLower)
        );
      });
    }

    this.certificates = filtered;
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

  onFromParashaChange() {
    // כאשר נבחרה פרשה ב"מפרשה" ו"עד פרשה" ריק, העתק את הערך ל"עד פרשה"
    if (this.filterFromParasha && !this.filterToParasha) {
      this.filterToParasha = this.filterFromParasha;
    }
    // Note: Parasha filtering will work once the Certificate entity has a parasha field
  }

  onToParashaChange() {
    // כאשר נבחרה פרשה ב"עד פרשה" ו"מפרשה" ריק, העתק את הערך ל"מפרשה"
    if (this.filterToParasha && !this.filterFromParasha) {
      this.filterFromParasha = this.filterToParasha;
    }
    // Note: Parasha filtering will work once the Certificate entity has a parasha field
  }

}