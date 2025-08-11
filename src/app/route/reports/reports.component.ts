import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Donation } from '../../../shared/entity/donation';
import { Donor } from '../../../shared/entity/donor';
import { Campaign } from '../../../shared/entity/campaign';
import { StandingOrder } from '../../../shared/entity/standing-order';

interface ChartData {
  label: string;
  value: number;
  percentage?: number;
}

interface MonthlyStats {
  month: string;
  donations: number;
  amount: number;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  
  loading = true;
  dateRange = {
    from: new Date(new Date().getFullYear(), 0, 1), // תחילת השנה
    to: new Date() // היום
  };
  
  // סטטיסטיקות כלליות
  totalStats = {
    donations: 0,
    amount: 0,
    donors: 0,
    campaigns: 0,
    avgDonation: 0,
    recurringAmount: 0
  };
  
  // נתונים לגרפים
  monthlyData: MonthlyStats[] = [];
  campaignData: ChartData[] = [];
  donorTypeData: ChartData[] = [];
  regionData: ChartData[] = [];
  paymentMethodData: ChartData[] = [];
  
  // טבלאות מפורטות
  topDonors: any[] = [];
  topCampaigns: Campaign[] = [];
  recentActivity: any[] = [];
  
  private donationRepo = remult.repo(Donation);
  private donorRepo = remult.repo(Donor);
  private campaignRepo = remult.repo(Campaign);
  private standingOrderRepo = remult.repo(StandingOrder);

  constructor() {}

  async ngOnInit() {
    await this.loadReportsData();
    this.loading = false;
  }

  async loadReportsData() {
    try {
      await Promise.all([
        this.loadGeneralStats(),
        this.loadMonthlyTrends(),
        this.loadCampaignAnalysis(),
        this.loadDonorAnalysis(),
        this.loadTopPerformers(),
        this.loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading reports data:', error);
    }
  }

  private async loadGeneralStats() {
    const donations = await this.donationRepo.find({
      where: {
        donationDate: { 
          $gte: this.dateRange.from,
          $lte: this.dateRange.to
        }
      }
    });

    const donors = await this.donorRepo.find({
      where: { isActive: true }
    });

    const campaigns = await this.campaignRepo.find({
      where: { isActive: true }
    });

    const recurringOrders = await this.standingOrderRepo.find({
      where: { status: 'active' }
    });

    this.totalStats.donations = donations.length;
    this.totalStats.amount = donations.reduce((sum, d) => sum + d.amount, 0);
    this.totalStats.donors = donors.length;
    this.totalStats.campaigns = campaigns.length;
    this.totalStats.avgDonation = this.totalStats.donations > 0 ? 
      this.totalStats.amount / this.totalStats.donations : 0;
    this.totalStats.recurringAmount = recurringOrders.reduce((sum, so) => sum + so.amount, 0);
  }

  private async loadMonthlyTrends() {
    const donations = await this.donationRepo.find({
      where: {
        donationDate: { 
          $gte: new Date(new Date().getFullYear() - 1, 0, 1) // שנה אחורה
        }
      },
      orderBy: { donationDate: 'asc' }
    });

    const monthlyMap = new Map<string, { donations: number, amount: number }>();
    
    donations.forEach(donation => {
      const monthKey = new Date(donation.donationDate).toLocaleDateString('he-IL', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { donations: 0, amount: 0 });
      }
      
      const monthData = monthlyMap.get(monthKey)!;
      monthData.donations++;
      monthData.amount += donation.amount;
    });

    this.monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      donations: data.donations,
      amount: data.amount
    }));
  }

  private async loadCampaignAnalysis() {
    const campaigns = await this.campaignRepo.find({
      orderBy: { raisedAmount: 'desc' }
    });

    const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedAmount, 0);
    
    this.campaignData = campaigns.slice(0, 10).map(campaign => ({
      label: campaign.name,
      value: campaign.raisedAmount,
      percentage: totalRaised > 0 ? (campaign.raisedAmount / totalRaised) * 100 : 0
    }));
  }

  private async loadDonorAnalysis() {
    const donations = await this.donationRepo.find({
      include: { donor: true }
    });

    // ניתוח לפי סוג תורם
    const typeMap = new Map<string, number>();
    donations.forEach(donation => {
      const type = donation.donor?.donorType || 'אחר';
      typeMap.set(type, (typeMap.get(type) || 0) + donation.amount);
    });

    const totalAmount = Array.from(typeMap.values()).reduce((sum, amount) => sum + amount, 0);
    
    this.donorTypeData = Array.from(typeMap.entries()).map(([type, amount]) => ({
      label: type,
      value: amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
    }));

    // ניתוח לפי אזור
    const regionMap = new Map<string, number>();
    donations.forEach(donation => {
      const region = donation.donor?.city || 'לא צוין';
      regionMap.set(region, (regionMap.get(region) || 0) + donation.amount);
    });

    const regionTotal = Array.from(regionMap.values()).reduce((sum, amount) => sum + amount, 0);
    
    this.regionData = Array.from(regionMap.entries())
      .map(([region, amount]) => ({
        label: region,
        value: amount,
        percentage: regionTotal > 0 ? (amount / regionTotal) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  private async loadTopPerformers() {
    // תורמים מובילים
    const donations = await this.donationRepo.find({
      include: { donor: true }
    });

    const donorMap = new Map<string, { donor: any, total: number, count: number }>();
    donations.forEach(donation => {
      const donorKey = donation.donor?.id || 'unknown';
      if (!donorMap.has(donorKey)) {
        donorMap.set(donorKey, {
          donor: donation.donor,
          total: 0,
          count: 0
        });
      }
      const donorData = donorMap.get(donorKey)!;
      donorData.total += donation.amount;
      donorData.count++;
    });

    this.topDonors = Array.from(donorMap.values())
      .filter(data => data.donor)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // קמפיינים מובילים
    this.topCampaigns = await this.campaignRepo.find({
      orderBy: { raisedAmount: 'desc' },
      limit: 5
    });
  }

  private async loadRecentActivity() {
    const recentDonations = await this.donationRepo.find({
      orderBy: { donationDate: 'desc' },
      limit: 20,
      include: {
        donor: true,
        campaign: true
      }
    });

    this.recentActivity = recentDonations.map(donation => ({
      type: 'donation',
      date: donation.donationDate,
      description: `תרומה מ${donation.donor?.displayName || 'תורם אלמוני'}`,
      amount: donation.amount,
      campaign: donation.campaign?.name,
      details: donation
    }));
  }

  formatCurrency(amount: number): string {
    return `₪${amount.toLocaleString()}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('he-IL');
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  async exportReport(format: 'excel' | 'pdf' | 'csv') {
    // TODO: הוסף לוגיקה לייצא דוח
    alert(`ייצוא דוח בפורמט ${format} - בפיתוח`);
  }

  async refreshData() {
    this.loading = true;
    await this.loadReportsData();
    this.loading = false;
  }

  onDateRangeChange() {
    this.refreshData();
  }

  getMaxDonations(): number {
    return Math.max(...this.monthlyData.map(m => m.donations), 1);
  }

  getMaxAmount(): number {
    return Math.max(...this.monthlyData.map(m => m.amount), 1);
  }

  getPieColor(index: number): string {
    const colors = ['#3498db', '#e74c3c', '#f39c12', '#27ae60', '#9b59b6', '#34495e'];
    return colors[index % colors.length];
  }

  getProgressPercentage(campaign: Campaign): number {
    if (campaign.targetAmount === 0) return 0;
    return Math.min(100, Math.round((campaign.raisedAmount / campaign.targetAmount) * 100));
  }
}