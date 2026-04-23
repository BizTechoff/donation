import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { Blessing } from '../../../../shared/entity';
import { BlessingBookType } from '../../../../shared/entity/blessing-book-type';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { BlessingTypeSelectionModalComponent } from '../blessing-type-selection-modal/blessing-type-selection-modal.component';
import { BlessingTextEditModalComponent } from '../blessing-text-edit-modal/blessing-text-edit-modal.component';
import { ExcelExportService, ExcelColumn } from '../../../services/excel-export.service';
import { DonorController } from '../../../../shared/controllers/donor.controller';
import { BlessingBookDataDto, BlessingBookTypeDto, CampaignController } from '../../../../shared/controllers/campaign.controller';

export interface CampaignBlessingBookModalArgs {
  campaignId: string;
  campaignName?: string;
}

export interface DonorBlessing {
  donor: {
    id: string;
    fullName: string;
    lastAndFirstName: string;
    level: string;
    fundraiserId: string;
    contactPersonId: string;
  };
  donation?: { id: string; donorId: string; campaignId: string; amount: number; currencyId: string; donationDate?: Date };
  blessing?: any; // BlessingBookBlessingDto or Blessing entity — compatible with blessingRepo.save
  blessingStatus: 'pending' | 'sent' | 'received' | 'none';
  totalDonated: number;
  matchingDonationsCount: number;
  email?: string;
  phone?: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-campaign-blessing-book-modal',
  templateUrl: './campaign-blessing-book-modal.component.html',
  styleUrls: ['./campaign-blessing-book-modal.component.scss']
})
export class CampaignBlessingBookModalComponent implements OnInit {
  args!: CampaignBlessingBookModalArgs;

  campaignId?: string;
  campaignName?: string;
  donorBlessings: DonorBlessing[] = [];
  blessingTypes: BlessingBookTypeDto[] = [];

  blessingRepo = remult.repo(Blessing);

  loading = false;

  // Filters
  filterText = '';
  filterStatus = '';
  filterLevel = '';
  filterBlessingType = '';

  // Table configuration
  displayedColumns: string[] = ['donorName', 'phone', 'email', 'blessingType', 'totalAmount', 'blessingStatus', 'blessingText'];

  // Statistics
  totalDonors = 0;
  pendingBlessings = 0;
  sentBlessings = 0;
  receivedBlessings = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CampaignBlessingBookModalComponent>,
    private excelService: ExcelExportService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  get modalTitle(): string {
    const blessingBook = this.i18n.currentTerms?.blessingBookTitle || 'ספר ברכות';
    return `${blessingBook} - ${this.campaignName || this.args.campaignName || ''}`;
  }

  async loadData() {
    this.loading = true;
    try {
      const dto = await CampaignController.getBlessingBookData(this.args.campaignId);
      this.campaignName = this.args.campaignName;
      this.blessingTypes = dto.blessingTypes;
      this.donorBlessings = dto.entries.map(e => ({
        donor: e.donor,
        donation: e.donation,
        blessing: e.blessing,
        blessingStatus: e.blessingStatus,
        totalDonated: e.totalDonated,
        matchingDonationsCount: e.matchingDonationsCount,
        email: e.email || undefined,
        phone: e.phone || undefined
      }));
      this.calculateStatistics();
    } catch (error) {
      console.error('Error loading campaign blessing book:', error);
      this.ui.error('שגיאה בטעינת ספר הברכות');
    } finally {
      this.loading = false;
    }
  }

  getBlessingStatus(blessing: any): 'pending' | 'sent' | 'received' | 'none' {
    if (!blessing?.blessingContent || blessing.blessingContent.trim() === '') return 'pending';
    if (blessing.status === 'מאושר') return 'received';
    if (blessing.status === 'בטיפול') return 'sent';
    return 'pending';
  }

  calculateStatistics() {
    this.totalDonors = this.donorBlessings.length;
    this.pendingBlessings = this.donorBlessings.filter(db => db.blessingStatus === 'pending').length;
    this.sentBlessings = this.donorBlessings.filter(db => db.blessingStatus === 'sent').length;
    this.receivedBlessings = this.donorBlessings.filter(db => db.blessingStatus === 'received').length;
  }

  get filteredDonorBlessings(): DonorBlessing[] {
    return this.donorBlessings.filter(db => {
      const matchesText = !this.filterText ||
        db.donor.fullName?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        (db.phone || '').includes(this.filterText) ||
        (db.email || '').toLowerCase().includes(this.filterText.toLowerCase()) ||
        db.blessing?.blessingContent?.toLowerCase().includes(this.filterText.toLowerCase());

      const matchesStatus = !this.filterStatus || db.blessingStatus === this.filterStatus;
      const matchesLevel = !this.filterLevel || db.donor.level === this.filterLevel;
      const matchesBlessingType = !this.filterBlessingType || db.blessing?.blessingBookTypeId === this.filterBlessingType;

      return matchesText && matchesStatus && matchesLevel && matchesBlessingType;
    });
  }

  getStatusText(status: string): string {
    const terms = this.i18n.currentTerms;
    if (!terms) return status;

    switch (status) {
      case 'pending': return terms.statusPending || 'ממתין';
      case 'sent': return terms.statusSent || 'נשלח';
      case 'received': return terms.statusReceived || 'התקבל';
      case 'none': return terms.statusNone || 'ללא';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'sent': return 'status-sent';
      case 'received': return 'status-received';
      case 'none': return 'status-none';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return 'schedule';
      case 'sent': return 'send';
      case 'received': return 'check_circle';
      case 'none': return 'remove_circle';
      default: return 'help';
    }
  }

  async selectBlessingType(donorBlessing: DonorBlessing) {
    const selectedType = await openDialog(BlessingTypeSelectionModalComponent, (dlg) => {}) as BlessingBookType | undefined;

    if (selectedType && selectedType.id) {
      let blessing: any = donorBlessing.blessing;
      if (!blessing) {
        blessing = this.blessingRepo.create();
        blessing.donorId = donorBlessing.donor.id;
        blessing.campaignId = this.args.campaignId;
        blessing.name = donorBlessing.donor.fullName || '';
      }
      blessing.blessingBookTypeId = selectedType.id;
      blessing.blessingBookType = selectedType;
      blessing.amount = selectedType.price;

      try {
        await this.blessingRepo.save(blessing);
        donorBlessing.blessing = blessing;
        this.ui.info('סוג הברכה נבחר בהצלחה');
      } catch (error) {
        console.error('Error saving blessing type:', error);
        this.ui.error('שגיאה בשמירת סוג הברכה');
      }
    }
  }

  async editBlessing(donorBlessing: DonorBlessing) {
    let blessing: any = donorBlessing.blessing;
    if (!blessing) {
      blessing = this.blessingRepo.create();
      blessing.donorId = donorBlessing.donor.id;
      blessing.campaignId = this.args.campaignId;
      blessing.name = donorBlessing.donor.fullName || '';
    }

    const text = await openDialog(BlessingTextEditModalComponent, (dlg) => {
      dlg.args = {
        initialText: blessing!.blessingContent || '',
        donorName: donorBlessing.donor.fullName || ''
      };
    }) as string | undefined;

    if (text !== undefined && text !== null) {
      blessing.blessingContent = text;
      if (typeof text === 'string' && text.trim() !== '') {
        blessing.status = 'מאושר';
      }

      try {
        await this.blessingRepo.save(blessing);
        donorBlessing.blessing = blessing;
        donorBlessing.blessingStatus = this.getBlessingStatus(blessing);
        this.calculateStatistics();
        this.ui.info('הברכה נשמרה בהצלחה');
      } catch (error) {
        console.error('Error saving blessing:', error);
        this.ui.error('שגיאה בשמירת הברכה');
      }
    }
  }

  async markAsSent(donorBlessing: DonorBlessing) {
    if (!donorBlessing.blessing) {
      this.ui.info('יש להוסיף תחילה נוסח ברכה');
      return;
    }

    try {
      donorBlessing.blessing.status = 'בטיפול';
      await remult.repo(Blessing).save(donorBlessing.blessing);
      donorBlessing.blessingStatus = this.getBlessingStatus(donorBlessing.blessing);
      this.calculateStatistics();
      this.ui.info('הברכה סומנה כנשלחה');
    } catch (error) {
      console.error('Error marking blessing as sent:', error);
      this.ui.error('שגיאה בסימון הברכה כנשלחה');
    }
  }

  async openDonorDetails(donor: { id: string }) {
    await this.ui.donorDetailsDialog(donor.id);
  }

  async selectOrCreateDonation(donorBlessing: DonorBlessing) {
    if (!donorBlessing.blessing?.blessingBookType) {
      this.ui.error('יש לבחור תחילה סוג ברכה');
      return;
    }

    // Check if there are matching donations
    if (donorBlessing.matchingDonationsCount === 0) {
      // No matching donations - create new one directly
      const result = await this.ui.donationDetailsDialog('new', {
        donorId: donorBlessing.donor.id,
        campaignId: this.args.campaignId,
        amount: donorBlessing.blessing.blessingBookType.price
      });

      if (result) {
        await this.loadData();
      }
    } else {
      // Has matching donations - show donor donations modal to select
      await this.ui.donorDonationsDialog(
        donorBlessing.donor.id,
        'donations',
        donorBlessing.donor.fullName
      );

      // Reload data to show the selected/new donation
      await this.loadData();
    }
  }

  async openDonationDetails(donation: { id: string } | undefined) {
    if (!donation) return;
    const result = await this.ui.donationDetailsDialog(donation.id);
    if (result) await this.loadData();
  }

  getTruncatedBlessingText(text: string | undefined, maxLength: number = 30): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  async exportSummaryToExcel() {
    if (!this.campaignName) return;

    const dataToExport = this.filteredDonorBlessings;

    if (dataToExport.length === 0) {
      this.snackBar.open('אין נתונים לייצוא', 'סגור', { duration: 3000 });
      return;
    }

    // יצירת סיכום לפי סוג ברכה
    interface BlessingSummary {
      blessingType: string;
      price: number;
      count: number;
    }

    const summaryMap = new Map<string, BlessingSummary>();

    // סיכום הברכות
    for (const db of dataToExport) {
      if (db.blessing?.blessingBookType) {
        const typeId = db.blessing.blessingBookType.id;
        const existing = summaryMap.get(typeId);

        if (existing) {
          existing.count++;
        } else {
          summaryMap.set(typeId, {
            blessingType: db.blessing.blessingBookType.type,
            price: db.blessing.blessingBookType.price,
            count: 1
          });
        }
      }
    }

    // המרה למערך וממוין לפי מחיר
    const summaryData = Array.from(summaryMap.values()).sort((a, b) => a.price - b.price);

    if (summaryData.length === 0) {
      this.snackBar.open('אין סוגי ברכות לסיכום', 'סגור', { duration: 3000 });
      return;
    }

    // הגדרת עמודות לסיכום (ללא עמודת מחיר - מיון לפי מחיר בלבד)
    const columns: ExcelColumn<BlessingSummary>[] = [
      { header: 'סוג ברכה', mapper: (s) => s.blessingType, width: 25 },
      { header: 'כמות', mapper: (s) => s.count, width: 12 }
    ];

    // חישוב סה"כ
    const totalBlessings = summaryData.reduce((sum, s) => sum + s.count, 0);
    const totalAmount = summaryData.reduce((sum, s) => sum + (s.price * s.count), 0);

    // ייצוא
    await this.excelService.export({
      data: summaryData,
      columns: columns,
      sheetName: 'סיכום ספר ברכות',
      fileName: this.excelService.generateFileName(`סיכום_ספר_ברכות_${this.campaignName}`),
      includeStats: true,
      stats: [
        { label: 'שם קמפיין', value: this.campaignName || '' },
        { label: 'סה"כ ברכות', value: totalBlessings },
        { label: 'סה"כ סכום', value: `${totalAmount.toLocaleString('he-IL')} ₪` },
        { label: 'מס\' סוגי ברכות', value: summaryData.length },
        { label: 'תאריך ייצוא', value: new Date().toLocaleDateString('he-IL') }
      ]
    });
  }

  async exportToExcel() {
    if (!this.campaignName) return;

    const dataToExport = this.filteredDonorBlessings;

    if (dataToExport.length === 0) {
      this.snackBar.open('אין נתונים לייצוא', 'סגור', { duration: 3000 });
      return;
    }

    // Load fundraisers and contact persons for lookup
    const { fundraisers, contactPersons } = await DonorController.getExportLookups();
    const fundraiserMap = new Map(fundraisers.map(f => [f.id, f.name]));
    const contactPersonMap = new Map(contactPersons.map(cp => [cp.id, cp.name]));

    // הגדרת עמודות
    const columns: ExcelColumn<DonorBlessing>[] = [
      { header: 'שם תורם', mapper: (db) => db.donor.fullName || '-', width: 20 },
      { header: 'טלפון', mapper: (db) => db.phone || '-', width: 15 },
      { header: 'אימייל', mapper: (db) => db.email || '-', width: 25 },
      { header: 'מתרים', mapper: (db) => db.donor.fundraiserId ? fundraiserMap.get(db.donor.fundraiserId) || '' : '', width: 15 },
      { header: 'איש קשר', mapper: (db) => db.donor.contactPersonId ? contactPersonMap.get(db.donor.contactPersonId) || '' : '', width: 15 },
      { header: 'סוג ברכה', mapper: (db) => db.blessing?.blessingBookType?.type || '-', width: 15 },
      { header: 'מחיר סוג ברכה', mapper: (db) => db.blessing?.blessingBookType?.price || '-', width: 15 },
      { header: 'סה"כ תרם', mapper: (db) => db.totalDonated, width: 12 },
      { header: 'מספר תרומות תואמות', mapper: (db) => db.matchingDonationsCount, width: 18 },
      { header: 'סטטוס ברכה', mapper: (db) => this.getStatusText(db.blessingStatus), width: 12 },
      { header: 'נוסח ברכה', mapper: (db) => db.blessing?.blessingContent || '-', width: 40 }
    ];

    // ייצוא
    await this.excelService.export({
      data: dataToExport,
      columns: columns,
      sheetName: 'ספר ברכות',
      fileName: this.excelService.generateFileName(`ספר_ברכות_${this.campaignName}`),
      includeStats: true,
      stats: [
        { label: 'שם קמפיין', value: this.campaignName || '' },
        { label: 'סה"כ תורמים', value: this.totalDonors },
        { label: 'ברכות ממתינות', value: this.pendingBlessings },
        { label: 'ברכות שנשלחו', value: this.sentBlessings },
        { label: 'ברכות שהתקבלו', value: this.receivedBlessings },
        { label: 'מוצגים לאחר פילטור', value: dataToExport.length },
        { label: 'תאריך ייצוא', value: new Date().toLocaleDateString('he-IL') }
      ]
    });
  }

  async sendBulkReminders() {
    const pendingCount = this.pendingBlessings;
    if (pendingCount === 0) {
      this.ui.info('אין ברכות ממתינות לשליחה');
      return;
    }

    const confirmed = await this.ui.yesNoQuestion(`האם לשלוח תזכורת ל-${pendingCount} תורמים שטרם שלחו ברכה?`);
    if (confirmed) {
      // TODO: Implement bulk reminder sending
      this.ui.info(`תזכורות נשלחו ל-${pendingCount} תורמים`);
    }
  }

  // Open phone dialer
  callPhone(phone: string) {
    if (!phone) return;
    // Remove all non-digit characters except + at the beginning
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  }

  // Send blessing request email
  async sendBlessingEmail(donorBlessing: DonorBlessing) {
    if (!donorBlessing.email) {
      this.snackBar.open('אין כתובת אימייל לתורם זה', 'סגור', { duration: 3000 });
      return;
    }

    const subject = `בקשה לברכה לספר ברכות - ${this.campaignName || ''}`;

    const htmlBody = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
        <h2 style="color: #2c3e50; text-align: center;">שלום ${donorBlessing.donor.fullName},</h2>

        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          אנו שמחים לפנות אליך במסגרת <strong>${this.campaignName || ''}</strong>.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          נשמח אם תוכל לשלוח לנו ברכה אישית שתיכלל בספר הברכות המיוחד שלנו.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          הברכה יכולה לכלול מילות תודה, ברכות לעתיד, או כל מסר אישי שתרצה לשתף.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 16px; color: #7f8c8d;">
            אנא השב לאימייל זה עם הברכה שלך, ואנחנו נדאג להכליל אותה בספר הברכות.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; color: #7f8c8d; font-size: 14px; text-align: center;">
            תודה על שיתוף הפעולה והמשך הצלחה!
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="font-size: 12px; color: #95a5a6; text-align: center;">
          אימייל זה נשלח אוטומטית מפלטפורמת ניהול התרומות
        </p>
      </div>
    `;

    // Open send email modal
    const { SendEmailModalComponent } = await import('../send-email-modal/send-email-modal.component');
    const result = await SendEmailModalComponent.open({
      to: [donorBlessing.email],
      subject,
      htmlBody,
      from: 'המערכת',
      blessingId: donorBlessing.blessing?.id
    });

    if (result) {
      // Reload data to reflect email sent status
      await this.loadData();
      this.snackBar.open('האימייל נשלח בהצלחה!', 'סגור', { duration: 3000 });
    }
  }

  closeModal() {
    this.dialogRef.close();
  }
}