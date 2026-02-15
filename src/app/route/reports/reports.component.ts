import { Component, OnDestroy, OnInit } from '@angular/core';
import { BusyService, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Subscription } from 'rxjs';
import { CampaignController, CurrencyTotal } from '../../../shared/controllers/campaign.controller';
import { HebrewDateController } from '../../../shared/controllers/hebrew-date.controller';
import { PersonalDonorReportData, ReportController } from '../../../shared/controllers/report.controller';
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
import { PrintService, PrintColumn } from '../../services/print.service';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { PayerService } from '../../services/payer.service';
import { ReportService } from '../../services/report.service';
import { UIToolsService } from '../../common/UIToolsService';
import { DonationController } from '../../../shared/controllers/donation.controller';
import { calculateEffectiveAmount, isPaymentBased } from '../../../shared/utils/donation-utils';

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
  promisedAmount: number; // Commitment in shekel
  actualAmount: number; // Actual payments in shekel
  remainingDebt: number;
  status: 'fullyPaid' | 'partiallyPaid' | 'notPaid';
  currency: string;
  address?: string;
  city?: string;
  phones?: string[];
  emails?: string[];
  lastDonationDate?: Date;
  // Expanded donor fields
  title?: string;
  firstName?: string;
  lastName?: string;
  suffix?: string;
  titleEnglish?: string;
  firstNameEnglish?: string;
  lastNameEnglish?: string;
  suffixEnglish?: string;
  maritalStatus?: string;
  isAnash?: boolean;
  isAlumni?: boolean;
  // Expanded address fields
  country?: string;
  state?: string;
  neighborhood?: string;
  street?: string;
  houseNumber?: string;
  building?: string;
  apartment?: string;
  postcode?: string;
  placeName?: string;
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
  // Expanded donor fields
  title?: string;
  suffix?: string;
  titleEnglish?: string;
  firstNameEnglish?: string;
  lastNameEnglish?: string;
  suffixEnglish?: string;
  maritalStatus?: string;
  isAnash?: boolean;
  isAlumni?: boolean;
}

interface DonationDetail {
  donationId?: string;
  date: Date;
  hebrewDateFormatted?: string;
  amount: number;
  originalAmount?: number;
  paymentTotal?: number;
  paymentCount?: number;
  perPaymentAmount?: number;
  isStandingOrder?: boolean;
  isUnlimitedStandingOrder?: boolean;
  currency: string;
  reason?: string;
  campaignName?: string;
  hebrewYear?: string;
  donationType?: 'full' | 'commitment' | 'partner';
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
  donations?: DonationDetail[]; // Donation breakdown
  isExpanded?: boolean; // For UI toggle
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
export class ReportsComponent implements OnInit, OnDestroy {
  toggleIsPrintAndProduceOnce() {
    // this.isPrintAndProduceOnce = !this.isPrintAndProduceOnce
  }

  printAndProduceOnce() {
    this.loadPersonalDonorReport()
    this.printPersonalDonorReport()
  }
  Math = Math; // Make Math available in template
  isExpandedView = false;
  filtersExpanded = true; // Accordion state for filters section
  isPrintAndProduceOnce = true
  private subscription = new Subscription();

  dateRange = {
    from: new Date(new Date().getFullYear(), 0, 1), // תחילת השנה
    to: new Date() // היום
  };

  // Active report type
  activeReport: 'general' | 'donations' | 'payments' | 'yearly' | 'blessings' | 'personalDonor' = 'donations';

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

  // Map for campaign raised amounts by currency (calculated on demand)
  campaignRaisedByCurrencyMap = new Map<string, CurrencyTotal[]>();

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
  conversionRates: { [key: string]: number } = {};

  // Pagination data - Donations Report
  totalRecords = 0;
  totalPages = 0;
  currentPage = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];

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
    showDonorAddress: true,
    showDonorPhone: true,
    showDonorEmail: true,
    showActualPayments: false,
    showCurrencySummary: true,
    showDonationDetails: true // Show donation breakdown under each row
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

  currencyTypes = this.payerService.getCurrencyTypesRecord()

  // Personal Donor Report
  personalDonorReportData: PersonalDonorReportData | null = null;
  selectedDonorForPersonalReport: Donor | null = null;
  selectedDonorsForPersonalReport: Donor[] = []; // Multi-select support
  currentPersonalReportDonorIndex = 0; // Index of currently displayed donor
  personalReportFromDate: Date | null = null;
  personalReportToDate: Date | null = null;
  personalReportFromDateHebrew = '';
  personalReportToDateHebrew = '';
  isPersonalReportPrintMode = false;

  // Sorting data - Personal Donor Report
  personalDonorSortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];

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
    private hebrewDateService: HebrewDateService,
    private payerService: PayerService,
    private printService: PrintService,
    private uiTools: UIToolsService
  ) { }

  async ngOnInit() {
    // Subscribe to global filter changes
    this.subscription.add(
      this.globalFilterService.filters$.subscribe(() => {
        console.log('Reports: Global filters changed, reloading data');
        this.refreshData();
      })
    );


    // this.activeReport === 'personalDonor'
    //   const donor = await remult.repo(Donor).findId('f6a1af98-f5e5-4595-b95d-895fb46a07e8')
    //   if (donor) {
    //     this.selectedDonorForPersonalReport = donor
    //     this.personalReportFromDate = new Date(2000, 1, 1)
    //     // await this.loadPersonalDonorReport()
    //   }

    // Load last selected report from user settings
    await this.loadLastReportSelection();

    await this.refreshData();

  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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


  private async loadGeneralStats() {
    // Note: Global filters are now applied on the backend automatically via user.settings
    const donations = await this.donationRepo.find({
      include: { donationMethod: true }
    });
    console.log('📊 Donations loaded:', donations.length);

    const donors = await this.donorRepo.find();
    console.log('📊 Donors loaded:', donors.length);

    const campaigns = await this.campaignRepo.find();
    console.log('📊 Campaigns loaded:', campaigns.length);

    // Load payment totals for commitment and standing order donations
    const paymentBasedIds = donations.filter(d => isPaymentBased(d)).map(d => d.id).filter(Boolean);
    const paymentTotals = paymentBasedIds.length > 0
      ? await DonationController.getPaymentTotalsForCommitments(paymentBasedIds)
      : {};

    this.totalStats.donations = donations.length;
    this.totalStats.amount = donations.reduce((sum, d) => sum + calculateEffectiveAmount(d, paymentTotals[d.id]), 0);
    this.totalStats.donors = donors.length;
    this.totalStats.campaigns = campaigns.length;
    this.totalStats.avgDonation = this.totalStats.donations > 0 ?
      this.totalStats.amount / this.totalStats.donations : 0;
    this.totalStats.recurringAmount = 0;
  }

  private async loadMonthlyTrends() {
    // Note: Global filters are now applied on the backend automatically via user.settings
    const donations = await this.donationRepo.find({
      orderBy: { donationDate: 'asc' },
      include: { donationMethod: true }
    });

    // Load payment totals for commitment and standing order donations
    const paymentBasedIds = donations.filter(d => isPaymentBased(d)).map(d => d.id).filter(Boolean);
    const paymentTotals = paymentBasedIds.length > 0
      ? await DonationController.getPaymentTotalsForCommitments(paymentBasedIds)
      : {};

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
      monthData.amount += calculateEffectiveAmount(donation, paymentTotals[donation.id]);
    });

    this.monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      donations: data.donations,
      amount: data.amount
    }));
  }

  private async loadCampaignAnalysis() {
    const campaigns = await this.campaignRepo.find({
      orderBy: { name: 'asc' }
    });

    // Fetch raised amounts for all campaigns
    const campaignIds = campaigns.map(c => c.id);
    const raisedByCurrency = await CampaignController.getRaisedAmountsByCurrency(campaignIds);

    // Build map of campaign -> currency totals
    this.campaignRaisedByCurrencyMap.clear();
    for (const item of raisedByCurrency) {
      this.campaignRaisedByCurrencyMap.set(item.campaignId, item.totals);
    }

    // Sort campaigns by raised amount (converted to ILS) descending
    const sortedCampaigns = [...campaigns].sort((a, b) => {
      const raisedA = this.getCampaignRaisedInILS(a.id);
      const raisedB = this.getCampaignRaisedInILS(b.id);
      return raisedB - raisedA;
    });

    const totalRaised = campaigns.reduce((sum, c) => sum + this.getCampaignRaisedInILS(c.id), 0);

    this.campaignData = sortedCampaigns.slice(0, 10).map(campaign => {
      const raised = this.getCampaignRaisedInILS(campaign.id);
      return {
        label: campaign.name,
        value: raised,
        percentage: totalRaised > 0 ? (raised / totalRaised) * 100 : 0
      };
    });
  }

  private getCampaignRaisedInILS(campaignId: string): number {
    const totals = this.campaignRaisedByCurrencyMap.get(campaignId) || [];
    return totals.reduce((sum, t) => {
      const rate = this.currencyTypes[t.currencyId]?.rateInShekel || 1;
      return sum + (t.total * rate);
    }, 0);
  }

  private async loadDonorAnalysis() {
    // Note: Global filters are now applied on the backend automatically via user.settings
    const donations = await this.donationRepo.find({
      include: { donor: true, donationMethod: true }
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

    // Load payment totals for commitment and standing order donations
    const paymentBasedIds = donations.filter(d => isPaymentBased(d)).map(d => d.id).filter(Boolean);
    const paymentTotals = paymentBasedIds.length > 0
      ? await DonationController.getPaymentTotalsForCommitments(paymentBasedIds)
      : {};

    // ניתוח לפי סוג תורם
    const typeMap = new Map<string, number>();
    donations.forEach(donation => {
      const type = donation.donor?.donorType || 'אחר';
      typeMap.set(type, (typeMap.get(type) || 0) + calculateEffectiveAmount(donation, paymentTotals[donation.id]));
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
      regionMap.set(region, (regionMap.get(region) || 0) + calculateEffectiveAmount(donation, paymentTotals[donation.id]));
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
    // Note: Global filters are now applied on the backend automatically via user.settings
    const donations = await this.donationRepo.find({
      include: { donor: true, donationMethod: true }
    });

    // Load payment totals for commitment and standing order donations
    const paymentBasedIds = donations.filter(d => isPaymentBased(d)).map(d => d.id).filter(Boolean);
    const paymentTotals = paymentBasedIds.length > 0
      ? await DonationController.getPaymentTotalsForCommitments(paymentBasedIds)
      : {};

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
      donorData.total += calculateEffectiveAmount(donation, paymentTotals[donation.id]);
      donorData.count++;
    });

    this.topDonors = Array.from(donorMap.values())
      .filter(data => data.donor)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // קמפיינים מובילים - sort by raised amount calculated on demand
    const allCampaigns = await this.campaignRepo.find({});
    const topCampaignIds = allCampaigns.map(c => c.id);

    // Fetch raised amounts if not already loaded
    if (this.campaignRaisedByCurrencyMap.size === 0 && topCampaignIds.length > 0) {
      const raisedByCurrency = await CampaignController.getRaisedAmountsByCurrency(topCampaignIds);
      for (const item of raisedByCurrency) {
        this.campaignRaisedByCurrencyMap.set(item.campaignId, item.totals);
      }
    }

    this.topCampaigns = [...allCampaigns]
      .sort((a, b) => {
        const raisedA = this.getCampaignRaisedInILS(a.id);
        const raisedB = this.getCampaignRaisedInILS(b.id);
        return raisedB - raisedA;
      })
      .slice(0, 5);
  }

  private async loadRecentActivity() {
    // Note: Global filters are now applied on the backend automatically via user.settings
    const recentDonations = await this.donationRepo.find({
      orderBy: { donationDate: 'desc' },
      limit: 20,
      include: {
        donor: true,
        campaign: true,
        donationMethod: true
      }
    });

    // Load payment totals for payment-based donations (commitments + standing orders)
    const paymentBasedIds = recentDonations.filter(d => isPaymentBased(d)).map(d => d.id).filter(Boolean);
    const paymentTotals = paymentBasedIds.length > 0
      ? await DonationController.getPaymentTotalsForCommitments(paymentBasedIds)
      : {};

    this.recentActivity = recentDonations.map(donation => ({
      type: 'donation',
      date: donation.donationDate,
      description: `תרומה מ${donation.donor?.fullName || 'תורם אלמוני'}`,
      amount: calculateEffectiveAmount(donation, paymentTotals[donation.id]),
      campaign: donation.campaign?.name,
      details: donation
    }));
  }

  formatCurrency(amount: number): string {
    return `₪${amount.toLocaleString()}`;
  }

  normalizeCurrencyCode(currency: string): string {
    // Map Hebrew currency names and variations to standard codes
    const hebrewToCode: { [key: string]: string } = {
      'דולר': 'USD',
      'אירו': 'EUR',
      'יורו': 'EUR',
      'שקל': 'ILS',
      'שקלים': 'ILS',
      'לירה': 'GBP',
      'לירה שטרלינג': 'GBP',
      'ליש"ט': 'GBP',
      'פאונד': 'GBP',
      'Shekel': 'ILS',
      'Dollar': 'USD',
      'Euro': 'EUR',
      'Pound': 'GBP'
    };

    // Return standard code if already in correct format, otherwise convert
    const normalized = hebrewToCode[currency] || currency.toUpperCase();

    // Ensure it's one of the valid codes
    const validCodes = ['ILS', 'USD', 'EUR', 'GBP'];
    return validCodes.includes(normalized) ? normalized : 'ILS';
  }

  getCurrencySymbol(currencyId: string): string {
    return this.currencyTypes[currencyId]?.symbol
  }

  formatCurrencyWithSymbol(amount: number, currency: string): string {
    const symbol = this.getCurrencySymbol(currency);
    const formattedAmount = Math.round(amount).toLocaleString('he-IL');
    return `${symbol}${formattedAmount}`;
  }

  /**
   * Returns true if any donor detail column is visible (for backend data loading)
   */
  get showAnyDonorDetails(): boolean {
    return this.filters.showDonorAddress || this.filters.showDonorPhone || this.filters.showDonorEmail;
  }

  /**
   * Get the total number of columns for colspan calculation
   */
  getColumnsCount(): number {
    let count = 1; // Name column
    if (this.filters.groupBy === 'donor') {
      if (this.filters.showDonorAddress) count++;
      if (this.filters.showDonorPhone) count++;
      if (this.filters.showDonorEmail) count++;
    }
    count += this.hebrewYears.length; // Year columns
    if (this.filters.showActualPayments) {
      count += 1; // Actual payments column
    }
    return count;
  }

  /**
   * Get donations filtered by Hebrew year
   */
  getDonationsForYear(donations: DonationDetail[] | undefined, year: string): DonationDetail[] {
    if (!donations) return [];
    return donations.filter(d => d.hebrewYear === year);
  }

  /**
   * Open donation details modal
   */
  async openDonationDetails(donationId: string | undefined, event: Event) {
    event.stopPropagation(); // Prevent row expand/collapse
    if (!donationId) return;
    await this.uiTools.donationDetailsDialog(donationId);
  }

  /**
   * Check if name starts with English character (LTR)
   */
  isEnglishName(name: string): boolean {
    if (!name) return false;
    const firstChar = name.trim().charAt(0);
    return /^[A-Za-z]/.test(firstChar);
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

    // Convert raised amounts to ILS
    const raisedInILS = this.getCampaignRaisedInILS(campaign.id);

    // Convert target amount to ILS
    const targetRate = this.currencyTypes[campaign.currencyId]?.rateInShekel || 1;
    const targetInILS = campaign.targetAmount * targetRate;

    return Math.min(100, Math.round((raisedInILS / targetInILS) * 100));
  }

  getRaisedAmount(campaign: Campaign): number {
    return this.getCampaignRaisedInILS(campaign.id);
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

  async switchReport(reportType: 'general' | 'donations' | 'payments' | 'yearly' | 'blessings' | 'personalDonor') {
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
        user.settings.reports.filtersExpanded = this.filtersExpanded;
        user.settings.reports.pageSize = this.pageSize;
        user.settings.reports.donationFilters = {
          groupBy: this.filters.groupBy,
          showDonorAddress: this.filters.showDonorAddress,
          showDonorPhone: this.filters.showDonorPhone,
          showDonorEmail: this.filters.showDonorEmail,
          showActualPayments: this.filters.showActualPayments,
          showCurrencySummary: this.filters.showCurrencySummary,
          showDonationDetails: this.filters.showDonationDetails,
        };
        await userRepo.save(user);

        console.log('Saved report settings:', this.activeReport, 'donationFilters:', user.settings.reports.donationFilters);
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
      if (user?.settings?.reports?.filtersExpanded !== undefined) {
        this.filtersExpanded = user.settings.reports.filtersExpanded;
        console.log('Loaded filtersExpanded:', this.filtersExpanded);
      }
      if (user?.settings?.reports?.pageSize) {
        this.pageSize = user.settings.reports.pageSize;
        console.log('Loaded pageSize:', this.pageSize);
      }
      const df = user?.settings?.reports?.donationFilters;
      if (df) {
        if (df.groupBy) this.filters.groupBy = df.groupBy as any;
        if (df.showDonorAddress !== undefined) this.filters.showDonorAddress = df.showDonorAddress;
        if (df.showDonorPhone !== undefined) this.filters.showDonorPhone = df.showDonorPhone;
        if (df.showDonorEmail !== undefined) this.filters.showDonorEmail = df.showDonorEmail;
        if (df.showActualPayments !== undefined) this.filters.showActualPayments = df.showActualPayments;
        if (df.showCurrencySummary !== undefined) this.filters.showCurrencySummary = df.showCurrencySummary;
        if (df.showDonationDetails !== undefined) this.filters.showDonationDetails = df.showDonationDetails;
        console.log('Loaded donationFilters:', df);
      }
    } catch (error) {
      console.error('Error loading last report selection:', error);
    }
  }

  /**
   * Toggle filters accordion and save state
   */
  toggleFiltersExpanded() {
    this.filtersExpanded = !this.filtersExpanded;
    this.saveLastReportSelection();
  }

  /**
   * טעינת דוחות ספציפיים (תרומות, תשלומים, שנתי, ברכות, דוח אישי לתורם)
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
      case 'personalDonor':
        // Don't auto-load - user needs to select donor and dates first
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

      // Global filters are fetched from user.settings in the backend
      const reportResponse = await this.reportService.getGroupedDonationsReport({
        groupBy: this.filters.groupBy,
        showDonorDetails: this.showAnyDonorDetails,
        showActualPayments: this.filters.showActualPayments,
        showCurrencySummary: this.filters.showCurrencySummary,
        showDonationDetails: this.filters.showDonationDetails,
        selectedDonorIds: this.filters.selectedDonorIds.length > 0 ? this.filters.selectedDonorIds : undefined,
        selectedCampaign: this.filters.selectedCampaign || undefined,
        selectedDonorType: this.filters.selectedDonorType || undefined,
        selectedYear: this.filters.selectedYear,
        conversionRates: this.conversionRates,
        page: this.currentPage,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection
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

      // Auto-expand all rows when showDonationDetails is active
      if (this.filters.showDonationDetails) {
        this.groupedDonationReport.forEach(row => row.isExpanded = true);
      }
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
    if (!yearData) return '-';

    const currencies = Object.entries(yearData).filter(([, amount]) => amount > 0);
    if (currencies.length === 0) return '-';

    // Show each currency separately (e.g., "₪100 | €36 | $50")
    return currencies
      .map(([currency, amount]) => this.formatCurrencyWithSymbol(amount, currency))
      .join(' | ');
  }

  async loadPaymentsReport() {
    // דוח תשלומים - Commitment vs Actual
    try {
      // Build local filters
      const localFilters = {
        selectedDonorIds: this.filters.selectedDonorIds.length > 0 ? this.filters.selectedDonorIds : undefined
      };
      // Global filters are now applied on the backend automatically via user.settings
      this.paymentReportData = await this.reportService.getPaymentsReport(this.conversionRates, localFilters);

      // Update pagination info
      this.paymentTotalCount = this.paymentReportData.length;
      this.paymentTotalPages = Math.ceil(this.paymentTotalCount / this.paymentPageSize);
      this.paymentCurrentPage = 1; // Reset to first page

      console.log(`✅ Loaded ${this.paymentReportData.length} payment report rows`);
    } catch (error) {
      console.error('Error loading payments report:', error);
      this.paymentReportData = [];
      this.paymentTotalCount = 0;
      this.paymentTotalPages = 0;
    }
  }

  async loadYearlySummaryReport() {
    // דוח שנתי - סיכום לפי שנים
    try {
      // Build local filters
      const localFilters = {
        selectedYear: this.filters.selectedYear
      };
      // Global filters are now applied on the backend automatically via user.settings
      this.yearlySummaryData = await this.reportService.getYearlySummaryReport(this.conversionRates, localFilters);

      // Update pagination info
      this.yearlySummaryTotalCount = this.yearlySummaryData.length;
      this.yearlySummaryTotalPages = Math.ceil(this.yearlySummaryTotalCount / this.yearlySummaryPageSize);
      this.yearlySummaryCurrentPage = 1; // Reset to first page

      console.log(`✅ Loaded ${this.yearlySummaryData.length} yearly summary rows`);
    } catch (error) {
      console.error('Error loading yearly summary report:', error);
      this.yearlySummaryData = [];
      this.yearlySummaryTotalCount = 0;
      this.yearlySummaryTotalPages = 0;
    }
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

    // 🎯 Apply global filters to invited donors list
    let filteredInvitedDonorIds = [...campaign.invitedDonorIds];
    const globalFilters = this.globalFilterService.currentFilters;

    // Filter by city
    if (globalFilters.cityIds && globalFilters.cityIds.length > 0) {
      const donorPlaceRepo = remult.repo(DonorPlace);
      const donorPlaces = await donorPlaceRepo.find({
        where: {
          isPrimary: true,
          isActive: true,
          donorId: { $in: filteredInvitedDonorIds }
        },
        include: { place: true }
      });

      const cityFilteredDonorIds = donorPlaces
        .filter(dp => dp.place?.city && globalFilters.cityIds!.includes(dp.place.city))
        .map(dp => dp.donorId!)
        .filter(Boolean);

      filteredInvitedDonorIds = filteredInvitedDonorIds.filter(id => cityFilteredDonorIds.includes(id));
      console.log(`🏙️ City filter applied: ${campaign.invitedDonorIds.length} → ${filteredInvitedDonorIds.length} donors`);
    }

    // Filter by donor type
    if (globalFilters.donorTypeIds && globalFilters.donorTypeIds.length > 0) {
      // This would require loading donors first - for now skip or implement if needed
      console.log('⚠️ Donor type filter not yet implemented for Blessings Report');
    }

    // If no donors left after filtering, return empty
    if (filteredInvitedDonorIds.length === 0) {
      this.blessingReportData = [];
      this.blessingsTotalCount = 0;
      this.blessingsTotalPages = 0;
      return;
    }

    // Load all invitees (donors) - now filtered
    const invitedDonors = await this.donorRepo.find({
      where: { id: { $in: filteredInvitedDonorIds } }
    });

    // Load all blessings for this campaign (only for filtered donors)
    const blessings = await this.blessingRepo.find({
      where: {
        campaignId: this.filters.selectedCampaign,
        donorId: { $in: filteredInvitedDonorIds }
      },
      include: {
        donor: true,
        blessingBookType: true
      }
    });

    // Load donor contacts for filtered invitees only
    const donorContactRepo = remult.repo(DonorContact);
    const donorContacts = await donorContactRepo.find({
      where: { donorId: { $in: filteredInvitedDonorIds } }
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
        // Original fields
        lastName: donor.lastName || '',
        firstName: donor.firstName || '',
        blessingBookType: (blessing && blessing.blessingBookType) ? blessing.blessingBookType.type : '-',
        notes: (blessing?.notes && blessing.notes.trim() !== '') ? blessing.notes : '-',
        status: (blessing && blessing.status) ? blessing.status : 'לא הגיב',
        phone: phone || '-',
        mobile: mobile || '-',
        email: email || '-',
        campaignName: campaign.name,
        // Expanded donor fields
        title: donor.title || '',
        suffix: donor.suffix || '',
        titleEnglish: donor.titleEnglish || '',
        firstNameEnglish: donor.firstNameEnglish || '',
        lastNameEnglish: donor.lastNameEnglish || '',
        suffixEnglish: donor.suffixEnglish || '',
        maritalStatus: donor.maritalStatus || '',
        isAnash: donor.isAnash || false,
        isAlumni: donor.isAlumni || false
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
    await this.saveLastReportSelection();
  }

  async printReport() {
    switch (this.activeReport) {
      case 'donations':
        await this.printDonationsReport();
        break;
      case 'yearly':
        this.printYearlySummaryReport();
        break;
      case 'payments':
        this.printPaymentsReport();
        break;
      case 'blessings':
        this.printBlessingsReport();
        break;
      default:
        alert('הדפסה לדוח זה עדיין לא נתמכת');
    }
  }

  toggleExpandedView() {
    this.isExpandedView = !this.isExpandedView;
  }

  async exportToExcel() {
    switch (this.activeReport) {
      case 'donations':
        await this.exportDonationsReportToExcel();
        break;
      case 'payments':
        await this.exportPaymentsToExcel();
        break;
      case 'yearly':
        await this.exportYearlySummaryToExcel();
        break;
      case 'blessings':
        await this.exportBlessingsToExcel();
        break;
      default:
        alert('ייצוא לדוח זה עדיין לא נתמך');
    }
  }

  async exportSpecificReport(format: 'excel' | 'pdf' | 'csv') {
    if (this.activeReport === 'donations' && format === 'excel') {
      await this.exportDonationsReportToExcel();
    } else {
      alert(`ייצוא דוח ${this.activeReport} בפורמט ${format} - בפיתוח`);
    }
  }

  async exportDonorsToExcel() {
    try {
      // Load all donor data with details
      const fullReportResponse = await this.reportService.getGroupedDonationsReport({
        groupBy: 'donor',
        showDonorDetails: true,
        showActualPayments: false,
        showCurrencySummary: false,
        showDonationDetails: false,
        selectedDonorIds: this.filters.selectedDonorIds.length > 0 ? this.filters.selectedDonorIds : undefined,
        selectedCampaign: this.filters.selectedCampaign || undefined,
        selectedDonorType: this.filters.selectedDonorType || undefined,
        selectedYear: this.filters.selectedYear,
        conversionRates: this.conversionRates,
        page: 1,
        pageSize: 999999,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection
      });

      const columns: import('../../services/excel-export.service').ExcelColumn<any>[] = [
        // Expanded donor fields (Hebrew)
        { header: 'תואר', mapper: (row: any) => row.donorDetails?.title || '', width: 10 },
        { header: 'שם פרטי', mapper: (row: any) => row.donorDetails?.firstName || '', width: 15 },
        { header: 'שם משפחה', mapper: (row: any) => row.donorDetails?.lastName || '', width: 15 },
        { header: 'סיומת', mapper: (row: any) => row.donorDetails?.suffix || '', width: 10 },
        // Expanded donor fields (English)
        { header: 'Title', mapper: (row: any) => row.donorDetails?.titleEnglish || '', width: 10 },
        { header: 'First Name', mapper: (row: any) => row.donorDetails?.firstNameEnglish || '', width: 15 },
        { header: 'Last Name', mapper: (row: any) => row.donorDetails?.lastNameEnglish || '', width: 15 },
        { header: 'Suffix', mapper: (row: any) => row.donorDetails?.suffixEnglish || '', width: 10 },
        // Donor type fields
        { header: 'מצב משפחתי', mapper: (row: any) => this.getMaritalStatusText(row.donorDetails?.maritalStatus || ''), width: 12 },
        { header: 'אנ"ש', mapper: (row: any) => row.donorDetails?.isAnash ? '✓' : '', width: 8 },
        { header: 'תלמידנו', mapper: (row: any) => row.donorDetails?.isAlumni ? '✓' : '', width: 8 },
        // Expanded address fields
        { header: 'מדינה', mapper: (row: any) => row.donorDetails?.country || '', width: 12 },
        { header: 'עיר', mapper: (row: any) => row.donorDetails?.city || '', width: 15 },
        { header: 'מחוז', mapper: (row: any) => row.donorDetails?.state || '', width: 12 },
        { header: 'שכונה', mapper: (row: any) => row.donorDetails?.neighborhood || '', width: 15 },
        { header: 'רחוב', mapper: (row: any) => row.donorDetails?.street || '', width: 20 },
        { header: 'מספר', mapper: (row: any) => row.donorDetails?.houseNumber || '', width: 8 },
        { header: 'בניין', mapper: (row: any) => row.donorDetails?.building || '', width: 10 },
        { header: 'דירה', mapper: (row: any) => row.donorDetails?.apartment || '', width: 8 },
        { header: 'מיקוד', mapper: (row: any) => row.donorDetails?.postcode || '', width: 10 },
        { header: 'שם מקום', mapper: (row: any) => row.donorDetails?.placeName || '', width: 15 },
        // Contact fields
        { header: 'טלפון', mapper: (row: any) => row.donorDetails?.phones?.join(', ') || '', width: 20 },
        { header: 'אימייל', mapper: (row: any) => row.donorDetails?.emails?.join(', ') || '', width: 30 }
      ];

      await this.excelService.export({
        data: fullReportResponse.reportData,
        columns,
        sheetName: 'תורמים',
        fileName: this.excelService.generateFileName('תורמים')
      });
    } catch (error) {
      console.error('Error exporting donors to Excel:', error);
    }
  }

  async exportDonationsReportToExcel() {
    try {
      // Load all data without pagination for export
      // Global filters are fetched from user.settings in the backend
      const fullReportResponse = await this.reportService.getGroupedDonationsReport({
        groupBy: this.filters.groupBy,
        showDonorDetails: this.showAnyDonorDetails,
        showActualPayments: this.filters.showActualPayments,
        showCurrencySummary: this.filters.showCurrencySummary,
        showDonationDetails: this.filters.showDonationDetails, // Include details if user selected
        selectedDonorIds: this.filters.selectedDonorIds.length > 0 ? this.filters.selectedDonorIds : undefined,
        selectedCampaign: this.filters.selectedCampaign || undefined,
        selectedDonorType: this.filters.selectedDonorType || undefined,
        selectedYear: this.filters.selectedYear,
        conversionRates: this.conversionRates,
        page: 1,
        pageSize: 999999, // Get all records
        sortBy: this.sortBy,
        sortDirection: this.sortDirection
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
      const headers: string[] = [];
      const isDonorGroupBy = this.filters.groupBy === 'donor';

      if (isDonorGroupBy) {
        // Expanded donor headers (Hebrew)
        headers.push('תואר', 'שם פרטי', 'שם משפחה', 'סיומת');
        // Expanded donor headers (English)
        headers.push('Title', 'First Name', 'Last Name', 'Suffix');
        // Donor type fields
        headers.push('מצב משפחתי', 'אנ"ש', 'תלמידנו');
        // Expanded address fields (if showDonorAddress)
        if (this.filters.showDonorAddress) {
          headers.push('מדינה', 'עיר', 'מחוז', 'שכונה', 'רחוב', 'מספר', 'בניין', 'דירה', 'מיקוד', 'שם מקום');
        }
        if (this.filters.showDonorPhone) headers.push('טלפונים');
        if (this.filters.showDonorEmail) headers.push('אימיילים');
      } else {
        headers.push('שם');
      }

      fullReportResponse.hebrewYears.forEach(year => headers.push(year));
      if (this.filters.showActualPayments) {
        headers.push('תשלומים בפועל');
      }
      reportData.push(headers);

      // Add data rows
      fullReportResponse.reportData.forEach(row => {
        const dataRow: any[] = [];

        if (isDonorGroupBy) {
          // Expanded donor fields (Hebrew)
          dataRow.push(row.donorDetails?.title || '');
          dataRow.push(row.donorDetails?.firstName || '');
          dataRow.push(row.donorDetails?.lastName || '');
          dataRow.push(row.donorDetails?.suffix || '');
          // Expanded donor fields (English)
          dataRow.push(row.donorDetails?.titleEnglish || '');
          dataRow.push(row.donorDetails?.firstNameEnglish || '');
          dataRow.push(row.donorDetails?.lastNameEnglish || '');
          dataRow.push(row.donorDetails?.suffixEnglish || '');
          // Donor type fields
          dataRow.push(this.getMaritalStatusText(row.donorDetails?.maritalStatus || ''));
          dataRow.push(row.donorDetails?.isAnash ? '✓' : '');
          dataRow.push(row.donorDetails?.isAlumni ? '✓' : '');
          // Expanded address fields (if showDonorAddress)
          if (this.filters.showDonorAddress) {
            dataRow.push(row.donorDetails?.country || '');
            dataRow.push(row.donorDetails?.city || '');
            dataRow.push(row.donorDetails?.state || '');
            dataRow.push(row.donorDetails?.neighborhood || '');
            dataRow.push(row.donorDetails?.street || '');
            dataRow.push(row.donorDetails?.houseNumber || '');
            dataRow.push(row.donorDetails?.building || '');
            dataRow.push(row.donorDetails?.apartment || '');
            dataRow.push(row.donorDetails?.postcode || '');
            dataRow.push(row.donorDetails?.placeName || '');
          }
          if (this.filters.showDonorPhone) {
            dataRow.push(row.donorDetails?.phones?.join(', ') || '');
          }
          if (this.filters.showDonorEmail) {
            dataRow.push(row.donorDetails?.emails?.join(', ') || '');
          }
        } else {
          dataRow.push(row.donorName);
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

        // Add donation details rows if showDonationDetails is enabled
        if (this.filters.showDonationDetails && row.donations && row.donations.length > 0) {
          // Calculate number of columns before years
          let preYearCols = 1; // Name column (for non-donor groupBy)
          if (isDonorGroupBy) {
            preYearCols = 11; // 4 Hebrew name + 4 English name + 3 type fields
            if (this.filters.showDonorAddress) preYearCols += 10; // 10 address fields
            if (this.filters.showDonorPhone) preYearCols++;
            if (this.filters.showDonorEmail) preYearCols++;
          }

          // Group donations by Hebrew year
          fullReportResponse.hebrewYears.forEach((year, yearIndex) => {
            const yearDonations = row.donations!.filter((d: any) => d.hebrewYear === year);
            yearDonations.forEach((donation: any) => {
              const detailRow: any[] = [];
              // Empty cells for pre-year columns
              for (let i = 0; i < preYearCols; i++) {
                detailRow.push('');
              }
              // Empty cells for years before this one
              for (let i = 0; i < yearIndex; i++) {
                detailRow.push('');
              }
              // Donation detail in the year column
              const dateStr = donation.hebrewDateFormatted || (donation.date ? new Date(donation.date).toLocaleDateString('he-IL') : '');
              const amountStr = this.formatCurrencyWithSymbol(donation.amount, donation.currency);
              const reasonStr = donation.reason ? ` - ${donation.reason}` : '';
              detailRow.push(`  ${dateStr}: ${amountStr}${reasonStr}`);
              // Empty cells for remaining years
              for (let i = yearIndex + 1; i < fullReportResponse.hebrewYears.length; i++) {
                detailRow.push('');
              }
              if (this.filters.showActualPayments) {
                detailRow.push('');
              }
              reportData.push(detailRow);
            });
          });
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(reportData);

      // Set column widths
      const colWidths: { wch: number }[] = [];
      if (isDonorGroupBy) {
        // Expanded donor fields (Hebrew): תואר, שם פרטי, שם משפחה, סיומת
        colWidths.push({ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 });
        // Expanded donor fields (English): Title, First Name, Last Name, Suffix
        colWidths.push({ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 });
        // Donor type fields: מצב משפחתי, אנ"ש, תלמידנו
        colWidths.push({ wch: 12 }, { wch: 8 }, { wch: 8 });
        // Expanded address fields
        if (this.filters.showDonorAddress) {
          colWidths.push({ wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 });
          colWidths.push({ wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 15 });
        }
        if (this.filters.showDonorPhone) colWidths.push({ wch: 20 });
        if (this.filters.showDonorEmail) colWidths.push({ wch: 30 });
      } else {
        colWidths.push({ wch: 25 }); // Name column
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

  async exportPaymentsToExcel() {
    try {
      if (this.paymentReportData.length === 0) {
        alert('אין נתונים לייצוא');
        return;
      }

      await this.excelService.export({
        data: this.paymentReportData,
        columns: [
          // Expanded donor fields (Hebrew)
          { header: 'תואר', mapper: (row) => row.title || '', width: 10 },
          { header: 'שם פרטי', mapper: (row) => row.firstName || '', width: 15 },
          { header: 'שם משפחה', mapper: (row) => row.lastName || '', width: 15 },
          { header: 'סיומת', mapper: (row) => row.suffix || '', width: 10 },
          // Expanded donor fields (English)
          { header: 'Title', mapper: (row) => row.titleEnglish || '', width: 10 },
          { header: 'First Name', mapper: (row) => row.firstNameEnglish || '', width: 15 },
          { header: 'Last Name', mapper: (row) => row.lastNameEnglish || '', width: 15 },
          { header: 'Suffix', mapper: (row) => row.suffixEnglish || '', width: 10 },
          // Donor type fields
          { header: 'מצב משפחתי', mapper: (row) => this.getMaritalStatusText(row.maritalStatus || ''), width: 12 },
          { header: 'אנ"ש', mapper: (row) => row.isAnash ? '✓' : '', width: 8 },
          { header: 'תלמידנו', mapper: (row) => row.isAlumni ? '✓' : '', width: 8 },
          // Expanded address fields
          { header: 'מדינה', mapper: (row) => row.country || '', width: 12 },
          { header: 'עיר', mapper: (row) => row.city || '', width: 15 },
          { header: 'מחוז', mapper: (row) => row.state || '', width: 12 },
          { header: 'שכונה', mapper: (row) => row.neighborhood || '', width: 15 },
          { header: 'רחוב', mapper: (row) => row.street || '', width: 20 },
          { header: 'מספר', mapper: (row) => row.houseNumber || '', width: 8 },
          { header: 'בניין', mapper: (row) => row.building || '', width: 10 },
          { header: 'דירה', mapper: (row) => row.apartment || '', width: 8 },
          { header: 'מיקוד', mapper: (row) => row.postcode || '', width: 10 },
          { header: 'שם מקום', mapper: (row) => row.placeName || '', width: 15 },
          // Contact fields
          { header: 'טלפון', mapper: (row) => row.phones?.join(', ') || '', width: 20 },
          { header: 'אימייל', mapper: (row) => row.emails?.join(', ') || '', width: 30 },
          // Report fields
          { header: 'תאריך אחרון', mapper: (row) => this.formatHebrewDate(row.lastDonationDate), width: 15 },
          { header: 'התחייבות', mapper: (row) => this.formatCurrency(row.promisedAmount), width: 15 },
          { header: 'תשלום בפועל', mapper: (row) => this.formatCurrency(row.actualAmount), width: 15 },
          { header: 'חוב נותר', mapper: (row) => this.formatCurrency(row.remainingDebt), width: 15 }
        ],
        sheetName: 'דוח תשלומים',
        fileName: this.excelService.generateFileName('דוח_תשלומים')
      });
    } catch (error) {
      console.error('Error exporting payments to Excel:', error);
      alert('שגיאה בייצוא הדוח');
    }
  }

  async exportYearlySummaryToExcel() {
    try {
      if (this.yearlySummaryData.length === 0) {
        alert('אין נתונים לייצוא');
        return;
      }

      await this.excelService.export({
        data: this.yearlySummaryData,
        columns: [
          { header: 'שנה עברית', mapper: (row) => row.hebrewYear, width: 15 },
          { header: 'שנה לועזית', mapper: (row) => row.year.toString(), width: 12 },
          { header: 'שקל', mapper: (row) => (row.currencies['ILS'] || 0) > 0 ? `₪${Math.round(row.currencies['ILS']).toLocaleString()}` : '-', width: 15 },
          { header: 'דולר', mapper: (row) => (row.currencies['USD'] || 0) > 0 ? `$${Math.round(row.currencies['USD']).toLocaleString()}` : '-', width: 15 },
          { header: 'יורו', mapper: (row) => (row.currencies['EUR'] || 0) > 0 ? `€${Math.round(row.currencies['EUR']).toLocaleString()}` : '-', width: 15 }
        ],
        sheetName: 'סיכום שנתי',
        fileName: this.excelService.generateFileName('סיכום_שנתי')
      });
    } catch (error) {
      console.error('Error exporting yearly summary to Excel:', error);
      alert('שגיאה בייצוא הדוח');
    }
  }

  async exportBlessingsToExcel() {
    try {
      if (this.blessingReportData.length === 0) {
        alert('אין נתונים לייצוא');
        return;
      }

      await this.excelService.export({
        data: this.blessingReportData,
        columns: [
          // Expanded donor fields (Hebrew)
          { header: 'תואר', mapper: (row) => row.title || '', width: 10 },
          { header: 'שם פרטי', mapper: (row) => row.firstName || '', width: 15 },
          { header: 'שם משפחה', mapper: (row) => row.lastName || '', width: 15 },
          { header: 'סיומת', mapper: (row) => row.suffix || '', width: 10 },
          // Expanded donor fields (English)
          { header: 'Title', mapper: (row) => row.titleEnglish || '', width: 10 },
          { header: 'First Name', mapper: (row) => row.firstNameEnglish || '', width: 15 },
          { header: 'Last Name', mapper: (row) => row.lastNameEnglish || '', width: 15 },
          { header: 'Suffix', mapper: (row) => row.suffixEnglish || '', width: 10 },
          // Donor type fields
          { header: 'מצב משפחתי', mapper: (row) => this.getMaritalStatusText(row.maritalStatus || ''), width: 12 },
          { header: 'אנ"ש', mapper: (row) => row.isAnash ? '✓' : '', width: 8 },
          { header: 'תלמידנו', mapper: (row) => row.isAlumni ? '✓' : '', width: 8 },
          // Blessing-specific fields
          { header: 'סוג ברכה', mapper: (row) => row.blessingBookType || '-', width: 15 },
          { header: 'הערות', mapper: (row) => row.notes || '-', width: 30 },
          { header: 'סטטוס', mapper: (row) => row.status || '-', width: 12 },
          // Contact fields
          { header: 'טלפון', mapper: (row) => row.phone || '-', width: 15 },
          { header: 'נייד', mapper: (row) => row.mobile || '-', width: 15 },
          { header: 'אימייל', mapper: (row) => row.email || '-', width: 25 }
        ],
        sheetName: 'דוח ברכות',
        fileName: this.excelService.generateFileName('דוח_ברכות')
      });
    } catch (error) {
      console.error('Error exporting blessings to Excel:', error);
      alert('שגיאה בייצוא הדוח');
    }
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
    await this.saveLastReportSelection();
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

  // ===============================================
  // PERSONAL DONOR REPORT Methods
  // ===============================================

  async selectDonorForPersonalReport() {
    try {
      const result = await openDialog(
        DonorSelectionModalComponent,
        (modal: DonorSelectionModalComponent) => {
          modal.args = {
            title: 'בחר תורמים לדוח אישי',
            multiSelect: true,
            selectedIds: this.selectedDonorsForPersonalReport.map(d => d.id)
          };
        }
      );

      if (result) {
        if (Array.isArray(result)) {
          // Multi-select mode - got array of donors
          this.selectedDonorsForPersonalReport = result as Donor[];
          this.currentPersonalReportDonorIndex = 0;
          // Set the first donor as the current one for backward compatibility
          this.selectedDonorForPersonalReport = this.selectedDonorsForPersonalReport.length > 0
            ? this.selectedDonorsForPersonalReport[0]
            : null;
        } else {
          // Single donor (shouldn't happen with multiSelect: true, but just in case)
          this.selectedDonorForPersonalReport = result as Donor;
          this.selectedDonorsForPersonalReport = [result as Donor];
          this.currentPersonalReportDonorIndex = 0;
        }
        // Reset report data when donor changes
        this.personalDonorReportData = null;
      }
    } catch (error) {
      console.error('Error selecting donor for personal report:', error);
    }
  }

  // Select a specific donor from the horizontal bar
  async selectDonorFromBar(index: number) {
    if (index >= 0 && index < this.selectedDonorsForPersonalReport.length) {
      this.currentPersonalReportDonorIndex = index;
      this.selectedDonorForPersonalReport = this.selectedDonorsForPersonalReport[index];
      // Auto-load report for this donor if dates are set
      if (this.personalReportFromDate) {
        await this.loadPersonalDonorReport();
      } else {
        this.personalDonorReportData = null;
      }
    }
  }

  // Get display text for selected donors
  getSelectedDonorsForPersonalReportText(): string {
    if (this.selectedDonorsForPersonalReport.length === 0) {
      return 'בחר תורמים';
    } else if (this.selectedDonorsForPersonalReport.length === 1) {
      return this.selectedDonorsForPersonalReport[0].lastAndFirstName || '';
    } else {
      return `${this.selectedDonorsForPersonalReport.length} תורמים נבחרו`;
    }
  }

  onNativeDatePick(event: Event, target: 'from' | 'to') {
    const input = event.target as HTMLInputElement;
    if (!input.value) return;
    const date = new Date(input.value);
    if (isNaN(date.getTime())) return;
    if (target === 'from') {
      this.personalReportFromDate = date;
      this.onPersonalReportFromDateChange();
    } else {
      this.personalReportToDate = date;
      this.onPersonalReportToDateChange();
    }
  }

  formatDateForNativePicker(date: Date | null): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async openHebrewDatePicker(target: 'from' | 'to') {
    const { HebrewDatePickerModalComponent } = await import('../../routes/modals/hebrew-date-picker-modal/hebrew-date-picker-modal.component');

    // קבל תאריך נוכחי או תאריך היום
    const currentDate = target === 'from'
      ? (this.personalReportFromDate || new Date())
      : (this.personalReportToDate || new Date());

    const dateObj = currentDate instanceof Date ? currentDate : new Date(currentDate);

    const selectedDate = await openDialog(
      HebrewDatePickerModalComponent,
      (modal) => {
        modal.title = target === 'from' ? 'בחר תאריך עברי - מתאריך' : 'בחר תאריך עברי - עד תאריך';
        modal.selectedDate = dateObj;
      },
      (modal) => modal.selectedDate
    );

    if (selectedDate) {
      if (target === 'from') {
        this.personalReportFromDate = selectedDate;
        this.onPersonalReportFromDateChange();
      } else {
        this.personalReportToDate = selectedDate;
        this.onPersonalReportToDateChange();
      }
    }
  }

  onPersonalReportFromDateChange() {
    if (!this.personalReportFromDate) {
      this.updatePersonalReportHebrewDates();
      return;
    }

    const fromDate = this.personalReportFromDate instanceof Date
      ? this.personalReportFromDate
      : new Date(this.personalReportFromDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Case 1: If "to" date is empty, fill with today
    if (!this.personalReportToDate) {
      this.personalReportToDate = today;
    } else {
      const toDate = this.personalReportToDate instanceof Date
        ? this.personalReportToDate
        : new Date(this.personalReportToDate);
      // Case 2: If "to" date is less than "from" date, set "to" = "from"
      if (toDate < fromDate) {
        this.personalReportToDate = new Date(fromDate);
      }
      // Case 3: If "to" date is greater than "from" - don't touch!
    }

    // Update Hebrew date display
    this.updatePersonalReportHebrewDates();
  }

  onPersonalReportToDateChange() {
    // If "from" date is greater than "to" date, set "to" = "from"
    if (this.personalReportFromDate && this.personalReportToDate &&
      this.personalReportFromDate > this.personalReportToDate) {
      this.personalReportToDate = new Date(this.personalReportFromDate);
    }

    // Update Hebrew date display
    this.updatePersonalReportHebrewDates();
  }

  private async updatePersonalReportHebrewDates() {
    // Helper to check if date is valid for Hebrew conversion (year >= 1000)
    const isValidForHebrew = (date: Date | string | null): boolean => {
      if (!date) return false;
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return false;
      const year = d.getFullYear();
      return year >= 1000 && year <= 9999;
    };

    // Helper to ensure we have a Date object
    const toDate = (date: Date | string | null): Date | null => {
      if (!date) return null;
      if (date instanceof Date) return date;
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    };

    const fromDate = toDate(this.personalReportFromDate);
    if (fromDate && isValidForHebrew(fromDate)) {
      try {
        const hebrewFrom = this.hebrewDateService.convertGregorianToHebrew(fromDate);
        this.personalReportFromDateHebrew = hebrewFrom.formatted;
      } catch {
        this.personalReportFromDateHebrew = '';
      }
    } else {
      this.personalReportFromDateHebrew = '';
    }

    const toDateVal = toDate(this.personalReportToDate);
    if (toDateVal && isValidForHebrew(toDateVal)) {
      try {
        const hebrewTo = this.hebrewDateService.convertGregorianToHebrew(toDateVal);
        this.personalReportToDateHebrew = hebrewTo.formatted;
      } catch {
        this.personalReportToDateHebrew = '';
      }
    } else {
      this.personalReportToDateHebrew = '';
    }
  }

  async loadPersonalDonorReport() {
    if (!this.selectedDonorForPersonalReport) {
      alert('יש לבחור תורם');
      return;
    }

    if (!this.personalReportFromDate) {
      alert('יש לבחור תאריך התחלה');
      return;
    }

    await this.busy.doWhileShowingBusy(async () => {
      try {
        this.personalDonorReportData = await ReportController.getPersonalDonorReport(
          this.selectedDonorForPersonalReport!.id,
          this.personalReportFromDate!,
          this.personalReportToDate || new Date()
        );
        console.log('Personal donor report loaded:', this.personalDonorReportData);
      } catch (error) {
        console.error('Error loading personal donor report:', error);
        alert('שגיאה בטעינת הדוח');
      }
    });

    // await this.busy.doWhileShowingBusy(async () => {
    //   try {
    //     this.personalDonorReportData = await ReportController.getPersonalDonorReport(
    //       this.selectedDonorForPersonalReport!.id,
    //       this.personalReportFromDate!,
    //       this.personalReportToDate || new Date()
    //     );
    //     console.log('Personal donor report loaded:', this.personalDonorReportData);
    //   } catch (error) {
    //     console.error('Error loading personal donor report:', error);
    //     alert('שגיאה בטעינת הדוח');
    //   }
    // });
  }

  async printPersonalDonorReport() {
    console.log('this.personalReportFromDate:', this.personalReportFromDate);
    console.log('this.personalReportToDate:', this.personalReportToDate);
    try {
      // Convert dates to ISO string format (YYYY-MM-DD) to avoid timezone issues
      const fromDateStr = this.formatDateToISOString(this.personalReportFromDate!);
      const toDateStr = this.formatDateToISOString(this.personalReportToDate || new Date());

      const result = await ReportController.createPersonalDonorReport(
        this.selectedDonorForPersonalReport!.id,
        fromDateStr,
        toDateStr
      );
      console.log('printPersonalDonorReport:', JSON.stringify(result));

      if (result.success) {
        // Extract base64 and mimeType from data URL
        // Format: data:mimeType;base64,base64Data
        const dataUrlMatch = result.url.match(/^data:([^;]+);base64,(.+)$/);
        if (!dataUrlMatch) {
          console.error('Invalid data URL format');
          alert('שגיאה בפורמט הקובץ');
          return;
        }

        const mimeType = dataUrlMatch[1];
        const base64 = dataUrlMatch[2];

        const blob = this.base64ToBlob(base64, mimeType);
        const url = URL.createObjectURL(blob);

        const printWindow = window.open(url, '_blank');
        printWindow?.addEventListener('load', () => {
          printWindow.print();
        });
      } else {
        console.error('Error:', result.error);
        alert('שגיאה ביצירת הדוח');
      }

    } catch (error) {
      console.error('Error loading personal donor report:', error);
      alert('שגיאה בהדפסת הדוח');
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  async printPersonalDonorReport1() {
    try {
      // Convert dates to ISO string format (YYYY-MM-DD) to avoid timezone issues
      const fromDateStr = this.formatDateToISOString(this.personalReportFromDate!);
      const toDateStr = this.formatDateToISOString(this.personalReportToDate || new Date());

      const result = await ReportController.createPersonalDonorReport(
        this.selectedDonorForPersonalReport!.id,
        fromDateStr,
        toDateStr
      );
      console.log('printPersonalDonorReport:', JSON.stringify(result));


      if (result.success) {
        // יצירת לינק להורדה
        const link = document.createElement('a');
        link.href = result.url;
        link.download = `דוח אישי לתורם.docx` // result.fileName!;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error('Error:', result.error);
      }

    } catch (error) {
      console.error('Error loading personal donor report:', error);
      alert('שגיאה בהדפסת הדוח');
    }
    // this.isPersonalReportPrintMode = true;
    // setTimeout(() => {
    //   window.print();
    //   this.isPersonalReportPrintMode = false;
    // }, 100);
  }

  // Export Word documents for all selected donors
  async exportAllDonorsToWord() {
    if (this.selectedDonorsForPersonalReport.length === 0) {
      alert('לא נבחרו תורמים');
      return;
    }

    if (!this.personalReportFromDate) {
      alert('יש לבחור תאריך התחלה');
      return;
    }

    // Confirmation dialog
    const confirmed = await this.uiTools.yesNoQuestion(`האם להפיק דוח ל-${this.selectedDonorsForPersonalReport.length} תורמים שנבחרו?`);
    if (!confirmed) {
      return;
    }

    const fromDateStr = this.formatDateToISOString(this.personalReportFromDate);
    const toDateStr = this.formatDateToISOString(this.personalReportToDate || new Date());

    let successCount = 0;
    let errorCount = 0;

    await this.busy.doWhileShowingBusy(async () => {
      for (let i = 0; i < this.selectedDonorsForPersonalReport.length; i++) {
        const donor = this.selectedDonorsForPersonalReport[i];
        try {
          const result = await ReportController.createPersonalDonorReport(
            donor.id,
            fromDateStr,
            toDateStr
          );

          if (result.success) {
            // Extract base64 and mimeType from data URL
            const dataUrlMatch = result.url.match(/^data:([^;]+);base64,(.+)$/);
            if (dataUrlMatch) {
              const mimeType = dataUrlMatch[1];
              const base64 = dataUrlMatch[2];

              const blob = this.base64ToBlob(base64, mimeType);
              const url = URL.createObjectURL(blob);

              // Create download link
              const link = document.createElement('a');
              link.href = url;
              link.download = `דוח_אישי_${donor.lastAndFirstName || donor.id}.docx`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // Clean up
              URL.revokeObjectURL(url);
              successCount++;

              // Small delay between downloads to prevent browser blocking
              if (i < this.selectedDonorsForPersonalReport.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } else {
              console.error('Invalid data URL format for donor:', donor.id);
              errorCount++;
            }
          } else {
            console.error('Error creating report for donor:', donor.id, result.error);
            errorCount++;
          }
        } catch (error) {
          console.error('Error exporting report for donor:', donor.id, error);
          errorCount++;
        }
      }
    });

    // Show summary
    if (errorCount === 0) {
      await this.uiTools.yesNoQuestion(`הופקו בהצלחה ${successCount} קבצים`, false);
    } else {
      await this.uiTools.yesNoQuestion(`הופקו ${successCount} קבצים, ${errorCount} נכשלו`, false);
    }
  }

  clearPersonalDonorReport() {
    this.selectedDonorForPersonalReport = null;
    this.selectedDonorsForPersonalReport = [];
    this.currentPersonalReportDonorIndex = 0;
    this.personalReportFromDate = null;
    this.personalReportToDate = null;
    this.personalReportFromDateHebrew = '';
    this.personalReportToDateHebrew = '';
    this.personalDonorReportData = null;
  }

  formatDateForReport(date: Date): string {
    // Format: DD/MM/YYYY
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Format date to ISO string (YYYY-MM-DD) for sending to server
   * Uses local date parts to avoid timezone issues
   */
  private formatDateToISOString(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateEnglish(date: Date): string {
    // Format: 08 December 2025
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  // ===============================================
  // PERSONAL DONOR REPORT - Sorting Methods
  // ===============================================

  togglePersonalDonorSort(field: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
      // Multi-column sort with Ctrl/Cmd
      const existing = this.personalDonorSortColumns.find(col => col.field === field);
      if (existing) {
        if (existing.direction === 'asc') {
          existing.direction = 'desc';
        } else {
          this.personalDonorSortColumns = this.personalDonorSortColumns.filter(col => col.field !== field);
        }
      } else {
        this.personalDonorSortColumns.push({ field, direction: 'asc' });
      }
    } else {
      // Single column sort
      const existing = this.personalDonorSortColumns.find(col => col.field === field);
      if (existing && existing.direction === 'asc') {
        this.personalDonorSortColumns = [{ field, direction: 'desc' }];
      } else {
        this.personalDonorSortColumns = [{ field, direction: 'asc' }];
      }
    }
    this.applyPersonalDonorSorting();
  }

  applyPersonalDonorSorting() {
    if (!this.personalDonorReportData || this.personalDonorSortColumns.length === 0) return;

    this.personalDonorReportData.donations.sort((a, b) => {
      for (const sortCol of this.personalDonorSortColumns) {
        let aVal: any;
        let bVal: any;

        switch (sortCol.field) {
          case 'date':
            aVal = new Date(a.date).getTime();
            bVal = new Date(b.date).getTime();
            break;
          case 'dateHebrew':
            aVal = a.dateHebrew || '';
            bVal = b.dateHebrew || '';
            break;
          case 'commitment':
            aVal = a.commitment || 0;
            bVal = b.commitment || 0;
            break;
          case 'amount':
            aVal = a.amount || 0;
            bVal = b.amount || 0;
            break;
          case 'notes':
            aVal = a.notes || '';
            bVal = b.notes || '';
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

  isPersonalDonorSorted(field: string): boolean {
    return this.personalDonorSortColumns.some(col => col.field === field);
  }

  getPersonalDonorSortIcon(field: string): string {
    const sortCol = this.personalDonorSortColumns.find(col => col.field === field);
    if (!sortCol) return '';
    return sortCol.direction === 'asc' ? '↑' : '↓';
  }

  // ===============================================
  // PRINT REPORT
  // ===============================================

  private async printDonationsReport() {
    // Load all data without pagination for print
    const fullReportResponse = await this.reportService.getGroupedDonationsReport({
      groupBy: this.filters.groupBy,
      showDonorDetails: this.showAnyDonorDetails,
      showActualPayments: this.filters.showActualPayments,
      showCurrencySummary: this.filters.showCurrencySummary,
      showDonationDetails: this.filters.showDonationDetails,
      selectedDonorIds: this.filters.selectedDonorIds.length > 0 ? this.filters.selectedDonorIds : undefined,
      selectedCampaign: this.filters.selectedCampaign || undefined,
      selectedDonorType: this.filters.selectedDonorType || undefined,
      selectedYear: this.filters.selectedYear,
      conversionRates: this.conversionRates,
      page: 1,
      pageSize: 999999, // Get all records
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    });

    // Generate custom HTML that matches the display exactly
    const html = this.generateDonationsReportHtml(fullReportResponse);
    this.printHtml(html);
  }

  private generateDonationsReportHtml(reportData: any): string {
    const hebrewYears = reportData.hebrewYears;
    const data = reportData.reportData;
    const isDonorGroupBy = this.filters.groupBy === 'donor';
    const showAddress = this.filters.showDonorAddress && isDonorGroupBy;
    const showPhone = this.filters.showDonorPhone && isDonorGroupBy;
    const showEmail = this.filters.showDonorEmail && isDonorGroupBy;
    const showDonationDetails = this.filters.showDonationDetails;
    const showActualPayments = this.filters.showActualPayments;

    // Calculate column count for details row
    let detailsColSpan = 1; // name column
    if (showAddress) detailsColSpan++;
    if (showPhone) detailsColSpan++;
    if (showEmail) detailsColSpan++;

    return `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>דוח תרומות מקובץ</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; padding: 15px; direction: rtl; }
    .print-header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #333; }
    .print-header h1 { font-size: 20px; margin-bottom: 5px; }
    .print-header .subtitle { font-size: 12px; color: #666; }
    .print-date { font-size: 10px; color: #888; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #4a5568; color: white; padding: 8px 6px; text-align: right; font-weight: 600; font-size: 11px; border: 1px solid #2d3748; }
    td { padding: 2px 6px; border: 1px solid #e2e8f0; text-align: right; font-size: 10px; vertical-align: top; }
    tr:nth-child(even) { background: #f7fafc; }
    .main-row td { font-weight: 500; }
    .details-row { background: #f8f9fc !important; }
    .details-row td { border-top: none; padding-top: 2px; }
    .year-details-cell { padding: 4px !important; }
    .donation-detail-line { padding: 3px 0; border-bottom: 1px dotted #ddd; }
    .donation-detail-line:last-child { border-bottom: none; }
    .detail-main-row { display: flex; justify-content: space-between; gap: 8px; }
    .detail-date { color: #666; font-size: 9px; }
    .detail-amount { font-weight: 600; }
    .detail-amount.commitment, .detail-amount.partner { color: #888; font-style: italic; }
    .detail-amount.standing-order { color: #2980b9; }
    .standing-order-breakdown { font-size: 8px; color: #888; text-align: center; }
    .detail-reason { font-size: 9px; color: #888; display: block; }
    .no-donations { color: #ccc; text-align: center; }
    .print-footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #ccc; text-align: center; font-size: 10px; color: #888; }
    @media print {
      body { padding: 10px; }
      th { background: #4a5568 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr:nth-child(even) { background: #f7fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .details-row { background: #f8f9fc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <h1>דוח תרומות מקובץ</h1>
    <div class="subtitle">לפי ${this.getGroupByLabel()}</div>
    <div class="print-date">תאריך הדפסה: ${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>שם</th>
        ${showAddress ? '<th>כתובת</th>' : ''}
        ${showPhone ? '<th>טלפונים</th>' : ''}
        ${showEmail ? '<th>אימיילים</th>' : ''}
        ${hebrewYears.map((year: string) => `<th>${year}</th>`).join('')}
        ${showActualPayments ? '<th>תשלומים בפועל</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${data.map((row: any) => this.generateDonationRowHtml(row, hebrewYears, showAddress, showPhone, showEmail, showDonationDetails, showActualPayments, detailsColSpan)).join('')}
    </tbody>
  </table>

  <div class="print-footer">
    סה"כ ${data.length} רשומות
  </div>
</body>
</html>`;
  }

  private generateDonationRowHtml(row: any, hebrewYears: string[], showAddress: boolean, showPhone: boolean, showEmail: boolean, showDonationDetails: boolean, showActualPayments: boolean, detailsColSpan: number): string {
    // Main row
    let html = `<tr class="main-row">
      <td><strong>${row.donorName}</strong></td>
      ${showAddress ? `<td class="donor-address-cell" style="text-align: left; direction: ltr;">${row.donorDetails?.address || '-'}</td>` : ''}
      ${showPhone ? `<td>${row.donorDetails?.phones?.join('<br>') || '-'}</td>` : ''}
      ${showEmail ? `<td>${row.donorDetails?.emails?.join('<br>') || '-'}</td>` : ''}
      ${hebrewYears.map((year: string) => `<td>${this.formatYearTotal(row.yearlyTotals || {}, year)}</td>`).join('')}
      ${showActualPayments ? `<td>${this.formatActualPayments(row.actualPayments, hebrewYears)}</td>` : ''}
    </tr>`;

    // Details row - donation details under each year column
    if (showDonationDetails && row.donations?.length) {
      html += `<tr class="details-row">
        <td></td>
        ${showAddress ? '<td></td>' : ''}
        ${showPhone ? '<td></td>' : ''}
        ${showEmail ? '<td></td>' : ''}
        ${hebrewYears.map((year: string) => {
          const yearDonations = this.getDonationsForYear(row.donations, year);
          if (yearDonations.length === 0) {
            return '<td class="year-details-cell"><div class="no-donations">-</div></td>';
          }
          return `<td class="year-details-cell">
            ${yearDonations.map((d: any) => {
              let amountHtml = '';
              const amountClass = (d.isStandingOrder || d.isUnlimitedStandingOrder) ? 'standing-order' : d.donationType === 'commitment' ? 'commitment' : d.donationType === 'partner' ? 'partner' : '';

              if (d.isStandingOrder || d.isUnlimitedStandingOrder) {
                // Standing order (limited or unlimited): paid / expected
                amountHtml = `${this.formatCurrencyWithSymbol(d.paymentTotal || 0, d.currency)} / ${this.formatCurrencyWithSymbol(d.originalAmount || d.amount, d.currency)}`;
              } else if (d.donationType === 'commitment') {
                // Commitment: (paid / total)
                amountHtml = `(${this.formatCurrencyWithSymbol(d.paymentTotal || 0, d.currency)} / ${this.formatCurrencyWithSymbol(d.originalAmount || d.amount, d.currency)})`;
              } else if (d.donationType === 'partner') {
                amountHtml = `(${this.formatCurrencyWithSymbol(d.amount, d.currency)})`;
              } else {
                amountHtml = this.formatCurrencyWithSymbol(d.amount, d.currency);
              }

              return `
              <div class="donation-detail-line">
                <span class="detail-main-row">
                  <span class="detail-date">${d.hebrewDateFormatted || new Date(d.date).toLocaleDateString('he-IL')}</span>
                  <span class="detail-amount ${amountClass}">${amountHtml}</span>
                </span>
                ${d.reason ? `<span class="detail-reason">${d.reason}</span>` : ''}
              </div>`;
            }).join('')}
          </td>`;
        }).join('')}
        ${showActualPayments ? '<td></td>' : ''}
      </tr>`;
    }

    return html;
  }

  private formatActualPayments(actualPayments: any, hebrewYears: string[]): string {
    if (!actualPayments) return '-';
    const payments = hebrewYears
      .map(year => actualPayments[year] ? `${year}: ₪${actualPayments[year].toLocaleString('he-IL')}` : '')
      .filter(p => p)
      .join('<br>');
    return payments || '-';
  }

  private printHtml(html: string) {
    // Use hidden iframe like printService does
    let printFrame = document.getElementById('donations-print-frame') as HTMLIFrameElement;
    if (printFrame) {
      document.body.removeChild(printFrame);
    }

    printFrame = document.createElement('iframe');
    printFrame.id = 'donations-print-frame';
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-10000px';
    printFrame.style.left = '-10000px';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';

    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc) {
      alert('שגיאה ביצירת חלון הדפסה');
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    printFrame.onload = () => {
      setTimeout(() => {
        printFrame.contentWindow?.print();
      }, 100);
    };
  }

  private printYearlySummaryReport() {
    const columns: PrintColumn[] = [
      {
        header: 'שנה',
        field: 'hebrewYear',
        customFormatter: (val, row) => `${row.hebrewYear} (${row.year})`
      },
      {
        header: 'שקל',
        field: 'currencies.ILS',
        customFormatter: (val, row) => {
          const amount = row.currencies?.['ILS'] || 0;
          return amount > 0 ? '₪' + Math.round(amount).toLocaleString('he-IL') : '-';
        }
      },
      {
        header: 'דולר',
        field: 'currencies.USD',
        customFormatter: (val, row) => {
          const amount = row.currencies?.['USD'] || 0;
          return amount > 0 ? '$' + Math.round(amount).toLocaleString('he-IL') : '-';
        }
      },
      {
        header: 'יורו',
        field: 'currencies.EUR',
        customFormatter: (val, row) => {
          const amount = row.currencies?.['EUR'] || 0;
          return amount > 0 ? '€' + Math.round(amount).toLocaleString('he-IL') : '-';
        }
      }
    ];

    const filters = [
      { label: 'שנים', value: this.filters.selectedYear === 'last4' ? 'כל השנים' : String(this.filters.selectedYear) }
    ];

    this.printService.print({
      title: 'דוח סיכום שנים',
      filters,
      columns,
      data: this.yearlySummaryData,
      totals: [
        { label: 'סה"כ שקל', value: this.getTotalByCurrency('ILS') > 0 ? '₪' + Math.round(this.getTotalByCurrency('ILS')).toLocaleString('he-IL') : '-' },
        { label: 'סה"כ דולר', value: this.getTotalByCurrency('USD') > 0 ? '$' + Math.round(this.getTotalByCurrency('USD')).toLocaleString('he-IL') : '-' },
        { label: 'סה"כ יורו', value: this.getTotalByCurrency('EUR') > 0 ? '€' + Math.round(this.getTotalByCurrency('EUR')).toLocaleString('he-IL') : '-' }
      ]
    });
  }

  private printPaymentsReport() {
    const columns: PrintColumn[] = [
      { header: 'שם תורם', field: 'donorName' },
      {
        header: 'כתובת',
        field: 'address',
        align: 'left',
        customFormatter: (val, row) => row.address || '-'
      },
      {
        header: 'עיר',
        field: 'city',
        customFormatter: (val, row) => row.city || '-'
      },
      {
        header: 'תאריך אחרון',
        field: 'lastDonationDate',
        customFormatter: (val, row) => row.lastDonationDate ? this.formatHebrewDate(row.lastDonationDate) : '-'
      },
      { header: 'התחייבות', field: 'promisedAmount', format: 'currency' },
      { header: 'שולם בפועל', field: 'actualAmount', format: 'currency' },
      { header: 'יתרה', field: 'remainingDebt', format: 'currency' }
    ];

    // Calculate summary from all data (not paginated)
    const summary = this.getPaymentStatusSummary();
    this.printService.print({
      title: 'דוח מצב תשלומים',
      columns,
      data: this.paymentReportData, // Already contains all data (pagination is client-side only)
      totals: [
        { label: 'שולם במלואו', value: summary.fullyPaid },
        { label: 'שולם חלקית', value: summary.partiallyPaid },
        { label: 'לא שולם', value: summary.notPaid },
        { label: 'סה"כ חוב', value: `₪${summary.totalDebt.toLocaleString('he-IL')}` }
      ]
    });
  }

  private printBlessingsReport() {
    const columns: PrintColumn[] = [
      { header: 'שם משפחה', field: 'lastName' },
      { header: 'שם פרטי', field: 'firstName' },
      { header: 'סוג ספר ברכות', field: 'blessingBookType' },
      { header: 'הערות', field: 'notes', customFormatter: (val) => val || '-' },
      { header: 'סטטוס', field: 'status' },
      { header: 'טלפון', field: 'phone', customFormatter: (val) => val || '-' },
      { header: 'נייד', field: 'mobile', customFormatter: (val) => val || '-' },
      { header: 'אימייל', field: 'email', customFormatter: (val) => val || '-' }
    ];

    const summary = this.getBlessingSummary();
    this.printService.print({
      title: 'דוח ברכות',
      columns,
      data: this.blessingReportData,
      totals: [
        { label: 'מוכנה', value: summary.preMade },
        { label: 'מותאמת אישית', value: summary.custom },
        { label: 'לא נבחר', value: summary.notChosen },
        { label: 'סה"כ', value: summary.total }
      ]
    });
  }

  // Helper method to translate marital status based on user's current language
  private getMaritalStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'married': this.i18n.currentTerms.married || 'נשוי/ה',
      'single': this.i18n.currentTerms.single || 'רווק/ה',
      'widowed': this.i18n.currentTerms.widowed || 'אלמן/ה',
      'divorced': this.i18n.currentTerms.divorced || 'גרוש/ה'
    };
    return statusMap[status] || '';
  }
}