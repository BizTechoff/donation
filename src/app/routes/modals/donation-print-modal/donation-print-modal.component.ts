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
      const fileData: { file: DonationFile; url: string; tagPosition: TagPosition }[] = [];

      // Get URLs for all selected files
      for (const fs of selectedFiles) {
        const url = fs.previewUrl || await this.fileUploadService.getDownloadUrl(fs.file.id);
        if (url) {
          fileData.push({ file: fs.file, url, tagPosition: fs.tagPosition });
        }
      }

      // Generate and print HTML
      const printHtml = this.generatePrintHtml(fileData);
      this.executePrint(printHtml);

      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error printing donation:', error);
      this.ui.error('שגיאה בהדפסה');
    }
  }

  private generatePrintHtml(fileData: { file: DonationFile; url: string; tagPosition: TagPosition }[]): string {
    const donorName = this.donor?.fullName || this.donor?.lastAndFirstName || '';

    let html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>הדפסת תרומה - ${donorName}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 10mm;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      font-size: 14px;
      line-height: 1.5;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }

    .header h1 {
      font-size: 22px;
      margin-bottom: 3px;
    }

    .section {
      margin-bottom: 15px;
    }

    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #2c3e50;
      border-bottom: 1px solid #ddd;
      padding-bottom: 3px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 20px;
    }

    .info-item {
      display: flex;
      gap: 8px;
    }

    .info-label {
      font-weight: bold;
      color: #555;
      min-width: 100px;
    }

    .info-value {
      color: #333;
    }

    .amount-highlight {
      font-size: 22px;
      font-weight: bold;
      color: #27ae60;
      text-align: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      margin: 12px 0;
    }

    /* Scan item - fixed height for uniform look */
    .scan-item {
      position: relative;
      width: 100%;
      height: 250px;
      margin-top: 15px;
      page-break-inside: avoid;
    }

    .scan-item:first-child {
      margin-top: 15px;
    }

    .scan-item img {
      width: 100%;
      height: 100%;
      object-fit: fill;
      display: block;
    }

    .scan-item .donor-tag {
      position: absolute;
      background: rgba(255, 255, 255, 0.95);
      padding: 5px 15px;
      font-weight: bold;
      font-size: 14px;
      border: 2px solid #333;
      z-index: 10;
    }

    /* Tag positions */
    .donor-tag.tag-top-left { top: 8px; left: 8px; }
    .donor-tag.tag-top-center { top: 8px; left: 50%; transform: translateX(-50%); }
    .donor-tag.tag-top-right { top: 8px; right: 8px; }
    .donor-tag.tag-bottom-left { bottom: 8px; left: 8px; }
    .donor-tag.tag-bottom-center { bottom: 8px; left: 50%; transform: translateX(-50%); }
    .donor-tag.tag-bottom-right { bottom: 8px; right: 8px; }
  </style>
</head>
<body>
`;

    // Add donation details if enabled
    if (this.printDonationDetails) {
      html += this.generateDonationDetailsHtml(donorName);
    }

    // Add scans - they flow naturally with page breaks
    if (this.printScans && fileData.length > 0) {
      html += this.generateScansHtml(fileData, donorName);
    }

    html += `
</body>
</html>
`;

    return html;
  }

  private generateDonationDetailsHtml(donorName: string): string {
    const donation = this.donation!;
    const donor = this.donor;

    return `
  <div class="header">
    <h1>פרטי תרומה</h1>
    <p>${this.getHebrewDate()}</p>
  </div>

  <div class="amount-highlight">
    ${this.getCurrencySymbol()}${donation.amount.toLocaleString('he-IL')}
  </div>

  <div class="section">
    <div class="section-title">פרטי התורם</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">שם מלא:</span>
        <span class="info-value">${donor?.fullName || donor?.lastAndFirstName || '-'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">שם באנגלית:</span>
        <span class="info-value">${donor?.fullNameEnglish || '-'}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">פרטי התרומה</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">סוג תרומה:</span>
        <span class="info-value">${this.getDonationTypeDisplay()}</span>
      </div>
      <div class="info-item">
        <span class="info-label">אמצעי תשלום:</span>
        <span class="info-value">${donation.donationMethod?.name || '-'}</span>
      </div>
      ${donation.campaign ? `
      <div class="info-item">
        <span class="info-label">קמפיין:</span>
        <span class="info-value">${donation.campaign.name}</span>
      </div>
      ` : ''}
      ${donation.checkNumber ? `
      <div class="info-item">
        <span class="info-label">מספר צ'ק:</span>
        <span class="info-value">${donation.checkNumber}</span>
      </div>
      ` : ''}
      ${donation.reason ? `
      <div class="info-item">
        <span class="info-label">סיבה:</span>
        <span class="info-value">${donation.reason}</span>
      </div>
      ` : ''}
      ${donation.notes ? `
      <div class="info-item">
        <span class="info-label">הערות:</span>
        <span class="info-value">${donation.notes}</span>
      </div>
      ` : ''}
    </div>
  </div>
  <div style="height: 100px;"></div>
`;
  }

  private generateScansHtml(fileData: { file: DonationFile; url: string; tagPosition: TagPosition }[], donorName: string): string {
    // Images flow naturally - each image stretches to full width
    // Page breaks happen automatically when content doesn't fit
    return fileData.map(f => `
  <div class="scan-item">
    ${f.tagPosition !== 'none' ? `<div class="donor-tag tag-${f.tagPosition}">${donorName}</div>` : ''}
    <img src="${f.url}" alt="${f.file.fileName}" />
  </div>
`).join('');
  }

  private executePrint(html: string) {
    // Create hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      // Wait for all images to load before printing
      const images = iframeDoc.querySelectorAll('img');
      let loadedCount = 0;
      const totalImages = images.length;

      const tryPrint = () => {
        loadedCount++;
        if (loadedCount >= totalImages) {
          setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 500);
          }, 300);
        }
      };

      if (totalImages === 0) {
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 500);
        }, 100);
      } else {
        images.forEach((img) => {
          if (img.complete) {
            tryPrint();
          } else {
            img.onload = tryPrint;
            img.onerror = tryPrint;
          }
        });
      }
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }
}
