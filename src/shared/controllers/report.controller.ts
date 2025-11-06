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
  totalAmount: number;
  totalInShekel: number;
}

export interface GroupedReportResponse {
  hebrewYears: string[];
  reportData: GroupedDonationReportData[];
  currencySummary: CurrencySummaryData[];
  totalInShekel: number;
}

export type GroupByOption = 'donor' | 'campaign' | 'paymentMethod' | 'fundraiser';

export interface ReportFilters {
  groupBy: GroupByOption;
  showDonorDetails: boolean;
  showActualPayments: boolean;
  showCurrencySummary: boolean;
  selectedDonor?: string;
  selectedCampaign?: string;
  selectedDonorType?: string;
  selectedYear?: string | number; // 'last4' or specific year
  conversionRates: { [currency: string]: number };
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
            donor: true,
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
        selectedCampaign: filters.selectedCampaign,
        selectedDonorType: filters.selectedDonorType,
        selectedYear: filters.selectedYear
      });

      if (filters.selectedDonor) {
        const before = filteredDonations.length;
        filteredDonations = filteredDonations.filter(d => d.donorId === filters.selectedDonor);
        console.log(`  → Donor filter: ${before} → ${filteredDonations.length}`);
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
      const reportData = await ReportController.groupDonations(
        filteredDonations,
        allPayments,
        filters
      );

      // Calculate currency summary
      const currencySummary = ReportController.calculateCurrencySummary(
        filteredDonations,
        filters.conversionRates
      );

      // Calculate total
      const totalInShekel = currencySummary.reduce((sum, curr) => sum + curr.totalInShekel, 0);

      return {
        hebrewYears,
        reportData,
        currencySummary: filters.showCurrencySummary ? currencySummary : [],
        totalInShekel
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

    for (const donation of donations) {
      let groupKey = '';
      let groupName = '';

      // Determine grouping key based on filter
      switch (filters.groupBy) {
        case 'donor':
          groupKey = donation.donorId || 'unknown';
          groupName = donation.donor?.displayName || 'תורם אלמוני';
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

        // Add donor details if requested and grouping by donor
        if (filters.showDonorDetails && filters.groupBy === 'donor' && groupKey !== 'unknown') {
          groupData.donorDetails = await ReportController.loadDonorDetails(groupKey);
        }

        grouped.set(groupKey, groupData);
      }

      const group = grouped.get(groupKey)!;

      // Determine Hebrew year of donation
      const hebrewDate = await HebrewDateController.convertGregorianToHebrew(donation.donationDate);
      const hebrewYearFormatted = await HebrewDateController.formatHebrewYear(hebrewDate.year);

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

        const hebrewDate = await HebrewDateController.convertGregorianToHebrew(payment.paymentDate);
        const hebrewYearFormatted = await HebrewDateController.formatHebrewYear(hebrewDate.year);

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

  private static calculateCurrencySummary(
    donations: Donation[],
    conversionRates: { [currency: string]: number }
  ): CurrencySummaryData[] {
    const currencyTotals = new Map<string, number>();

    for (const donation of donations) {
      const current = currencyTotals.get(donation.currency) || 0;
      currencyTotals.set(donation.currency, current + donation.amount);
    }

    return Array.from(currencyTotals.entries()).map(([currency, totalAmount]) => ({
      currency,
      totalAmount,
      totalInShekel: totalAmount * (conversionRates[currency] || 1)
    }));
  }
}
