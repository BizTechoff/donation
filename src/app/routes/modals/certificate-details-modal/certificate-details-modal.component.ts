import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Certificate } from '../../../../shared/entity/certificate';
import { Donor } from '../../../../shared/entity/donor';
import { Donation } from '../../../../shared/entity/donation';
import { Reminder } from '../../../../shared/entity/reminder';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { UIToolsService } from '../../../common/UIToolsService';
import { ReminderDetailsModalComponent } from '../reminder-details-modal/reminder-details-modal.component';

export interface CertificateDetailsModalArgs {
  certificateId?: string; // 'new' for new certificate or certificate ID for editing
  donorId?: string; // Optional donor ID to pre-select
  donationId?: string; // Optional donation ID to link
}

@Component({
  selector: 'app-certificate-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedComponentsModule],
  templateUrl: './certificate-details-modal.component.html',
  styleUrl: './certificate-details-modal.component.scss'
})
export class CertificateDetailsModalComponent implements OnInit {
  args!: CertificateDetailsModalArgs;
  changed = false;

  certificate!: Certificate;
  donors: Donor[] = [];
  selectedDonorId = '';
  showPreview = false;
  loading = false;
  isNewCertificate = false;

  donorRepo = remult.repo(Donor);
  certificateRepo = remult.repo(Certificate);
  donationRepo = remult.repo(Donation);
  reminderRepo = remult.repo(Reminder);

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CertificateDetailsModalComponent>
  ) {}

  async ngOnInit() {
    this.loading = true;

    if (!this.args.certificateId || this.args.certificateId === 'new') {
      this.isNewCertificate = true;
      this.certificate = new Certificate();
      this.certificate.eventDate = new Date();

      // Pre-select donor if donorId is provided
      if (this.args.donorId) {
        this.selectedDonorId = this.args.donorId;
        this.certificate.donorId = this.args.donorId;
      }

      // Load donation details if donationId is provided
      if (this.args.donationId) {
        await this.loadDonationDetails(this.args.donationId);
      }
    } else {
      const cert = await this.certificateRepo.findId(this.args.certificateId, {
        include: {
          donor: true
        }
      });
      if (cert) {
        this.certificate = cert;
        this.selectedDonorId = cert.donorId;
      }
    }

    await this.loadDonors();
    this.loading = false;
  }

  async loadDonors() {
    this.donors = await this.donorRepo.find({
      where: { isActive: true },
      orderBy: { firstName: 'asc' }
    });
  }

  get eventDateForInput(): string {
    return this.certificate?.eventDate?.toISOString().split('T')[0] || '';
  }

  set eventDateForInput(value: string) {
    if (this.certificate) {
      this.certificate.eventDate = value ? new Date(value) : new Date();
      this.changed = true;
    }
  }

  onCertificateTypeChange() {
    if (!this.certificate) return;

    switch (this.certificate.type) {
      case 'donation':
        this.certificate.typeText = this.i18n.terms.donationCertificate;
        this.certificate.mainTitle = this.i18n.terms.mainTitlePlaceholder;
        break;
      case 'memorial':
        this.certificate.typeText = this.i18n.terms.memorialCertificate;
        this.certificate.mainTitle = this.i18n.terms.memorialCertificate;
        break;
      case 'dedication':
        this.certificate.typeText = this.i18n.terms.dedication;
        this.certificate.mainTitle = this.i18n.terms.dedication;
        break;
      case 'appreciation':
        this.certificate.typeText = this.i18n.terms.appreciation;
        this.certificate.mainTitle = this.i18n.terms.mainTitlePlaceholder;
        break;
    }
    this.changed = true;
  }

  onDonorChange() {
    if (!this.certificate) return;

    this.certificate.donorId = this.selectedDonorId;
    const selectedDonor = this.donors.find(d => d.id === this.selectedDonorId);
    if (selectedDonor) {
      this.certificate.donor = selectedDonor;
    }
    this.changed = true;
  }

  async save() {
    if (!this.certificate) return;

    try {
      this.certificate.statusText = this.i18n.terms.draftStatusCert;
      await this.certificateRepo.save(this.certificate);
      this.changed = true;
      this.ui.info(this.isNewCertificate ? 'התעודה נוספה בהצלחה' : 'התעודה עודכנה בהצלחה');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving certificate:', error);
      this.ui.info(`שגיאה בשמירת התעודה: ${error}`);
    }
  }

  onClose() {
    this.dialogRef.close(this.changed);
  }

  openPreview() {
    this.showPreview = true;
  }

  closePreview() {
    this.showPreview = false;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Add file to attachments array (path is placeholder until server upload is implemented)
      if (!this.certificate.attachments) {
        this.certificate.attachments = [];
      }

      this.certificate.attachments.push({
        name: file.name,
        path: '#', // TODO: Replace with actual upload URL when implemented
        size: file.size
      });

      this.changed = true;
      alert(`הקובץ "${file.name}" נוסף לרשימת הקבצים (העלאה לשרת - עדיין בפיתוח)`);
    }
  }

  get currentDate(): Date {
    return new Date();
  }

  async loadDonationDetails(donationId: string) {
    try {
      const donation = await this.donationRepo.findId(donationId, {
        include: {
          donor: true,
          campaign: true
        }
      });

      if (donation) {
        // Pre-fill certificate details from donation
        this.certificate.amount = donation.amount;
        this.certificate.eventDate = donation.donationDate;

        // Set donor information
        if (donation.donor) {
          this.selectedDonorId = donation.donorId;
          this.certificate.donorId = donation.donorId;
        }

        // Set certificate type based on donation
        this.certificate.type = 'donation';
        this.certificate.typeText = this.i18n.terms.donationCertificate;
      }
    } catch (error) {
      console.error('Error loading donation details:', error);
    }
  }

  async createOrEditReminder() {
    if (!this.certificate) return;

    // Save certificate first if it's new
    if (this.isNewCertificate || this.changed) {
      if (!this.certificate.donorId) {
        this.ui.info('יש לבחור תורם לפני יצירת תזכורת');
        return;
      }

      try {
        this.certificate.statusText = this.i18n.terms.draftStatusCert;
        await this.certificateRepo.save(this.certificate);
        this.changed = true;
        this.isNewCertificate = false;
      } catch (error) {
        this.ui.info('שגיאה בשמירת התעודה');
        return;
      }
    }

    // Check if reminder already exists
    const reminderId = this.certificate.reminderId || 'new';

    // Prepare reminder args based on certificate type
    let reminderType: 'dedication' | 'memorial' | undefined;
    let isRecurringYearly = false;

    if (this.certificate.type === 'dedication') {
      reminderType = 'dedication';
      isRecurringYearly = false; // One-time reminder
    } else if (this.certificate.type === 'memorial') {
      reminderType = 'memorial';
      isRecurringYearly = true; // Yearly recurring reminder
    }

    const reminderSaved = await ReminderDetailsModalComponent.open({
      reminderId: reminderId,
      donorId: this.certificate.donorId,
      reminderType: reminderType,
      reminderDate: this.certificate.eventDate,
      isRecurringYearly: isRecurringYearly
    });

    if (reminderSaved && reminderId === 'new') {
      // Reload certificate to get the updated reminderId
      const reloadedCert = await this.certificateRepo.findId(this.certificate.id, {
        include: { reminder: true }
      });
      if (reloadedCert) {
        this.certificate.reminderId = reloadedCert.reminderId;
        this.certificate.reminder = reloadedCert.reminder;
      }
      this.ui.info('תזכורת נוצרה בהצלחה');
    }
  }
}