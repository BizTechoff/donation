import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Donation, Donor, Campaign, DonationMethod } from '../../../../shared/entity';
import { DonationFile } from '../../../../shared/entity/file';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { FileUploadService } from '../../../services/file-upload.service';
import { PayerService } from '../../../services/payer.service';
import { HebrewDateService } from '../../../services/hebrew-date.service';
import { PrintService, DonationPrintData } from '../../../services/print.service';

export interface DonationPrintModalArgs {
  donationId: string;
}

export type TagPosition = 'none' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface FileWithSettings {
  file: DonationFile;
  selected: boolean;
  tagPosition: TagPosition;
  previewUrl?: string;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '900px',
  maxHeight: '90vh',
  panelClass: 'donation-print-dialog-panel'
})
@Component({
  selector: 'app-donation-print-modal',
  templateUrl: './donation-print-modal.component.html',
  styleUrls: ['./donation-print-modal.component.scss']
})
export class DonationPrintModalComponent implements OnInit {
  args!: DonationPrintModalArgs;

  donation?: Donation;
  donor?: Donor;
  filesWithSettings: FileWithSettings[] = [];

  // Print options
  scansPerPage = 4;
  printDonationDetails = true;
  printScans = true;
  defaultTagPosition: TagPosition = 'top-right';

  loading = false;

  // Tag position options for display
  tagPositions: { value: TagPosition; label: string; icon: string }[] = [
    { value: 'top-right', label: 'למעלה ימין', icon: '↗' },
    { value: 'top-center', label: 'למעלה אמצע', icon: '↑' },
    { value: 'top-left', label: 'למעלה שמאל', icon: '↖' },
    { value: 'bottom-right', label: 'למטה ימין', icon: '↘' },
    { value: 'bottom-center', label: 'למטה אמצע', icon: '↓' },
    { value: 'bottom-left', label: 'למטה שמאל', icon: '↙' }
  ];

  // Currency types from service
  currencyTypes = this.payerService.getCurrencyTypesRecord();

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private fileUploadService: FileUploadService,
    private payerService: PayerService,
    private hebrewDateService: HebrewDateService,
    private printService: PrintService,
    public dialogRef: MatDialogRef<DonationPrintModalComponent>
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    this.loading = true;
    try {
      // Load donation with relations
      this.donation = await remult.repo(Donation).findId(this.args.donationId, {
        include: {
          donor: true,
          campaign: true,
          donationMethod: true,
          organization: true,
          bank: true
        }
      }) || undefined;

      if (this.donation) {
        this.donor = this.donation.donor;

        // Load attached files
        const files = await this.fileUploadService.getFilesByDonation(this.args.donationId);

        // Create file settings with preview URLs
        this.filesWithSettings = await Promise.all(files.map(async (file) => {
          let previewUrl: string | undefined;
          if (file.fileType.startsWith('image/')) {
            previewUrl = await this.fileUploadService.getDownloadUrl(file.id) || undefined;
          }
          return {
            file,
            selected: true,
            tagPosition: this.defaultTagPosition,
            previewUrl
          };
        }));
      }
    } catch (error) {
      console.error('Error loading donation data:', error);
      this.ui.error('שגיאה בטעינת נתוני התרומה');
    } finally {
      this.loading = false;
    }
  }

  toggleFileSelection(fileSettings: FileWithSettings) {
    fileSettings.selected = !fileSettings.selected;
  }

  getSelectedCount(): number {
    return this.filesWithSettings.filter(f => f.selected).length;
  }

  selectAllFiles() {
    this.filesWithSettings.forEach(f => f.selected = true);
  }

  deselectAllFiles() {
    this.filesWithSettings.forEach(f => f.selected = false);
  }

  applyDefaultToAll() {
    this.filesWithSettings.forEach(f => f.tagPosition = this.defaultTagPosition);
  }

  getFileIcon(fileType: string): string {
    return this.fileUploadService.getFileIcon(fileType);
  }

  formatFileSize(bytes: number): string {
    return this.fileUploadService.formatFileSize(bytes);
  }

  getCurrencySymbol(): string {
    if (!this.donation?.currencyId) return '₪';
    return this.currencyTypes[this.donation.currencyId]?.symbol || '₪';
  }

  getDonationTypeDisplay(): string {
    if (!this.donation) return '';
    switch (this.donation.donationType) {
      case 'full': return 'תרומה מלאה';
      case 'commitment': return 'התחייבות';
      default: return this.donation.donationType;
    }
  }

  getHebrewDate(): string {
    if (!this.donation?.donationDate) return '';
    return this.hebrewDateService.convertGregorianToHebrew(new Date(this.donation.donationDate))?.formatted || '';
  }

  getTagPositionClass(position: TagPosition): string {
    return `tag-${position}`;
  }

  async print() {
    if (!this.donation) return;

    try {
      // Get selected files with URLs
      const selectedFiles = this.filesWithSettings.filter(f => f.selected && f.file.fileType.startsWith('image/'));
      const scans: { url: string; tagPosition: string }[] = [];
      for (const fs of selectedFiles) {
        const url = fs.previewUrl || await this.fileUploadService.getDownloadUrl(fs.file.id);
        if (url) {
          scans.push({ url, tagPosition: fs.tagPosition });
        }
      }

      // Build data and delegate to shared PrintService logic
      const item: DonationPrintData = {
        donorName: this.donor?.fullName || this.donor?.lastAndFirstName || '',
        donorNameEnglish: this.donor?.fullNameEnglish || '',
        amount: `${this.getCurrencySymbol()}${this.donation.amount.toLocaleString('he-IL')}`,
        hebrewDate: this.getHebrewDate(),
        donationType: this.getDonationTypeDisplay(),
        method: this.donation.donationMethod?.name || '-',
        campaign: this.donation.campaign?.name || '',
        checkNumber: this.donation.checkNumber || '',
        reason: this.donation.reason || '',
        notes: this.donation.notes || '',
        scans
      };

      this.printService.printDonations([item], this.printDonationDetails, this.printScans);
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error printing donation:', error);
      this.ui.error('שגיאה בהדפסה');
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }
}
