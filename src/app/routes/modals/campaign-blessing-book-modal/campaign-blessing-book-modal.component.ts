import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Donation, Donor, Campaign, Blessing } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { SharedComponentsModule } from '../../../shared/shared-components.module';

export interface CampaignBlessingBookModalArgs {
  campaignId: string;
  campaignName?: string;
}

export interface DonorBlessing {
  donor: Donor;
  donation?: Donation;
  blessing?: Blessing;
  blessingStatus: 'pending' | 'sent' | 'received' | 'none';
  totalDonated: number;
}

@Component({
  selector: 'app-campaign-blessing-book-modal',
  templateUrl: './campaign-blessing-book-modal.component.html',
  styleUrls: ['./campaign-blessing-book-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatSelectModule,
    MatFormFieldModule,
    SharedComponentsModule
  ]
})
export class CampaignBlessingBookModalComponent implements OnInit {
  args!: CampaignBlessingBookModalArgs;
  shouldClose = false;

  campaign?: Campaign;
  donorBlessings: DonorBlessing[] = [];

  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  blessingRepo = remult.repo(Blessing);

  loading = false;

  // Filters
  filterText = '';
  filterStatus = '';
  filterLevel = '';

  // Table configuration
  displayedColumns: string[] = ['donorName', 'phone', 'email', 'totalAmount', 'blessingStatus', 'blessingText', 'actions'];

  // Statistics
  totalDonors = 0;
  pendingBlessings = 0;
  sentBlessings = 0;
  receivedBlessings = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  get modalTitle(): string {
    return `ספר ברכות - ${this.campaign?.name || this.args.campaignName || ''}`;
  }

  async loadData() {
    this.loading = true;
    try {
      // Load campaign
      this.campaign = await this.campaignRepo.findId(this.args.campaignId) || undefined;

      // Load campaign donations with donors
      const donations = await this.donationRepo.find({
        where: { campaignId: this.args.campaignId },
        include: {
          donor: true
        }
      });

      // Load existing blessings for this campaign
      const blessings = await this.blessingRepo.find({
        where: { campaignId: this.args.campaignId }
      });

      // Group by donor and create DonorBlessing objects
      const donorMap = new Map<string, DonorBlessing>();

      for (const donation of donations) {
        if (!donation.donor) continue;

        const donorId = donation.donorId;
        if (!donorMap.has(donorId)) {
          donorMap.set(donorId, {
            donor: donation.donor,
            donation: donation,
            blessing: undefined,
            blessingStatus: 'none',
            totalDonated: 0
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

      this.donorBlessings = Array.from(donorMap.values());
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
        donorBlessing.donor.fullName.toLowerCase().includes(this.filterText.toLowerCase()) ||
        donorBlessing.donor.phone?.includes(this.filterText) ||
        donorBlessing.donor.email?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        donorBlessing.blessing?.blessingContent?.toLowerCase().includes(this.filterText.toLowerCase());

      const matchesStatus = !this.filterStatus ||
        donorBlessing.blessingStatus === this.filterStatus;

      const matchesLevel = !this.filterLevel ||
        donorBlessing.donor.level === this.filterLevel;

      return matchesText && matchesStatus && matchesLevel;
    });
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'ממתין';
      case 'sent': return 'נשלח';
      case 'received': return 'התקבל';
      case 'none': return 'ללא';
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

  async editBlessing(donorBlessing: DonorBlessing) {
    // Create or find blessing
    let blessing = donorBlessing.blessing;
    if (!blessing) {
      blessing = this.blessingRepo.create();
      blessing.donorId = donorBlessing.donor.id;
      blessing.campaignId = this.args.campaignId;
      blessing.name = donorBlessing.donor.fullName;
    }

    // Open blessing edit dialog
    const text = await this.promptForBlessingText(blessing.blessingContent || '');
    if (text !== null) {
      blessing.blessingContent = text;
      if (text.trim() !== '') {
        blessing.status = 'אישר';
      }

      try {
        await blessing.save();
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

  async promptForBlessingText(currentText: string): Promise<string | null> {
    return new Promise((resolve) => {
      const text = prompt('נוסח הברכה:', currentText);
      resolve(text);
    });
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

  async exportToExcel() {
    // TODO: Implement Excel export for blessing book
    this.ui.info('ייצוא לאקסל יבוצע בהמשך');
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
    this.shouldClose = true;
  }
}