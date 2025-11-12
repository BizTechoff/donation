import { Allow, BackendMethod } from 'remult';
import { Donation } from '../entity/donation';
import { Donor } from '../entity/donor';
import { DonorPlace } from '../entity/donor-place';
import { DonorContact } from '../entity/donor-contact';
import { Payment } from '../entity/payment';
import { HebrewDateController } from './hebrew-date.controller';
import { remult } from 'remult';

export interface GroupedDonationReportData {
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
  // Global filters
  globalFilterCampaignIds?: string[];
  globalFilterDateFrom?: Date;
  globalFilterDateTo?: Date;
  globalFilterAmountMin?: number;
  globalFilterAmountMax?: number;
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
        console.log(`🔍 Loading donations for Hebrew year ${hebrewYear}:`, {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });

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
        console.log(`✅ Found ${yearDonations.length} donations for year ${hebrewYear}`);
        allDonations.push(...yearDonations);
      }
      console.log(`📊 Total donations loaded: ${allDonations.length}`);

      // Apply additional filters
      let filteredDonations = allDonations;
      console.log('🔍 Applying filters:', {
        selectedDonor: filters.selectedDonor,
        selectedDonorIds: filters.selectedDonorIds,
        selectedCampaign: filters.selectedCampaign,
        selectedDonorType: filters.selectedDonorType,
        selectedYear: filters.selectedYear
      });

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

      // Apply global filters
      if (filters.globalFilterCampaignIds && filters.globalFilterCampaignIds.length > 0) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d =>
          d.campaignId && filters.globalFilterCampaignIds!.includes(d.campaignId)
        );
        console.log(`  → Global campaign filter: ${before} → ${filteredDonations.length}`);
      }

      if (filters.globalFilterDateFrom || filters.globalFilterDateTo) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d => {
          const donationDate = new Date(d.donationDate);
          if (filters.globalFilterDateFrom && donationDate < filters.globalFilterDateFrom) return false;
          if (filters.globalFilterDateTo && donationDate > filters.globalFilterDateTo) return false;
          return true;
        });
        console.log(`  → Global date filter: ${before} → ${filteredDonations.length}`);
      }

      if (filters.globalFilterAmountMin !== undefined || filters.globalFilterAmountMax !== undefined) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d => {
          if (filters.globalFilterAmountMin !== undefined && d.amount < filters.globalFilterAmountMin) return false;
          if (filters.globalFilterAmountMax !== undefined && d.amount > filters.globalFilterAmountMax) return false;
          return true;
        });
        console.log(`  → Global amount filter: ${before} → ${filteredDonations.length}`);
      }

      console.log(`✅ Final filtered donations: ${filteredDonations.length}`);

      // Load payments if requested
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
        filters
      );

      // Calculate currency summary (before pagination)
      const currencySummary = await ReportController.calculateCurrencySummary(
        filteredDonations,
        filters.conversionRates,
        hebrewYears
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
    filters: ReportFilters
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
    const hebrewDateCache = new Map<string, { year: number; formatted: string }>();

    const getHebrewYearFormatted = async (date: Date): Promise<string> => {
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!hebrewDateCache.has(dateKey)) {
        const hebrewDate = await HebrewDateController.convertGregorianToHebrew(date);
        const formatted = await HebrewDateController.formatHebrewYear(hebrewDate.year);
        hebrewDateCache.set(dateKey, { year: hebrewDate.year, formatted });
      }
      return hebrewDateCache.get(dateKey)!.formatted;
    };

    for (const donation of donations) {
      let groupKey = '';
      let groupName = '';

      // Determine grouping key based on filter
      switch (filters.groupBy) {
        case 'donor':
          groupKey = donation.donorId || 'unknown';
          groupName = donation.donor?.fullName || 'תורם אלמוני';
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
          actualPayments: filters.showActualPayments ? {} : undefined
        };

        // Add donor details if requested and grouping by donor (use pre-loaded data)
        if (filters.showDonorDetails && filters.groupBy === 'donor' && groupKey !== 'unknown') {
          groupData.donorDetails = donorDetailsMap.get(groupKey) || {};
        }

        grouped.set(groupKey, groupData);
      }

      const group = grouped.get(groupKey)!;

      // Determine Hebrew year of donation (use cache)
      const hebrewYearFormatted = await getHebrewYearFormatted(donation.donationDate);

      // Initialize year if not exists
      if (!group.yearlyTotals[hebrewYearFormatted]) {
        group.yearlyTotals[hebrewYearFormatted] = {};
      }

      // Add amount to year and currency
      if (!group.yearlyTotals[hebrewYearFormatted][donation.currency]) {
        group.yearlyTotals[hebrewYearFormatted][donation.currency] = 0;
      }
      group.yearlyTotals[hebrewYearFormatted][donation.currency] += donation.amount;
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
        const currency = donation.currency;
        const amountInShekel = payment.amount * (filters.conversionRates[currency] || 1);
        group.actualPayments[hebrewYearFormatted] += amountInShekel;
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * ✅ NEW: Load donor details for multiple donors in batch (optimized)
   * Replaces N+1 queries with 2 queries total
   */
  private static async loadAllDonorDetails(
    donorIds: string[]
  ): Promise<Map<string, { address?: string; phones?: string[]; emails?: string[] }>> {
    const detailsMap = new Map<string, { address?: string; phones?: string[]; emails?: string[] }>();

    try {
      // Load all donor places for the given donors in one query
      const allPlaces = await remult.repo(DonorPlace).find({
        where: {
          donorId: { $in: donorIds },
          isPrimary: true,
          isActive: true
        },
        include: { place: true }
      });

      // Load all contacts for the given donors in one query
      const allContacts = await remult.repo(DonorContact).find({
        where: {
          donorId: { $in: donorIds },
          isActive: true
        }
      });

      // Group data by donorId
      for (const donorId of donorIds) {
        const primaryPlace = allPlaces.find(dp => dp.donorId === donorId);
        const address = primaryPlace?.place
          ? `${primaryPlace.place.street || ''} ${primaryPlace.place.city || ''}`.trim()
          : undefined;

        const phoneContacts = allContacts.filter(c =>
          c.donorId === donorId && c.type === 'phone'
        );
        const phones = phoneContacts.map(c => c.phoneNumber || '').filter(p => p);

        const emailContacts = allContacts.filter(c =>
          c.donorId === donorId && c.type === 'email'
        );
        const emails = emailContacts.map(c => c.email || '').filter(e => e);

        detailsMap.set(donorId, { address, phones, emails });
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
      // Load all donor places and filter manually
      const allPlaces = await remult.repo(DonorPlace).find({
        include: { place: true }
      });
      const primaryPlace = allPlaces.find(dp =>
        dp.donorId === donorId && dp.isPrimary && dp.isActive
      );

      const address = primaryPlace?.place
        ? `${primaryPlace.place.street || ''} ${primaryPlace.place.city || ''}`.trim()
        : undefined;

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
    // Map Hebrew currency names to standard codes
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

    return hebrewToCode[currency] || currency;
  }

  private static async calculateCurrencySummary(
    donations: Donation[],
    conversionRates: { [currency: string]: number },
    hebrewYears: string[]
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
      const normalizedCurrency = ReportController.normalizeCurrencyName(donation.currency);

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

      yearTotals[hebrewYearFormatted] += donation.amount;
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
}
