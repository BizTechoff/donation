import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Donation } from '../../../shared/entity/donation';
import { Donor } from '../../../shared/entity/donor';
import { DonorPlace } from '../../../shared/entity/donor-place';
import { Campaign } from '../../../shared/entity/campaign';
import { Blessing } from '../../../shared/entity/blessing';
import { I18nService } from '../../i18n/i18n.service';

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

interface DonationReportData {
  id: string;
  donorName: string;
  donorType: string;
  amount: number;
  currency: string;
  date: Date;
  campaign: string;
  year: number;
  attachedFiles?: string[];
}

interface PaymentReportData {
  donorName: string;
  promisedAmount: number;
  actualAmount: number;
  remainingDebt: number;
  status: 'fullyPaid' | 'partiallyPaid' | 'notPaid';
  currency: string;
}

interface YearlySummaryData {
  year: number;
  currencies: { [currency: string]: number };
  totalInShekel: number;
}

interface BlessingReportData {
  donorName: string;
  blessingType: string;
  status: string;
  campaignName: string;
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

  // Active report type
  activeReport: 'general' | 'donations' | 'payments' | 'yearly' | 'blessings' = 'donations';
  
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

  // New report data
  donationReportData: DonationReportData[] = [];
  paymentReportData: PaymentReportData[] = [];
  yearlySummaryData: YearlySummaryData[] = [];
  blessingReportData: BlessingReportData[] = [];

  // Filters
  filters = {
    selectedDonor: '',
    selectedDonorType: '',
    selectedYear: new Date().getFullYear(),
    selectedCampaign: '',
    selectedCurrency: 'all'
  };

  // Available options for filters
  availableDonors: Donor[] = [];
  availableYears: number[] = [];
  availableCampaigns: Campaign[] = [];
  donorTypes = ['אנ"ש', 'בוגר', 'קשר אחר'];
  currencies = ['ILS', 'USD', 'EUR'];

  // Print settings
  printSettings = {
    includeDonorNameTag: false,
    tagPosition: 'top-right' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  };
  
  private donationRepo = remult.repo(Donation);
  private donorRepo = remult.repo(Donor);
  private campaignRepo = remult.repo(Campaign);
  private blessingRepo = remult.repo(Blessing);

  constructor(public i18n: I18nService) {}

  async ngOnInit() {
    await this.loadFilterOptions();
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
    const donations = await this.donationRepo.find();
    console.log('📊 Donations loaded:', donations.length);

    const donors = await this.donorRepo.find();
    console.log('📊 Donors loaded:', donors.length);

    const campaigns = await this.campaignRepo.find();
    console.log('📊 Campaigns loaded:', campaigns.length);

    this.totalStats.donations = donations.length;
    this.totalStats.amount = donations.reduce((sum, d) => sum + d.amount, 0);
    this.totalStats.donors = donors.length;
    this.totalStats.campaigns = campaigns.length;
    this.totalStats.avgDonation = this.totalStats.donations > 0 ?
      this.totalStats.amount / this.totalStats.donations : 0;
    this.totalStats.recurringAmount = 0;
  }

  private async loadMonthlyTrends() {
    const donations = await this.donationRepo.find({
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

    // Load donor places for all donors
    const uniqueDonorIds = [...new Set(donations.map(d => d.donorId).filter(Boolean))];
    const donorPlaces = await remult.repo(DonorPlace).find({
      where: {
        donorId: { $in: uniqueDonorIds },
        isPrimary: true
      },
      include: { place: true }
    });

    // Create map of donorId -> city
    const donorCityMap = new Map<string, string>();
    donorPlaces.forEach(dp => {
      if (dp.donorId && dp.place?.city) {
        donorCityMap.set(dp.donorId, dp.place.city);
      }
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
      const city = donation.donorId ? donorCityMap.get(donation.donorId) : undefined;
      const region = city || 'לא צוין';
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
    const message = this.i18n.currentTerms.exportReportInDevelopment?.replace('{format}', format) || `Export report in ${format} format - in development`;
    alert(message);
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

  // New methods for the enhanced reports

  async loadFilterOptions() {
    try {
      this.availableDonors = await this.donorRepo.find({
        orderBy: { lastName: 'asc' }
      });

      this.availableCampaigns = await this.campaignRepo.find({
        orderBy: { name: 'asc' }
      });

      // Generate available years from donations data
      const donations = await this.donationRepo.find({
        orderBy: { donationDate: 'desc' }
      });
      
      const years = new Set(donations.map(d => new Date(d.donationDate).getFullYear()));
      this.availableYears = Array.from(years).sort((a, b) => b - a);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }

  switchReport(reportType: 'general' | 'donations' | 'payments' | 'yearly' | 'blessings') {
    this.activeReport = reportType;
    this.loadSpecificReportData();
  }

  async loadSpecificReportData() {
    this.loading = true;
    try {
      switch (this.activeReport) {
        case 'donations':
          await this.loadDonationsReport();
          break;
        case 'payments':
          await this.loadPaymentsReport();
          break;
        case 'yearly':
          await this.loadYearlySummaryReport();
          break;
        case 'blessings':
          await this.loadBlessingsReport();
          break;
      }
    } catch (error) {
      console.error('Error loading specific report data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDonationsReport() {
    let where: any = {};
    
    if (this.filters.selectedDonor) {
      where.donorId = this.filters.selectedDonor;
    }
    
    if (this.filters.selectedCampaign) {
      where.campaignId = this.filters.selectedCampaign;
    }

    if (this.filters.selectedYear) {
      const yearStart = new Date(this.filters.selectedYear, 0, 1);
      const yearEnd = new Date(this.filters.selectedYear, 11, 31);
      where.donationDate = { $gte: yearStart, $lte: yearEnd };
    }

    const donations = await this.donationRepo.find({
      where,
      include: {
        donor: true,
        campaign: true
      },
      orderBy: { donationDate: 'desc' }
    });

    this.donationReportData = donations
      .filter(d => {
        if (this.filters.selectedDonorType && d.donor) {
          return this.checkDonorType(d.donor, this.filters.selectedDonorType);
        }
        return true;
      })
      .map(donation => ({
        id: donation.id!,
        donorName: donation.donor?.displayName || 'תורם אלמוני',
        donorType: this.getDonorTypeString(donation.donor),
        amount: donation.amount,
        currency: donation.currency,
        date: donation.donationDate,
        campaign: donation.campaign?.name || 'ללא קמפיין',
        year: new Date(donation.donationDate).getFullYear(),
        attachedFiles: [] // TODO: Add attachment support
      }));
  }

  async loadPaymentsReport() {
    // Standing orders feature removed - returning empty data
    this.paymentReportData = [];
  }

  async loadYearlySummaryReport() {
    const donations = await this.donationRepo.find({
      orderBy: { donationDate: 'desc' }
    });

    const yearlyMap = new Map<number, { [currency: string]: number }>();

    donations.forEach(donation => {
      const year = new Date(donation.donationDate).getFullYear();
      
      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, {});
      }
      
      const yearData = yearlyMap.get(year)!;
      if (!yearData[donation.currency]) {
        yearData[donation.currency] = 0;
      }
      yearData[donation.currency] += donation.amount;
    });

    this.yearlySummaryData = Array.from(yearlyMap.entries())
      .map(([year, currencies]) => {
        // Simple conversion to shekel (would need real exchange rates)
        const conversionRates: { [key: string]: number } = {
          'ILS': 1,
          'USD': 3.7,
          'EUR': 4.0
        };

        let totalInShekel = 0;
        Object.entries(currencies).forEach(([currency, amount]) => {
          totalInShekel += amount * (conversionRates[currency] || 1);
        });

        return {
          year,
          currencies,
          totalInShekel
        };
      })
      .sort((a, b) => b.year - a.year);
  }

  async loadBlessingsReport() {
    const blessings = await this.blessingRepo.find({
      include: {
        donor: true,
        campaign: true
      },
      orderBy: { createdDate: 'desc' }
    });

    this.blessingReportData = blessings.map(blessing => ({
      donorName: blessing.donor?.displayName || blessing.name,
      blessingType: blessing.blessingType || 'לא צוין',
      status: blessing.status || 'ממתין',
      campaignName: blessing.campaign?.name || 'ללא קמפיין'
    }));
  }

  private checkDonorType(donor: Donor, type: string): boolean {
    switch (type) {
      case 'אנ"ש': return donor.isAnash || false;
      case 'בוגר': return donor.isAlumni || false;
      case 'קשר אחר': return donor.isOtherConnection || false;
      default: return true;
    }
  }

  private getDonorTypeString(donor?: Donor): string {
    if (!donor) return 'לא צוין';
    
    const types: string[] = [];
    if (donor.isAnash) types.push('אנ"ש');
    if (donor.isAlumni) types.push('בוגר');
    if (donor.isOtherConnection) types.push('קשר אחר');
    
    return types.length > 0 ? types.join(', ') : 'לא צוין';
  }

  async applyFilters() {
    if (this.activeReport !== 'general') {
      await this.loadSpecificReportData();
    }
  }

  async printReport() {
    // TODO: Implement print functionality
    alert('פונקצית הדפסה - בפיתוח');
  }

  async exportSpecificReport(format: 'excel' | 'pdf' | 'csv') {
    // TODO: Implement export functionality for specific reports
    alert(`ייצוא דוח ${this.activeReport} בפורמט ${format} - בפיתוח`);
  }

  getBlessingSummary() {
    const summary = {
      preMade: this.blessingReportData.filter(b => b.blessingType === 'מוכנה').length,
      custom: this.blessingReportData.filter(b => b.blessingType === 'מותאמת אישית').length,
      notChosen: this.blessingReportData.filter(b => b.blessingType === 'לא נבחר' || !b.blessingType).length,
      total: this.blessingReportData.length
    };
    return summary;
  }

  getPaymentStatusSummary() {
    const summary = {
      fullyPaid: this.paymentReportData.filter(p => p.status === 'fullyPaid').length,
      partiallyPaid: this.paymentReportData.filter(p => p.status === 'partiallyPaid').length,
      notPaid: this.paymentReportData.filter(p => p.status === 'notPaid').length,
      totalDebt: this.paymentReportData.reduce((sum, p) => sum + p.remainingDebt, 0)
    };
    return summary;
  }

  getTotalDonationAmount(): number {
    return this.donationReportData.reduce((sum, d) => sum + d.amount, 0);
  }
}