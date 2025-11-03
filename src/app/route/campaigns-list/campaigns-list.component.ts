import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Campaign } from '../../../shared/entity/campaign';
import { User } from '../../../shared/entity/user';
import { Blessing } from '../../../shared/entity/blessing';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';

@Component({
  selector: 'app-campaigns-list',
  templateUrl: './campaigns-list.component.html',
  styleUrls: ['./campaigns-list.component.scss']
})
export class CampaignsListComponent implements OnInit {

  campaigns: Campaign[] = [];
  users: User[] = [];

  campaignRepo = remult.repo(Campaign);
  userRepo = remult.repo(User);

  loading = false;
  showAddCampaignModal = false;
  editingCampaign?: Campaign;

  // מפיינים
  filterName = '';
  filterActive = '';
  sortField = 'name';
  sortDirection = 'asc';

  constructor(public i18n: I18nService, private ui: UIToolsService) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadCampaigns(),
        this.loadUsers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadCampaigns() {
    let where: any = {};

    if (this.filterName) {
      where.name = { $contains: this.filterName };
    }

    if (this.filterActive) {
      where.isActive = this.filterActive === 'true';
    }

    this.campaigns = await this.campaignRepo.find({
      where,
      orderBy: { [this.sortField]: this.sortDirection },
      include: {
        createdBy: true
      }
    });
  }

  async loadUsers() {
    this.users = await this.userRepo.find({
      where: { secretary: true },
      orderBy: { name: 'asc' }
    });
  }

  async createCampaign() {
    const changed = await this.ui.campaignDetailsDialog('new');
    if (changed) {
      await this.loadCampaigns();
    }
  }

  async editCampaign(campaign: Campaign) {
    const changed = await this.ui.campaignDetailsDialog(campaign.id);
    if (changed) {
      await this.loadCampaigns();
    }
  }

  async saveCampaign() {
    if (!this.editingCampaign) return;

    try {
      await this.editingCampaign.save();
      await this.loadCampaigns();
      this.closeModal();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert(this.i18n.currentTerms.campaignManagementError || 'Error saving campaign');
    }
  }

  async deleteCampaign(campaign: Campaign) {
    if (confirm(`${this.i18n.currentTerms.deleteCampaignConfirm || 'Are you sure you want to delete campaign'} ${campaign.name}?`)) {
      try {
        await campaign.delete();
        await this.loadCampaigns();
      } catch (error) {
        console.error('Error deleting campaign:', error);
        alert(this.i18n.currentTerms.campaignDeletionError || 'Error deleting campaign');
      }
    }
  }

  async activateCampaign(campaign: Campaign) {
    try {
      await campaign.activate();
      await this.loadCampaigns();
    } catch (error) {
      console.error('Error activating campaign:', error);
    }
  }

  async completeCampaign(campaign: Campaign) {
    try {
      await campaign.complete();
      await this.loadCampaigns();
    } catch (error) {
      console.error('Error completing campaign:', error);
    }
  }

  async cancelCampaign(campaign: Campaign) {
    if (confirm(`${this.i18n.currentTerms.cancelCampaignConfirm || 'Are you sure you want to cancel campaign'} ${campaign.name}?`)) {
      try {
        await campaign.cancel();
        await this.loadCampaigns();
      } catch (error) {
        console.error('Error canceling campaign:', error);
      }
    }
  }

  closeModal() {
    this.showAddCampaignModal = false;
    this.editingCampaign = undefined;
  }

  async applyFilters() {
    await this.loadCampaigns();
  }

  async clearFilters() {
    this.filterName = '';
    this.filterActive = '';
    await this.loadCampaigns();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      case 'draft': return 'status-draft';
      default: return 'status-default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active': return this.i18n.currentTerms.activeStatus || 'Active';
      case 'completed': return this.i18n.currentTerms.completedStatus || 'Completed';
      case 'cancelled': return this.i18n.currentTerms.cancelledStatus || 'Cancelled';
      case 'draft': return this.i18n.currentTerms.draft || 'Draft';
      default: return status;
    }
  }

  formatDate(date?: Date): string {
    if (!date) return this.i18n.currentTerms.notSpecified || 'Not specified';
    return new Date(date).toLocaleDateString('he-IL');
  }

  formatCurrency(amount: number): string {
    return `₪${amount.toLocaleString()}`;
  }

  get activeCampaigns(): number {
    return this.campaigns.filter(c => c.isActive).length;
  }

  get totalTargetAmount(): number {
    return this.campaigns
      .filter(c => c.isActive)
      .reduce((sum, c) => sum + c.targetAmount, 0);
  }

  get totalRaisedAmount(): number {
    return this.campaigns
      .filter(c => c.isActive)
      .reduce((sum, c) => sum + c.raisedAmount, 0);
  }

  // New methods for enhanced campaign functionality
  onStartDateChange(date: Date | null) {
    if (this.editingCampaign) {
      this.editingCampaign.startDate = date || new Date();
    }
  }

  onEndDateChange(date: Date | null) {
    if (this.editingCampaign) {
      this.editingCampaign.endDate = date || undefined;
    }
  }

  onLocationChange() {
    if (this.editingCampaign && this.editingCampaign.eventLocation) {
      // Auto-set currency based on location (example logic)
      const location = this.editingCampaign.eventLocation?.fullAddress?.toLowerCase() || '';
      if (location.includes('ארה"ב') || location.includes('america') || location.includes('usa')) {
        this.editingCampaign.currency = 'USD';
      } else if (location.includes('אירופה') || location.includes('europe')) {
        this.editingCampaign.currency = 'EUR';
      } else {
        this.editingCampaign.currency = 'ILS';
      }
    }
  }

  onCampaignTypeChange() {
    // Any specific logic when campaign type changes
    console.log('Campaign type changed to:', this.editingCampaign?.campaignType);
  }

  // Action button methods
  openBlessingsBook() {
    if (!this.editingCampaign?.id) return;
    
    // TODO: Implement blessings book functionality
    console.log('Opening blessings book for campaign:', this.editingCampaign.id);
    alert(`ספר ברכות עבור קמפיין "${this.editingCampaign.name}" יפתח בקרוב`);
  }

  openDonors() {
    if (!this.editingCampaign?.id) return;
    
    // TODO: Implement donors functionality
    console.log('Opening donors for campaign:', this.editingCampaign.id);
    alert(`רשימת תורמים עבור קמפיין "${this.editingCampaign.name}" תפתח בקרוב`);
  }

  openContacts() {
    if (!this.editingCampaign?.id) return;
    
    // TODO: Implement contacts functionality
    console.log('Opening contacts for campaign:', this.editingCampaign.id);
    alert(`אנשי קשר ופעילים עבור קמפיין "${this.editingCampaign.name}" יפתח בקרוב`);
  }

}
