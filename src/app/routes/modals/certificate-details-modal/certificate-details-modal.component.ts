import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { Certificate } from '../../../../shared/entity/certificate';
import { Donor } from '../../../../shared/entity/donor';
import { Donation } from '../../../../shared/entity/donation';
import { Reminder } from '../../../../shared/entity/reminder';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { ReminderDetailsModalComponent } from '../reminder-details-modal/reminder-details-modal.component';
import { DonorSelectionModalComponent } from '../donor-selection-modal/donor-selection-modal.component';

export interface CertificateDetailsModalArgs {
  certificateId?: string; // 'new' for new certificate or certificate ID for editing
  donorId?: string; // Optional donor ID to pre-select
  donationId?: string; // Optional donation ID to link
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-certificate-details-modal',
  templateUrl: './certificate-details-modal.component.html',
  styleUrl: './certificate-details-modal.component.scss'})
export class CertificateDetailsModalComponent implements OnInit {
  args!: CertificateDetailsModalArgs;
  changed = false;

  certificate!: Certificate;
  selectedDonor?: Donor;
  selectedDonorId = '';
  showPreview = false;
  loading = false;
  isNewCertificate = false;
  hasReminderFlag = false;

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

    // Load selected donor if exists
    if (this.selectedDonorId) {
      this.selectedDonor = await this.donorRepo.findId(this.selectedDonorId) || undefined;
    }

    // Check if reminder exists for existing certificate
    if (!this.isNewCertificate && this.certificate.id) {
      await this.checkReminder();
    }

    this.loading = false;
  }

  private async checkReminder() {
    if (!this.certificate?.id) {
      this.hasReminderFlag = false;
      return;
    }
    try {
      const reminder = await remult.repo(Reminder).findFirst({
        sourceEntityType: 'certificate',
        sourceEntityId: this.certificate.id
      });
      this.hasReminderFlag = !!reminder;
    } catch (error) {
      this.hasReminderFlag = false;
    }
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
      case 'memorialDay':
        this.certificate.typeText = this.i18n.terms.memorialDay;
        this.certificate.mainTitle = this.i18n.terms.memorialDay;
        break;
      case 'appreciation':
        this.certificate.typeText = this.i18n.terms.appreciation;
        this.certificate.mainTitle = this.i18n.terms.mainTitlePlaceholder;
        break;
    }
    this.changed = true;
  }

  async openDonorSelectionModal() {
    try {
      const selectedDonor = await openDialog(
        DonorSelectionModalComponent,
        (modal: DonorSelectionModalComponent) => {
          modal.args = {
            title: 'בחירת תורם',
            multiSelect: false
          };
        }
      ) as Donor | null;

      if (selectedDonor) {
        this.selectedDonor = selectedDonor;
        this.selectedDonorId = selectedDonor.id;
        this.certificate.donorId = selectedDonor.id;
        this.certificate.donor = selectedDonor;
        this.changed = true;
      }
    } catch (error) {
      console.error('Error opening donor selection modal:', error);
      this.ui.info('שגיאה בפתיחת חלון בחירת תורם');
    }
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

    // Check if reminder already exists by querying with sourceEntityType/sourceEntityId
    const existingReminder = await remult.repo(Reminder).findFirst({
      sourceEntityType: 'certificate',
      sourceEntityId: this.certificate.id
    });
    const reminderId = existingReminder?.id || 'new';

    // Prepare reminder args based on certificate type
    let reminderType: 'memorialDay' | 'memorial' | undefined;
    let isRecurringYearly = false;

    if (this.certificate.type === 'memorialDay') {
      reminderType = 'memorialDay';
      isRecurringYearly = false; // One-time reminder
    } else if (this.certificate.type === 'memorial') {
      reminderType = 'memorial';
      isRecurringYearly = true; // Yearly recurring reminder
    }

    const donorName = this.certificate.donor ?
      `${this.certificate.donor.firstName || ''} ${this.certificate.donor.lastName || ''}`.trim() :
      'תורם';

    const result = await this.ui.reminderDetailsDialog(reminderId, {
      donorId: this.certificate.donorId,
      reminderType: reminderType,
      reminderDate: this.certificate.eventDate,
      isRecurringYearly: isRecurringYearly,
      sourceEntity: 'certificate',
      donorName: donorName,
      sourceEntityType: 'certificate',
      sourceEntityId: this.certificate.id
    });

    if (result && reminderId === 'new' && typeof result === 'string') {
      // Reminder is now linked via sourceEntityType/sourceEntityId - no need to save certificate
      this.ui.info('תזכורת נוצרה ונשמרה בהצלחה');
    }

    // Update flag after creating/editing reminder
    await this.checkReminder();
  }
}