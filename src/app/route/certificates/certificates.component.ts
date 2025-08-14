import { Component, OnInit } from '@angular/core';
import { Certificate } from '../../../shared/entity/certificate';
import { Donor } from '../../../shared/entity/donor';
import { repo } from 'remult';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-certificates',
  templateUrl: './certificates.component.html',
  styleUrls: ['./certificates.component.scss']
})
export class CertificatesComponent implements OnInit {
  
  showCreateCertificateModal = false;
  showPreviewModal = false;
  certificates: Certificate[] = [];
  donors: Donor[] = [];
  
  newCertificate = new Certificate();
  selectedDonorId = '';

  constructor(public i18n: I18nService) { }

  async ngOnInit() {
    await this.loadCertificates();
    await this.loadDonors();
  }

  async loadCertificates() {
    this.certificates = await repo(Certificate).find({
      include: {
        donor: true,
        createdBy: true
      },
      orderBy: { createdDate: 'desc' }
    });
  }

  async loadDonors() {
    this.donors = await repo(Donor).find({
      where: { isActive: true },
      orderBy: { firstName: 'asc' }
    });
  }

  openCreateModal() {
    this.showCreateCertificateModal = true;
    this.newCertificate = new Certificate();
    this.newCertificate.eventDate = new Date();
    this.selectedDonorId = '';
  }

  get eventDateForInput(): string {
    return this.newCertificate.eventDate?.toISOString().split('T')[0] || '';
  }

  set eventDateForInput(value: string) {
    this.newCertificate.eventDate = value ? new Date(value) : new Date();
  }

  closeCreateModal() {
    this.showCreateCertificateModal = false;
  }

  onCertificateTypeChange(event: any) {
    const type = event.target.value;
    this.newCertificate.type = type as any;
    switch (type) {
      case 'donation':
        this.newCertificate.typeText = this.i18n.terms.donationCertificate;
        this.newCertificate.mainTitle = this.i18n.terms.mainTitlePlaceholder;
        break;
      case 'memorial':
        this.newCertificate.typeText = this.i18n.terms.memorialCertificate;
        this.newCertificate.mainTitle = this.i18n.terms.memorialCertificate;
        break;
      case 'dedication':
        this.newCertificate.typeText = this.i18n.terms.dedication;
        this.newCertificate.mainTitle = this.i18n.terms.dedication;
        break;
      case 'appreciation':
        this.newCertificate.typeText = this.i18n.terms.appreciation;
        this.newCertificate.mainTitle = this.i18n.terms.mainTitlePlaceholder;
        break;
    }
  }

  onDonorSelect(event: any) {
    const donorId = event.target.value;
    this.selectedDonorId = donorId;
    this.newCertificate.donorId = donorId;
    const selectedDonor = this.donors.find(d => d.id === donorId);
    if (selectedDonor) {
      this.newCertificate.donor = selectedDonor;
    }
  }

  async saveCertificate() {
    try {
      this.newCertificate.statusText = this.i18n.terms.draftStatusCert;
      await this.newCertificate.save();
      await this.loadCertificates();
      this.closeCreateModal();
    } catch (error) {
      console.error('Error saving certificate:', error);
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

  openPreview() {
    this.showPreviewModal = true;
  }

  closePreview() {
    this.showPreviewModal = false;
  }

  get currentDate(): Date {
    return new Date();
  }

}