import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { Donation, Donor, Campaign, Blessing } from '../../../../shared/entity';
import { BlessingBookType } from '../../../../shared/entity/blessing-book-type';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { BlessingTypeSelectionModalComponent } from '../blessing-type-selection-modal/blessing-type-selection-modal.component';
import { BlessingTextEditModalComponent } from '../blessing-text-edit-modal/blessing-text-edit-modal.component';
import { ExcelExportService, ExcelColumn } from '../../../services/excel-export.service';

export interface CampaignBlessingBookModalArgs {
  campaignId: string;
  campaignName?: string;
}

export interface DonorBlessing {
  donor: Donor;
  donation?: Donation; // Donation matching the blessing type amount
  blessing?: Blessing;
  blessingStatus: 'pending' | 'sent' | 'received' | 'none';
  totalDonated: number;
  matchingDonationsCount: number; // Number of donations matching blessing type amount and campaign
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

  campaign?: Campaign;
  donorBlessings: DonorBlessing[] = [];
  blessingTypes: BlessingBookType[] = [];

  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  blessingRepo = remult.repo(Blessing);
  blessingTypeRepo = remult.repo(BlessingBookType);

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
    return `${blessingBook} - ${this.campaign?.name || this.args.campaignName || ''}`;
  }

  async loadData() {
    this.loading = true;
    try {
      // Load campaign
      this.campaign = await this.campaignRepo.findId(this.args.campaignId) || undefined;

      // Load blessing types
      this.blessingTypes = await this.blessingTypeRepo.find({
        where: { isActive: true },
        orderBy: { price: 'asc' }
      });

      // If campaign has invited donors, show only those
      if (this.campaign?.invitedDonorIds && this.campaign.invitedDonorIds.length > 0) {
        // Load only invited donors
        const invitedDonors = await this.donorRepo.find({
          where: {
            id: { $in: this.campaign.invitedDonorIds }
          }
        });

        // Load campaign donations for invited donors, ordered by date descending
        const donations = await this.donationRepo.find({
          where: {
            campaignId: this.args.campaignId,
            donorId: { $in: this.campaign.invitedDonorIds }
          },
          include: {
            donor: true
          },
          orderBy: {
            donationDate: 'desc'
          }
        });

        // Load existing blessings for invited donors
        const blessings = await this.blessingRepo.find({
          where: {
            campaignId: this.args.campaignId,
            donorId: { $in: this.campaign.invitedDonorIds }
          },
          include: {
            blessingBookType: true
          }
        });

        // Group by donor and create DonorBlessing objects
        const donorMap = new Map<string, DonorBlessing>();

        // First, create entries for all invited donors (even without donations)
        for (const donor of invitedDonors) {
          donorMap.set(donor.id, {
            donor: donor,
            donation: undefined,
            blessing: undefined,
            blessingStatus: 'none',
            totalDonated: 0,
            matchingDonationsCount: 0
          });
        }

        // Add blessing information first (so we know the expected amount)
        for (const blessing of blessings) {
          const donorBlessing = donorMap.get(blessing.donorId);
          if (donorBlessing) {
            donorBlessing.blessing = blessing;
            donorBlessing.blessingStatus = this.getBlessingStatus(blessing);
          }
        }

        // Add donation information - find donation matching blessing type amount
        for (const donation of donations) {
          if (!donation.donor) continue;

          const donorId = donation.donorId;
          const donorBlessing = donorMap.get(donorId);

          if (donorBlessing) {
            // Calculate total donated
            donorBlessing.totalDonated += donation.amount;

            // If we have a blessing with a type, count and match donations
            if (donorBlessing.blessing?.blessingBookType) {
              const expectedAmount = donorBlessing.blessing.blessingBookType.price;
              if (donation.amount === expectedAmount) {
                donorBlessing.matchingDonationsCount++;
                if (!donorBlessing.donation) {
                  donorBlessing.donation = donation;
                }
              }
            } else if (!donorBlessing.donation) {
              // If no blessing type yet, just keep the latest donation
              donorBlessing.donation = donation;
            }
          }
        }

        this.donorBlessings = Array.from(donorMap.values());
      } else {
        // Original behavior: show donors with donations
        const donations = await this.donationRepo.find({
          where: { campaignId: this.args.campaignId },
          include: {
            donor: true
          }
        });

        // Load existing blessings for this campaign
        const blessings = await this.blessingRepo.find({
          where: { campaignId: this.args.campaignId },
          include: {
            blessingBookType: true
          }
        });

        // Group by donor and create DonorBlessing objects
        const donorMap = new Map<string, DonorBlessing>();

        // First create entries from donations
        for (const donation of donations) {
          if (!donation.donor) continue;

          const donorId = donation.donorId;
          if (!donorMap.has(donorId)) {
            donorMap.set(donorId, {
              donor: donation.donor,
              donation: undefined,
              blessing: undefined,
              blessingStatus: 'none',
              totalDonated: 0,
              matchingDonationsCount: 0
            });
          }

          const donorBlessing = donorMap.get(donorId)!;
          donorBlessing.totalDonated += donation.amount;
        }

        // Add blessing information
        for (const blessing of blessings) {
          const donorBlessing = donorMap.get(blessing.donorId);
          if (donorBlessing) {
            donorBlessing.blessing = blessing;
            donorBlessing.blessingStatus = this.getBlessingStatus(blessing);
          }
        }

        // Now match donations to blessing types
        for (const donation of donations) {
          if (!donation.donor) continue;

          const donorId = donation.donorId;
          const donorBlessing = donorMap.get(donorId);

          if (donorBlessing) {
            // If we have a blessing with a type, count and match donations
            if (donorBlessing.blessing?.blessingBookType) {
              const expectedAmount = donorBlessing.blessing.blessingBookType.price;
              if (donation.amount === expectedAmount) {
                donorBlessing.matchingDonationsCount++;
                if (!donorBlessing.donation) {
                  donorBlessing.donation = donation;
                }
              }
            } else if (!donorBlessing.donation) {
              // If no blessing type yet, just keep the first donation
              donorBlessing.donation = donation;
            }
          }
        }

        this.donorBlessings = Array.from(donorMap.values());
      }

      this.calculateStatistics();

    } catch (error) {
      console.error('Error loading campaign blessing book:', error);
      this.ui.error('שגיאה בטעינת ספר הברכות');
    } finally {
      this.loading = false;
    }
  }

  getBlessingStatus(blessing: Blessing): 'pending' | 'sent' | 'received' | 'none' {
    if (!blessing.blessingContent || blessing.blessingContent.trim() === '') {
      return 'pending';
    }
    if (blessing.status === 'אישר') {
      return 'received';
    }
    if (blessing.status === 'בתהליך') {
      return 'sent';
    }
    return 'pending';
  }

  calculateStatistics() {
    this.totalDonors = this.donorBlessings.length;
    this.pendingBlessings = this.donorBlessings.filter(db => db.blessingStatus === 'pending').length;
    this.sentBlessings = this.donorBlessings.filter(db => db.blessingStatus === 'sent').length;
    this.receivedBlessings = this.donorBlessings.filter(db => db.blessingStatus === 'received').length;
  }

  get filteredDonorBlessings(): DonorBlessing[] {
    return this.donorBlessings.filter(donorBlessing => {
      const matchesText = !this.filterText ||
        donorBlessing.donor.fullName?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        donorBlessing.donor.phone?.includes(this.filterText) ||
        donorBlessing.donor.email?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        donorBlessing.blessing?.blessingContent?.toLowerCase().includes(this.filterText.toLowerCase());

      const matchesStatus = !this.filterStatus ||
        donorBlessing.blessingStatus === this.filterStatus;

      const matchesLevel = !this.filterLevel ||
        donorBlessing.donor.level === this.filterLevel;

      const matchesBlessingType = !this.filterBlessingType ||
        donorBlessing.blessing?.blessingBookTypeId === this.filterBlessingType;

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
      // Create or update blessing with selected type
      let blessing = donorBlessing.blessing;
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
    // Create or find blessing
    let blessing = donorBlessing.blessing;
    if (!blessing) {
      blessing = this.blessingRepo.create();
      blessing.donorId = donorBlessing.donor.id;
      blessing.campaignId = this.args.campaignId;
      blessing.name = donorBlessing.donor.fullName || '';
    }

    // Open blessing text edit dialog
    const text = await openDialog(BlessingTextEditModalComponent, (dlg) => {
      dlg.args = {
        initialText: blessing!.blessingContent || '',
        donorName: donorBlessing.donor.fullName || ''
      };
    }) as string | undefined;

    if (text !== undefined && text !== null) {
      blessing.blessingContent = text;
      if (typeof text === 'string' && text.trim() !== '') {
        blessing.status = 'אישר';
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
      donorBlessing.blessing.status = 'בתהליך';
      await donorBlessing.blessing.save();
      donorBlessing.blessingStatus = this.getBlessingStatus(donorBlessing.blessing);
      this.calculateStatistics();
      this.ui.info('הברכה סומנה כנשלחה');
    } catch (error) {
      console.error('Error marking blessing as sent:', error);
      this.ui.error('שגיאה בסימון הברכה כנשלחה');
    }
  }

  async openDonorDetails(donor: Donor) {
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

  async openDonationDetails(donation: Donation | undefined) {
    if (!donation) return;

    const result = await this.ui.donationDetailsDialog(donation.id);
    if (result) {
      // Reload data to reflect any changes
      await this.loadData();
    }
  }

  getTruncatedBlessingText(text: string | undefined, maxLength: number = 30): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  async exportToExcel() {
    if (!this.campaign) return;

    const dataToExport = this.filteredDonorBlessings;

    if (dataToExport.length === 0) {
      this.snackBar.open('אין נתונים לייצוא', 'סגור', { duration: 3000 });
      return;
    }

    // הגדרת עמודות
    const columns: ExcelColumn<DonorBlessing>[] = [
      { header: 'שם תורם', mapper: (db) => db.donor.fullName || '-', width: 20 },
      { header: 'טלפון', mapper: (db) => db.donor.phone || '-', width: 15 },
      { header: 'אימייל', mapper: (db) => db.donor.email || '-', width: 25 },
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
      fileName: this.excelService.generateFileName(`ספר_ברכות_${this.campaign.name}`),
      includeStats: true,
      stats: [
        { label: 'שם קמפיין', value: this.campaign.name },
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

  closeModal() {
    this.dialogRef.close();
  }
}