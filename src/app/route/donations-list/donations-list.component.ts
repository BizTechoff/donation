import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Donation, Donor, Campaign, DonationMethod } from '../../../shared/entity';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-donations-list',
  templateUrl: './donations-list.component.html',
  styleUrls: ['./donations-list.component.scss']
})
export class DonationsListComponent implements OnInit {
  
  donations: Donation[] = [];
  donors: Donor[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];
  
  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  
  loading = false;
  showAddDonationModal = false;
  editingDonation?: Donation;
  today = new Date().toISOString().split('T')[0];
  
  completedDonationsCountCache = 0;
  
  // תצוגה מקדימה ונתונים נוספים
  showPreview = false;
  hebrewDate = '';
  fundraiserName = '';

  constructor(public i18n: I18nService) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadDonations(),
        this.loadDonors(),
        this.loadCampaigns(),
        this.loadDonationMethods()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDonations() {
    this.donations = await this.donationRepo.find({
      orderBy: { donationDate: 'desc' },
      include: {
        donor: true,
        campaign: true,
        donationMethod: true,
        createdBy: true
      }
    });
    
    // Calculate completed donations count once after loading
    this.completedDonationsCountCache = this.donations.filter(d => d.status === 'completed').length;
  }

  async loadDonors() {
    this.donors = await this.donorRepo.find({
      where: { isActive: true },
      orderBy: { lastName: 'asc' }
    });
  }

  async loadCampaigns() {
    this.campaigns = await this.campaignRepo.find({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async loadDonationMethods() {
    this.donationMethods = await this.donationMethodRepo.find({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async createDonation() {
    this.editingDonation = this.donationRepo.create();
    this.editingDonation.donationDate = new Date();
    this.editingDonation.currency = 'ILS';
    this.hebrewDate = '';
    this.fundraiserName = '';
    this.showPreview = false;
    this.showAddDonationModal = true;
  }

  async editDonation(donation: Donation) {
    this.editingDonation = donation;
    this.showAddDonationModal = true;
  }

  async saveDonation() {
    if (!this.editingDonation) return;

    try {
      await this.editingDonation.save();
      
      if (this.editingDonation.donationMethod) {
        await this.editingDonation.donationMethod.updateStats(this.editingDonation.amount);
      }
      
      if (this.editingDonation.campaign) {
        await this.editingDonation.campaign.updateRaisedAmount(this.editingDonation.amount);
      }

      await this.loadDonations(); // This will also update the cache
      this.closeModal();
    } catch (error) {
      console.error('Error saving donation:', error);
    }
  }

  async deleteDonation(donation: Donation) {
    const confirmMessage = this.i18n.currentTerms.confirmDeleteDonation?.replace('{donor}', donation.donor?.displayName || '') || '';
    if (confirm(confirmMessage)) {
      try {
        await donation.delete();
        await this.loadDonations(); // This will also update the cache
      } catch (error) {
        console.error('Error deleting donation:', error);
      }
    }
  }

  async issueReceipt(donation: Donation) {
    try {
      await donation.issueReceipt();
      await this.loadDonations(); // This will also update the cache
    } catch (error) {
      console.error('Error issuing receipt:', error);
    }
  }

  async cancelDonation(donation: Donation) {
    const confirmMessage = this.i18n.currentTerms.confirmCancelDonation?.replace('{donor}', donation.donor?.displayName || '') || '';
    if (confirm(confirmMessage)) {
      try {
        await donation.cancelDonation();
        await this.loadDonations(); // This will also update the cache
      } catch (error) {
        console.error('Error canceling donation:', error);
      }
    }
  }

  closeModal() {
    this.showAddDonationModal = false;
    this.editingDonation = undefined;
    this.showPreview = false;
    this.hebrewDate = '';
    this.fundraiserName = '';
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  async saveDonationAndExit() {
    await this.saveDonation();
    // הפונקציה saveDonation כבר סוגרת את המודל אם הצליחה
  }

  getMethodDisplayName(method: string): string {
    if (!method) return 'לא צוין';
    switch (method) {
      case 'cash': return 'מזומן';
      case 'check': return 'צ\'ק';
      case 'credit': return 'כרטיס אשראי';
      case 'transfer': return 'העברה בנקאית';
      case 'standing': return 'הוראת קבע';
      default: return 'לא צוין';
    }
  }

  getCampaignDisplayName(campaign: string): string {
    if (!campaign) return 'לא צוין';
    switch (campaign) {
      case 'general': return 'כללי';
      case 'torah': return 'לימוד תורה';
      case 'charity': return 'צדקה';
      case 'building': return 'בניין';
      default: return 'לא צוין';
    }
  }

  // פונקציות עזר לתצוגה מקדימה
  getSelectedDonorName(): string {
    if (!this.editingDonation?.donorId) return '';
    const donor = this.donors.find(d => d.id === this.editingDonation!.donorId);
    return donor?.displayName || '';
  }

  getSelectedMethodName(): string {
    if (!this.editingDonation?.donationMethodId) return 'לא צוין';
    const method = this.donationMethods.find(m => m.id === this.editingDonation!.donationMethodId);
    return method?.name || 'לא צוין';
  }

  getSelectedCampaignName(): string {
    if (!this.editingDonation?.campaignId) return 'לא צוין';
    const campaign = this.campaigns.find(c => c.id === this.editingDonation!.campaignId);
    return campaign?.name || 'לא צוין';
  }

  getCurrencySymbol(): string {
    switch (this.editingDonation?.currency) {
      case 'ILS': return '₪';
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return '₪';
    }
  }

  // Getter and setter for date input
  get donationDateForInput(): string {
    return this.editingDonation?.donationDate?.toISOString().split('T')[0] || '';
  }

  set donationDateForInput(value: string) {
    if (this.editingDonation && value) {
      this.editingDonation.donationDate = new Date(value);
    }
  }

  get totalAmount(): number {
    return this.donations
      .filter(d => d.status === 'completed')
      .reduce((sum, donation) => sum + donation.amount, 0);
  }

  get pendingAmount(): number {
    return this.donations
      .filter(d => d.status === 'pending')
      .reduce((sum, donation) => sum + donation.amount, 0);
  }

  getDonorName(donation: Donation): string {
    return donation.donor?.displayName || this.i18n.currentTerms.unknown || '';
  }

  getCampaignName(donation: Donation): string {
    return donation.campaign?.name || this.i18n.currentTerms.withoutCampaign || '';
  }

  getMethodName(donation: Donation): string {
    return donation.donationMethod?.name || this.i18n.currentTerms.notSpecified || '';
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return this.i18n.currentTerms.pending || '';
      case 'completed': return this.i18n.currentTerms.completed || '';
      case 'cancelled': return this.i18n.currentTerms.cancelled || '';
      default: return status;
    }
  }

  get completedDonationsCount(): number {
    return this.completedDonationsCountCache;
  }
}