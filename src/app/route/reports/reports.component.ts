import { Component, OnInit } from '@angular/core';
import { BusyService, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { HebrewDateController } from '../../../shared/controllers/hebrew-date.controller';
import { Blessing } from '../../../shared/entity/blessing';
import { Campaign } from '../../../shared/entity/campaign';
import { Donation } from '../../../shared/entity/donation';
import { Donor } from '../../../shared/entity/donor';
import { DonorContact } from '../../../shared/entity/donor-contact';
import { DonorPlace } from '../../../shared/entity/donor-place';
import { User } from '../../../shared/entity/user';
import { I18nService } from '../../i18n/i18n.service';
import { CampaignSelectionModalComponent } from '../../routes/modals/campaign-selection-modal/campaign-selection-modal.component';
import { DonorSelectionModalComponent } from '../../routes/modals/donor-selection-modal/donor-selection-modal.component';
import { ExcelExportService } from '../../services/excel-export.service';
import { GlobalFilterService } from '../../services/global-filter.service';
import { ReportService } from '../../services/report.service';
import { HebrewDateService } from '../../services/hebrew-date.service';

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
  promisedAmount: number; // Used for total amount in shekel
  actualAmount: number; // Used for donation count
  remainingDebt: number;
  status: 'fullyPaid' | 'partiallyPaid' | 'notPaid';
  currency: string;
  address?: string;
  city?: string;
  lastDonationDate?: Date;
}

interface YearlySummaryData {
  year: number; // Gregorian year
  hebrewYear: string; // Hebrew year formatted
  currencies: { [currency: string]: number };
  totalInShekel: number;
}

interface BlessingReportData {
  lastName: string;
  firstName: string;
  blessingBookType: string;
  notes: string;
  status: string;
  phone: string;
  mobile: string;
  email: string;
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

  // Pagination data - Donations Report
  totalRecords = 0;
  totalPages = 0;
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];

  // Sorting data - Donations Report
  sortBy = 'donorName';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination data - Payment Report
  paymentCurrentPage = 1;
  paymentPageSize = 20;
  paymentTotalCount = 0;
  paymentTotalPages = 0;

  // Sorting data - Payment Report
  paymentSortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];

  // Pagination data - Yearly Summary Report
  yearlySummaryCurrentPage = 1;
  yearlySummaryPageSize = 20;
  yearlySummaryTotalCount = 0;
  yearlySummaryTotalPages = 0;

  // Sorting data - Yearly Summary Report
  yearlySummarySortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];

  // Pagination data - Blessings Report
  blessingsCurrentPage = 1;
  blessingsPageSize = 20;
  blessingsTotalCount = 0;
  blessingsTotalPages = 0;

  // Sorting data - Blessings Report
  blessingsSortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];

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
    private globalFilterService: GlobalFilterService,
    private hebrewDateService: HebrewDateService
  ) { }

  async ngOnInit() {
    // Load last selected report from user settings
    await this.loadLastReportSelection();

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
      description: `תרומה מ${donation.donor?.fullName || 'תורם אלמוני'}`,
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

  formatHebrewDate(date: Date | undefined): string {
    if (!date) return '-';
    try {
      const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(date));
      return hebrewDate.formatted;
    } catch (error) {
      console.error('Error converting date to Hebrew:', error);
      return new Date(date).toLocaleDateString('he-IL');
    }
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getFirstName(fullName: string): string {
    const parts = fullName.trim().split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : fullName;
  }

  getLastName(fullName: string): string {
    const parts = fullName.trim().split(' ');
    return parts[0] || '';
  }

  getTotalByCurrency(currency: string): number {
    return this.yearlySummaryData.reduce((sum, yearData) => {
      return sum + (yearData.currencies[currency] || 0);
    }, 0);
  }

  getGrandTotalInShekel(): number {
    return this.yearlySummaryData.reduce((sum, yearData) => {
      return sum + yearData.totalInShekel;
    }, 0);
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
    await this.saveLastReportSelection();
    await this.refreshData();
  }

  /**
   * Save last selected report to user settings
   */
  private async saveLastReportSelection() {
    if (!remult.user?.id) return;

    try {
      const userRepo = remult.repo(User);
      const user = await userRepo.findId(remult.user.id);

      if (user) {
        if (!user.settings) {
          user.settings = {
            openModal: 'dialog',
            calendar_heb_holidays_jews_enabled: true,
            calendar_open_heb_and_eng_parallel: true
          };
        }

        if (!user.settings.reports) {
          user.settings.reports = {};
        }

        user.settings.reports.lastSelectedTab = this.activeReport;
        await userRepo.save(user);

        console.log('Saved last report selection:', this.activeReport);
      }
    } catch (error) {
      console.error('Error saving last report selection:', error);
    }
  }

  /**
   * Load last selected report from user settings
   */
  private async loadLastReportSelection() {
    if (!remult.user?.id) return;

    try {
      const userRepo = remult.repo(User);
      const user = await userRepo.findId(remult.user.id);

      if (user?.settings?.reports?.lastSelectedTab) {
        this.activeReport = user.settings.reports.lastSelectedTab;
        console.log('Loaded last report selection:', this.activeReport);
      }
    } catch (error) {
      console.error('Error loading last report selection:', error);
    }
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
    // דוח תשלומים - סיכום תרומות לפי תורם
    try {
      const query = this.globalFilterService.applyFiltersToQuery({
        where: {},
        include: {
          donor: {
            include: {
              donorPlaces: {
                include: {
                  place: true
                }
              }
            }
          }
        },
        orderBy: { donationDate: 'desc' }
      });

      const donations = await this.donationRepo.find(query);

      // קיבוץ לפי תורם
      const donorMap = new Map<string, {
        donor: Donor;
        totalAmount: number;
        totalDonations: number;
        lastDonationDate: Date;
        homeAddress?: string;
        city?: string;
      }>();

      donations.forEach(donation => {
        if (!donation.donor) return;

        const donorId = donation.donor.id;
        const amountInShekel = donation.amount * (this.conversionRates[donation.currency] || 1);

        if (!donorMap.has(donorId)) {
          // מציאת כתובת בית
          const homePlace = (donation.donor as any).donorPlaces?.find((dp: any) => dp.placeType === 'home');

          donorMap.set(donorId, {
            donor: donation.donor,
            totalAmount: 0,
            totalDonations: 0,
            lastDonationDate: donation.donationDate,
            homeAddress: homePlace?.place?.fullAddress || '',
            city: homePlace?.place?.city || ''
          });
        }

        const data = donorMap.get(donorId)!;
        data.totalAmount += amountInShekel;
        data.totalDonations++;

        // עדכון תאריך אחרון
        if (donation.donationDate > data.lastDonationDate) {
          data.lastDonationDate = donation.donationDate;
        }
      });

      // המרה למערך וסידור
      this.paymentReportData = Array.from(donorMap.values())
        .map(data => ({
          donorName: data.donor.fullName || `${data.donor.firstName} ${data.donor.lastName}`,
          promisedAmount: data.totalAmount, // נשתמש בשדה הזה בתור סכום בשקלים
          actualAmount: data.totalDonations, // נשתמש בשדה הזה בתור מספר תרומות
          remainingDebt: 0, // לא רלוונטי
          status: 'fullyPaid' as const,
          currency: 'ILS',
          // נוסיף שדות נוספים
          address: data.homeAddress || '',
          city: data.city || '',
          lastDonationDate: data.lastDonationDate
        }))
        .sort((a, b) => a.donorName.localeCompare(b.donorName));

      // Update pagination info
      this.paymentTotalCount = this.paymentReportData.length;
      this.paymentTotalPages = Math.ceil(this.paymentTotalCount / this.paymentPageSize);
      this.paymentCurrentPage = 1; // Reset to first page

    } catch (error) {
      console.error('Error loading payments report:', error);
      this.paymentReportData = [];
      this.paymentTotalCount = 0;
      this.paymentTotalPages = 0;
    }
  }

  async loadYearlySummaryReport() {
    const query = this.globalFilterService.applyFiltersToQuery({
      where: {},
      orderBy: { donationDate: 'desc' }
    });
    const donations = await this.donationRepo.find(query);

    const yearlyMap = new Map<number, { currencies: { [currency: string]: number }, hebrewYear?: string }>();

    // Process donations and convert dates to Hebrew years
    for (const donation of donations) {
      const year = new Date(donation.donationDate).getFullYear();

      if (!yearlyMap.has(year)) {
        // Get Hebrew year for this Gregorian year
        const hebrewDate = await HebrewDateController.convertGregorianToHebrew(donation.donationDate);
        const hebrewYearFormatted = await HebrewDateController.formatHebrewYear(hebrewDate.year);

        yearlyMap.set(year, {
          currencies: {},
          hebrewYear: hebrewYearFormatted
        });
      }

      const yearData = yearlyMap.get(year)!;
      if (!yearData.currencies[donation.currency]) {
        yearData.currencies[donation.currency] = 0;
      }
      yearData.currencies[donation.currency] += donation.amount;
    }

    this.yearlySummaryData = Array.from(yearlyMap.entries())
      .map(([year, data]) => {
        let totalInShekel = 0;
        Object.entries(data.currencies).forEach(([currency, amount]) => {
          totalInShekel += amount * (this.conversionRates[currency] || 1);
        });

        return {
          year,
          hebrewYear: data.hebrewYear || '',
          currencies: data.currencies,
          totalInShekel
        };
      })
      .sort((a, b) => b.year - a.year);

    // Update pagination info
    this.yearlySummaryTotalCount = this.yearlySummaryData.length;
    this.yearlySummaryTotalPages = Math.ceil(this.yearlySummaryTotalCount / this.yearlySummaryPageSize);
    this.yearlySummaryCurrentPage = 1; // Reset to first page
  }

  async loadBlessingsReport() {
    // Load campaign with invitees
    if (!this.filters.selectedCampaign || this.filters.selectedCampaign === '') {
      this.blessingReportData = [];
      this.blessingsTotalCount = 0;
      this.blessingsTotalPages = 0;
      return;
    }

    // Load campaign with invitees list
    const campaign = await this.campaignRepo.findId(this.filters.selectedCampaign);
    if (!campaign || !campaign.invitedDonorIds || campaign.invitedDonorIds.length === 0) {
      this.blessingReportData = [];
      this.blessingsTotalCount = 0;
      this.blessingsTotalPages = 0;
      return;
    }

    // Load all invitees (donors)
    const invitedDonors = await this.donorRepo.find({
      where: { id: { $in: campaign.invitedDonorIds } }
    });

    // Load all blessings for this campaign
    const blessings = await this.blessingRepo.find({
      where: { campaignId: this.filters.selectedCampaign },
      include: {
        donor: true,
        blessingBookType: true
      }
    });

    // Load donor contacts for all invitees
    const donorContactRepo = remult.repo(DonorContact);
    const donorContacts = await donorContactRepo.find({
      where: { donorId: { $in: campaign.invitedDonorIds } }
    });

    // Create map of contacts by donor ID
    const contactsMap = new Map<string, DonorContact[]>();
    donorContacts.forEach(contact => {
      if (contact.donorId) {
        if (!contactsMap.has(contact.donorId)) {
          contactsMap.set(contact.donorId, []);
        }
        contactsMap.get(contact.donorId)!.push(contact);
      }
    });

    // Create a map of blessings by donor ID
    const blessingMap = new Map<string, Blessing>();
    blessings.forEach(blessing => {
      if (blessing.donorId) {
        blessingMap.set(blessing.donorId, blessing);
      }
    });

    // Create report data for all invitees
    this.blessingReportData = invitedDonors.map(donor => {
      const displayName = donor.fullName || `${donor.firstName} ${donor.lastName}`;
      const nameParts = displayName.trim().split(' ');

      // מציאת טלפון, נייד ואימייל
      let phone = '';
      let mobile = '';
      let email = '';

      const donorContactsList = contactsMap.get(donor.id) || [];
      for (const contact of donorContactsList) {
        if (contact.type === 'phone' && contact.phoneNumber && !phone) {
          phone = contact.phoneNumber;
        } else if (contact.type === 'phone' && contact.phoneNumber && !mobile) {
          mobile = contact.phoneNumber;
        } else if (contact.type === 'email' && contact.email && !email) {
          email = contact.email;
        }
      }

      // Check if this donor has a blessing
      const blessing = blessingMap.get(donor.id);
      console.log('blessing', JSON.stringify(blessing))

      return {
        lastName: nameParts[0] || '',
        firstName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
        blessingBookType: (blessing && blessing.blessingBookType) ? blessing.blessingBookType.type : '-',
        notes: (blessing?.notes && blessing.notes.trim() !== '') ? blessing.notes : '-',
        status: (blessing && blessing.status) ? blessing.status : 'לא הגיב',
        phone: phone || '-',
        mobile: mobile || '-',
        email: email || '-',
        campaignName: campaign.name
      };
    });

    // Update pagination info
    this.blessingsTotalCount = this.blessingReportData.length;
    this.blessingsTotalPages = Math.ceil(this.blessingsTotalCount / this.blessingsPageSize);
    this.blessingsCurrentPage = 1; // Reset to first page
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
      preMade: this.blessingReportData.filter(b => b.blessingBookType === 'מוכנה').length,
      custom: this.blessingReportData.filter(b => b.blessingBookType === 'מותאמת אישית').length,
      notChosen: this.blessingReportData.filter(b => b.blessingBookType === 'לא נבחר' || !b.blessingBookType).length,
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

  async openCampaignSelectionModal() {
    try {
      const selectedCampaign = await openDialog(
        CampaignSelectionModalComponent,
        (modal: CampaignSelectionModalComponent) => {
          modal.args = {
            title: 'בחר קמפיין',
            multiSelect: false, // Single select only
            allowAddNew: false,
            selectedIds: this.filters.selectedCampaign ? [this.filters.selectedCampaign] : []
          };
        }
      );

      if (selectedCampaign && !Array.isArray(selectedCampaign)) {
        this.filters.selectedCampaign = (selectedCampaign as Campaign).id;
        await this.refreshData();
      }
    } catch (error) {
      console.error('Error opening campaign selection modal:', error);
    }
  }

  getSelectedCampaignText(): string {
    if (!this.filters.selectedCampaign) {
      return 'בחר קמפיין';
    }

    const campaign = this.availableCampaigns.find(c => c.id === this.filters.selectedCampaign);
    return campaign ? campaign.name : 'בחר קמפיין';
  }

  clearSelectedCampaign() {
    this.filters.selectedCampaign = '';
    this.refreshData();
  }

  // ===============================================
  // PAYMENT REPORT - Pagination & Sorting Methods
  // ===============================================

  get paginatedPaymentReport() {
    const start = (this.paymentCurrentPage - 1) * this.paymentPageSize;
    return this.paymentReportData.slice(start, start + this.paymentPageSize);
  }

  togglePaymentSort(field: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
      // Multi-column sort with Ctrl/Cmd
      const existing = this.paymentSortColumns.find(col => col.field === field);
      if (existing) {
        if (existing.direction === 'asc') {
          existing.direction = 'desc';
        } else {
          this.paymentSortColumns = this.paymentSortColumns.filter(col => col.field !== field);
        }
      } else {
        this.paymentSortColumns.push({ field, direction: 'asc' });
      }
    } else {
      // Single column sort
      const existing = this.paymentSortColumns.find(col => col.field === field);
      if (existing && existing.direction === 'asc') {
        this.paymentSortColumns = [{ field, direction: 'desc' }];
      } else {
        this.paymentSortColumns = [{ field, direction: 'asc' }];
      }
    }
    this.applyPaymentSorting();
  }

  applyPaymentSorting() {
    if (this.paymentSortColumns.length === 0) return;

    this.paymentReportData.sort((a, b) => {
      for (const sortCol of this.paymentSortColumns) {
        let aVal: any;
        let bVal: any;

        switch (sortCol.field) {
          case 'donorName':
            aVal = a.donorName || '';
            bVal = b.donorName || '';
            break;
          case 'promisedAmount':
            aVal = a.promisedAmount || 0;
            bVal = b.promisedAmount || 0;
            break;
          case 'actualAmount':
            aVal = a.actualAmount || 0;
            bVal = b.actualAmount || 0;
            break;
          case 'remainingDebt':
            aVal = a.remainingDebt || 0;
            bVal = b.remainingDebt || 0;
            break;
          case 'status':
            aVal = a.status || '';
            bVal = b.status || '';
            break;
          default:
            continue;
        }

        let comparison = 0;
        if (typeof aVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = aVal - bVal;
        }

        if (comparison !== 0) {
          return sortCol.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  isPaymentSorted(field: string): boolean {
    return this.paymentSortColumns.some(col => col.field === field);
  }

  getPaymentSortIcon(field: string): string {
    const sortCol = this.paymentSortColumns.find(col => col.field === field);
    if (!sortCol) return '';
    return sortCol.direction === 'asc' ? '↑' : '↓';
  }

  goToPaymentPage(page: number) {
    if (page >= 1 && page <= this.paymentTotalPages) {
      this.paymentCurrentPage = page;
    }
  }

  nextPaymentPage() {
    if (this.paymentCurrentPage < this.paymentTotalPages) {
      this.paymentCurrentPage++;
    }
  }

  previousPaymentPage() {
    if (this.paymentCurrentPage > 1) {
      this.paymentCurrentPage--;
    }
  }

  firstPaymentPage() {
    this.paymentCurrentPage = 1;
  }

  lastPaymentPage() {
    this.paymentCurrentPage = this.paymentTotalPages;
  }

  getPaymentPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.paymentCurrentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.paymentTotalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // Add first page
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push(-1); // Ellipsis
      }
    }

    // Add range
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add last page
    if (endPage < this.paymentTotalPages) {
      if (endPage < this.paymentTotalPages - 1) {
        pages.push(-1); // Ellipsis
      }
      pages.push(this.paymentTotalPages);
    }

    return pages;
  }

  // ===============================================
  // YEARLY SUMMARY REPORT - Pagination & Sorting Methods
  // ===============================================

  get paginatedYearlySummaryReport() {
    const start = (this.yearlySummaryCurrentPage - 1) * this.yearlySummaryPageSize;
    return this.yearlySummaryData.slice(start, start + this.yearlySummaryPageSize);
  }

  toggleYearlySummarySort(field: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
      // Multi-column sort with Ctrl/Cmd
      const existing = this.yearlySummarySortColumns.find(col => col.field === field);
      if (existing) {
        if (existing.direction === 'asc') {
          existing.direction = 'desc';
        } else {
          this.yearlySummarySortColumns = this.yearlySummarySortColumns.filter(col => col.field !== field);
        }
      } else {
        this.yearlySummarySortColumns.push({ field, direction: 'asc' });
      }
    } else {
      // Single column sort
      const existing = this.yearlySummarySortColumns.find(col => col.field === field);
      if (existing && existing.direction === 'asc') {
        this.yearlySummarySortColumns = [{ field, direction: 'desc' }];
      } else {
        this.yearlySummarySortColumns = [{ field, direction: 'asc' }];
      }
    }
    this.applyYearlySummarySorting();
  }

  applyYearlySummarySorting() {
    if (this.yearlySummarySortColumns.length === 0) return;

    this.yearlySummaryData.sort((a, b) => {
      for (const sortCol of this.yearlySummarySortColumns) {
        let aVal: any;
        let bVal: any;

        switch (sortCol.field) {
          case 'year':
            aVal = a.year || 0;
            bVal = b.year || 0;
            break;
          case 'hebrewYear':
            aVal = a.hebrewYear || '';
            bVal = b.hebrewYear || '';
            break;
          case 'totalInShekel':
            aVal = a.totalInShekel || 0;
            bVal = b.totalInShekel || 0;
            break;
          default:
            continue;
        }

        let comparison = 0;
        if (typeof aVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = aVal - bVal;
        }

        if (comparison !== 0) {
          return sortCol.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  isYearlySummarySorted(field: string): boolean {
    return this.yearlySummarySortColumns.some(col => col.field === field);
  }

  getYearlySummarySortIcon(field: string): string {
    const sortCol = this.yearlySummarySortColumns.find(col => col.field === field);
    if (!sortCol) return '';
    return sortCol.direction === 'asc' ? '↑' : '↓';
  }

  goToYearlySummaryPage(page: number) {
    if (page >= 1 && page <= this.yearlySummaryTotalPages) {
      this.yearlySummaryCurrentPage = page;
    }
  }

  nextYearlySummaryPage() {
    if (this.yearlySummaryCurrentPage < this.yearlySummaryTotalPages) {
      this.yearlySummaryCurrentPage++;
    }
  }

  previousYearlySummaryPage() {
    if (this.yearlySummaryCurrentPage > 1) {
      this.yearlySummaryCurrentPage--;
    }
  }

  firstYearlySummaryPage() {
    this.yearlySummaryCurrentPage = 1;
  }

  lastYearlySummaryPage() {
    this.yearlySummaryCurrentPage = this.yearlySummaryTotalPages;
  }

  getYearlySummaryPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.yearlySummaryCurrentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.yearlySummaryTotalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // Add first page
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push(-1); // Ellipsis
      }
    }

    // Add range
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add last page
    if (endPage < this.yearlySummaryTotalPages) {
      if (endPage < this.yearlySummaryTotalPages - 1) {
        pages.push(-1); // Ellipsis
      }
      pages.push(this.yearlySummaryTotalPages);
    }

    return pages;
  }

  // ===============================================
  // BLESSINGS REPORT - Pagination & Sorting Methods
  // ===============================================

  get paginatedBlessingsReport() {
    const start = (this.blessingsCurrentPage - 1) * this.blessingsPageSize;
    return this.blessingReportData.slice(start, start + this.blessingsPageSize);
  }

  toggleBlessingsSort(field: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
      // Multi-column sort with Ctrl/Cmd
      const existing = this.blessingsSortColumns.find(col => col.field === field);
      if (existing) {
        if (existing.direction === 'asc') {
          existing.direction = 'desc';
        } else {
          this.blessingsSortColumns = this.blessingsSortColumns.filter(col => col.field !== field);
        }
      } else {
        this.blessingsSortColumns.push({ field, direction: 'asc' });
      }
    } else {
      // Single column sort
      const existing = this.blessingsSortColumns.find(col => col.field === field);
      if (existing && existing.direction === 'asc') {
        this.blessingsSortColumns = [{ field, direction: 'desc' }];
      } else {
        this.blessingsSortColumns = [{ field, direction: 'asc' }];
      }
    }
    this.applyBlessingsSorting();
  }

  applyBlessingsSorting() {
    if (this.blessingsSortColumns.length === 0) return;

    this.blessingReportData.sort((a, b) => {
      for (const sortCol of this.blessingsSortColumns) {
        let aVal: any;
        let bVal: any;

        switch (sortCol.field) {
          case 'lastName':
            aVal = a.lastName || '';
            bVal = b.lastName || '';
            break;
          case 'firstName':
            aVal = a.firstName || '';
            bVal = b.firstName || '';
            break;
          case 'blessingBookType':
            aVal = a.blessingBookType || '';
            bVal = b.blessingBookType || '';
            break;
          case 'status':
            aVal = a.status || '';
            bVal = b.status || '';
            break;
          case 'campaignName':
            aVal = a.campaignName || '';
            bVal = b.campaignName || '';
            break;
          default:
            continue;
        }

        let comparison = 0;
        if (typeof aVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = aVal - bVal;
        }

        if (comparison !== 0) {
          return sortCol.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  isBlessingsSorted(field: string): boolean {
    return this.blessingsSortColumns.some(col => col.field === field);
  }

  getBlessingsSortIcon(field: string): string {
    const sortCol = this.blessingsSortColumns.find(col => col.field === field);
    if (!sortCol) return '';
    return sortCol.direction === 'asc' ? '↑' : '↓';
  }

  goToBlessingsPage(page: number) {
    if (page >= 1 && page <= this.blessingsTotalPages) {
      this.blessingsCurrentPage = page;
    }
  }

  nextBlessingsPage() {
    if (this.blessingsCurrentPage < this.blessingsTotalPages) {
      this.blessingsCurrentPage++;
    }
  }

  previousBlessingsPage() {
    if (this.blessingsCurrentPage > 1) {
      this.blessingsCurrentPage--;
    }
  }

  firstBlessingsPage() {
    this.blessingsCurrentPage = 1;
  }

  lastBlessingsPage() {
    this.blessingsCurrentPage = this.blessingsTotalPages;
  }

  getBlessingsPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.blessingsCurrentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.blessingsTotalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // Add first page
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push(-1); // Ellipsis
      }
    }

    // Add range
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add last page
    if (endPage < this.blessingsTotalPages) {
      if (endPage < this.blessingsTotalPages - 1) {
        pages.push(-1); // Ellipsis
      }
      pages.push(this.blessingsTotalPages);
    }

    return pages;
  }
}