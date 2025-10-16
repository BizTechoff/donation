import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Certificate } from '../../../../shared/entity/certificate';
import { Donor } from '../../../../shared/entity/donor';
import { Donation } from '../../../../shared/entity/donation';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { SharedComponentsModule } from '../../../shared/shared-components.module';

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
  shouldClose = false;

  certificate!: Certificate;
  donors: Donor[] = [];
  selectedDonorId = '';
  showPreview = false;
  loading = false;
  isNewCertificate = false;

  donorRepo = remult.repo(Donor);
  certificateRepo = remult.repo(Certificate);
  donationRepo = remult.repo(Donation);

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef) {}

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
      await this.certificate.save();
      this.changed = true;
      this.shouldClose = true;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving certificate:', error);
    }
  }

  onClose() {
    this.shouldClose = true;
    this.cdr.detectChanges();
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
      console.log('File selected:', file.name, file.type, file.size);
      // TODO: Handle file upload - store in certificate or upload to server
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
}