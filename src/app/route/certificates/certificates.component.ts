import { Component, OnInit } from '@angular/core';
import { Certificate } from '../../../shared/entity/certificate';
import { Donor } from '../../../shared/entity/donor';
import { repo } from 'remult';

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

  constructor() { }

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
        this.newCertificate.typeText = 'תעודת תרומה';
        this.newCertificate.mainTitle = 'תעודת הוקרה על תרומה';
        break;
      case 'memorial':
        this.newCertificate.typeText = 'נציב זיכרון';
        this.newCertificate.mainTitle = 'נציב לזכר נפטר';
        break;
      case 'dedication':
        this.newCertificate.typeText = 'הקדשה';
        this.newCertificate.mainTitle = 'תעודת הקדשה';
        break;
      case 'appreciation':
        this.newCertificate.typeText = 'הוקרה';
        this.newCertificate.mainTitle = 'תעודת הוקרה';
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
      this.newCertificate.statusText = 'טיוטה';
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
    return certificate.donor?.fullName || 'לא ידוע';
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