import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Certificate } from '../../../../shared/entity/certificate';
import { Donor } from '../../../../shared/entity/donor';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';

export interface CertificateDetailsModalArgs {
  certificateId?: string;
}

@Component({
  selector: 'app-certificate-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(public i18n: I18nService) {}

  async ngOnInit() {
    this.loading = true;

    if (!this.args.certificateId || this.args.certificateId === 'new') {
      this.isNewCertificate = true;
      this.certificate = new Certificate();
      this.certificate.eventDate = new Date();
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
    } catch (error) {
      console.error('Error saving certificate:', error);
    }
  }

  onClose() {
    this.shouldClose = true;
  }

  openPreview() {
    this.showPreview = true;
  }

  closePreview() {
    this.showPreview = false;
  }

  get currentDate(): Date {
    return new Date();
  }
}