import { Component, OnInit } from '@angular/core';
import { Certificate } from '../../../shared/entity/certificate';
import { Donor } from '../../../shared/entity/donor';
import { repo } from 'remult';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';

@Component({
  selector: 'app-certificates',
  templateUrl: './certificates.component.html',
  styleUrls: ['./certificates.component.scss'],
  standalone: false
})
export class CertificatesComponent implements OnInit {

  certificates: Certificate[] = [];

  constructor(public i18n: I18nService, private ui: UIToolsService) { }

  async ngOnInit() {
    await this.loadCertificates();
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

  async openCreateModal() {
    if (await this.ui.certificateDetailsDialog('new')) {
      await this.loadCertificates();
    }
  }

  async openEditModal(certificate: Certificate) {
    if (await this.ui.certificateDetailsDialog(certificate.id)) {
      await this.loadCertificates();
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

}