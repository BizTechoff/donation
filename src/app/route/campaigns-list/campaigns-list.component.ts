import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Campaign } from '../../../shared/entity/campaign';
import { User } from '../../../shared/entity/user';
import { I18nService } from '../../i18n/i18n.service';

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
  filterStatus = '';
  filterCategory = '';
  filterActive = '';
  sortField = 'name';
  sortDirection = 'asc';

  constructor(public i18n: I18nService) {}

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

    if (this.filterStatus) {
      where.status = this.filterStatus;
    }

    if (this.filterCategory) {
      where.category = { $contains: this.filterCategory };
    }

    if (this.filterActive) {
      where.isActive = this.filterActive === 'true';
    }

    this.campaigns = await this.campaignRepo.find({
      where,
      orderBy: { [this.sortField]: this.sortDirection },
      include: {
        createdBy: true,
        manager: true
      }
    });
  }

  async loadUsers() {
    this.users = await this.userRepo.find({
      where: { manager: true },
      orderBy: { name: 'asc' }
    });
  }

  async createCampaign() {
    this.editingCampaign = this.campaignRepo.create({
      status: 'draft',
      currency: 'ILS',
      startDate: new Date(),
      isActive: true,
      isPublic: false
    });
    this.showAddCampaignModal = true;
  }

  async editCampaign(campaign: Campaign) {
    this.editingCampaign = campaign;
    this.showAddCampaignModal = true;
  }

  async saveCampaign() {
    if (!this.editingCampaign) return;

    try {
      await this.editingCampaign.save();
      await this.loadCampaigns();
      this.closeModal();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert(this.i18n.terms.campaignManagementError);
    }
  }

  async deleteCampaign(campaign: Campaign) {
    if (confirm(`${this.i18n.terms.deleteCampaignConfirm} ${campaign.name}?`)) {
      try {
        await campaign.delete();
        await this.loadCampaigns();
      } catch (error) {
        console.error('Error deleting campaign:', error);
        alert(this.i18n.terms.campaignDeletionError);
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
    if (confirm(`${this.i18n.terms.cancelCampaignConfirm} ${campaign.name}?`)) {
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
    this.filterStatus = '';
    this.filterCategory = '';
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
      case 'active': return this.i18n.terms.activeStatusText;
      case 'completed': return this.i18n.terms.completedStatusText;
      case 'cancelled': return this.i18n.terms.cancelledStatusText;
      case 'draft': return this.i18n.terms.draftStatusText;
      default: return status;
    }
  }

  formatDate(date?: Date): string {
    if (!date) return this.i18n.terms.notSpecifiedText;
    return new Date(date).toLocaleDateString('he-IL');
  }

  formatCurrency(amount: number): string {
    return `₪${amount.toLocaleString()}`;
  }

  get activeCampaigns(): number {
    return this.campaigns.filter(c => c.status === 'active').length;
  }

  get totalTargetAmount(): number {
    return this.campaigns
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + c.targetAmount, 0);
  }

  get totalRaisedAmount(): number {
    return this.campaigns
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + c.raisedAmount, 0);
  }

}
