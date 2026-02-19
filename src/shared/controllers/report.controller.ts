import { Allow, BackendMethod, Fields, remult } from 'remult';
import { Donation } from '../entity/donation';
import { DonationMethod } from '../entity/donation-method';
import { Donor } from '../entity/donor';
import { DonorContact } from '../entity/donor-contact';
import { DonorPlace } from '../entity/donor-place';
import { Payment } from '../entity/payment';
import { Report } from '../enum/report';
import { DocxCreateResponse } from '../type/letter.type';
import { calculateEffectiveAmount, calculatePaymentTotals, calculatePeriodsElapsed, isPaymentBased, isStandingOrder } from '../utils/donation-utils';
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
    console.log('getGroupedDonationsReport',JSON.stringify(filters))
    try {
      // 🎯 Fetch global filters using GlobalFilterController (handles all filter types: city, anash, alumni, etc.)
      const globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();
    console.log('getGroupedDonationsReport',JSON.stringify(globalFilterDonorIds))

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
      const allDonations: Donation[] = [];
      for (const hebrewYear of yearsToLoad) {
        const dateRange = await HebrewDateController.getHebrewYearDateRange(hebrewYear);
        // console.log(`🔍 Loading donations for Hebrew year ${hebrewYear}:`, {
        //   startDate: dateRange.startDate,
        //   endDate: dateRange.endDate
        // });

        const yearDonations = await remult.repo(Donation).find({
          where: {
            donationDate: {
              $gte: dateRange.startDate,
              $lte: dateRange.endDate
            }
          },
          include: {
            donor: {
              include: {
                fundraiser: true
              }
            },
            campaign: true,
            donationMethod: true,
            createdBy: true
          }
        });
        // console.log(`✅ Found ${yearDonations.length} donations for year ${hebrewYear}`);
        allDonations.push(...yearDonations);
      }
      // console.log(`📊 Total donations loaded: ${allDonations.length}`);

      // Apply additional filters
      let filteredDonations = allDonations;
      // console.log('🔍 Applying filters:', {
      //   selectedDonor: filters.selectedDonor,
      //   selectedDonorIds: filters.selectedDonorIds,
      //   selectedCampaign: filters.selectedCampaign,
      //   selectedDonorType: filters.selectedDonorType,
      //   selectedYear: filters.selectedYear
      // });

      // Single donor filter (legacy)
      if (filters.selectedDonor) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d => d.donorId === filters.selectedDonor);
        console.log(`  → Donor filter: ${before} → ${filteredDonations.length}`);
      }

      // Multi-donor filter (new)
      if (filters.selectedDonorIds && filters.selectedDonorIds.length > 0) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d =>
          d.donorId && filters.selectedDonorIds!.includes(d.donorId)
        );
        console.log(`  → Multi-donor filter: ${before} → ${filteredDonations.length} (${filters.selectedDonorIds.length} donors selected)`);
      }

      // 🎯 Apply global donor filter (from user.settings)
      // undefined = אין פילטר, [] = יש פילטר אבל אף תורם לא עונה לו
      if (globalFilterDonorIds !== undefined) {
        if (globalFilterDonorIds.length === 0) {
          // מערך ריק = אף תורם לא עונה לפילטר - להחזיר תוצאות ריקות
          filteredDonations = [];
          console.log(`  → Global donor filter: empty array - no donors match filter`);
        } else {
          const before = filteredDonations.length;
          filteredDonations = filteredDonations.filter(d =>
            d.donorId && globalFilterDonorIds!.includes(d.donorId)
          );
          console.log(`  → Global donor filter: ${before} → ${filteredDonations.length} (${globalFilterDonorIds.length} donors in global filter)`);
        }
      }

      if (filters.selectedCampaign) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d => d.campaignId === filters.selectedCampaign);
        console.log(`  → Campaign filter: ${before} → ${filteredDonations.length}`);
      }

      if (filters.selectedDonorType) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d => {
          if (!d.donor) return false;
          switch (filters.selectedDonorType) {
            case 'אנ"ש': return d.donor.isAnash || false;
            case 'תלמידנו': return d.donor.isAlumni || false;
            case 'קשר אחר': return d.donor.isOtherConnection || false;
            default: return true;
          }
        });
        console.log(`  → Donor type filter: ${before} → ${filteredDonations.length}`);
      }

      // Apply global filters (from user.settings)
      if (globalFilterCampaignIds && globalFilterCampaignIds.length > 0) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d =>
          d.campaignId && globalFilterCampaignIds!.includes(d.campaignId)
        );
        console.log(`  → Global campaign filter: ${before} → ${filteredDonations.length}`);
      }

      if (globalFilterDateFrom || globalFilterDateTo) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d => {
          const donationDate = new Date(d.donationDate);
          if (globalFilterDateFrom && donationDate < globalFilterDateFrom) return false;
          if (globalFilterDateTo && donationDate > globalFilterDateTo) return false;
          return true;
        });
        console.log(`  → Global date filter: ${before} → ${filteredDonations.length}`);
      }

      if (globalFilterAmountMin !== undefined || globalFilterAmountMax !== undefined) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d => {
          if (globalFilterAmountMin !== undefined && d.amount < globalFilterAmountMin) return false;
          if (globalFilterAmountMax !== undefined && d.amount > globalFilterAmountMax) return false;
          return true;
        });
        console.log(`  → Global amount filter: ${before} → ${filteredDonations.length}`);
      }

      console.log(`✅ Final filtered donations: ${filteredDonations.length}`);

      // Load payment totals for payment-based donations (commitments + standing orders)
      let paymentTotalsMap: Record<string, number> = {};
      if (filteredDonations.length > 0) {
        const paymentBasedDonations = filteredDonations.filter(d => isPaymentBased(d));
        const paymentBasedIds = paymentBasedDonations.map(d => d.id!).filter(Boolean);

        if (paymentBasedIds.length > 0) {
          const allPaymentsForTotals = await remult.repo(Payment).find({
            where: { donationId: { $in: paymentBasedIds }, isActive: true }
          });
          paymentTotalsMap = calculatePaymentTotals(paymentBasedDonations, allPaymentsForTotals);
        }
      }

      // Load payments if requested (for actualPayments column)
      const allPayments: Payment[] = [];
      if (filters.showActualPayments && filteredDonations.length > 0) {
        const donationIds = filteredDonations.map(d => d.id!);
        const payments = await remult.repo(Payment).find({
          where: {
            donationId: { $in: donationIds }//,
            // status: 'completed'
          }
        });
        allPayments.push(...payments);
      }

      // Group the donations
      let reportData = await ReportController.groupDonations(
        filteredDonations,
        allPayments,
        filters,
        paymentTotalsMap
      );

      // Calculate currency summary (before pagination)
      const currencySummary = await ReportController.calculateCurrencySummary(
        filteredDonations,
        filters.conversionRates,
        hebrewYears,
        paymentTotalsMap
      );

      // Calculate total (before pagination)
      const totalInShekel = currencySummary.reduce((sum, curr) => sum + curr.totalInShekel, 0);

      // Apply sorting
      if (filters.sortBy) {
        reportData = ReportController.sortReportData(reportData, filters.sortBy, filters.sortDirection || 'asc', hebrewYears);
      }

      // Store total count before pagination
      const totalRecords = reportData.length;

      // Apply pagination
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const totalPages = Math.ceil(totalRecords / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = reportData.slice(startIndex, endIndex);

      return {
        hebrewYears,
        reportData: paginatedData,
        currencySummary: filters.showCurrencySummary ? currencySummary : [],
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

  private static async groupDonations(
    donations: Donation[],
    payments: Payment[],
    filters: ReportFilters,
    paymentTotalsMap: Record<string, number> = {}
  ): Promise<GroupedDonationReportData[]> {
    const grouped = new Map<string, GroupedDonationReportData>();

    // ✅ OPTIMIZATION 1: Pre-load all donor details in batch (if needed)
    let donorDetailsMap = new Map<string, { address?: string; phones?: string[]; emails?: string[] }>();
    if (filters.showDonorDetails && filters.groupBy === 'donor') {
      const donorIds = [...new Set(donations.map(d => d.donorId).filter(Boolean))];
      if (donorIds.length > 0) {
        donorDetailsMap = await ReportController.loadAllDonorDetails(donorIds);
      }
    }

    // ✅ OPTIMIZATION 2: Cache Hebrew date conversions
    const hebrewDateCache = new Map<string, { year: number; yearFormatted: string; dateFormatted: string }>();

    const getHebrewDateInfo = async (date: Date): Promise<{ yearFormatted: string; dateFormatted: string }> => {
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!hebrewDateCache.has(dateKey)) {
        const hebrewDate = await HebrewDateController.convertGregorianToHebrew(date);
        const yearFormatted = await HebrewDateController.formatHebrewYear(hebrewDate.year);
        hebrewDateCache.set(dateKey, {
          year: hebrewDate.year,
          yearFormatted,
          dateFormatted: hebrewDate.formatted
        });
      }
      const cached = hebrewDateCache.get(dateKey)!;
      return { yearFormatted: cached.yearFormatted, dateFormatted: cached.dateFormatted };
    };

    const getHebrewYearFormatted = async (date: Date): Promise<string> => {
      const info = await getHebrewDateInfo(date);
      return info.yearFormatted;
    };

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

      // Determine Hebrew year and date of donation (use cache)
      const hebrewDateInfo = await getHebrewDateInfo(donation.donationDate);

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
    }

    // Add partner donations to donation details (only for sub-table display, not for totals)
    if (filters.showDonationDetails && filters.groupBy === 'donor') {
      for (const donation of donations) {
        // Check if donation has partners
        if (!donation.partnerIds || donation.partnerIds.length === 0) continue;

        const hebrewDateInfo = await getHebrewDateInfo(donation.donationDate);

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
      for (const payment of payments) {
        const donation = donations.find(d => d.id === payment.donationId);
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

        // Use cached Hebrew date conversion
        const hebrewYearFormatted = await getHebrewYearFormatted(payment.paymentDate);

        if (!group.actualPayments[hebrewYearFormatted]) {
          group.actualPayments[hebrewYearFormatted] = 0;
        }

        // Convert to shekel
        const currency = donation.currencyId;
        const amountInShekel = payment.amount * (filters.conversionRates[currency] || 1);
        group.actualPayments[hebrewYearFormatted] += amountInShekel;
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * ✅ NEW: Load donor details for multiple donors in batch (optimized)
   * Replaces N+1 queries with 3 queries total (donors, places, contacts)
   * Returns expanded donor and address fields for Excel export
   */
  private static async loadAllDonorDetails(
    donorIds: string[]
  ): Promise<Map<string, DonorExportDetails>> {
    const detailsMap = new Map<string, DonorExportDetails>();

    try {
      // Load all donors in one query
      const donors = await remult.repo(Donor).find({
        where: { id: { $in: donorIds } }
      });
      const donorMap = new Map(donors.map(d => [d.id, d]));

      // Load primary places for all donors (בית first, then any other)
      const primaryPlacesMap = await DonorPlace.getPrimaryForDonors(donorIds);

      // Load all contacts for the given donors in one query
      const allContacts = await remult.repo(DonorContact).find({
        where: {
          donorId: { $in: donorIds },
          isActive: true
        }
      });

      // Group data by donorId
      for (const donorId of donorIds) {
        const donor = donorMap.get(donorId);
        const primaryPlace = primaryPlacesMap.get(donorId);
        const place = primaryPlace?.place;

        // שימוש בפונקציה המרכזית לתצוגת כתובת
        const address = place?.getDisplayAddress() || undefined;

        const phoneContacts = allContacts.filter(c =>
          c.donorId === donorId && c.type === 'phone'
        );
        const phones = phoneContacts.map(c => c.phoneNumber || '').filter(p => p);

        const emailContacts = allContacts.filter(c =>
          c.donorId === donorId && c.type === 'email'
        );
        const emails = emailContacts.map(c => c.email || '').filter(e => e);

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
          isAlumni: donor?.isAlumni || false
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
    const normalized = hebrewToCode[currency] || currency.toUpperCase();

    // Ensure it's one of the valid codes
    const validCodes = ['ILS', 'USD', 'EUR', 'GBP'];
    return validCodes.includes(normalized) ? normalized : 'ILS';
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
      // Get all unique donation dates (only the date field, not the whole object)
      const donations = await remult.repo(Donation).find({
        orderBy: { donationDate: 'desc' }
      });

      // Extract unique Hebrew years
      const hebrewYearsSet = new Set<number>();
      for (const donation of donations) {
        const hebrewDate = await HebrewDateController.convertGregorianToHebrew(donation.donationDate);
        hebrewYearsSet.add(hebrewDate.year);
      }

      // Convert to formatted strings and sort descending
      const sortedYears = Array.from(hebrewYearsSet).sort((a, b) => b - a);
      const formattedYears: string[] = [];
      for (const year of sortedYears) {
        const formatted = await HebrewDateController.formatHebrewYear(year);
        formattedYears.push(formatted);
      }

      return formattedYears;
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
    localFilters?: { selectedDonorIds?: string[] }
  ): Promise<PaymentReportData[]> {
    try {
      // 🎯 Fetch global filters using GlobalFilterController (handles all filter types: city, anash, alumni, etc.)
      let globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

      // If local filter exists, intersect with global filter
      if (localFilters?.selectedDonorIds && localFilters.selectedDonorIds.length > 0) {
        if (globalFilterDonorIds !== undefined) {
          // חיתוך עם הפילטר הגלובלי (אם ריק - התוצאה תהיה ריקה)
          globalFilterDonorIds = localFilters.selectedDonorIds.filter(id => globalFilterDonorIds!.includes(id));
        } else {
          globalFilterDonorIds = localFilters.selectedDonorIds;
        }
      }

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

      // Load only commitment donations (not standing orders - they are not pledges)
      // הו"ק היא לא התחייבות - היא אמצעי תשלום, לא הבטחה מחייבת
      let donations = await remult.repo(Donation).find({
        where: { donationType: 'commitment' },
        include: {
          donor: true,
          donationMethod: true
        },
        orderBy: { donationDate: 'desc' }
      });

      console.log(`📊 Loaded ${donations.length} commitment donations for payments report`);

      // Apply global filters
      // undefined = אין פילטר, [] = יש פילטר אבל אף תורם לא עונה לו
      if (globalFilterDonorIds !== undefined) {
        if (globalFilterDonorIds.length === 0) {
          donations = [];
          console.log(`  → Global donor filter: empty array - no donors match filter`);
        } else {
          const before = donations.length;
          donations = donations.filter(d => d.donorId && globalFilterDonorIds!.includes(d.donorId));
          console.log(`  → Global donor filter: ${before} → ${donations.length}`);
        }
      }

      if (globalFilterCampaignIds && globalFilterCampaignIds.length > 0) {
        const before = donations.length;
        donations = donations.filter(d => d.campaignId && globalFilterCampaignIds!.includes(d.campaignId));
        console.log(`  → Global campaign filter: ${before} → ${donations.length}`);
      }

      if (globalFilterDateFrom || globalFilterDateTo) {
        const before = donations.length;
        donations = donations.filter(d => {
          const donationDate = new Date(d.donationDate);
          if (globalFilterDateFrom && donationDate < globalFilterDateFrom) return false;
          if (globalFilterDateTo && donationDate > globalFilterDateTo) return false;
          return true;
        });
        console.log(`  → Global date filter: ${before} → ${donations.length}`);
      }

      if (globalFilterAmountMin !== undefined || globalFilterAmountMax !== undefined) {
        const before = donations.length;
        donations = donations.filter(d => {
          if (globalFilterAmountMin !== undefined && d.amount < globalFilterAmountMin) return false;
          if (globalFilterAmountMax !== undefined && d.amount > globalFilterAmountMax) return false;
          return true;
        });
        console.log(`  → Global amount filter: ${before} → ${donations.length}`);
      }

      // Load payments for all donations with type filtering
      const donationIds = donations.map(d => d.id!).filter(Boolean);
      const payments = await remult.repo(Payment).find({
        where: {
          donationId: { $in: donationIds },
          isActive: true
        }
      });
      const paymentTotalsMap = calculatePaymentTotals(donations, payments);

      console.log(`📊 Loaded ${payments.length} payments`);

      // Load donor details (addresses)
      const uniqueDonorIds = [...new Set(donations.map(d => d.donorId).filter(Boolean))];
      const donorDetailsMap = await ReportController.loadAllDonorDetails(uniqueDonorIds);

      // Group by donor
      const donorMap = new Map<string, {
        donor: Donor;
        totalCommitment: number; // Total promised (in shekel)
        totalActual: number; // Total paid (in shekel)
        donationCount: number;
        lastDonationDate: Date;
        donorDetails: DonorExportDetails;
      }>();

      // Process donations (commitments and standing orders)
      for (const donation of donations) {
        if (!donation.donor) continue;

        const donorId = donation.donor.id;
        const rate = conversionRates[donation.currencyId] || 1;

        // התחייבות: donation.amount הוא סכום ההתחייבות המלא
        const commitmentAmount = donation.amount;
        const amountInShekel = commitmentAmount * rate;

        if (!donorMap.has(donorId)) {
          const donorDetails = donorDetailsMap.get(donorId) || {};

          donorMap.set(donorId, {
            donor: donation.donor,
            totalCommitment: 0,
            totalActual: 0,
            donationCount: 0,
            lastDonationDate: donation.donationDate,
            donorDetails: donorDetails
          });
        }

        const data = donorMap.get(donorId)!;
        data.totalCommitment += amountInShekel;
        data.donationCount++;

        // Update last donation date
        if (donation.donationDate > data.lastDonationDate) {
          data.lastDonationDate = donation.donationDate;
        }
      }

      // Process payments (actual amounts) - using filtered payment totals
      for (const donation of donations) {
        if (!donation?.donor) continue;

        const donorId = donation.donor.id;
        const data = donorMap.get(donorId);
        if (!data) continue;

        // Get filtered payment total for this donation
        const paymentTotal = paymentTotalsMap[donation.id!] || 0;
        // Convert to shekel
        const amountInShekel = paymentTotal * (conversionRates[donation.currencyId] || 1);
        data.totalActual += amountInShekel;
      }

      // Convert to array and calculate remaining debt
      const reportData: PaymentReportData[] = Array.from(donorMap.values())
        .map(data => {
          const remainingDebt = Math.max(0, data.totalCommitment - data.totalActual);
          let status: 'fullyPaid' | 'partiallyPaid' | 'notPaid';

          if (data.totalActual >= data.totalCommitment) {
            status = 'fullyPaid';
          } else if (data.totalActual > 0) {
            status = 'partiallyPaid';
          } else {
            status = 'notPaid';
          }

          const details = data.donorDetails;
          return {
            donorName: data.donor.lastAndFirstName,
            promisedAmount: data.totalCommitment,
            actualAmount: data.totalActual,
            remainingDebt: remainingDebt,
            status: status,
            currency: 'ILS', // Always in shekel after conversion
            // Legacy fields
            address: details.address || '',
            city: details.city || '',
            phones: details.phones || [],
            emails: details.emails || [],
            lastDonationDate: data.lastDonationDate,
            // Expanded donor fields
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
            // Expanded address fields
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

      console.log(`✅ Generated ${reportData.length} payment report rows`);
      return reportData;

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

      // Load all donations with donationMethod for isPaymentBased check
      let donations = await remult.repo(Donation).find({
        orderBy: { donationDate: 'desc' },
        include: { donationMethod: true }
      });

      console.log(`📊 Loaded ${donations.length} donations for yearly summary report`);

      // Apply global filters
      // undefined = אין פילטר, [] = יש פילטר אבל אף תורם לא עונה לו
      if (globalFilterDonorIds !== undefined) {
        if (globalFilterDonorIds.length === 0) {
          donations = [];
          console.log(`  → Global donor filter: empty array - no donors match filter`);
        } else {
          const before = donations.length;
          donations = donations.filter(d => d.donorId && globalFilterDonorIds!.includes(d.donorId));
          console.log(`  → Global donor filter: ${before} → ${donations.length}`);
        }
      }

      if (globalFilterCampaignIds && globalFilterCampaignIds.length > 0) {
        const before = donations.length;
        donations = donations.filter(d => d.campaignId && globalFilterCampaignIds!.includes(d.campaignId));
        console.log(`  → Global campaign filter: ${before} → ${donations.length}`);
      }

      if (globalFilterDateFrom || globalFilterDateTo) {
        const before = donations.length;
        donations = donations.filter(d => {
          const donationDate = new Date(d.donationDate);
          if (globalFilterDateFrom && donationDate < globalFilterDateFrom) return false;
          if (globalFilterDateTo && donationDate > globalFilterDateTo) return false;
          return true;
        });
        console.log(`  → Global date filter: ${before} → ${donations.length}`);
      }

      if (globalFilterAmountMin !== undefined || globalFilterAmountMax !== undefined) {
        const before = donations.length;
        donations = donations.filter(d => {
          if (globalFilterAmountMin !== undefined && d.amount < globalFilterAmountMin) return false;
          if (globalFilterAmountMax !== undefined && d.amount > globalFilterAmountMax) return false;
          return true;
        });
        console.log(`  → Global amount filter: ${before} → ${donations.length}`);
      }

      // Apply local year filter
      if (localFilters?.selectedYear && localFilters.selectedYear !== 'last4') {
        const before = donations.length;
        // Parse Hebrew year string to get numeric Hebrew year
        let targetHebrewYear: number;
        if (typeof localFilters.selectedYear === 'number') {
          targetHebrewYear = localFilters.selectedYear;
        } else {
          // It's a Hebrew year string like "תשפ"ה" - parse it
          targetHebrewYear = await HebrewDateController.parseHebrewYear(localFilters.selectedYear);
        }

        // Get date range for the Hebrew year
        const dateRange = await HebrewDateController.getHebrewYearDateRange(targetHebrewYear);
        console.log(`  → Filtering by Hebrew year ${targetHebrewYear}:`, {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });

        // Filter donations within the Hebrew year date range
        donations = donations.filter(d => {
          const donationDate = new Date(d.donationDate);
          return donationDate >= dateRange.startDate && donationDate <= dateRange.endDate;
        });
        console.log(`  → Local year filter (${localFilters.selectedYear}): ${before} → ${donations.length}`);
      }

      // Load payment totals for payment-based donations (commitments and standing orders)
      const paymentBasedIds = donations.filter(d => isPaymentBased(d)).map(d => d.id).filter(Boolean);
      let paymentTotals: Record<string, number> = {};
      if (paymentBasedIds.length > 0) {
        const { DonationController } = await import('./donation.controller');
        paymentTotals = await DonationController.getPaymentTotalsForCommitments(paymentBasedIds);
      }
      console.log(`  → Loaded payment totals for ${paymentBasedIds.length} payment-based donations`);

      // Group by year
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
        // Normalize currency code to standard format
        const normalizedCurrency = ReportController.normalizeCurrencyName(donation.currencyId);
        if (!yearData.currencies[normalizedCurrency]) {
          yearData.currencies[normalizedCurrency] = 0;
        }
        // Use effective amount (what was actually paid) for commitments and standing orders
        yearData.currencies[normalizedCurrency] += calculateEffectiveAmount(donation, paymentTotals[donation.id]);
      }

      // Convert to array with totals
      const reportData = Array.from(yearlyMap.entries())
        .map(([year, data]) => {
          let totalInShekel = 0;
          Object.entries(data.currencies).forEach(([currency, amount]) => {
            totalInShekel += amount * (conversionRates[currency] || 1);
          });

          return {
            year,
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

export interface PaymentReportData {
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
