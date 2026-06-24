import { Allow, BackendMethod, Fields, remult } from 'remult';
import { Donation } from '../entity/donation';
import { DonationMethod } from '../entity/donation-method';
import { Donor } from '../entity/donor';
import { DonorContact } from '../entity/donor-contact';
import { DonorPlace } from '../entity/donor-place';
import { Payment } from '../entity/payment';
import { User } from '../entity/user';
import { ContactPerson } from '../entity/contact-person';
import { Campaign } from '../entity/campaign';
import { Report } from '../enum/report';
import { DocxCreateResponse } from '../type/letter.type';
import { GeneralCurrencyStat, GeneralMonthlyStat, GeneralChartItem, GeneralTopDonor, GeneralTopCampaign, GeneralRecentActivity, GeneralStatsResponse } from '../type/report.res';
import { calculateEffectiveAmount, calculatePaymentTotals, calculatePeriodsElapsed, isPaymentBased, isStandingOrder } from '../utils/donation-utils';
import { selectDisplayPhones } from '../utils/phone-utils';
import { HebrewDateController } from './hebrew-date.controller';
import { GlobalFilterController } from './global-filter.controller';

export interface DonationDetailData {
  donationId?: string; // ID of the donation for opening details modal
  date: Date;
  hebrewDateFormatted?: string; // Hebrew date formatted for display
  amount: number; // Effective amount (paymentTotal for commitments/standing orders, donation.amount for regular)
  originalAmount?: number; // Original donation amount (for commitments/standing orders) or expected amount (for unlimited standing orders)
  paymentTotal?: number; // Total payments received (for commitments/standing orders)
  paymentCount?: number; // Number of payments made (for standing orders)
  perPaymentAmount?: number; // Amount per payment (for standing orders)
  isStandingOrder?: boolean; // Whether this is a limited standing order donation
  isUnlimitedStandingOrder?: boolean; // Whether this is an unlimited standing order donation
  currency: string;
  reason?: string;
  campaignName?: string;
  hebrewYear?: string; // For grouping by year in display
  donationType?: 'full' | 'commitment' | 'partner'; // Type of donation
}

export interface DonorExportDetails {
  // Address fields
  address?: string;
  /** Display phones selected by phone-utils.selectDisplayPhones - mobiles when any
   *  exist, else landlines. Joined newline-separated when stringified for cells. */
  phones?: string[];
  emails?: string[];
  // Expanded address fields
  country?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  street?: string;
  houseNumber?: string;
  building?: string;
  apartment?: string;
  postcode?: string;
  placeName?: string;
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
  // Fundraiser & Contact Person
  fundraiserName?: string;
  contactPersonName?: string;
}

export interface GroupedDonationReportData {
  donorId?: string;
  donorName: string;
  donorDetails?: DonorExportDetails;
  yearlyTotals: {
    [hebrewYear: string]: {
      [currency: string]: number;
    };
  };
  actualPayments?: {
    [hebrewYear: string]: number; // in shekel
  };
  donations?: DonationDetailData[]; // Donation breakdown
}

export interface CurrencySummaryData {
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

export interface GroupedReportResponse {
  hebrewYears: string[];
  reportData: GroupedDonationReportData[];
  currencySummary: CurrencySummaryData[];
  totalInShekel: number;
  // Pagination info
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}

export type GroupByOption = 'donor' | 'campaign' | 'paymentMethod' | 'fundraiser';

export interface ReportFilters {
  groupBy: GroupByOption;
  showDonorDetails: boolean;
  showActualPayments: boolean;
  showCurrencySummary: boolean;
  showDonationDetails?: boolean; // Show donation breakdown under each row
  selectedDonor?: string;
  selectedDonorIds?: string[]; // For multi-select donor filter
  selectedCampaign?: string;
  selectedDonorType?: string;
  selectedYear?: string | number; // 'last4' or specific year
  conversionRates: { [currency: string]: number };
  // Pagination
  page?: number;
  pageSize?: number;
  // Sorting
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  // Global filters - removed, now fetched from user.settings in backend
}

export class ReportController {
  /**
   * Get grouped donations report
   * Returns data ready for display and printing
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getGroupedDonationsReport(
    filters: ReportFilters
  ): Promise<GroupedReportResponse> {
    try {
      // 🎯 Fetch global filters using GlobalFilterController (handles all filter types: city, anash, alumni, etc.)
      const globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

      // Get other global filters for date/amount filtering
      const currentUserId = remult.user?.id;
      let globalFilterCampaignIds: string[] | undefined = undefined;
      let globalFilterDateFrom: Date | undefined = undefined;
      let globalFilterDateTo: Date | undefined = undefined;
      let globalFilterAmountMin: number | undefined = undefined;
      let globalFilterAmountMax: number | undefined = undefined;

      if (currentUserId) {
        const { User } = await import('../entity/user');
        const user = await remult.repo(User).findId(currentUserId);
        const globalFilters = user?.settings?.globalFilters;

        if (globalFilters) {
          globalFilterCampaignIds = globalFilters.campaignIds;
          globalFilterDateFrom = globalFilters.dateFrom;
          globalFilterDateTo = globalFilters.dateTo;
          globalFilterAmountMin = globalFilters.amountMin;
          globalFilterAmountMax = globalFilters.amountMax;
        }
      }

      // Get current Hebrew year
      const currentHebrewYear = await HebrewDateController.getCurrentHebrewYear();

      // Determine which years to load based on filter
      let yearsToLoad: number[] = [];
      let hebrewYears: string[] = [];

      if (!filters.selectedYear || filters.selectedYear === 'last4') {
        // Load last 4 years (current-3, current-2, current-1, current)
        for (let i = 3; i >= 0; i--) {
          yearsToLoad.push(currentHebrewYear - i);
        }
      } else {
        // Load specific year only
        // If it's a string (Hebrew year), parse it; otherwise treat as number
        let specificYear: number;
        if (typeof filters.selectedYear === 'string') {
          specificYear = await HebrewDateController.parseHebrewYear(filters.selectedYear);
        } else {
          specificYear = filters.selectedYear;
        }
        yearsToLoad.push(specificYear);
      }

      // Generate Hebrew years array
      for (const year of yearsToLoad) {
        const formatted = await HebrewDateController.formatHebrewYear(year);
        hebrewYears.push(formatted);
      }

      // Load all donations for the selected years
      // ── גרסה מקורית (שמורה): לולאה על כל שנה עברית בנפרד + nested include של
      //    fundraiser, campaign, donationMethod, createdBy = ~500MB memory על 4 שנים.
      // const allDonations: Donation[] = [];
      // for (const hebrewYear of yearsToLoad) {
      //   const dateRange = await HebrewDateController.getHebrewYearDateRange(hebrewYear);
      //   const yearDonations = await remult.repo(Donation).find({
      //     where: { donationDate: { $gte: dateRange.startDate, $lte: dateRange.endDate } },
      //     include: { donor: { include: { fundraiser: true } }, campaign: true, donationMethod: true, createdBy: true }
      //   });
      //   allDonations.push(...yearDonations);
      // }

      // ── אופטימיזציה: שאילתה אחת עם טווח תאריכים מאוחד + פילטרי WHERE מוקדמים,
      //    הורדת include.createdBy שלא בשימוש + הורדת fundraiser (נטען נפרד ב-fundraiserMap).
      //    לכל הפילטרים שמסננים ב-JS - מעבירים ל-WHERE.
      const yearRanges = await Promise.all(yearsToLoad.map(y => HebrewDateController.getHebrewYearDateRange(y)));
      const minDate = yearRanges.reduce((min, r) => r.startDate < min ? r.startDate : min, yearRanges[0]?.startDate);
      const maxDate = yearRanges.reduce((max, r) => r.endDate > max ? r.endDate : max, yearRanges[0]?.endDate);

      // הרכב WHERE מוקדם הכולל את כל הפילטרים (במקום filter-chain ב-JS)
      const donationWhere: any = {
        donationDate: { $gte: minDate, $lte: maxDate }
      };
      if (filters.selectedDonor) {
        donationWhere.donorId = filters.selectedDonor;
      } else if (filters.selectedDonorIds && filters.selectedDonorIds.length > 0) {
        donationWhere.donorId = { $in: filters.selectedDonorIds };
      }
      if (globalFilterDonorIds !== undefined) {
        if (globalFilterDonorIds.length === 0) {
          // filter מוגדר אבל אף תורם לא עונה - לא נטען כלום
          donationWhere.donorId = { $in: [] };
        } else {
          // חיתוך עם פילטר קודם אם קיים
          const prev = donationWhere.donorId?.$in;
          donationWhere.donorId = { $in: prev ? prev.filter((x: string) => new Set(globalFilterDonorIds).has(x)) : globalFilterDonorIds };
        }
      }
      if (filters.selectedCampaign) {
        donationWhere.campaignId = filters.selectedCampaign;
      } else if (globalFilterCampaignIds && globalFilterCampaignIds.length > 0) {
        donationWhere.campaignId = { $in: globalFilterCampaignIds };
      }
      if (globalFilterDateFrom || globalFilterDateTo) {
        const dateFilter: any = {};
        if (globalFilterDateFrom) dateFilter.$gte = globalFilterDateFrom > minDate ? globalFilterDateFrom : minDate;
        if (globalFilterDateTo) dateFilter.$lte = globalFilterDateTo < maxDate ? globalFilterDateTo : maxDate;
        donationWhere.donationDate = { ...donationWhere.donationDate, ...dateFilter };
      }
      if (globalFilterAmountMin !== undefined || globalFilterAmountMax !== undefined) {
        const amountFilter: any = {};
        if (globalFilterAmountMin !== undefined) amountFilter.$gte = globalFilterAmountMin;
        if (globalFilterAmountMax !== undefined) amountFilter.$lte = globalFilterAmountMax;
        donationWhere.amount = amountFilter;
      }

      // donorType filter: pre-resolve to donorIds before find() to push to WHERE
      if (filters.selectedDonorType && filters.selectedDonorType !== '') {
        let typeField: 'isAnash' | 'isAlumni' | 'isOtherConnection' | null = null;
        if (filters.selectedDonorType === 'אנ"ש') typeField = 'isAnash';
        else if (filters.selectedDonorType === 'תלמידנו') typeField = 'isAlumni';
        else if (filters.selectedDonorType === 'קשר אחר') typeField = 'isOtherConnection';

        if (typeField) {
          const matchingDonors = await remult.repo(Donor).find({
            where: { [typeField]: true },
            limit: 10000
          });
          const matchingIds = matchingDonors.map(d => d.id!).filter(Boolean);
          const prev = donationWhere.donorId?.$in;
          donationWhere.donorId = {
            $in: prev ? prev.filter((x: string) => new Set(matchingIds).has(x)) : matchingIds
          };
        }
      }

      // ── DB-level pagination: lightweight first pass for group keys, full load only for page data
      const allDonationsLight = await remult.repo(Donation).find({ where: donationWhere });

      const page = Number(filters.page) || 1;
      const pageSize = Number(filters.pageSize) || 10;

      // Step 1: Paginate at group-entity level — returns only page's donation subset
      const { pageDonations, totalRecords } = await ReportController.paginateByGroupKey(
        allDonationsLight, filters, page, pageSize
      );
      const totalPages = Math.ceil(totalRecords / pageSize);

      // Step 2: Load related entities for page donations only
      const pageDonorIds = [...new Set(pageDonations.map(d => d.donorId).filter((id): id is string => !!id))];
      const pageCampaignIds = [...new Set(pageDonations.map(d => d.campaignId).filter((id): id is string => !!id))];
      const pageMethodIds = [...new Set(pageDonations.map(d => d.donationMethodId).filter((id): id is string => !!id))];

      const [pageDonors, pageCampaigns, pageMethods] = await Promise.all([
        pageDonorIds.length > 0 ? remult.repo(Donor).find({ where: { id: { $in: pageDonorIds } } }) : Promise.resolve([]),
        pageCampaignIds.length > 0 ? remult.repo(Campaign).find({ where: { id: { $in: pageCampaignIds } } }) : Promise.resolve([]),
        pageMethodIds.length > 0 ? remult.repo(DonationMethod).find({ where: { id: { $in: pageMethodIds } } }) : Promise.resolve([])
      ]);

      const donorMap = new Map(pageDonors.map(d => [d.id!, d]));
      const campaignMap = new Map(pageCampaigns.map(c => [c.id!, c]));
      const methodMap = new Map(pageMethods.map(m => [m.id!, m]));

      if (filters.groupBy === 'fundraiser' && pageDonors.length > 0) {
        const fundraiserIds = [...new Set(pageDonors.map(d => d.fundraiserId).filter((id): id is string => !!id))];
        if (fundraiserIds.length > 0) {
          const fundraisers = await remult.repo(User).find({ where: { id: { $in: fundraiserIds } } });
          const fundraiserMap = new Map(fundraisers.map(f => [f.id!, f]));
          for (const donor of pageDonors) {
            if (donor.fundraiserId) (donor as any).fundraiser = fundraiserMap.get(donor.fundraiserId);
          }
        }
      }

      for (const d of pageDonations) {
        if (d.donorId) (d as any).donor = donorMap.get(d.donorId);
        if (d.campaignId) (d as any).campaign = campaignMap.get(d.campaignId);
        if (d.donationMethodId) (d as any).donationMethod = methodMap.get(d.donationMethodId);
      }

      // Step 3: Payment totals for page's payment-based donations only
      let paymentTotalsMap: Record<string, number> = {};
      if (pageDonations.length > 0) {
        const pagePaymentBased = pageDonations.filter(d => isPaymentBased(d));
        const pagePaymentBasedIds = pagePaymentBased.map(d => d.id!).filter(Boolean);
        if (pagePaymentBasedIds.length > 0) {
          const pagePaymentsForTotals = await remult.repo(Payment).find({
            where: { donationId: { $in: pagePaymentBasedIds }, isActive: true }
          });
          paymentTotalsMap = calculatePaymentTotals(pagePaymentBased, pagePaymentsForTotals);
        }
      }

      // Step 4: Actual payments for page's donations only (if requested)
      const pageActualPayments: Payment[] = [];
      if (filters.showActualPayments && pageDonations.length > 0) {
        const pagePaymentBasedIds = pageDonations.filter(d => isPaymentBased(d)).map(d => d.id!).filter(Boolean);
        if (pagePaymentBasedIds.length > 0) {
          const payments = await remult.repo(Payment).find({
            where: { donationId: { $in: pagePaymentBasedIds }, isActive: true }
          });
          pageActualPayments.push(...payments);
        }
      }

      // Step 5: Group only page donations (fast — page data only)
      const { data: groupedData } = await ReportController.groupDonations(
        pageDonations, pageActualPayments, filters, paymentTotalsMap, hebrewYears, pageDonors
      );

      // Step 6: Currency summary from ALL donations (lightweight pass using donation.amount)
      const currencySummary = filters.showCurrencySummary
        ? ReportController.computeLightCurrencySummary(allDonationsLight, filters.conversionRates, hebrewYears)
        : [];
      const totalInShekel = currencySummary.reduce((sum, c) => sum + c.totalInShekel, 0);

      // Step 7: Sort page data only (trivial — page rows only)
      const reportData = filters.sortBy
        ? ReportController.sortReportData(groupedData, filters.sortBy, filters.sortDirection || 'asc', hebrewYears)
        : groupedData;

      return {
        hebrewYears,
        reportData,
        currencySummary,
        totalInShekel,
        totalRecords,
        totalPages,
        currentPage: page
      };
    } catch (error) {
      console.error('Error in getGroupedDonationsReport:', error);
      throw error;
    }
  }

  private static async paginateByGroupKey(
    allDonations: Donation[],
    filters: ReportFilters,
    page: number,
    pageSize: number
  ): Promise<{ pageDonations: Donation[]; totalRecords: number }> {
    const start = (page - 1) * pageSize;
    const sortDir = (filters.sortDirection || 'asc') as 'asc' | 'desc';

    switch (filters.groupBy) {
      case 'donor': {
        const allDonorIds = [...new Set(allDonations.map(d => d.donorId).filter((id): id is string => !!id))];
        const totalRecords = allDonorIds.length;

        let pageDonorIds: string[];

        if (filters.sortBy === 'total' || filters.sortBy?.startsWith('year_')) {
          // Sort by computed amount totals in JS (no DB GROUP BY needed)
          const totals = new Map<string, number>();
          for (const d of allDonations) {
            if (d.donorId) totals.set(d.donorId, (totals.get(d.donorId) || 0) + d.amount);
          }
          pageDonorIds = [...allDonorIds]
            .sort((a, b) => ((totals.get(a) || 0) - (totals.get(b) || 0)) * (sortDir === 'desc' ? -1 : 1))
            .slice(start, start + pageSize);
        } else {
          // DB-level pagination sorted by real DB columns (lastAndFirstName is serverExpression, not a column)
          const donors = await remult.repo(Donor).find({
            where: { id: { $in: allDonorIds } },
            orderBy: { lastName: sortDir, firstName: sortDir },
            limit: pageSize,
            page
          });
          pageDonorIds = donors.map(d => d.id!).filter(Boolean);
        }

        const idSet = new Set(pageDonorIds);
        return {
          pageDonations: allDonations.filter(d => d.donorId && idSet.has(d.donorId)),
          totalRecords
        };
      }

      case 'campaign': {
        const allCampaignIds = [...new Set(allDonations.map(d => d.campaignId).filter((id): id is string => !!id))];
        const hasUnknown = allDonations.some(d => !d.campaignId);
        const allCampaigns = await remult.repo(Campaign).find({
          where: { id: { $in: allCampaignIds } },
          orderBy: { name: 'asc' }
        });
        const allGroupKeys = [
          ...allCampaigns.map(c => c.id!).filter(Boolean),
          ...(hasUnknown ? ['unknown'] : [])
        ];
        const totalRecords = allGroupKeys.length;
        const pageKeys = new Set(allGroupKeys.slice(start, start + pageSize));
        return {
          pageDonations: allDonations.filter(d =>
            (d.campaignId && pageKeys.has(d.campaignId)) || (!d.campaignId && pageKeys.has('unknown'))
          ),
          totalRecords
        };
      }

      case 'paymentMethod': {
        const allMethodIds = [...new Set(allDonations.map(d => d.donationMethodId).filter((id): id is string => !!id))];
        const hasUnknown = allDonations.some(d => !d.donationMethodId);
        const allMethods = await remult.repo(DonationMethod).find({
          where: { id: { $in: allMethodIds } },
          orderBy: { name: 'asc' }
        });
        const allGroupKeys = [
          ...allMethods.map(m => m.id!).filter(Boolean),
          ...(hasUnknown ? ['unknown'] : [])
        ];
        const totalRecords = allGroupKeys.length;
        const pageKeys = new Set(allGroupKeys.slice(start, start + pageSize));
        return {
          pageDonations: allDonations.filter(d =>
            (d.donationMethodId && pageKeys.has(d.donationMethodId)) || (!d.donationMethodId && pageKeys.has('unknown'))
          ),
          totalRecords
        };
      }

      case 'fundraiser': {
        const allDonorIds = [...new Set(allDonations.map(d => d.donorId).filter((id): id is string => !!id))];
        if (allDonorIds.length === 0) return { pageDonations: [], totalRecords: 0 };

        const allDonorsForFundraiser = await remult.repo(Donor).find({ where: { id: { $in: allDonorIds } } });
        const allFundraiserIds = [...new Set(allDonorsForFundraiser.map(d => d.fundraiserId).filter((id): id is string => !!id))];
        const hasNoFundraiser = allDonorsForFundraiser.some(d => !d.fundraiserId);
        const allFundraisers = await remult.repo(User).find({
          where: { id: { $in: allFundraiserIds } },
          orderBy: { name: 'asc' }
        });
        const allGroupKeys = [
          ...allFundraisers.map(f => f.id!).filter(Boolean),
          ...(hasNoFundraiser ? ['unknown'] : [])
        ];
        const totalRecords = allGroupKeys.length;
        const pageKeys = new Set(allGroupKeys.slice(start, start + pageSize));

        const pageDonorIdSet = new Set(
          allDonorsForFundraiser
            .filter(d => pageKeys.has(d.fundraiserId || 'unknown'))
            .map(d => d.id!)
            .filter(Boolean)
        );
        return {
          pageDonations: allDonations.filter(d => d.donorId && pageDonorIdSet.has(d.donorId)),
          totalRecords
        };
      }

      default:
        return { pageDonations: allDonations, totalRecords: allDonations.length };
    }
  }

  private static computeLightCurrencySummary(
    donations: Donation[],
    conversionRates: { [currency: string]: number },
    hebrewYears: string[]
  ): CurrencySummaryData[] {
    const currencyYearTotals = new Map<string, { [year: string]: number }>();
    const dateCache = new Map<string, string>();

    const getYear = (date: Date): string => {
      const key = date.toISOString().split('T')[0];
      if (!dateCache.has(key)) {
        dateCache.set(key, HebrewDateController.hebrewDateInfoSync(date).yearFormatted);
      }
      return dateCache.get(key)!;
    };

    for (const d of donations) {
      const currency = ReportController.normalizeCurrencyName(d.currencyId);
      const year = getYear(d.donationDate);
      if (!currencyYearTotals.has(currency)) currencyYearTotals.set(currency, {});
      const yt = currencyYearTotals.get(currency)!;
      yt[year] = (yt[year] || 0) + d.amount;
    }

    return Array.from(currencyYearTotals.entries()).map(([currency, yearTotals]) => {
      const yearlyTotalsInShekel: { [year: string]: number } = {};
      let totalAmount = 0;
      let totalInShekel = 0;
      for (const year of hebrewYears) {
        const amount = yearTotals[year] || 0;
        const inShekel = amount * (conversionRates[currency] || 1);
        yearlyTotalsInShekel[year] = inShekel;
        totalAmount += amount;
        totalInShekel += inShekel;
      }
      return { currency, yearlyTotals: yearTotals, yearlyTotalsInShekel, totalAmount, totalInShekel };
    });
  }

  private static async groupDonations(
    donations: Donation[],
    payments: Payment[],
    filters: ReportFilters,
    paymentTotalsMap: Record<string, number> = {},
    hebrewYears: string[] = [],
    preloadedDonors?: Donor[]
  ): Promise<{ data: GroupedDonationReportData[]; currencySummary: CurrencySummaryData[] }> {
    const grouped = new Map<string, GroupedDonationReportData>();
    const currencyYearTotals = new Map<string, { [year: string]: number }>();

    // ✅ OPTIMIZATION 1: Pre-load all donor details in batch (if needed)
    let donorDetailsMap = new Map<string, { address?: string; phones?: string[]; emails?: string[] }>();
    if (filters.showDonorDetails && filters.groupBy === 'donor') {
      const donorIds = [...new Set(donations.map(d => d.donorId).filter(Boolean))];
      if (donorIds.length > 0) {
        donorDetailsMap = await ReportController.loadAllDonorDetails(donorIds, preloadedDonors);
      }
    }

    // ✅ OPTIMIZATION 2: Sync Hebrew date cache — @hebcal/core is pure JS, no async needed
    const hebrewDateCache = new Map<string, { year: number; yearFormatted: string; dateFormatted: string }>();

    const getHebrewDateInfo = (date: Date): { yearFormatted: string; dateFormatted: string } => {
      const dateKey = date.toISOString().split('T')[0];
      if (!hebrewDateCache.has(dateKey)) {
        hebrewDateCache.set(dateKey, HebrewDateController.hebrewDateInfoSync(date));
      }
      const cached = hebrewDateCache.get(dateKey)!;
      return { yearFormatted: cached.yearFormatted, dateFormatted: cached.dateFormatted };
    };

    const getHebrewYearFormatted = (date: Date): string => getHebrewDateInfo(date).yearFormatted;

    for (const donation of donations) {
      let groupKey = '';
      let groupName = '';

      // Determine grouping key based on filter
      switch (filters.groupBy) {
        case 'donor':
          groupKey = donation.donorId || 'unknown';
          groupName = donation.donor?.lastAndFirstName || 'תורם אלמוני';
          break;
        case 'campaign':
          groupKey = donation.campaignId || 'unknown';
          groupName = donation.campaign?.name || 'ללא קמפיין';
          break;
        case 'paymentMethod':
          groupKey = donation.donationMethodId || 'unknown';
          groupName = donation.donationMethod?.name || 'לא צוין';
          break;
        case 'fundraiser':
          groupKey = donation.donor?.fundraiserId || 'unknown';
          groupName = donation.donor?.fundraiser?.name || 'לא משוייך';
          break;
      }

      // Get or create group entry
      if (!grouped.has(groupKey)) {
        const groupData: GroupedDonationReportData = {
          donorId: filters.groupBy === 'donor' ? groupKey : undefined,
          donorName: groupName,
          yearlyTotals: {},
          actualPayments: filters.showActualPayments ? {} : undefined,
          donations: filters.showDonationDetails ? [] : undefined
        };

        // Add donor details if requested and grouping by donor (use pre-loaded data)
        if (filters.showDonorDetails && filters.groupBy === 'donor' && groupKey !== 'unknown') {
          groupData.donorDetails = donorDetailsMap.get(groupKey) || {};
        }

        grouped.set(groupKey, groupData);
      }

      const group = grouped.get(groupKey)!;

      // Determine Hebrew year and date of donation (use sync cache)
      const hebrewDateInfo = getHebrewDateInfo(donation.donationDate);

      // Add donation detail if requested
      if (filters.showDonationDetails && group.donations) {
        const donationPaymentTotal = paymentTotalsMap[donation.id!] || 0;
        const donationIsStandingOrder = isStandingOrder(donation);
        const donationIsPaymentBased = isPaymentBased(donation);
        const donationIsUnlimitedStandingOrder = donationIsStandingOrder && donation.unlimitedPayments;

        // For unlimited standing orders: expected = periods elapsed × amount per payment
        // For limited standing orders / commitments: expected = donation.amount (total)
        let expectedAmount: number | undefined;
        if (donationIsUnlimitedStandingOrder) {
          const periodsElapsed = calculatePeriodsElapsed(donation);
          expectedAmount = periodsElapsed * donation.amount;
        } else if (donationIsPaymentBased) {
          expectedAmount = donation.amount;
        }

        group.donations.push({
          donationId: donation.id,
          date: donation.donationDate,
          hebrewDateFormatted: hebrewDateInfo.dateFormatted,
          amount: calculateEffectiveAmount(donation, donationPaymentTotal),
          originalAmount: expectedAmount,
          paymentTotal: donationIsPaymentBased ? donationPaymentTotal : undefined,
          isStandingOrder: (donationIsStandingOrder && !donation.unlimitedPayments) || undefined,
          isUnlimitedStandingOrder: donationIsUnlimitedStandingOrder || undefined,
          currency: donation.currencyId,
          reason: donation.reason || undefined,
          campaignName: donation.campaign?.name || undefined,
          hebrewYear: hebrewDateInfo.yearFormatted,
          donationType: donation.donationType || 'full'
        });
      }

      // Initialize year if not exists
      const hebrewYearFormatted = hebrewDateInfo.yearFormatted;
      if (!group.yearlyTotals[hebrewYearFormatted]) {
        group.yearlyTotals[hebrewYearFormatted] = {};
      }

      // Add amount to year and currency (using effective amount for standing orders/commitments)
      if (!group.yearlyTotals[hebrewYearFormatted][donation.currencyId]) {
        group.yearlyTotals[hebrewYearFormatted][donation.currencyId] = 0;
      }
      group.yearlyTotals[hebrewYearFormatted][donation.currencyId] += calculateEffectiveAmount(donation, paymentTotalsMap[donation.id!]);

      // ── Accumulate currency summary in the same pass (replaces calculateCurrencySummary loop)
      const normalizedCurrency = ReportController.normalizeCurrencyName(donation.currencyId);
      if (!currencyYearTotals.has(normalizedCurrency)) currencyYearTotals.set(normalizedCurrency, {});
      const currencyTotals = currencyYearTotals.get(normalizedCurrency)!;
      if (!currencyTotals[hebrewYearFormatted]) currencyTotals[hebrewYearFormatted] = 0;
      currencyTotals[hebrewYearFormatted] += calculateEffectiveAmount(donation, paymentTotalsMap[donation.id!]);
    }

    // Add partner donations to donation details (only for sub-table display, not for totals)
    if (filters.showDonationDetails && filters.groupBy === 'donor') {
      for (const donation of donations) {
        // Check if donation has partners
        if (!donation.partnerIds || donation.partnerIds.length === 0) continue;

        const hebrewDateInfo = getHebrewDateInfo(donation.donationDate);

        // Add this donation to each partner's donation details
        for (const partnerId of donation.partnerIds) {
          const partnerGroup = grouped.get(partnerId);
          if (partnerGroup && partnerGroup.donations) {
            // Add as partner donation (don't add to totals, only to details)
            partnerGroup.donations.push({
              donationId: donation.id,
              date: donation.donationDate,
              hebrewDateFormatted: hebrewDateInfo.dateFormatted,
              amount: donation.amount,
              currency: donation.currencyId,
              reason: donation.reason || undefined,
              campaignName: donation.campaign?.name || undefined,
              hebrewYear: hebrewDateInfo.yearFormatted,
              donationType: 'partner' // Mark as partner donation
            });
          }
        }
      }
    }

    // Calculate actual payments if requested
    if (filters.showActualPayments) {
      // ── אופטימיזציה: Map לחיפוש O(1) במקום find() O(n) בתוך לולאה (היה O(n²)).
      const donationMap = new Map(donations.filter(d => d.id).map(d => [d.id as string, d]));
      for (const payment of payments) {
        const donation = donationMap.get(payment.donationId);
        if (!donation) continue;

        let groupKey = '';
        switch (filters.groupBy) {
          case 'donor':
            groupKey = donation.donorId || 'unknown';
            break;
          case 'campaign':
            groupKey = donation.campaignId || 'unknown';
            break;
          case 'paymentMethod':
            groupKey = donation.donationMethodId || 'unknown';
            break;
          case 'fundraiser':
            groupKey = donation.donor?.fundraiserId || 'unknown';
            break;
        }

        const group = grouped.get(groupKey);
        if (!group || !group.actualPayments) continue;

        // Use cached Hebrew date conversion (sync)
        const hebrewYearFormatted = getHebrewYearFormatted(payment.paymentDate);

        if (!group.actualPayments[hebrewYearFormatted]) {
          group.actualPayments[hebrewYearFormatted] = 0;
        }

        // Convert to shekel
        const currency = donation.currencyId;
        const amountInShekel = payment.amount * (filters.conversionRates[currency] || 1);
        group.actualPayments[hebrewYearFormatted] += amountInShekel;
      }
    }

    // Build currencySummary from the accumulated map (no second loop over donations needed)
    const currencySummary: CurrencySummaryData[] = Array.from(currencyYearTotals.entries()).map(([currency, yearTotals]) => {
      const yearlyTotalsInShekel: { [year: string]: number } = {};
      let totalAmount = 0;
      let totalInShekel = 0;
      for (const year of hebrewYears) {
        const amount = yearTotals[year] || 0;
        const amountInShekel = amount * (filters.conversionRates[currency] || 1);
        yearlyTotalsInShekel[year] = amountInShekel;
        totalAmount += amount;
        totalInShekel += amountInShekel;
      }
      return { currency, yearlyTotals: yearTotals, yearlyTotalsInShekel, totalAmount, totalInShekel };
    });

    return { data: Array.from(grouped.values()), currencySummary };
  }

  /**
   * ✅ NEW: Load donor details for multiple donors in batch (optimized)
   * Replaces N+1 queries with 3 queries total (donors, places, contacts)
   * Returns expanded donor and address fields for Excel export
   */
  private static async loadAllDonorDetails(
    donorIds: string[],
    preloadedDonors?: Donor[]
  ): Promise<Map<string, DonorExportDetails>> {
    const detailsMap = new Map<string, DonorExportDetails>();

    try {
      const donorMap = preloadedDonors
        ? new Map(preloadedDonors.map(d => [d.id, d]))
        : new Map((await remult.repo(Donor).find({ where: { id: { $in: donorIds } } })).map(d => [d.id, d]));

      // Load primary places for all donors (בית first, then any other)
      const primaryPlacesMap = await DonorPlace.getPrimaryForDonors(donorIds);

      // Load fundraisers and contact persons for name lookup (scoped to referenced IDs only)
      const referencedContactPersonIds = [...new Set([...donorMap.values()].map(d => (d as any).contactPersonId).filter((id): id is string => !!id))];
      const [fundraisers, contactPersons] = await Promise.all([
        remult.repo(User).find({ where: { donator: true } }),
        referencedContactPersonIds.length > 0 ? remult.repo(ContactPerson).find({ where: { id: { $in: referencedContactPersonIds } } }) : Promise.resolve([])
      ]);
      const fundraiserMap = new Map(fundraisers.map(f => [f.id, f.name]));
      const contactPersonMap = new Map(contactPersons.map(cp => [cp.id, cp.name]));

      // Load all contacts for the given donors in one query
      const allContacts = await remult.repo(DonorContact).find({
        where: {
          donorId: { $in: donorIds },
          isActive: true
        }
      });

      // ── pre-group contacts ב-Map לפי donorId (O(n) פעם אחת).
      // Display phones via shared phone-utils.selectDisplayPhones (mobiles if any,
      // else landlines). Single source of truth across the app.
      const allPhonesByDonor = new Map<string, string[]>();
      const emailsByDonor = new Map<string, string[]>();
      for (const c of allContacts) {
        if (!c.donorId) continue;
        if (c.type === 'phone' && c.phoneNumber) {
          const list = allPhonesByDonor.get(c.donorId) || [];
          list.push(c.phoneNumber);
          allPhonesByDonor.set(c.donorId, list);
        } else if (c.type === 'email' && c.email) {
          const arr = emailsByDonor.get(c.donorId) || [];
          arr.push(c.email);
          emailsByDonor.set(c.donorId, arr);
        }
      }
      const phonesByDonor = new Map<string, string[]>();
      for (const [donorId, list] of allPhonesByDonor) {
        phonesByDonor.set(donorId, selectDisplayPhones(list));
      }

      // Group data by donorId
      for (const donorId of donorIds) {
        const donor = donorMap.get(donorId);
        const primaryPlace = primaryPlacesMap.get(donorId);
        const place = primaryPlace?.place;

        // שימוש בפונקציה המרכזית לתצוגת כתובת
        const address = place?.getDisplayAddress() || undefined;

        const phones = phonesByDonor.get(donorId) || [];
        const emails = emailsByDonor.get(donorId) || [];

        detailsMap.set(donorId, {
          // Legacy fields
          address,
          phones,
          emails,
          // Expanded address fields
          country: place?.country?.name || '',
          city: place?.city || '',
          state: place?.state || '',
          neighborhood: place?.neighborhood || '',
          street: place?.street || '',
          houseNumber: place?.houseNumber || '',
          building: place?.building || '',
          apartment: place?.apartment || '',
          postcode: place?.postcode || '',
          placeName: place?.placeName || '',
          // Expanded donor fields
          title: donor?.title || '',
          firstName: donor?.firstName || '',
          lastName: donor?.lastName || '',
          suffix: donor?.suffix || '',
          titleEnglish: donor?.titleEnglish || '',
          firstNameEnglish: donor?.firstNameEnglish || '',
          lastNameEnglish: donor?.lastNameEnglish || '',
          suffixEnglish: donor?.suffixEnglish || '',
          maritalStatus: donor?.maritalStatus || '',
          isAnash: donor?.isAnash || false,
          isAlumni: donor?.isAlumni || false,
          // Fundraiser & Contact Person
          fundraiserName: donor?.fundraiserId ? fundraiserMap.get(donor.fundraiserId) || '' : '',
          contactPersonName: donor?.contactPersonId ? contactPersonMap.get(donor.contactPersonId) || '' : ''
        });
      }

      return detailsMap;
    } catch (error) {
      console.error('Error loading all donor details:', error);
      return detailsMap;
    }
  }

  /**
   * @deprecated Use loadAllDonorDetails for batch loading instead
   * Kept for backward compatibility
   */
  private static async loadDonorDetails(
    donorId: string
  ): Promise<{ address?: string; phones?: string[]; emails?: string[] }> {
    try {
      // Load primary place for donor
      const primaryPlace = await DonorPlace.getPrimaryForDonor(donorId);

      // שימוש בפונקציה המרכזית לתצוגת כתובת
      const address = primaryPlace?.place?.getDisplayAddress() || undefined;

      // Load all contacts and filter manually
      const allContacts = await remult.repo(DonorContact).find();

      const phoneContacts = allContacts.filter(c =>
        c.donorId === donorId && c.type === 'phone' && c.isActive
      );
      const phones = phoneContacts.map(c => c.phoneNumber || '').filter(p => p);

      const emailContacts = allContacts.filter(c =>
        c.donorId === donorId && c.type === 'email' && c.isActive
      );
      const emails = emailContacts.map(c => c.email || '').filter(e => e);

      return { address, phones, emails };
    } catch (error) {
      console.error('Error loading donor details:', error);
      return {};
    }
  }

  private static normalizeCurrencyName(currency: string): string {
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
      'Pound': 'GBP',
      'euro': 'EUR',
      'dollar': 'USD',
      'shekel': 'ILS',
      'pound': 'GBP'
    };

    // Return standard code if already in correct format, otherwise convert
    const normalized = hebrewToCode[currency] || (currency || '').toUpperCase();

    // Accept any 3-letter ISO currency code (ILS/USD/EUR/GBP/CHF/CAD/etc.)
    // Previously this whitelisted only 4 currencies and silently mapped
    // anything else to 'ILS' - which caused CHF/CAD donations to be lost
    // in totals (PayerService defines all platform currencies as the
    // single source of truth).
    if (/^[A-Z]{3}$/.test(normalized)) return normalized;

    // Truly unknown/empty input - fallback to ILS so we don't crash, but
    // this is a rare edge case (donation with no currencyId).
    return 'ILS';
  }

  private static async calculateCurrencySummary(
    donations: Donation[],
    conversionRates: { [currency: string]: number },
    hebrewYears: string[],
    paymentTotalsMap: Record<string, number> = {}
  ): Promise<CurrencySummaryData[]> {
    // Map: currency -> { year -> amount }
    const currencyYearTotals = new Map<string, { [year: string]: number }>();

    // ✅ OPTIMIZATION: Cache Hebrew date conversions
    const hebrewDateCache = new Map<string, string>();

    const getHebrewYearFormatted = async (date: Date): Promise<string> => {
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!hebrewDateCache.has(dateKey)) {
        const hebrewDate = await HebrewDateController.convertGregorianToHebrew(date);
        const formatted = await HebrewDateController.formatHebrewYear(hebrewDate.year);
        hebrewDateCache.set(dateKey, formatted);
      }
      return hebrewDateCache.get(dateKey)!;
    };

    for (const donation of donations) {
      // Normalize currency name to standard code
      const normalizedCurrency = ReportController.normalizeCurrencyName(donation.currencyId);

      // Get Hebrew year of this donation (use cache)
      const hebrewYearFormatted = await getHebrewYearFormatted(donation.donationDate);

      // Initialize currency if not exists
      if (!currencyYearTotals.has(normalizedCurrency)) {
        currencyYearTotals.set(normalizedCurrency, {});
      }

      const yearTotals = currencyYearTotals.get(normalizedCurrency)!;

      // Initialize year if not exists
      if (!yearTotals[hebrewYearFormatted]) {
        yearTotals[hebrewYearFormatted] = 0;
      }

      yearTotals[hebrewYearFormatted] += calculateEffectiveAmount(donation, paymentTotalsMap[donation.id!]);
    }

    // Convert to array with totals
    return Array.from(currencyYearTotals.entries()).map(([currency, yearTotals]) => {
      const yearlyTotalsInShekel: { [year: string]: number } = {};
      let totalAmount = 0;
      let totalInShekel = 0;

      // Calculate totals for each year and grand totals
      for (const year of hebrewYears) {
        const amount = yearTotals[year] || 0;
        const amountInShekel = amount * (conversionRates[currency] || 1);

        yearlyTotalsInShekel[year] = amountInShekel;
        totalAmount += amount;
        totalInShekel += amountInShekel;
      }

      return {
        currency,
        yearlyTotals: yearTotals,
        yearlyTotalsInShekel,
        totalAmount,
        totalInShekel
      };
    });
  }

  private static sortReportData(
    data: GroupedDonationReportData[],
    sortBy: string,
    sortDirection: 'asc' | 'desc',
    hebrewYears: string[]
  ): GroupedDonationReportData[] {
    const sortedData = [...data];
    const direction = sortDirection === 'asc' ? 1 : -1;

    sortedData.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortBy === 'donorName') {
        aValue = a.donorName;
        bValue = b.donorName;
      } else if (sortBy === 'address') {
        aValue = a.donorDetails?.address || '';
        bValue = b.donorDetails?.address || '';
      } else if (sortBy === 'phones') {
        aValue = a.donorDetails?.phones?.[0] || '';
        bValue = b.donorDetails?.phones?.[0] || '';
      } else if (sortBy === 'emails') {
        aValue = a.donorDetails?.emails?.[0] || '';
        bValue = b.donorDetails?.emails?.[0] || '';
      } else if (sortBy.startsWith('year_')) {
        // Sorting by specific year total
        const yearKey = sortBy.replace('year_', '');
        aValue = ReportController.calculateYearTotal(a, yearKey);
        bValue = ReportController.calculateYearTotal(b, yearKey);
      } else if (sortBy === 'total') {
        // Sorting by total across all years
        aValue = ReportController.calculateGrandTotal(a, hebrewYears);
        bValue = ReportController.calculateGrandTotal(b, hebrewYears);
      } else {
        return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue, 'he') * direction;
      } else {
        return (aValue - bValue) * direction;
      }
    });

    return sortedData;
  }

  private static calculateYearTotal(data: GroupedDonationReportData, yearKey: string): number {
    const yearData = data.yearlyTotals[yearKey];
    if (!yearData) return 0;
    return Object.values(yearData).reduce((sum, amount) => sum + amount, 0);
  }

  private static calculateGrandTotal(data: GroupedDonationReportData, hebrewYears: string[]): number {
    let total = 0;
    for (const year of hebrewYears) {
      total += ReportController.calculateYearTotal(data, year);
    }
    return total;
  }

  /**
   * Get available Hebrew years from donations
   * Returns formatted Hebrew years sorted descending
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getAvailableHebrewYears(): Promise<string[]> {
    try {
      const donationRepo = remult.repo(Donation);
      const [oldest, newest] = await Promise.all([
        donationRepo.find({ orderBy: { donationDate: 'asc' }, limit: 1 }),
        donationRepo.find({ orderBy: { donationDate: 'desc' }, limit: 1 })
      ]);
      if (oldest.length === 0 || newest.length === 0) return [];
      const [oldestHebrew, newestHebrew] = await Promise.all([
        HebrewDateController.convertGregorianToHebrew(oldest[0].donationDate),
        HebrewDateController.convertGregorianToHebrew(newest[0].donationDate)
      ]);
      const years: string[] = [];
      for (let y = newestHebrew.year; y >= oldestHebrew.year; y--) {
        years.push(await HebrewDateController.formatHebrewYear(y));
      }
      return years;
    } catch (error) {
      console.error('Error getting available Hebrew years:', error);
      return [];
    }
  }

  /**
   * Get Payments Report (Commitment vs Actual)
   * Shows promised donations vs actual payments, grouped by donor
   * Applies global filters from user.settings
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getPaymentsReport(
    conversionRates: { [currency: string]: number },
    localFilters?: PaymentReportLocalFilters
  ): Promise<PaymentReportResponse> {
    try {
      let globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

      if (localFilters?.selectedDonorIds && localFilters.selectedDonorIds.length > 0) {
        globalFilterDonorIds = globalFilterDonorIds !== undefined
          ? localFilters.selectedDonorIds.filter(id => globalFilterDonorIds!.includes(id))
          : localFilters.selectedDonorIds;
      }

      const page = localFilters?.page ?? 1;
      const pageSize = localFilters?.pageSize;

      if (globalFilterDonorIds !== undefined && globalFilterDonorIds.length === 0) {
        return { data: [], totalRecords: 0, totalPages: 0, currentPage: page };
      }

      const currentUserId = remult.user?.id;
      let globalFilterCampaignIds: string[] | undefined = undefined;
      let globalFilterDateFrom: Date | undefined = undefined;
      let globalFilterDateTo: Date | undefined = undefined;
      let globalFilterAmountMin: number | undefined = undefined;
      let globalFilterAmountMax: number | undefined = undefined;

      if (currentUserId) {
        const { User } = await import('../entity/user');
        const user = await remult.repo(User).findId(currentUserId);
        const globalFilters = user?.settings?.globalFilters;
        if (globalFilters) {
          globalFilterCampaignIds = globalFilters.campaignIds;
          globalFilterDateFrom = globalFilters.dateFrom;
          globalFilterDateTo = globalFilters.dateTo;
          globalFilterAmountMin = globalFilters.amountMin;
          globalFilterAmountMax = globalFilters.amountMax;
        }
      }

      // Build WHERE — הו"ק היא לא התחייבות, לכן סוג 'commitment' בלבד
      const donationWhere: any = { donationType: 'commitment' };
      if (globalFilterDonorIds !== undefined) {
        donationWhere.donorId = { $in: globalFilterDonorIds };
      }
      if (globalFilterCampaignIds && globalFilterCampaignIds.length > 0) {
        donationWhere.campaignId = { $in: globalFilterCampaignIds };
      }
      if (globalFilterDateFrom || globalFilterDateTo) {
        const dateFilter: any = {};
        if (globalFilterDateFrom) dateFilter.$gte = globalFilterDateFrom;
        if (globalFilterDateTo) dateFilter.$lte = globalFilterDateTo;
        donationWhere.donationDate = dateFilter;
      }
      if (globalFilterAmountMin !== undefined || globalFilterAmountMax !== undefined) {
        const amountFilter: any = {};
        if (globalFilterAmountMin !== undefined) amountFilter.$gte = globalFilterAmountMin;
        if (globalFilterAmountMax !== undefined) amountFilter.$lte = globalFilterAmountMax;
        donationWhere.amount = amountFilter;
      }

      const donations = await remult.repo(Donation).find({
        where: donationWhere,
        include: { donor: true },
        orderBy: { donationDate: 'desc' }
      });

      console.log(`📊 Loaded ${donations.length} commitment donations for payments report`);

      const donationIds = donations.map(d => d.id!).filter(Boolean);
      const payments = donationIds.length > 0
        ? await remult.repo(Payment).find({ where: { donationId: { $in: donationIds }, isActive: true } })
        : [];
      const paymentTotalsMap = calculatePaymentTotals(donations, payments);

      const uniqueDonorIds = [...new Set(donations.map(d => d.donorId).filter(Boolean))];
      const preloadedDonors = donations.map(d => d.donor).filter((d): d is Donor => d !== undefined);
      const donorDetailsMap = await ReportController.loadAllDonorDetails(uniqueDonorIds, preloadedDonors);

      const donorMap = new Map<string, {
        donor: Donor;
        totalCommitment: number;
        totalActual: number;
        donationCount: number;
        lastDonationDate: Date;
        donorDetails: DonorExportDetails;
      }>();

      for (const donation of donations) {
        if (!donation.donor) continue;
        const donorId = donation.donor.id;
        const amountInShekel = donation.amount * (conversionRates[donation.currencyId] || 1);

        if (!donorMap.has(donorId)) {
          donorMap.set(donorId, {
            donor: donation.donor,
            totalCommitment: 0,
            totalActual: 0,
            donationCount: 0,
            lastDonationDate: donation.donationDate,
            donorDetails: donorDetailsMap.get(donorId) || {}
          });
        }
        const data = donorMap.get(donorId)!;
        data.totalCommitment += amountInShekel;
        data.donationCount++;
        if (donation.donationDate > data.lastDonationDate) {
          data.lastDonationDate = donation.donationDate;
        }
      }

      for (const donation of donations) {
        if (!donation?.donor) continue;
        const data = donorMap.get(donation.donor.id);
        if (!data) continue;
        data.totalActual += (paymentTotalsMap[donation.id!] || 0) * (conversionRates[donation.currencyId] || 1);
      }

      const allRows: PaymentReportData[] = Array.from(donorMap.values())
        .map(data => {
          const remainingDebt = Math.max(0, data.totalCommitment - data.totalActual);
          let status: 'fullyPaid' | 'partiallyPaid' | 'notPaid';
          if (data.totalActual >= data.totalCommitment) status = 'fullyPaid';
          else if (data.totalActual > 0) status = 'partiallyPaid';
          else status = 'notPaid';

          const details = data.donorDetails;
          return {
            donorName: data.donor.lastAndFirstName,
            promisedAmount: data.totalCommitment,
            actualAmount: data.totalActual,
            remainingDebt,
            status,
            currency: 'ILS',
            address: details.address || '',
            city: details.city || '',
            phones: details.phones || [],
            emails: details.emails || [],
            lastDonationDate: data.lastDonationDate,
            title: details.title || '',
            firstName: details.firstName || '',
            lastName: details.lastName || '',
            suffix: details.suffix || '',
            titleEnglish: details.titleEnglish || '',
            firstNameEnglish: details.firstNameEnglish || '',
            lastNameEnglish: details.lastNameEnglish || '',
            suffixEnglish: details.suffixEnglish || '',
            maritalStatus: details.maritalStatus || '',
            isAnash: details.isAnash || false,
            isAlumni: details.isAlumni || false,
            fundraiserName: details.fundraiserName || '',
            contactPersonName: details.contactPersonName || '',
            country: details.country || '',
            state: details.state || '',
            neighborhood: details.neighborhood || '',
            street: details.street || '',
            houseNumber: details.houseNumber || '',
            building: details.building || '',
            apartment: details.apartment || '',
            postcode: details.postcode || '',
            placeName: details.placeName || ''
          };
        })
        .sort((a, b) => a.donorName.localeCompare(b.donorName, 'he'));

      const totalRecords = allRows.length;
      const totalPages = pageSize ? Math.ceil(totalRecords / pageSize) : 1;
      const data = pageSize && pageSize < totalRecords
        ? allRows.slice((page - 1) * pageSize, page * pageSize)
        : allRows;

      console.log(`✅ Generated ${totalRecords} payment report rows (page ${page}/${totalPages})`);
      return { data, totalRecords, totalPages, currentPage: page };

    } catch (error) {
      console.error('Error in getPaymentsReport:', error);
      throw error;
    }
  }

  /**
   * Get Yearly Summary Report
   * Shows donations grouped by year with currency breakdown
   * Applies global filters from user.settings
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getYearlySummaryReport(
    conversionRates: { [currency: string]: number },
    localFilters?: { selectedYear?: string | number }
  ): Promise<YearlySummaryData[]> {
    try {
      const globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

      if (globalFilterDonorIds !== undefined && globalFilterDonorIds.length === 0) {
        return [];
      }

      const currentUserId = remult.user?.id;
      let globalFilterCampaignIds: string[] | undefined = undefined;
      let globalFilterDateFrom: Date | undefined = undefined;
      let globalFilterDateTo: Date | undefined = undefined;
      let globalFilterAmountMin: number | undefined = undefined;
      let globalFilterAmountMax: number | undefined = undefined;

      if (currentUserId) {
        const { User } = await import('../entity/user');
        const user = await remult.repo(User).findId(currentUserId);
        const globalFilters = user?.settings?.globalFilters;
        if (globalFilters) {
          globalFilterCampaignIds = globalFilters.campaignIds;
          globalFilterDateFrom = globalFilters.dateFrom;
          globalFilterDateTo = globalFilters.dateTo;
          globalFilterAmountMin = globalFilters.amountMin;
          globalFilterAmountMax = globalFilters.amountMax;
        }
      }

      // Build WHERE before find()
      const donationWhere: any = {};

      if (globalFilterDonorIds !== undefined) {
        donationWhere.donorId = { $in: globalFilterDonorIds };
      }
      if (globalFilterCampaignIds && globalFilterCampaignIds.length > 0) {
        donationWhere.campaignId = { $in: globalFilterCampaignIds };
      }
      if (globalFilterAmountMin !== undefined || globalFilterAmountMax !== undefined) {
        const amountFilter: any = {};
        if (globalFilterAmountMin !== undefined) amountFilter.$gte = globalFilterAmountMin;
        if (globalFilterAmountMax !== undefined) amountFilter.$lte = globalFilterAmountMax;
        donationWhere.amount = amountFilter;
      }

      // Year filter: resolve to date range before find()
      let yearDateFrom: Date | undefined = globalFilterDateFrom;
      let yearDateTo: Date | undefined = globalFilterDateTo;
      if (localFilters?.selectedYear && localFilters.selectedYear !== 'last4') {
        let targetHebrewYear: number;
        if (typeof localFilters.selectedYear === 'number') {
          targetHebrewYear = localFilters.selectedYear;
        } else {
          targetHebrewYear = await HebrewDateController.parseHebrewYear(localFilters.selectedYear);
        }
        const dateRange = await HebrewDateController.getHebrewYearDateRange(targetHebrewYear);
        yearDateFrom = yearDateFrom && yearDateFrom > dateRange.startDate ? yearDateFrom : dateRange.startDate;
        yearDateTo = yearDateTo && yearDateTo < dateRange.endDate ? yearDateTo : dateRange.endDate;
      }

      if (yearDateFrom || yearDateTo) {
        const dateFilter: any = {};
        if (yearDateFrom) dateFilter.$gte = yearDateFrom;
        if (yearDateTo) dateFilter.$lte = yearDateTo;
        donationWhere.donationDate = dateFilter;
      }

      const donations = await remult.repo(Donation).find({
        where: donationWhere,
        orderBy: { donationDate: 'desc' },
        include: { donationMethod: true }
      });

      console.log(`📊 Loaded ${donations.length} donations for yearly summary report`);

      // Load payment totals for payment-based donations (commitments and standing orders)
      const paymentBasedIds = donations.filter(d => isPaymentBased(d)).map(d => d.id).filter(Boolean);
      let paymentTotals: Record<string, number> = {};
      if (paymentBasedIds.length > 0) {
        const { DonationController } = await import('./donation.controller');
        paymentTotals = await DonationController.getPaymentTotalsForCommitments(paymentBasedIds);
      }
      console.log(`  → Loaded payment totals for ${paymentBasedIds.length} payment-based donations`);

      // Group by HEBREW year (NOT Gregorian year). A Gregorian year (e.g.
      // 2023) spans 2 Hebrew years (Tashpa"g ends Sep 2023, Tashpa"d starts
      // Sep 2023). Bucketing by Greg year merged both into one row, with
      // the Hebrew label of whichever donation was processed first - leading
      // to misclassification where a CAD donation in early 2023 (Tashpa"g)
      // was reported under Tashpa"d because later Tashpa"d donations also
      // fell in Greg 2023.
      const yearlyMap = new Map<number /* hebrewYear num, e.g. 5783 */, {
        currencies: { [currency: string]: number };
        hebrewYear: string; // formatted (e.g. 'תשפ"ג')
        gregYear: number;   // Greg year of Tishrei start, for the (YYYY) suffix in UI
      }>();

      for (const donation of donations) {
        const hebrewDate = await HebrewDateController.convertGregorianToHebrew(donation.donationDate);
        const hebrewYearNum = hebrewDate.year;

        if (!yearlyMap.has(hebrewYearNum)) {
          const hebrewYearFormatted = await HebrewDateController.formatHebrewYear(hebrewYearNum);
          // Greg year that contains MOST months of this Hebrew year.
          // Hebrew year starts in Tishrei (~Sep). Most of it falls in the
          // following Greg year, so use hebrewYearNum - 3760:
          //   Tashpa"g (5783) -> 2023 (mostly in 2023)
          //   Tashpa"d (5784) -> 2024
          // This matches user expectation that "2023 ~= Tashpa"g".
          const gregYearMostly = hebrewYearNum - 3760;
          yearlyMap.set(hebrewYearNum, {
            currencies: {},
            hebrewYear: hebrewYearFormatted,
            gregYear: gregYearMostly,
          });
        }

        const yearData = yearlyMap.get(hebrewYearNum)!;
        const normalizedCurrency = ReportController.normalizeCurrencyName(donation.currencyId);
        if (!yearData.currencies[normalizedCurrency]) {
          yearData.currencies[normalizedCurrency] = 0;
        }
        yearData.currencies[normalizedCurrency] += calculateEffectiveAmount(donation, paymentTotals[donation.id]);
      }

      // Convert to array with totals
      const reportData = Array.from(yearlyMap.entries())
        .map(([hebrewYearNum, data]) => {
          let totalInShekel = 0;
          Object.entries(data.currencies).forEach(([currency, amount]) => {
            totalInShekel += amount * (conversionRates[currency] || 1);
          });

          return {
            year: data.gregYear, // shown as (YYYY) hint in UI
            hebrewYear: data.hebrewYear || '',
            currencies: data.currencies,
            totalInShekel
          };
        })
        .sort((a, b) => b.year - a.year);

      console.log(`✅ Generated ${reportData.length} yearly summary rows`);
      return reportData;

    } catch (error) {
      console.error('Error in getYearlySummaryReport:', error);
      throw error;
    }
  }

  /**
   * General Stats — replaces 5+ client-side full-table loads with a single server call
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getGeneralStats(conversionRates: { [currency: string]: number }): Promise<GeneralStatsResponse> {
    try {
      const globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

      if (globalFilterDonorIds !== undefined && globalFilterDonorIds.length === 0) {
        return {
          totalDonations: 0, totalDonors: 0, totalCampaigns: 0,
          amountByCurrency: [], avgDonation: 0,
          monthlyData: [], donorTypeData: [], regionData: [],
          campaignData: [], paymentMethodData: [],
          topDonors: [], topCampaigns: [], recentActivity: []
        };
      }

      const donationWhere: any = {};
      if (globalFilterDonorIds !== undefined) {
        donationWhere.donorId = { $in: globalFilterDonorIds };
      }

      // Single donation load (with donor + donationMethod)
      const donations = await remult.repo(Donation).find({
        where: donationWhere,
        include: { donor: true, donationMethod: true, campaign: true },
        orderBy: { donationDate: 'desc' }
      });

      // Payment totals for payment-based donations
      const paymentBasedIds = donations.filter(d => isPaymentBased(d)).map(d => d.id!).filter(Boolean);
      let paymentTotals: Record<string, number> = {};
      if (paymentBasedIds.length > 0) {
        const { DonationController } = await import('./donation.controller');
        paymentTotals = await DonationController.getPaymentTotalsForCommitments(paymentBasedIds);
      }

      const effectiveAmountILS = (d: Donation) =>
        calculateEffectiveAmount(d, paymentTotals[d.id!]) * (conversionRates[d.currencyId] || 1);

      // Summary counts
      const totalDonations = donations.length;
      const uniqueDonorIds = [...new Set(donations.map(d => d.donorId).filter(Boolean))];
      const totalCampaigns = await remult.repo(Campaign).count();

      // Amount by currency (face value per currency)
      const currencyMap = new Map<string, number>();
      let totalAmountILS = 0;
      donations.forEach(d => {
        const currency = ReportController.normalizeCurrencyName(d.currencyId);
        currencyMap.set(currency, (currencyMap.get(currency) || 0) + d.amount);
        totalAmountILS += effectiveAmountILS(d);
      });
      const amountByCurrency: GeneralCurrencyStat[] = Array.from(currencyMap.entries())
        .map(([currencyId, total]) => ({ currencyId, total }));

      const avgDonation = totalDonations > 0 ? totalAmountILS / totalDonations : 0;

      // Monthly data (ILS)
      const monthlyMap = new Map<string, { donations: number; amount: number }>();
      donations.forEach(d => {
        const monthKey = new Date(d.donationDate).toLocaleDateString('he-IL', { year: 'numeric', month: 'short' });
        if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, { donations: 0, amount: 0 });
        const entry = monthlyMap.get(monthKey)!;
        entry.donations++;
        entry.amount += effectiveAmountILS(d);
      });
      const monthlyData: GeneralMonthlyStat[] = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .reverse();

      // Donor type data (ILS)
      const typeMap = new Map<string, number>();
      donations.forEach(d => {
        const type = d.donor?.donorType || 'אחר';
        typeMap.set(type, (typeMap.get(type) || 0) + effectiveAmountILS(d));
      });
      const typeTotal = Array.from(typeMap.values()).reduce((s, v) => s + v, 0);
      const donorTypeData: GeneralChartItem[] = Array.from(typeMap.entries())
        .map(([label, value]) => ({ label, value, percentage: typeTotal > 0 ? (value / typeTotal) * 100 : 0 }));

      // Payment method data (ILS)
      const methodMap = new Map<string, number>();
      donations.forEach(d => {
        const method = d.donationMethod?.name || d.donationMethodId || 'לא צוין';
        methodMap.set(method, (methodMap.get(method) || 0) + effectiveAmountILS(d));
      });
      const methodTotal = Array.from(methodMap.values()).reduce((s, v) => s + v, 0);
      const paymentMethodData: GeneralChartItem[] = Array.from(methodMap.entries())
        .map(([label, value]) => ({ label, value, percentage: methodTotal > 0 ? (value / methodTotal) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);

      // Region data — primary place per donor
      const donorPlaces = uniqueDonorIds.length > 0
        ? await remult.repo(DonorPlace).find({
            where: { donorId: { $in: uniqueDonorIds }, isPrimary: true },
            include: { place: true }
          })
        : [];
      const donorCityMap = new Map<string, string>();
      donorPlaces.forEach(dp => { if (dp.donorId && dp.place?.city) donorCityMap.set(dp.donorId, dp.place.city); });

      const regionMap = new Map<string, number>();
      donations.forEach(d => {
        const city = d.donorId ? donorCityMap.get(d.donorId) : undefined;
        regionMap.set(city || 'לא צוין', (regionMap.get(city || 'לא צוין') || 0) + effectiveAmountILS(d));
      });
      const regionTotal = Array.from(regionMap.values()).reduce((s, v) => s + v, 0);
      const regionData: GeneralChartItem[] = Array.from(regionMap.entries())
        .map(([label, value]) => ({ label, value, percentage: regionTotal > 0 ? (value / regionTotal) * 100 : 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Campaign chart data (ILS, top 10)
      const campaignAmountMap = new Map<string, number>();
      donations.forEach(d => {
        if (!d.campaignId) return;
        const label = d.campaign?.name || d.campaignId;
        campaignAmountMap.set(label, (campaignAmountMap.get(label) || 0) + effectiveAmountILS(d));
      });
      const campaignTotal = Array.from(campaignAmountMap.values()).reduce((s, v) => s + v, 0);
      const campaignData: GeneralChartItem[] = Array.from(campaignAmountMap.entries())
        .map(([label, value]) => ({ label, value, percentage: campaignTotal > 0 ? (value / campaignTotal) * 100 : 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Top donors (ILS, top 10)
      const topDonorMap = new Map<string, GeneralTopDonor>();
      donations.forEach(d => {
        if (!d.donor) return;
        if (!topDonorMap.has(d.donor.id)) {
          topDonorMap.set(d.donor.id, { donorId: d.donor.id, donorName: d.donor.lastAndFirstName, total: 0, count: 0 });
        }
        const entry = topDonorMap.get(d.donor.id)!;
        entry.total += effectiveAmountILS(d);
        entry.count++;
      });
      const topDonors: GeneralTopDonor[] = Array.from(topDonorMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Top campaigns (ILS, top 5 by donation amount for this donor filter)
      const campaignIdAmountMap = new Map<string, { name: string; raisedInShekel: number }>();
      donations.forEach(d => {
        if (!d.campaignId) return;
        const name = d.campaign?.name || d.campaignId;
        const existing = campaignIdAmountMap.get(d.campaignId);
        if (!existing) campaignIdAmountMap.set(d.campaignId, { name, raisedInShekel: 0 });
        campaignIdAmountMap.get(d.campaignId)!.raisedInShekel += effectiveAmountILS(d);
      });
      const topCampaigns: GeneralTopCampaign[] = Array.from(campaignIdAmountMap.entries())
        .map(([campaignId, { name, raisedInShekel }]) => ({ campaignId, name, raisedInShekel }))
        .sort((a, b) => b.raisedInShekel - a.raisedInShekel)
        .slice(0, 5);

      // Recent activity (last 10)
      const recentActivity: GeneralRecentActivity[] = donations.slice(0, 10).map(d => ({
        date: d.donationDate,
        description: d.donationMethod?.name || 'תרומה',
        amount: effectiveAmountILS(d),
        campaign: d.campaign?.name,
        donorId: d.donorId
      }));

      return {
        totalDonations,
        totalDonors: uniqueDonorIds.length,
        totalCampaigns,
        amountByCurrency,
        avgDonation,
        monthlyData,
        donorTypeData,
        regionData,
        campaignData,
        paymentMethodData,
        topDonors,
        topCampaigns,
        recentActivity
      };

    } catch (error) {
      console.error('Error in getGeneralStats:', error);
      throw error;
    }
  }

  /**
   * Get Personal Donor Report
   * Returns donation details for a specific donor within a date range
   * Includes donations where the donor is a partner (partnerIds)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getPersonalDonorReport(
    donorId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<PersonalDonorReportData> {
    try {
      console.log(`📊 Loading personal donor report for donor ${donorId}`);
      console.log(`   Date range: ${fromDate} to ${toDate}`);

      // Load donor details
      const donor = await remult.repo(Donor).findId(donorId);
      if (!donor) {
        throw new Error('Donor not found');
      }

      // Load donor's primary place (בית first, then any other)
      const donorPlace = await DonorPlace.getPrimaryForDonor(donorId);

      // Load donations for this donor in the date range
      const donorDonations = await remult.repo(Donation).find({
        where: {
          donorId: donorId,
          donationDate: {
            $gte: fromDate,
            $lte: toDate
          }
        },
        orderBy: { donationDate: 'asc' },
        include: { donationMethod: true }
      });

      // console.log(`   Found ${donorDonations.length} direct donations`);

      // Load donations where this donor is a partner
      const allDonationsInRange = await remult.repo(Donation).find({
        where: {
          donationDate: {
            $gte: fromDate,
            $lte: toDate
          }
        },
        include: { donor: true, donationMethod: true }
      });

      const partnerDonations = allDonationsInRange.filter(d =>
        d.partnerIds && d.partnerIds.includes(donorId) && d.donorId !== donorId
      );

      // console.log(`   Found ${partnerDonations.length} partner donations`);

      // Load payments for all these donations with type filtering
      const allDonations = [...donorDonations, ...partnerDonations];
      const allDonationIds = allDonations.map(d => d.id!).filter(Boolean);

      const payments = allDonationIds.length > 0
        ? await remult.repo(Payment).find({
          where: { donationId: { $in: allDonationIds }, isActive: true }
        })
        : [];

      // Create payment map with type filtering
      const paymentTotals = calculatePaymentTotals(allDonations, payments);
      const paymentMap = new Map<string, number>(Object.entries(paymentTotals));

      // Build donations array
      const donationsData: PersonalDonorReportData['donations'] = [];

      // Process direct donations
      for (const donation of donorDonations) {
        const hebrewDate = await HebrewDateController.convertGregorianToHebrew(donation.donationDate);
        // commitment column: only for commitment donations, shows the pledged amount
        const commitmentAmount = donation.donationType === 'commitment' ? donation.amount : 0;
        // amount column: what was actually paid (effective amount)
        const paidAmount = calculateEffectiveAmount(donation, paymentMap.get(donation.id!));

        donationsData.push({
          date: donation.donationDate,
          dateHebrew: hebrewDate.formatted,
          commitment: commitmentAmount,
          amount: paidAmount,
          currencyId: donation.currencyId,
          notes: donation.reason || ''
        });
      }

      //   { id: 'ILS', label: 'שקל', labelEnglish: 'Shekel', symbol: '₪', rateInShekel: 1 },
      //   { id: 'USD', label: 'דולר', labelEnglish: 'Dollar', symbol: '$', rateInShekel: 3.2 },
      //   { id: 'EUR', label: 'יורו', labelEnglish: 'Euro', symbol: '€', rateInShekel: 3.73 },
      //   { id: 'GBP', label: 'ליש"ט', labelEnglish: 'Pound', symbol: '£', rateInShekel: 4.58 }
      // ];

      // Process partner donations
      for (const donation of partnerDonations) {
        const hebrewDate = await HebrewDateController.convertGregorianToHebrew(donation.donationDate);
        const mainDonorName = donation.donor?.lastAndFirstName || 'תורם לא ידוע';
        // commitment column: only for commitment donations
        const commitmentAmount = donation.donationType === 'commitment' ? donation.amount : 0;
        // amount column: what was actually paid (effective amount)
        const paidAmount = calculateEffectiveAmount(donation, paymentMap.get(donation.id!));

        donationsData.push({
          date: donation.donationDate,
          dateHebrew: hebrewDate.formatted,
          commitment: commitmentAmount,
          amount: paidAmount,
          currencyId: donation.currencyId,
          notes: `שותף בתרומה עם ${mainDonorName}`
        });
      }

      // Sort by date
      donationsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Convert dates to Hebrew
      const fromDateHebrew = await HebrewDateController.convertGregorianToHebrew(fromDate);
      const toDateHebrew = await HebrewDateController.convertGregorianToHebrew(toDate);

      const reportData: PersonalDonorReportData = {
        donor: {
          title: donor.title || '',
          fullName: donor.lastAndFirstName,// donor.fullName || `${donor.firstName} ${donor.lastName}`,
          suffix: donor.suffix || '',
          titleEnglish: donor.titleEnglish || '',
          fullNameEnglish: donor.fullNameEnglish || `${donor.firstNameEnglish || ''} ${donor.lastNameEnglish || ''}`.trim(),
          address: {
            street: donorPlace?.place?.street || '',
            houseNumber: donorPlace?.place?.houseNumber || '',
            city: donorPlace?.place?.city || '',
            postcode: donorPlace?.place?.postcode || ''
          }
        },
        fromDate: fromDate,
        fromDateHebrew: fromDateHebrew.formatted,
        toDate: toDate,
        toDateHebrew: toDateHebrew.formatted,
        reportDate: new Date(),
        donations: donationsData
      };

      console.log(`✅ Personal donor report generated with ${donationsData.length} donations`);
      return reportData;

    } catch (error) {
      console.error('Error in getPersonalDonorReport:', error);
      throw error;
    }
  }

  static createReportDelegate: (type: Report, contents: Record<string, any>) => Promise<DocxCreateResponse>
  static createReportPdfDelegate: (type: Report, contents: Record<string, any>) => Promise<DocxCreateResponse>
  // static createReportRecordsDelegate: (type: Report, contents: Record<string, any>) => Promise<DocxCreateResponse>

  @BackendMethod({ allowed: Allow.authenticated })
  static async createPersonalDonorReport(donorId: string, fromDateStr: string, toDateStr: string): Promise<DocxCreateResponse> {
    // Parse dates from ISO strings (YYYY-MM-DD format) to avoid timezone issues
    const from = ReportController.parseLocalDate(fromDateStr);
    const to = ReportController.parseLocalDate(toDateStr);
    console.log('from', from);
    console.log('to', to);

    const data = await ReportController.getPersonalDonorReport(
      donorId, from, to)


    // Load donor details
    const donor = await remult.repo(Donor).findId(donorId);
    if (!donor) {
      throw new Error('Donor not found');
    }
    // שימוש בפונקציה המרכזית לקבלת הכתובת הראשית
    const donorPlace = await DonorPlace.getPrimaryForDonor(donorId);

    // שלב 2: הכנת הנתונים להדפסה
    const dataToRender = {
      'מתאריך': ReportController.formatDateForFilter(data.fromDate),
      'עד_תאריך': ReportController.formatDateForFilter(data.toDate),
      'שם_תורם_מלא_עברית': `${ReportController.getFieldValue('שם_תורם_מלא_עברית', donor, donorPlace)}`,
      'שם_תורם_מלא_אנגלית': `${ReportController.getFieldValue('שם_תורם_מלא_אנגלית', donor, donorPlace)}`,
      'FullAddress': `${ReportController.getFieldValue('FullAddress', donor, donorPlace)}`,
      // יצירת מערך 'stops' שתואם ללולאה בשבלונה
      'stops': data.donations.map(d => {
        // יצירת אובייקט פשוט עבור כל משימה
        return {
          'תאריך': ReportController.formatDateForFilter(d.date),
          'תאריך_עברי': d.dateHebrew,
          'התחייבות': d.commitment || '',
          'סכום': d.notes.startsWith('שותף בתרומה') ? `(${'$'}${d.amount})` : `${'$'}${d.amount}`,
          'הערות': d.notes
        };
      })
    };

    return await ReportController.createReportDelegate(Report.report_personal_donor_donations, dataToRender)
    // return await ReportController.createReportPdfDelegate(Report.report_personal_donor_donations, dataToRender)
  }

  private static formatDateForFilter(d: Date): string {
    const date = new Date(d)
    // Use UTC methods to avoid timezone issues
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  /**
   * Parse date string (YYYY-MM-DD or Date ISO string) to Date object
   * Handles timezone issues by creating date at noon UTC
   */
  private static parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    // If it's already an ISO date string with time, extract just the date part
    const datePart = dateStr.split('T')[0];

    // Parse YYYY-MM-DD
    const [year, month, day] = datePart.split('-').map(Number);

    // Create date at noon UTC to avoid timezone edge cases
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  private static getFieldValue(field: string, donor: Donor, donorPlace?: DonorPlace) {
    var result = ''
    switch (field) {

      case 'שם_תורם_מלא_עברית': {
        result = ''
        result += (donor?.title || '').trim()
        result = result.trim() + ' '
        result += (donor?.firstName || '').trim()
        result = result.trim() + ' '
        result += (donor?.lineage === 'israel' ? '' : donor?.lineage || '').trim()
        result = result.trim() + ' '
        result += (donor?.lastName || '').trim()
        result = result.trim() + ' '
        result += (donor?.suffix || '').trim()
        result = result.trim()
        break
      }

      case 'שם_תורם_מלא_אנגלית': {
        result = ''
        result += (donor?.titleEnglish || '').trim()
        result = result.trim() + ' '
        result += (donor?.firstNameEnglish || ' ')[0]?.toUpperCase().trim()
        result = result.trim() + ' '
        result += (donor?.lineage === 'israel' ? '' : donor?.lineage || '').trim()
        result = result.trim() + ' '
        result += (donor?.maritalStatus === 'married' ? '& Mrs.' : '').trim()
        result = result.trim() + ' '
        result += ReportController.toCamelCase(donor?.lastNameEnglish || '').trim()
        result = result.trim() + ' '
        result += (donor?.suffixEnglish || '').trim()
        result = result.trim()
        break
      }

      case 'FullAddress': {
        // שימוש בפונקציה המרכזית getAddressForLetter
        if (donorPlace?.place) {
          const addressLines = donorPlace.place.getAddressForLetter();
          result = addressLines.join('\n');
        }
        break
      }
    }
    return result.trim()
  }

  private static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (match, char) => char.toUpperCase());
  }

}

export interface PaymentReportLocalFilters {
  selectedDonorIds?: string[];
  page?: number;
  pageSize?: number;
}

export interface PaymentReportResponse {
  data: PaymentReportData[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}

export interface PaymentReportData {
  donorName: string;
  promisedAmount: number; // Commitment in shekel
  actualAmount: number; // Actual payments in shekel
  remainingDebt: number;
  status: 'fullyPaid' | 'partiallyPaid' | 'notPaid';
  currency: string;
  address?: string;
  city?: string;
  /** Display phones - mobiles when any exist, else landlines (selectDisplayPhones). */
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
  // Fundraiser & Contact Person
  fundraiserName?: string;
  contactPersonName?: string;
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

export interface YearlySummaryData {
  year: number; // Gregorian year
  hebrewYear: string; // Hebrew year formatted
  currencies: { [currency: string]: number };
  totalInShekel: number;
}

export interface PersonalDonorReportData {
  donor: {
    title: string;
    fullName: string;
    suffix: string;
    titleEnglish: string;
    fullNameEnglish: string;
    address: {
      street: string;
      houseNumber: string;
      city: string;
      postcode: string;
    };
  };
  fromDate: Date;
  fromDateHebrew: string;
  toDate: Date;
  toDateHebrew: string;
  reportDate: Date;
  donations: {
    date: Date;
    dateHebrew: string;
    commitment: number;
    amount: number;
    currencyId: string;
    notes: string;
  }[];
}
