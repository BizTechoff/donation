import { Allow, BackendMethod, remult } from 'remult';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { GlobalFilterController } from './global-filter.controller';
import { DonorController } from './donor.controller';
import { Bank } from '../entity/bank';
import { Campaign } from '../entity/campaign';
import { Company } from '../entity/company';
import { Donation } from '../entity/donation';
import { DonationBank } from '../entity/donation-bank';
import { DonationMethod } from '../entity/donation-method';
import { DonationOrganization } from '../entity/donation-organization';
import { Donor } from '../entity/donor';
import { Organization } from '../entity/organization';
import { DonorPlace } from '../entity/donor-place';
import { DonationFile } from '../entity/file';
import { Payment } from '../entity/payment';
import { CurrencyType } from '../type/currency.type';
import { calculateEffectiveAmount, calculatePaymentTotals, isPaymentBased } from '../utils/donation-utils';

export interface DonationFilters {
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  selectedMethodId?: string;
  amountFrom?: number;
  selectedCampaignId?: string;
  donorId?: string;
  selectedDonationType?: string;
  // globalFilters removed - now fetched from user.settings in backend
}

export interface DonationDetailsData {
  donation: Donation | null | undefined;
  campaigns: Campaign[];
  donationMethods: DonationMethod[];
  organizations: Organization[];
  banks: Bank[];
  payerCompanies: Company[];
  donationBanks: DonationBank[];
  donationOrganizations: DonationOrganization[];
  partnerDonors: Donor[];
  selectedOrganization: Organization | null;
  selectedBank: Bank | null;
}

export interface DonationSelectionData {
  donations: Donation[];
  donorMap: Record<string, Donor>;
  campaignMap: Record<string, Campaign>;
}

export interface CampaignDonationRow {
  id: string;
  donationDate: Date | undefined;
  donorId: string;
  donorName: string;
  amount: number;
  currencyId: string;
  donationType: string;
  standingOrderType: string;
  unlimitedPayments: boolean;
  frequency: string;
  donationMethodId: string;
  donationMethodName: string;
  donationMethodType: string;
  partnerIds: string[];
  reason: string;
  isExceptional: boolean;
  periodsElapsed: number;
}

export interface CampaignDonationsPageParams {
  campaignId: string;
  page: number;
  pageSize: number;
  filterDonorId?: string;
  filterMethodId?: string;
  filterType?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CampaignDonationsPageResult {
  rows: CampaignDonationRow[];
  total: number;
  paymentTotals: Record<string, number>;
  dropdownDonors: { id: string; firstName: string; lastName: string; fullName: string }[];
}

export class DonationController {

  /**
   * Get only donation IDs matching global filters - much faster for maps
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredDonationIds(): Promise<string[]> {
    const donations = await DonationController.findFilteredDonations({}, undefined, 10000);
    return donations.map(d => d.id);
  }

  /**
   * Get donations matching global filters with full donor info (for map display)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredDonationsForMap(): Promise<Donation[]> {
    return await DonationController.findFilteredDonations({}, undefined, 10000);
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonationsForSelection(excludeIds?: string[]): Promise<DonationSelectionData> {
    // Load donations using global filters from user.settings
    // Global filters are fetched automatically in findFilteredDonations
    let donations = await DonationController.findFilteredDonations({}, undefined, 500); // Limit to 500 for performance

    // Filter out excluded donations
    if (excludeIds && excludeIds.length > 0) {
      donations = donations.filter(donation => !excludeIds.includes(donation.id));
    }

    const donorIds = [...new Set(donations.map(d => d.donorId).filter(id => id))];
    const campaignIds = [...new Set(donations.map(d => d.campaignId).filter(id => id))];

    // Load all related data in parallel
    const [donors, campaigns] = await Promise.all([
      remult.repo(Donor).find({
        where: { id: { $in: donorIds } }
      }),
      remult.repo(Campaign).find({
        where: { id: { $in: campaignIds } }
      })
    ]);

    // Build maps
    const donorMap: Record<string, Donor> = {};
    const campaignMap: Record<string, Campaign> = {};

    donors.forEach(donor => donorMap[donor.id] = donor);
    campaigns.forEach(campaign => campaignMap[campaign.id] = campaign);

    return { donations, donorMap, campaignMap };
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonationDetailsData(donationId: string, donorId?: string): Promise<DonationDetailsData> {
    // Load donation (or null for new)
    const donation = donationId !== 'new' ? await remult.repo(Donation).findId(donationId, {
      include: { donor: true, donationMethod: true }
    }) : null;

    // Determine which donorId to use for loading companies
    const effectiveDonorId = donation?.donorId || donorId;

    // Load all reference data in parallel
    const [
      campaigns,
      donationMethods,
      organizations,
      banks
    ] = await Promise.all([
      remult.repo(Campaign).find({
        orderBy: { name: 'asc' }
      }),
      remult.repo(DonationMethod).find({
        orderBy: { name: 'asc' }
      }),
      remult.repo(Organization).find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      }),
      remult.repo(Bank).find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })
    ]);

    // Load payer companies — use already-included donor relation, fall back to findId for new donations
    let payerCompanies: Company[] = [];
    if (effectiveDonorId) {
      const donor = donation?.donor ?? await remult.repo(Donor).findId(effectiveDonorId);
      if (donor?.companyIds?.length) {
        payerCompanies = await remult.repo(Company).find({
          where: { id: { $in: donor.companyIds } },
          include: { place: true }
        });
      }
    }

    // Load donation-specific data if exists
    let donationBanks: DonationBank[] = [];
    let donationOrganizations: DonationOrganization[] = [];
    let partnerDonors: Donor[] = [];
    let selectedOrganization: Organization | null = null;
    let selectedBank: Bank | null = null;

    if (donation?.id) {
      const partnerIds = donation.partnerIds || [];
      const [
        donationBanksResult,
        donationOrganizationsResult,
        partnerDonorsResult,
        selectedOrganizationResult,
        selectedBankResult
      ] = await Promise.all([
        remult.repo(DonationBank).find({
          where: { donationId: donation.id, isActive: true },
          include: { bank: true },
          orderBy: { createdDate: 'asc' }
        }),
        remult.repo(DonationOrganization).find({
          where: { donationId: donation.id, isActive: true },
          include: { organization: true },
          orderBy: { createdDate: 'asc' }
        }),
        partnerIds.length > 0
          ? Promise.all(partnerIds.map(id => remult.repo(Donor).findId(id))).then(donors => donors.filter((d): d is Donor => d !== null && d !== undefined))
          : Promise.resolve([] as Donor[]),
        donation.organizationId ? remult.repo(Organization).findId(donation.organizationId) : Promise.resolve(null),
        donation.bankId ? remult.repo(Bank).findId(donation.bankId) : Promise.resolve(null)
      ]);
      donationBanks = donationBanksResult;
      donationOrganizations = donationOrganizationsResult;
      partnerDonors = partnerDonorsResult;
      selectedOrganization = selectedOrganizationResult ?? null;
      selectedBank = selectedBankResult ?? null;
    }

    return {
      donation,
      campaigns,
      donationMethods,
      organizations,
      banks,
      payerCompanies,
      donationBanks,
      donationOrganizations,
      partnerDonors,
      selectedOrganization,
      selectedBank
    };
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredDonations(
    filters: DonationFilters,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<Donation[]> {
    // 🎯 Fetch global filters from user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    console.log('DonationController.findFilteredDonations', JSON.stringify(filters, null, 2));
    let whereClause: any = {};
    let globalDonorIds: string[] | undefined = undefined;

    // Apply global filters first
    if (globalFilters) {
      console.log('Applying global filters...');
      // Get donor IDs from global filters (location + target audience)
      globalDonorIds = await GlobalFilterController.getDonorIds(globalFilters);
      console.log(`Found ${globalDonorIds?.length || 0} donors matching global filters`);

      if (globalDonorIds && globalDonorIds.length === 0) {
        console.log('No matching donors from global filters, returning empty array');
        return []; // No matching donors from global filters
      }

      // Apply campaign filter from global filters
      if (globalFilters.campaignIds && globalFilters.campaignIds.length > 0) {
        whereClause.campaignId = { $in: globalFilters.campaignIds };
      }

      // Apply date range filter from global filters
      if (globalFilters.dateFrom || globalFilters.dateTo) {
        whereClause.donationDate = {};
        if (globalFilters.dateFrom) {
          whereClause.donationDate.$gte = globalFilters.dateFrom;
        }
        if (globalFilters.dateTo) {
          whereClause.donationDate.$lte = globalFilters.dateTo;
        }
      }

      // Apply amount range filter from global filters
      if (globalFilters.amountMin !== undefined || globalFilters.amountMax !== undefined) {
        whereClause.amount = {};
        if (globalFilters.amountMin !== undefined) {
          whereClause.amount.$gte = globalFilters.amountMin;
        }
        if (globalFilters.amountMax !== undefined) {
          whereClause.amount.$lte = globalFilters.amountMax;
        }
      }
    }

    // Apply local campaign filter (overrides global if specified)
    if (filters.selectedCampaignId) {
      whereClause.campaignId = filters.selectedCampaignId;
    }

    // Apply donation method filter
    if (filters.selectedMethodId) {
      whereClause.donationMethodId = filters.selectedMethodId;
    }

    // Apply local amount filter (adds to global if specified)
    if (filters.amountFrom !== undefined && filters.amountFrom !== null && filters.amountFrom > 0) {
      if (whereClause.amount) {
        // Merge with existing amount filter
        if (!whereClause.amount.$gte || filters.amountFrom > whereClause.amount.$gte) {
          whereClause.amount.$gte = filters.amountFrom;
        }
      } else {
        whereClause.amount = { $gte: filters.amountFrom };
      }
    }

    // Apply local date range filter (overrides global if specified)
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      whereClause.donationDate = { $gte: fromDate };
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (whereClause.donationDate) {
        whereClause.donationDate = {
          ...whereClause.donationDate,
          $lte: toDate
        };
      } else {
        whereClause.donationDate = { $lte: toDate };
      }
    }

    // Apply donor filter (if specific donor)
    if (filters.donorId) {
      whereClause.donorId = filters.donorId;
    }

    // Apply donation type filter
    if (filters.selectedDonationType) {
      whereClause.donationType = filters.selectedDonationType;
    }

    // Build orderBy from sortColumns or use default
    let orderBy: any = { donationDate: 'desc' as 'desc' }; // Default sort
    // Track fields that require post-fetch sorting (related entities)
    let postFetchSortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];

    if (sortColumns && sortColumns.length > 0) {
      orderBy = {};
      sortColumns.forEach(sort => {
        // Map frontend field names to backend entity fields
        let fieldName = sort.field;
        switch (fieldName) {
          case 'amount':
            orderBy.amount = sort.direction;
            break;
          case 'currency':
          case 'currencyId':
            orderBy.currencyId = sort.direction;
            break;
          case 'donationDate':
            orderBy.donationDate = sort.direction;
            break;
          case 'donationType':
            orderBy.donationType = sort.direction;
            break;
          // Fields that require post-fetch sorting (related entities)
          case 'donorName':
          case 'address':
          case 'method':
          case 'campaign':
          case 'fundraiser':
            postFetchSortColumns.push(sort);
            break;
          default:
            console.log('DonationController: Unsupported sort field for server-side:', fieldName);
            break;
        }
      });
    }

    // If we have a search term, find matching donors using cross-field search
    // Each word must match at least one field (name, phone, email, address), AND between words
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const searchDonorIds = await DonorController.searchDonorIdsAcrossAllFields(filters.searchTerm, globalDonorIds);

      if (searchDonorIds.length === 0) {
        return [];
      }

      // Intersect search results with global filter results
      if (globalDonorIds) {
        const intersected = globalDonorIds.filter(id => searchDonorIds.includes(id));
        if (intersected.length === 0) {
          return [];
        }
        if (whereClause.donorId) {
          whereClause.donorId = { $in: [whereClause.donorId, ...intersected] };
        } else {
          whereClause.donorId = { $in: intersected };
        }
      } else {
        if (whereClause.donorId) {
          whereClause.donorId = { $in: [whereClause.donorId, ...searchDonorIds] };
        } else {
          whereClause.donorId = { $in: searchDonorIds };
        }
      }
    } else if (globalDonorIds) {
      // No search term but have global donor filter
      if (whereClause.donorId) {
        // If there's already a specific donor filter, intersect it with global donor IDs
        const specificDonorId = typeof whereClause.donorId === 'string' ? whereClause.donorId : whereClause.donorId;
        if (globalDonorIds.includes(specificDonorId)) {
          whereClause.donorId = specificDonorId; // Keep the specific donor if it's in the global list
        } else {
          return []; // Specific donor is not in global filter, return empty
        }
      } else {
        whereClause.donorId = { $in: globalDonorIds };
      }
    }

    const findOptions: any = {
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy,
      include: { donor: true, campaign: true, donationMethod: true }
    };

    // Add pagination if provided
    if (page && pageSize) {
      findOptions.page = page;
      findOptions.limit = pageSize;
    }

    const donations = await remult.repo(Donation).find(findOptions);

    // Load related entities manually
    for (const donation of donations) {
      if (donation.donorId) {
        const donor = await remult.repo(Donor).findId(donation.donorId);
        if (donor) donation.donor = donor;
      }
      if (donation.campaignId) {
        const campaign = await remult.repo(Campaign).findId(donation.campaignId);
        if (campaign) donation.campaign = campaign;
      }
      if (donation.donationMethodId) {
        const method = await remult.repo(DonationMethod).findId(donation.donationMethodId);
        if (method) donation.donationMethod = method;
      }
    }

    // Load primary addresses for all donors (בית first, then any other)
    const donorIds = [...new Set(donations.map(d => d.donorId).filter(id => id))];
    if (donorIds.length > 0) {
      const donorPlacesMap = await DonorPlace.getPrimaryForDonors(donorIds);

      // Attach home address to each donation's donor
      for (const donation of donations) {
        if (donation.donor && donation.donorId) {
          const primaryPlace = donorPlacesMap.get(donation.donorId);
          if (primaryPlace) {
            (donation.donor as any).homeAddress = primaryPlace.place?.getDisplayAddress() || '-';
          } else {
            (donation.donor as any).homeAddress = '-';
          }
        }
      }
    }

    // Apply post-fetch sorting for related entity fields
    if (postFetchSortColumns.length > 0) {
      donations.sort((a, b) => {
        for (const sort of postFetchSortColumns) {
          let aValue: string = '';
          let bValue: string = '';

          switch (sort.field) {
            case 'donorName':
              aValue = `${a.donor?.firstName || ''} ${a.donor?.lastName || ''}`.trim().toLowerCase();
              bValue = `${b.donor?.firstName || ''} ${b.donor?.lastName || ''}`.trim().toLowerCase();
              break;
            case 'address':
              aValue = ((a.donor as any)?.homeAddress || '').toLowerCase();
              bValue = ((b.donor as any)?.homeAddress || '').toLowerCase();
              break;
            case 'method':
              aValue = (a.donationMethod?.name || '').toLowerCase();
              bValue = (b.donationMethod?.name || '').toLowerCase();
              break;
            case 'campaign':
              aValue = (a.campaign?.name || '').toLowerCase();
              bValue = (b.campaign?.name || '').toLowerCase();
              break;
            case 'fundraiser':
              aValue = (a.donor?.fundraiser?.name || '').toLowerCase();
              bValue = (b.donor?.fundraiser?.name || '').toLowerCase();
              break;
          }

          if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return donations;
  }

  /**
   * Count all donations matching filters (for pagination)
   * Includes both full donations and commitments based on filter
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredDonations(filters: DonationFilters): Promise<number> {
    const whereClause = await DonationController.buildWhereClause(filters);
    if (whereClause === null) {
      return 0;
    }

    // Count all records matching the filter (donationType is already applied in buildWhereClause if specified)
    const count = await remult.repo(Donation).count(
      Object.keys(whereClause).length > 0 ? whereClause : undefined
    );

    return count;
  }

  /**
   * Count only full donations (not commitments) - for the summary card
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async countFullDonations(filters: DonationFilters): Promise<number> {
    const whereClause = await DonationController.buildWhereClause(filters);
    if (whereClause === null) {
      return 0;
    }

    // If user selected "commitment" type, don't count full donations
    if (filters.selectedDonationType === 'commitment') {
      return 0;
    }

    // Count only full donations (exclude commitments)
    if (!filters.selectedDonationType) {
      whereClause.donationType = { $ne: 'commitment' };
    }

    const count = await remult.repo(Donation).count(
      Object.keys(whereClause).length > 0 ? whereClause : undefined
    );

    return count;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async sumFilteredDonations(filters: DonationFilters, currencies: Record<string, CurrencyType>): Promise<number> {
    const whereClause = await DonationController.buildWhereClause(filters);
    if (whereClause === null) {
      return 0;
    }

    // Sum only full donations (exclude commitments)
    whereClause.donationType = { $ne: 'commitment' };

    // ── אופטימיזציה: groupBy מחזיר ~5 שורות (מטבעות) במקום לטעון 10K+ תרומות ל-memory.
    // הלוגיקה הקודמת העבירה את calculateEffectiveAmount ללא paymentsTotal,
    // ו-donation.donationMethod לא נטען (אין defaultIncluded) - לכן התוצאה בפועל
    // הייתה תמיד donation.amount עבור לא-commitment. גם SUM(amount) מחזיר בדיוק זה.
    const sumsByCurrency = await remult.repo(Donation).groupBy({
      group: ['currencyId'],
      sum: ['amount'],
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

    // Apply currency rates on the small result set (one row per currency).
    return sumsByCurrency.reduce((total, row) => {
      const rate = currencies[row.currencyId]?.rateInShekel || 1;
      const amountSum = row.amount?.sum || 0;
      return total + (amountSum * rate);
    }, 0);
  }

  /**
   * Get donation totals grouped by currency (full donations only, not commitments)
   * Returns effective amounts - what was actually paid
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async sumFilteredDonationsByCurrency(filters: DonationFilters): Promise<Record<string, number>> {
    const whereClause = await DonationController.buildWhereClause(filters);
    if (whereClause === null) {
      return {};
    }

    // If user selected "commitment" type, don't sum full donations
    if (filters.selectedDonationType === 'commitment') {
      return {};
    }

    // Sum only full donations (exclude commitments)
    if (!filters.selectedDonationType) {
      whereClause.donationType = { $ne: 'commitment' };
    }

    // ── אופטימיזציה: במקום לטעון 10K+ תרומות ל-memory:
    // (1) groupBy ב-SQL - מחזיר ~5 שורות (סכום amount לכל מטבע).
    // (2) לטעון רק את ההו"קים (תת-קבוצה קטנה) ולעדכן את הסכום שלהם לסכום
    //     התשלומים בפועל (לא amount).
    const sumsByCurrency = await remult.repo(Donation).groupBy({
      group: ['currencyId'],
      sum: ['amount'],
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

    // מזהי מתודות תשלום מסוג 'standing_order' (טבלה קטנה)
    const allMethods = await remult.repo(DonationMethod).find();
    const standingOrderMethodIds = allMethods.filter(m => m.type === 'standing_order').map(m => m.id);

    // רק הו"קים - תת-קבוצה קטנה, לא 10K
    const standingOrderDonations = standingOrderMethodIds.length > 0
      ? await remult.repo(Donation).find({
          where: { ...whereClause, donationMethodId: { $in: standingOrderMethodIds } }
        })
      : [];

    // סכומי התשלומים האמיתיים להו"קים
    const standingOrderIds = standingOrderDonations.map(d => d.id).filter(Boolean);
    const paymentTotals = standingOrderIds.length > 0
      ? await DonationController.getPaymentTotalsForCommitments(standingOrderIds)
      : {};

    // מתחילים מסכום amount מה-groupBy, ומתקנים עבור הו"קים
    // (מורידים amount, מוסיפים paymentTotal) - זה מה ש-calculateEffectiveAmount עושה להו"ק.
    const byCurrency: Record<string, number> = {};
    for (const row of sumsByCurrency) {
      byCurrency[row.currencyId || 'ILS'] = row.amount?.sum || 0;
    }
    for (const d of standingOrderDonations) {
      const currency = d.currencyId || 'ILS';
      byCurrency[currency] = (byCurrency[currency] || 0) - d.amount + (paymentTotals[d.id] || 0);
    }

    return byCurrency;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countCommitments(filters: DonationFilters): Promise<number> {
    const whereClause = await DonationController.buildWhereClause(filters);
    if (whereClause === null) {
      return 0;
    }

    // If user selected "full" type, don't count commitments
    if (filters.selectedDonationType === 'full') {
      return 0;
    }

    // Count only commitments
    if (!filters.selectedDonationType) {
      whereClause.donationType = 'commitment';
    }

    const count = await remult.repo(Donation).count(
      Object.keys(whereClause).length > 0 ? whereClause : undefined
    );

    return count;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async sumCommitments(filters: DonationFilters, currencies: Record<string, CurrencyType>): Promise<number> {
    const whereClause = await DonationController.buildWhereClause(filters);
    if (whereClause === null) {
      return 0;
    }

    // Override donationType to only sum commitments
    whereClause.donationType = 'commitment';

    // התחייבויות הן תת-קבוצה של תרומות. הסכום האפקטיבי שלהן הוא סכום התשלומים בפועל.
    // בהיעדר מנגנון JOIN ב-groupBy של Remult, טוענים התחייבויות (סאבסט קטן) + מחשבים.
    const commitments = await remult.repo(Donation).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

    if (commitments.length === 0) return 0;

    const donationIds = commitments.map(d => d.id).filter(Boolean);
    const paymentTotals = await DonationController.getPaymentTotalsForCommitments(donationIds);

    // חישוב מקומי על סט קטן (התחייבויות, לא 10K תרומות רגילות)
    return commitments.reduce((sum, d) => {
      const rate = currencies[d.currencyId]?.rateInShekel || 1;
      return sum + ((paymentTotals[d.id] || 0) * rate);
    }, 0);
  }

  /**
   * Get commitment totals grouped by currency with payment totals
   * Returns: { currencyId: { total: number, paid: number } }
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async sumCommitmentsByCurrency(filters: DonationFilters): Promise<Record<string, { total: number; paid: number }>> {
    const whereClause = await DonationController.buildWhereClause(filters);
    if (whereClause === null) {
      return {};
    }

    // If user selected "full" type, don't sum commitments
    if (filters.selectedDonationType === 'full') {
      return {};
    }

    // Sum only commitments
    if (!filters.selectedDonationType) {
      whereClause.donationType = 'commitment';
    }

    // אופטימיזציה: total מקבלים מ-groupBy SQL. paid דורש סכום תשלומים להתחייבות -
    // טוענים את רשימת ההתחייבויות (סאבסט קטן) + שאילתה אחת לתשלומים שלהן.
    const totalsByCurrency = await remult.repo(Donation).groupBy({
      group: ['currencyId'],
      sum: ['amount'],
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

    const commitments = await remult.repo(Donation).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

    const donationIds = commitments.map(d => d.id).filter(Boolean);
    const paymentTotals = donationIds.length > 0
      ? await DonationController.getPaymentTotalsForCommitments(donationIds)
      : {};

    // בונים את התוצאה: total ממחובר מ-groupBy, paid ממוצע על ההתחייבויות
    const byCurrency: Record<string, { total: number; paid: number }> = {};
    for (const row of totalsByCurrency) {
      const currency = row.currencyId || 'ILS';
      byCurrency[currency] = { total: row.amount?.sum || 0, paid: 0 };
    }
    for (const d of commitments) {
      const currency = d.currencyId || 'ILS';
      if (!byCurrency[currency]) {
        byCurrency[currency] = { total: 0, paid: 0 };
      }
      byCurrency[currency].paid += (paymentTotals[d.id] || 0);
    }

    return byCurrency;
  }

  /**
   * Build where clause for filtering donations
   * Returns null if no results should be returned (e.g., no matching donors)
   */
  /**
   * Get payment totals for commitment/standing order donations
   * Returns a map of donationId -> total paid amount
   * Uses calculatePaymentTotals to filter payments by type
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getPaymentTotalsForCommitments(donationIds: string[]): Promise<Record<string, number>> {
    if (!donationIds || donationIds.length === 0) {
      return {};
    }

    // Fetch donations to know their types
    const donations = await remult.repo(Donation).find({
      where: { id: { $in: donationIds } },
      include: { donationMethod: true }
    });

    const payments = await remult.repo(Payment).find({
      where: {
        donationId: { $in: donationIds },
        isActive: true
      }
    });

    return calculatePaymentTotals(donations, payments);
  }

  private static async buildWhereClause(filters: DonationFilters): Promise<any | null> {
    // 🎯 Fetch global filters from user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    let whereClause: any = {};
    let globalDonorIds: string[] | undefined = undefined;

    // Apply global filters first
    if (globalFilters) {
      globalDonorIds = await GlobalFilterController.getDonorIds(globalFilters);

      if (globalDonorIds && globalDonorIds.length === 0) {
        return null;
      }

      // Apply campaign filter from global filters
      if (globalFilters.campaignIds && globalFilters.campaignIds.length > 0) {
        whereClause.campaignId = { $in: globalFilters.campaignIds };
      }

      // Apply date range filter from global filters
      if (globalFilters.dateFrom || globalFilters.dateTo) {
        whereClause.donationDate = {};
        if (globalFilters.dateFrom) {
          whereClause.donationDate.$gte = globalFilters.dateFrom;
        }
        if (globalFilters.dateTo) {
          whereClause.donationDate.$lte = globalFilters.dateTo;
        }
      }

      // Apply amount range filter from global filters
      if (globalFilters.amountMin !== undefined || globalFilters.amountMax !== undefined) {
        whereClause.amount = {};
        if (globalFilters.amountMin !== undefined) {
          whereClause.amount.$gte = globalFilters.amountMin;
        }
        if (globalFilters.amountMax !== undefined) {
          whereClause.amount.$lte = globalFilters.amountMax;
        }
      }
    }

    // Apply local campaign filter (overrides global if specified)
    if (filters.selectedCampaignId) {
      whereClause.campaignId = filters.selectedCampaignId;
    }

    // Apply donation method filter
    if (filters.selectedMethodId) {
      whereClause.donationMethodId = filters.selectedMethodId;
    }

    // Apply donation type filter (only in buildWhereClause, not overridden by count/sum methods)
    if (filters.selectedDonationType) {
      whereClause.donationType = filters.selectedDonationType;
    }

    // Apply local amount filter
    if (filters.amountFrom !== undefined && filters.amountFrom !== null && filters.amountFrom > 0) {
      if (whereClause.amount) {
        if (!whereClause.amount.$gte || filters.amountFrom > whereClause.amount.$gte) {
          whereClause.amount.$gte = filters.amountFrom;
        }
      } else {
        whereClause.amount = { $gte: filters.amountFrom };
      }
    }

    // Apply local date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      whereClause.donationDate = { $gte: fromDate };
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (whereClause.donationDate) {
        whereClause.donationDate = {
          ...whereClause.donationDate,
          $lte: toDate
        };
      } else {
        whereClause.donationDate = { $lte: toDate };
      }
    }

    // Apply donor filter
    if (filters.donorId) {
      whereClause.donorId = filters.donorId;
    }

    // If we have a search term, find matching donors using cross-field search
    // Each word must match at least one field (name, phone, email, address), AND between words
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const searchDonorIds = await DonorController.searchDonorIdsAcrossAllFields(filters.searchTerm, globalDonorIds);

      if (searchDonorIds.length === 0) {
        return null;
      }

      // Intersect with global filter results
      if (globalDonorIds) {
        const intersected = globalDonorIds.filter(id => searchDonorIds.includes(id));
        if (intersected.length === 0) {
          return null;
        }
        if (whereClause.donorId) {
          whereClause.donorId = { $in: [whereClause.donorId, ...intersected] };
        } else {
          whereClause.donorId = { $in: intersected };
        }
      } else {
        if (whereClause.donorId) {
          whereClause.donorId = { $in: [whereClause.donorId, ...searchDonorIds] };
        } else {
          whereClause.donorId = { $in: searchDonorIds };
        }
      }
    } else if (globalDonorIds) {
      if (whereClause.donorId) {
        // If there's already a specific donor filter, intersect it with global donor IDs
        const specificDonorId = typeof whereClause.donorId === 'string' ? whereClause.donorId : whereClause.donorId;
        if (globalDonorIds.includes(specificDonorId)) {
          whereClause.donorId = specificDonorId;
        } else {
          return null;
        }
      } else {
        whereClause.donorId = { $in: globalDonorIds };
      }
    }

    return whereClause;
  }

  /**
   * Get the next available receipt number
   * Returns the maximum receiptNumber + 1, or 1 if no receipts exist
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getNextReceiptNumber(): Promise<number> {
    const donations = await remult.repo(Donation).find({
      where: { receiptNumber: { $gt: 0 } },
      orderBy: { receiptNumber: 'desc' },
      limit: 1
    });

    if (donations.length === 0 || !donations[0].receiptNumber) {
      return 1;
    }

    return donations[0].receiptNumber + 1;
  }

  /**
   * Assign a receipt number to a donation if not already assigned
   * Returns the receipt number (existing or newly assigned)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async assignReceiptNumber(donationId: string): Promise<number> {
    const donation = await remult.repo(Donation).findId(donationId);
    if (!donation) {
      throw new Error('תרומה לא נמצאה');
    }

    // If already has a receipt number, return it
    if (donation.receiptNumber) {
      return donation.receiptNumber;
    }

    // Get next receipt number
    const nextNumber = await DonationController.getNextReceiptNumber();

    // Assign and save
    donation.receiptNumber = nextNumber;
    await donation.save();

    return nextNumber;
  }

  /**
   * Get donor names and addresses for a list of donation IDs
   * Used for printing labels and envelopes
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getAddressesForDonations(donationIds: string[]): Promise<{ donorName: string; addressLines: string[] }[]> {
    if (!donationIds || donationIds.length === 0) return [];

    // Load donations with donor relation
    const donations = await remult.repo(Donation).find({
      where: { id: { $in: donationIds } },
      include: { donor: true }
    });

    // Get unique donor IDs
    const donorIds = [...new Set(donations.map(d => d.donorId).filter(id => id))];

    // Load primary places for all donors
    const placesMap = await DonorPlace.getPrimaryForDonors(donorIds);

    // Build result - one per donation (each donation = receipt = envelope/label)
    const result: { donorName: string; addressLines: string[] }[] = [];

    for (const donation of donations) {
      if (!donation.donorId) continue;

      const donorPlace = placesMap.get(donation.donorId);
      const addressLines = donorPlace?.place?.getAddressForLetter() || [];
      const donorName = donation.donor?.getNameForLetter() || '';

      if (donorName || addressLines.length > 0) {
        result.push({ donorName, addressLines });
      }
    }

    return result;
  }

  /**
   * Count how many of the given donation IDs have attached files (scans/checks)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async countDonationsWithFiles(donationIds: string[]): Promise<number> {
    if (!donationIds || donationIds.length === 0) return 0;

    const files = await remult.repo(DonationFile).find({
      where: { donationId: { $in: donationIds } }
    });

    // Count unique donation IDs that have files
    const donationsWithFiles = new Set(files.map(f => f.donationId));
    return donationsWithFiles.size;
  }

  /**
   * Paginated campaign donations — global donor filter applied server-side (no big ID array over wire)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getCampaignDonationsPage(params: CampaignDonationsPageParams): Promise<CampaignDonationsPageResult> {
    const {
      campaignId, page, pageSize,
      filterDonorId, filterMethodId, filterType,
      sortField = 'donationDate', sortDirection = 'desc'
    } = params;

    // Resolve global donor filter server-side
    const globalDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();
    if (globalDonorIds !== undefined && globalDonorIds.length === 0) {
      return { rows: [], total: 0, paymentTotals: {}, dropdownDonors: [] };
    }

    // Build WHERE clause
    const where: any = { campaignId };
    if (globalDonorIds !== undefined) {
      where.donorId = { $in: globalDonorIds };
    }
    if (filterDonorId) {
      if (globalDonorIds === undefined || globalDonorIds.includes(filterDonorId)) {
        where.donorId = filterDonorId;
      } else {
        return { rows: [], total: 0, paymentTotals: {}, dropdownDonors: [] };
      }
    }
    if (filterMethodId) where.donationMethodId = filterMethodId;
    if (filterType) where.donationType = filterType;

    const dbSortFields = ['donationDate', 'amount', 'currencyId', 'donationType'];
    const orderBy: any = dbSortFields.includes(sortField ?? '')
      ? { [sortField!]: sortDirection }
      : { donationDate: 'desc' };

    const [total, pageDonations] = await Promise.all([
      remult.repo(Donation).count(where),
      remult.repo(Donation).find({ where, orderBy, page, limit: pageSize })
    ]);

    // Load donors + methods via Maps — avoids include and concurrent sub-queries
    const donorIds = [...new Set(pageDonations.map(d => d.donorId).filter(Boolean))];
    const methodIds = [...new Set(pageDonations.map(d => d.donationMethodId).filter(Boolean))];
    const [donors, methods] = await Promise.all([
      donorIds.length > 0 ? remult.repo(Donor).find({ where: { id: { $in: donorIds } } }) : Promise.resolve([]),
      methodIds.length > 0 ? remult.repo(DonationMethod).find({ where: { id: { $in: methodIds } } }) : Promise.resolve([])
    ]);
    const donorMap = new Map(donors.map(d => [d.id, d]));
    const methodMap = new Map(methods.map(m => [m.id, m]));

    const rows: CampaignDonationRow[] = pageDonations.map(d => {
      const donor = donorMap.get(d.donorId);
      const method = methodMap.get(d.donationMethodId);
      return {
        id: d.id,
        donationDate: d.donationDate,
        donorId: d.donorId || '',
        donorName: donor?.fullName || 'לא ידוע',
        amount: d.amount || 0,
        currencyId: d.currencyId || 'ILS',
        donationType: d.donationType || '',
        standingOrderType: d.standingOrderType || 'bank',
        unlimitedPayments: d.unlimitedPayments || false,
        frequency: d.frequency || '',
        donationMethodId: d.donationMethodId || '',
        donationMethodName: method?.name || '-',
        donationMethodType: method?.type || '',
        partnerIds: d.partnerIds || [],
        reason: d.reason || '',
        isExceptional: d.isExceptional || false,
        periodsElapsed: DonationController.computePeriodsElapsed(d)
      };
    });

    // Load payment totals inline — avoids double Donation load from getPaymentTotalsForCommitments
    const paymentTotals: Record<string, number> = {};
    const paymentBasedIds = rows
      .filter(r => r.donationType === 'commitment' || r.donationMethodType === 'standing_order')
      .map(r => r.id);
    if (paymentBasedIds.length > 0) {
      const payments = await remult.repo(Payment).find({
        where: { donationId: { $in: paymentBasedIds }, isActive: true }
      });
      for (const payment of payments) {
        if (!payment.donationId) continue;
        const row = rows.find(r => r.id === payment.donationId);
        if (!row) continue;
        const expectedType = row.donationType === 'commitment' ? 'התחייבות' : 'הו"ק';
        if (payment.type?.startsWith(expectedType)) {
          paymentTotals[payment.donationId] = (paymentTotals[payment.donationId] || 0) + payment.amount;
        }
      }
    }

    const dropdownDonors = donors
      .map(d => ({ id: d.id, firstName: d.firstName || '', lastName: d.lastName || '', fullName: d.fullName || '' }))
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'he') || a.firstName.localeCompare(b.firstName, 'he'));

    return { rows, total, paymentTotals, dropdownDonors };
  }

  private static computePeriodsElapsed(donation: Donation): number {
    if (!donation.donationDate || !donation.frequency) return 0;
    const startDate = new Date(donation.donationDate);
    const endDate = new Date();
    if (endDate < startDate) return 0;
    switch (donation.frequency) {
      case 'monthly': {
        const yearDiff = endDate.getFullYear() - startDate.getFullYear();
        const monthDiff = endDate.getMonth() - startDate.getMonth();
        const totalMonths = yearDiff * 12 + monthDiff;
        return endDate.getDate() >= startDate.getDate() ? totalMonths + 1 : totalMonths;
      }
      case 'weekly':
        return Math.floor((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      case 'quarterly': {
        const yearDiff = endDate.getFullYear() - startDate.getFullYear();
        const monthDiff = endDate.getMonth() - startDate.getMonth();
        return Math.floor((yearDiff * 12 + monthDiff) / 3) + 1;
      }
      case 'yearly': {
        const yearDiff = endDate.getFullYear() - startDate.getFullYear();
        return (endDate.getMonth() > startDate.getMonth() ||
          (endDate.getMonth() === startDate.getMonth() && endDate.getDate() >= startDate.getDate()))
          ? yearDiff + 1 : yearDiff;
      }
      default: return 0;
    }
  }
}
