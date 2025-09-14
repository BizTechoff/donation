import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { remult } from 'remult';
import { Donation, Donor, Campaign, DonationMethod } from '../../../shared/entity';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';

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

  constructor(public i18n: I18nService, private ui: UIToolsService, private route: ActivatedRoute) {}

  async ngOnInit() {
    await this.loadData();
    
    // Check for query parameters to handle actions from map popup
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add' && params['donorId']) {
        this.createDonationForDonor(params['donorId']);
      }
    });
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
    const changed = await this.ui.donationDetailsDialog('new');
    if (changed) {
      await this.loadDonations();
    }
  }

  async createDonationForDonor(donorId: string) {
    const changed = await this.ui.donationDetailsDialog('new', { donorId });
    if (changed) {
      await this.loadDonations();
    }
  }

  async editDonation(donation: Donation) {
    const changed = await this.ui.donationDetailsDialog(donation.id);
    if (changed) {
      await this.loadDonations();
    }
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
    // The saveDonation function already closes the modal if successful
  }

  getMethodDisplayName(method: string): string {
    if (!method) return this.i18n.currentTerms.notSpecified || '';
    switch (method) {
      case 'cash': return this.i18n.currentTerms.cash || '';
      case 'check': return this.i18n.currentTerms.check || '';
      case 'credit': return this.i18n.currentTerms.creditCard || '';
      case 'transfer': return this.i18n.currentTerms.bankTransfer || '';
      case 'standing': return this.i18n.currentTerms.standingOrder || '';
      default: return this.i18n.currentTerms.notSpecified || '';
    }
  }

  getCampaignDisplayName(campaign: string): string {
    if (!campaign) return this.i18n.currentTerms.notSpecified || '';
    switch (campaign) {
      case 'general': return this.i18n.currentTerms.general || '';
      case 'torah': return this.i18n.currentTerms.torah || '';
      case 'charity': return this.i18n.currentTerms.charity || '';
      case 'building': return this.i18n.currentTerms.building || '';
      default: return this.i18n.currentTerms.notSpecified || '';
    }
  }

  // Helper functions for preview
  getSelectedDonorName(): string {
    if (!this.editingDonation?.donorId) return '';
    const donor = this.donors.find(d => d.id === this.editingDonation!.donorId);
    return donor?.displayName || '';
  }

  getSelectedMethodName(): string {
    if (!this.editingDonation?.donationMethodId) return this.i18n.currentTerms.notSpecified || '';
    const method = this.donationMethods.find(m => m.id === this.editingDonation!.donationMethodId);
    return method?.name || this.i18n.currentTerms.notSpecified || '';
  }

  getSelectedCampaignName(): string {
    if (!this.editingDonation?.campaignId) return this.i18n.currentTerms.notSpecified || '';
    const campaign = this.campaigns.find(c => c.id === this.editingDonation!.campaignId);
    return campaign?.name || this.i18n.currentTerms.notSpecified || '';
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