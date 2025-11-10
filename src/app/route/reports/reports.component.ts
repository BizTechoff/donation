import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Donation } from '../../../shared/entity/donation';
import { Donor } from '../../../shared/entity/donor';
import { DonorPlace } from '../../../shared/entity/donor-place';
import { Campaign } from '../../../shared/entity/campaign';
import { Blessing } from '../../../shared/entity/blessing';
import { User } from '../../../shared/entity/user';
import { HebrewDateController } from '../../../shared/controllers/hebrew-date.controller';
import { ReportService } from '../../services/report.service';
import { I18nService } from '../../i18n/i18n.service';
import { BusyService, openDialog } from 'common-ui-elements';
import { ExcelExportService } from '../../services/excel-export.service';
import { DonorSelectionModalComponent } from '../../routes/modals/donor-selection-modal/donor-selection-modal.component';
import { GlobalFilterService } from '../../services/global-filter.service';

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

interface GroupedDonationReport {
  donorId?: string;
  donorName: string;
  donorDetails?: {
    address?: string;
    phones?: string[];
    emails?: string[];
  };
  yearlyTotals: {
    [hebrewYear: string]: {
      [currency: string]: number;
    };
  };
  actualPayments?: {
    [hebrewYear: string]: number; // in shekel
  };
}

interface CurrencySummary {
  currency: string;
  yearlyTotals: {
    [hebrewYear: string]: number; // Amount in original currency
  };
  yearlyTotalsInShekel: {
    [hebrewYear: string]: number; // Amount converted to shekel
  };
  totalAmount: number; // Total across all years in original currency
  totalInShekel: number; // Total across all years in shekel
}

type GroupByOption = 'donor' | 'campaign' | 'paymentMethod' | 'fundraiser';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  Math = Math; // Make Math available in template
  isExpandedView = false;

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

  // Grouped donation report data
  groupedDonationReport: GroupedDonationReport[] = [];
  currencySummaryData: CurrencySummary[] = [];
  hebrewYears: string[] = []; // תשפ"א, תשפ"ב, תשפ"ג, תשפ"ד, תשפ"ה
  currentHebrewYear = 5785; // Will be calculated
  conversionRates: { [key: string]: number } = {
    'ILS': 1,
    'USD': 3.2530,
    'EUR': 3.7468,
    'GBP': 4.2582
  };

  // Pagination data
  totalRecords = 0;
  totalPages = 0;
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];

  // Sorting data
  sortBy = 'donorName';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Filters
  filters = {
    selectedDonorType: '',
    selectedDonorIds: [] as string[], // For multi-select donor filter (replaces selectedDonor)
    selectedYear: 'last4' as string | number, // 'last4' or specific year number
    selectedCampaign: '',
    selectedCurrency: 'all',
    groupBy: 'donor' as GroupByOption,
    showDonorDetails: true,
    showActualPayments: false,
    showCurrencySummary: true
  };

  // Available options for filters
  availableDonors: Donor[] = [];
  availableYears: string[] = []; // Hebrew years like תשפ"א, תשפ"ב
  availableCampaigns: Campaign[] = [];
  donorTypes = ['אנ"ש', 'תלמידנו', 'קשר אחר'];
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

  constructor(
    public i18n: I18nService,
    private reportService: ReportService,
    private busy: BusyService,
    private excelService: ExcelExportService,
    private globalFilterService: GlobalFilterService
  ) {}

  async ngOnInit() {
    await this.refreshData();
  }

  async loadCurrentHebrewYear() {
    try {
      this.currentHebrewYear = await HebrewDateController.getCurrentHebrewYear();
      // Generate last 4 Hebrew years (including current): current-3, current-2, current-1, current
      this.hebrewYears = [];
      for (let i = 3; i >= 0; i--) {
        const year = this.currentHebrewYear - i;
        const formatted = await HebrewDateController.formatHebrewYear(year);
        this.hebrewYears.push(formatted);
      }
    } catch (error) {
      console.error('Error loading Hebrew year:', error);
      // Fallback
      this.hebrewYears = ['תשפ"ג', 'תשפ"ד', 'תשפ"ה', 'תשפ"ו'];
    }
  }

  async loadCurrencyRates() {
    try {
      const currentUser = await remult.repo(User).findId(remult.user!.id!);
      if (currentUser?.settings?.currencyRates) {
        this.conversionRates = {
          'ILS': 1,
          'USD': currentUser.settings.currencyRates.USD || 3.2530,
          'EUR': currentUser.settings.currencyRates.EUR || 3.7468,
          'GBP': currentUser.settings.currencyRates.GBP || 4.2582
        };
      }
    } catch (error) {
      console.error('Error loading currency rates:', error);
    }
  }


  private async loadGeneralStats() {
    const donationsQuery = this.globalFilterService.applyFiltersToQuery({ where: {} });
    const donations = await this.donationRepo.find(donationsQuery);
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
    const query = this.globalFilterService.applyFiltersToQuery({
      where: {},
      orderBy: { donationDate: 'asc' }
    });
    const donations = await this.donationRepo.find(query);

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
    const query = this.globalFilterService.applyFiltersToQuery({
      where: {},
      include: { donor: true }
    });
    const donations = await this.donationRepo.find(query);

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
    const query = this.globalFilterService.applyFiltersToQuery({
      where: {},
      include: { donor: true }
    });
    const donations = await this.donationRepo.find(query);

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
    const query = this.globalFilterService.applyFiltersToQuery({
      where: {},
      orderBy: { donationDate: 'desc' },
      limit: 20,
      include: {
        donor: true,
        campaign: true
      }
    });
    const recentDonations = await this.donationRepo.find(query);

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

  getCurrencySymbol(currency: string): string {
    // Map Hebrew currency names to codes
    const hebrewToCode: { [key: string]: string } = {
      'דולר': 'USD',
      'אירו': 'EUR',
      'יורו': 'EUR',
      'שקל': 'ILS',
      'שקלים': 'ILS',
      'לירה': 'GBP',
      'לירה שטרלינג': 'GBP',
      'פאונד': 'GBP'
    };

    // Get currency code (convert from Hebrew if needed)
    const currencyCode = hebrewToCode[currency] || currency;

    // Map currency codes to symbols
    const symbols: { [key: string]: string } = {
      'ILS': '₪',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };

    return symbols[currencyCode] || currencyCode;
  }

  formatCurrencyWithSymbol(amount: number, currency: string): string {
    const symbol = this.getCurrencySymbol(currency);
    const formattedAmount = Math.round(amount).toLocaleString('he-IL');
    return `${symbol}${formattedAmount}`;
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
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // שלב 1: טעינת נתוני בסיס (רק אם לא נטענו)
        await this.loadBaseData();

        // שלב 2: טעינת הדוח המתאים
        await this.loadActiveReport();

      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    });
  }

  /**
   * טעינת נתוני בסיס - שנה עברית, מטבעות, אפשרויות סינון
   * נטען רק פעם אחת בהתחלה
   */
  private async loadBaseData() {
    // בדיקה אם נתוני בסיס כבר נטענו
    const isBaseDataLoaded = this.currentHebrewYear > 0 &&
                              this.hebrewYears.length > 0 &&
                              this.availableCampaigns.length > 0;

    if (isBaseDataLoaded) {
      console.log('📦 Base data already loaded, skipping...');
      return;
    }

    console.log('📦 Loading base data...');
    await Promise.all([
      this.loadCurrentHebrewYear(),
      this.loadCurrencyRates(),
      this.loadFilterOptions()
    ]);
    console.log('✅ Base data loaded successfully');
  }

  /**
   * טעינת הדוח הפעיל בהתאם לבחירת המשתמש
   */
  private async loadActiveReport() {
    console.log(`📊 Loading active report: ${this.activeReport}`);

    if (this.activeReport === 'general') {
      await this.loadGeneralReportData();
    } else {
      await this.loadSpecificReportDataWithoutLoading();
    }

    console.log(`✅ Report '${this.activeReport}' loaded successfully`);
  }

  /**
   * טעינת נתוני דוח כללי
   */
  private async loadGeneralReportData() {
    await Promise.all([
      this.loadGeneralStats(),
      this.loadMonthlyTrends(),
      this.loadCampaignAnalysis(),
      this.loadDonorAnalysis(),
      this.loadTopPerformers(),
      this.loadRecentActivity()
    ]);
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
      // Note: availableDonors are no longer loaded here - they load only when opening the donor selection modal

      // Load campaigns and available years in parallel
      const [campaigns, hebrewYears] = await Promise.all([
        this.campaignRepo.find({
          orderBy: { name: 'asc' }
        }),
        this.reportService.getAvailableHebrewYears()
      ]);

      this.availableCampaigns = campaigns;
      this.availableYears = hebrewYears;
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }

  async switchReport(reportType: 'general' | 'donations' | 'payments' | 'yearly' | 'blessings') {
    this.activeReport = reportType;
    await this.refreshData();
  }

  /**
   * טעינת דוחות ספציפיים (תרומות, תשלומים, שנתי, ברכות)
   */
  private async loadSpecificReportDataWithoutLoading() {
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
  }

  async loadDonationsReport() {
    // Load grouped report by default (new behavior)
    await this.loadGroupedDonationsReport();
  }

  async loadGroupedDonationsReport() {
    try {
      console.log('🔍 CLIENT: Requesting report with filters:', {
        groupBy: this.filters.groupBy,
        selectedYear: this.filters.selectedYear,
        selectedDonorIds: this.filters.selectedDonorIds,
        selectedCampaign: this.filters.selectedCampaign,
        selectedDonorType: this.filters.selectedDonorType,
        page: this.currentPage,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection
      });

      const globalFilters = this.globalFilterService.currentFilters;
      const reportResponse = await this.reportService.getGroupedDonationsReport({
        groupBy: this.filters.groupBy,
        showDonorDetails: this.filters.showDonorDetails,
        showActualPayments: this.filters.showActualPayments,
        showCurrencySummary: this.filters.showCurrencySummary,
        selectedDonorIds: this.filters.selectedDonorIds.length > 0 ? this.filters.selectedDonorIds : undefined,
        selectedCampaign: this.filters.selectedCampaign || undefined,
        selectedDonorType: this.filters.selectedDonorType || undefined,
        selectedYear: this.filters.selectedYear,
        conversionRates: this.conversionRates,
        page: this.currentPage,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        // Add global filters
        globalFilterCampaignIds: globalFilters.campaignIds,
        globalFilterDateFrom: globalFilters.dateFrom,
        globalFilterDateTo: globalFilters.dateTo,
        globalFilterAmountMin: globalFilters.amountMin,
        globalFilterAmountMax: globalFilters.amountMax
      });

      console.log('✅ CLIENT: Received report response:', {
        hebrewYears: reportResponse.hebrewYears,
        reportDataLength: reportResponse.reportData.length,
        currencySummaryLength: reportResponse.currencySummary.length,
        totalInShekel: reportResponse.totalInShekel,
        totalRecords: reportResponse.totalRecords,
        totalPages: reportResponse.totalPages,
        currentPage: reportResponse.currentPage
      });

      // Update component data with response
      this.hebrewYears = reportResponse.hebrewYears;
      this.groupedDonationReport = reportResponse.reportData;
      this.currencySummaryData = reportResponse.currencySummary;
      this.totalRecords = reportResponse.totalRecords;
      this.totalPages = reportResponse.totalPages;
      this.currentPage = reportResponse.currentPage;

      console.log('📊 CLIENT: Component data updated:', {
        hebrewYears: this.hebrewYears,
        groupedReportLength: this.groupedDonationReport.length,
        currencySummaryLength: this.currencySummaryData.length,
        totalRecords: this.totalRecords,
        totalPages: this.totalPages,
        currentPage: this.currentPage
      });

    } catch (error) {
      console.error('❌ CLIENT: Error loading grouped donations report:', error);
    }
  }


  getTotalInShekel(): number {
    return this.currencySummaryData.reduce((sum, curr) => sum + curr.totalInShekel, 0);
  }

  getCurrencySummaryYearTotal(year: string): number {
    return this.currencySummaryData.reduce((sum, curr) => {
      return sum + (curr.yearlyTotalsInShekel?.[year] || 0);
    }, 0);
  }

  getYearTotal(yearlyTotals: { [hebrewYear: string]: { [currency: string]: number } }, hebrewYear: string): number {
    const yearData = yearlyTotals[hebrewYear];
    if (!yearData) return 0;

    let total = 0;
    for (const [currency, amount] of Object.entries(yearData)) {
      total += amount * (this.conversionRates[currency] || 1);
    }
    return total;
  }

  formatYearTotal(yearlyTotals: { [hebrewYear: string]: { [currency: string]: number } }, hebrewYear: string): string {
    const yearData = yearlyTotals[hebrewYear];
    if (!yearData) return '0';

    const currencies = Object.entries(yearData);
    if (currencies.length === 0) return '0';

    // Debug: check what currencies we have
    console.log(`Year ${hebrewYear} currencies:`, currencies);

    // If only one currency - show with its symbol
    if (currencies.length === 1) {
      const [currency, amount] = currencies[0];
      // console.log(`Formatting: currency="${currency}", amount=${amount}`);
      return this.formatCurrencyWithSymbol(amount, currency);
    }

    // Multiple currencies - convert all to shekel and show total
    const total = this.getYearTotal(yearlyTotals, hebrewYear);
    const formattedTotal = Math.round(total).toLocaleString('he-IL');
    return `₪${formattedTotal}`;
  }

  async loadPaymentsReport() {
    // Standing orders feature removed - returning empty data
    this.paymentReportData = [];
  }

  async loadYearlySummaryReport() {
    const query = this.globalFilterService.applyFiltersToQuery({
      where: {},
      orderBy: { donationDate: 'desc' }
    });
    const donations = await this.donationRepo.find(query);

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
          'USD': 4.2582,
          'EUR': 3.7468
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
    // Note: Blessings don't have campaign/date filters in globalFilters structure
    // but we'll apply what we can (campaignIds)
    let query: any = {
      include: {
        donor: true,
        campaign: true
      },
      orderBy: { createdDate: 'desc' }
    };

    // Apply campaign filter if exists
    const filters = this.globalFilterService.currentFilters;
    if (filters.campaignIds && filters.campaignIds.length > 0) {
      query.where = { campaignId: { $in: filters.campaignIds } };
    }

    const blessings = await this.blessingRepo.find(query);

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
      case 'תלמידנו': return donor.isAlumni || false;
      case 'קשר אחר': return donor.isOtherConnection || false;
      default: return true;
    }
  }

  private getDonorTypeString(donor?: Donor): string {
    if (!donor) return 'לא צוין';
    
    const types: string[] = [];
    if (donor.isAnash) types.push('אנ"ש');
    if (donor.isAlumni) types.push('תלמידנו');
    if (donor.isOtherConnection) types.push('קשר אחר');
    
    return types.length > 0 ? types.join(', ') : 'לא צוין';
  }

  async applyFilters() {
    // רענון הדוח הנוכחי עם הפילטרים החדשים
    await this.refreshData();
  }

  async printReport() {
    // TODO: Implement print functionality
    alert('פונקצית הדפסה - בפיתוח');
  }

  toggleExpandedView() {
    this.isExpandedView = !this.isExpandedView;
  }

  async exportSpecificReport(format: 'excel' | 'pdf' | 'csv') {
    if (this.activeReport === 'donations' && format === 'excel') {
      await this.exportDonationsReportToExcel();
    } else {
      alert(`ייצוא דוח ${this.activeReport} בפורמט ${format} - בפיתוח`);
    }
  }

  async exportDonationsReportToExcel() {
    try {
      // Load all data without pagination for export
      const globalFilters = this.globalFilterService.currentFilters;
      const fullReportResponse = await this.reportService.getGroupedDonationsReport({
        groupBy: this.filters.groupBy,
        showDonorDetails: this.filters.showDonorDetails,
        showActualPayments: this.filters.showActualPayments,
        showCurrencySummary: this.filters.showCurrencySummary,
        selectedDonorIds: this.filters.selectedDonorIds.length > 0 ? this.filters.selectedDonorIds : undefined,
        selectedCampaign: this.filters.selectedCampaign || undefined,
        selectedDonorType: this.filters.selectedDonorType || undefined,
        selectedYear: this.filters.selectedYear,
        conversionRates: this.conversionRates,
        page: 1,
        pageSize: 999999, // Get all records
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        // Add global filters
        globalFilterCampaignIds: globalFilters.campaignIds,
        globalFilterDateFrom: globalFilters.dateFrom,
        globalFilterDateTo: globalFilters.dateTo,
        globalFilterAmountMin: globalFilters.amountMin,
        globalFilterAmountMax: globalFilters.amountMax
      });

      const XLSX = await import('xlsx');

      // Create workbook
      const wb = XLSX.utils.book_new();

      // ===== Sheet 1: Main Report =====
      const reportTitle = `דוח תרומות מקובץ לפי ${this.getGroupByLabel()}`;
      const yearSubtitle = this.filters.selectedYear === 'last4'
        ? `שנים עבריות: ${fullReportResponse.hebrewYears.join(', ')}`
        : `שנה עברית: ${fullReportResponse.hebrewYears[0]}`;

      // Build data array for main report
      const reportData: any[] = [];

      // Add title row
      reportData.push([reportTitle]);
      reportData.push([yearSubtitle]);
      reportData.push([]); // Empty row

      // Add headers
      const headers = ['שם'];
      if (this.filters.showDonorDetails && this.filters.groupBy === 'donor') {
        headers.push('כתובת', 'טלפונים', 'אימיילים');
      }
      fullReportResponse.hebrewYears.forEach(year => headers.push(year));
      if (this.filters.showActualPayments) {
        headers.push('תשלומים בפועל');
      }
      reportData.push(headers);

      // Add data rows
      fullReportResponse.reportData.forEach(row => {
        const dataRow: any[] = [row.donorName];

        if (this.filters.showDonorDetails && this.filters.groupBy === 'donor') {
          dataRow.push(
            row.donorDetails?.address || '-',
            row.donorDetails?.phones?.join(', ') || '-',
            row.donorDetails?.emails?.join(', ') || '-'
          );
        }

        fullReportResponse.hebrewYears.forEach(year => {
          dataRow.push(this.formatYearTotal(row.yearlyTotals, year));
        });

        if (this.filters.showActualPayments && row.actualPayments) {
          const payments = fullReportResponse.hebrewYears
            .map(year => row.actualPayments![year] ? `${year}: ₪${row.actualPayments![year].toLocaleString()}` : '')
            .filter(p => p)
            .join('\n');
          dataRow.push(payments || '-');
        }

        reportData.push(dataRow);
      });

      const ws = XLSX.utils.aoa_to_sheet(reportData);

      // Set column widths
      const colWidths = [{ wch: 25 }]; // Name column
      if (this.filters.showDonorDetails && this.filters.groupBy === 'donor') {
        colWidths.push({ wch: 30 }, { wch: 20 }, { wch: 30 }); // Address, Phones, Emails
      }
      fullReportResponse.hebrewYears.forEach(() => colWidths.push({ wch: 15 })); // Year columns
      if (this.filters.showActualPayments) {
        colWidths.push({ wch: 30 }); // Payments column
      }
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'דוח תרומות');

      // ===== Sheet 2: Currency Summary =====
      if (this.filters.showCurrencySummary && fullReportResponse.currencySummary.length > 0) {
        const summaryData: any[] = [];

        summaryData.push(['סיכום לפי מטבעות']);
        summaryData.push([]); // Empty row

        // Headers
        const summaryHeaders = ['מטבע'];
        fullReportResponse.hebrewYears.forEach(year => summaryHeaders.push(year));
        summaryHeaders.push('סה"כ');
        summaryData.push(summaryHeaders);

        // Currency rows
        fullReportResponse.currencySummary.forEach(curr => {
          const row: any[] = [curr.currency];
          fullReportResponse.hebrewYears.forEach(year => {
            row.push(this.formatCurrencyWithSymbol(curr.yearlyTotals[year] || 0, curr.currency));
          });
          row.push(this.formatCurrencyWithSymbol(curr.totalAmount, curr.currency));
          summaryData.push(row);
        });

        // Shekel totals row
        const shekelRow: any[] = ['בשקלים'];
        fullReportResponse.hebrewYears.forEach(year => {
          shekelRow.push(`₪${this.getCurrencySummaryYearTotalForExport(fullReportResponse.currencySummary, year).toLocaleString()}`);
        });
        shekelRow.push(`₪${fullReportResponse.currencySummary.reduce((sum, curr) => sum + curr.totalInShekel, 0).toLocaleString()}`);
        summaryData.push(shekelRow);

        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);

        // Set column widths for summary
        const summaryColWidths = [{ wch: 15 }]; // Currency column
        fullReportResponse.hebrewYears.forEach(() => summaryColWidths.push({ wch: 15 }));
        summaryColWidths.push({ wch: 20 }); // Total column
        summaryWs['!cols'] = summaryColWidths;

        XLSX.utils.book_append_sheet(wb, summaryWs, 'סיכום מטבעות');
      }

      // Save file
      const fileName = this.excelService.generateFileName(`דוח_תרומות_${this.getGroupByLabel()}`);
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Error exporting donations report:', error);
      alert('שגיאה בייצוא הדוח');
    }
  }

  private getGroupByLabel(): string {
    switch (this.filters.groupBy) {
      case 'donor': return 'תורם';
      case 'campaign': return 'קמפיין';
      case 'paymentMethod': return 'אמצעי_תשלום';
      case 'fundraiser': return 'מתרים';
      default: return 'תורם';
    }
  }

  private getCurrencySummaryYearTotalForExport(currencySummary: any[], year: string): number {
    return currencySummary.reduce((sum, curr) => {
      return sum + (curr.yearlyTotalsInShekel?.[year] || 0);
    }, 0);
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

  // Pagination handlers
  async onPageChange(page: number) {
    this.currentPage = page;
    await this.refreshData();
  }

  async onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
    await this.refreshData();
  }

  // Sorting handlers
  async onSortChange(sortBy: string) {
    if (this.sortBy === sortBy) {
      // Toggle direction if same column
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column - default to ascending
      this.sortBy = sortBy;
      this.sortDirection = 'asc';
    }
    await this.refreshData();
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) return 'unfold_more';
    return this.sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    // Adjust start if we're near the end
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  async openDonorSelectionModal() {
    try {
      const selectedDonors = await openDialog(
        DonorSelectionModalComponent,
        (modal: DonorSelectionModalComponent) => {
          modal.args = {
            title: 'בחר תורמים לסינון',
            multiSelect: true,
            selectedIds: this.filters.selectedDonorIds
          };
        }
      );

      if (selectedDonors && Array.isArray(selectedDonors)) {
        this.filters.selectedDonorIds = selectedDonors.map((d: Donor) => d.id);
        await this.applyFilters();
      }
    } catch (error) {
      console.error('Error opening donor selection modal:', error);
    }
  }

  getSelectedDonorsText(): string {
    if (this.filters.selectedDonorIds.length === 0) {
      return 'כל התורמים';
    }

    if (this.filters.selectedDonorIds.length === 1) {
      return 'תורם אחד נבחר';
    }

    return `${this.filters.selectedDonorIds.length} תורמים נבחרו`;
  }

  clearSelectedDonors() {
    this.filters.selectedDonorIds = [];
    this.applyFilters();
  }
}