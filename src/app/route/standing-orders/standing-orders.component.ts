import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { StandingOrder, Donor, Campaign, DonationMethod } from '../../../shared/entity';

@Component({
  selector: 'app-standing-orders',
  templateUrl: './standing-orders.component.html',
  styleUrls: ['./standing-orders.component.scss']
})
export class StandingOrdersComponent implements OnInit {

  standingOrders: StandingOrder[] = [];
  donors: Donor[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];
  
  standingOrderRepo = remult.repo(StandingOrder);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  
  loading = false;
  showAddOrderModal = false;
  editingOrder?: StandingOrder;

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadStandingOrders(),
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

  async loadStandingOrders() {
    this.standingOrders = await this.standingOrderRepo.find({
      orderBy: { startDate: 'desc' },
      include: {
        donor: true,
        campaign: true,
        donationMethod: true,
        createdBy: true
      }
    });
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

  async createOrder() {
    this.editingOrder = this.standingOrderRepo.create();
    this.showAddOrderModal = true;
  }

  async editOrder(order: StandingOrder) {
    this.editingOrder = order;
    this.showAddOrderModal = true;
  }

  async saveOrder() {
    if (!this.editingOrder) return;

    try {
      // Calculate next execution date
      this.editingOrder.nextExecutionDate = this.editingOrder.calculateNextExecutionDate();
      
      await this.editingOrder.save();
      await this.loadStandingOrders();
      this.closeModal();
    } catch (error) {
      console.error('Error saving standing order:', error);
    }
  }

  async deleteOrder(order: StandingOrder) {
    if (confirm(`האם אתה בטוח שברצונך למחוק את הוראת הקבע של ${order.donor?.displayName}?`)) {
      try {
        await order.delete();
        await this.loadStandingOrders();
      } catch (error) {
        console.error('Error deleting standing order:', error);
      }
    }
  }

  async activateOrder(order: StandingOrder) {
    try {
      await order.activate();
      await this.loadStandingOrders();
    } catch (error) {
      console.error('Error activating standing order:', error);
    }
  }

  async pauseOrder(order: StandingOrder) {
    try {
      await order.pause();
      await this.loadStandingOrders();
    } catch (error) {
      console.error('Error pausing standing order:', error);
    }
  }

  async cancelOrder(order: StandingOrder) {
    if (confirm(`האם אתה בטוח שברצונך לבטל את הוראת הקבע של ${order.donor?.displayName}?`)) {
      try {
        await order.cancel();
        await this.loadStandingOrders();
      } catch (error) {
        console.error('Error canceling standing order:', error);
      }
    }
  }

  async executeOrder(order: StandingOrder) {
    try {
      await order.recordExecution(order.amount);
      await this.loadStandingOrders();
    } catch (error) {
      console.error('Error executing standing order:', error);
    }
  }

  closeModal() {
    this.showAddOrderModal = false;
    this.editingOrder = undefined;
  }

  getDonorName(order: StandingOrder): string {
    return order.donor?.displayName || 'לא ידוע';
  }

  getCampaignName(order: StandingOrder): string {
    return order.campaign?.name || 'ללא קמפיין';
  }

  getMethodName(order: StandingOrder): string {
    return order.donationMethod?.name || 'לא צוין';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'paused': return 'status-paused';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-default';
    }
  }

  get totalMonthlyAmount(): number {
    return this.standingOrders
      .filter(o => o.status === 'active' && o.frequency === 'monthly')
      .reduce((sum, order) => sum + order.amount, 0);
  }

  get activeOrdersCount(): number {
    return this.standingOrders.filter(o => o.status === 'active').length;
  }

  get nextCollectionDate(): Date | undefined {
    const activeOrders = this.standingOrders.filter(o => o.status === 'active' && o.nextExecutionDate);
    if (activeOrders.length === 0) return undefined;
    
    return activeOrders.reduce((earliest, order) => {
      if (!order.nextExecutionDate) return earliest;
      if (!earliest) return order.nextExecutionDate;
      return order.nextExecutionDate < earliest ? order.nextExecutionDate : earliest;
    }, undefined as Date | undefined);
  }

}