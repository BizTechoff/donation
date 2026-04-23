import { Allow, BackendMethod, Controller } from 'remult';
import { remult } from 'remult';
import { Campaign } from '../entity';
import { GlobalFilters } from '../../app/services/global-filter.service';

export interface CampaignSelectionData {
  campaigns: Campaign[];
}

export interface CampaignFilters {
  searchTerm?: string;
  isActive?: boolean;
}

export interface CampaignSummary {
  activeCampaigns: number;
  totalTargetAmount: number;
  totalRaisedAmount: number;
  totalRaisedByCurrency: CurrencyTotal[];
}

export interface CurrencyTotal {
  currencyId: string;
  symbol: string;
  total: number;
}

export interface CampaignRaisedByCurrency {
  campaignId: string;
  totals: CurrencyTotal[];
}

export interface CampaignDonationTotals {
  fullDonationsCount: number;
  commitmentDonationsCount: number;
  fullDonationsByCurrency: CurrencyTotal[];
  commitmentDonationsByCurrency: CurrencyTotal[];
}

export interface BlessingBookTypeDto {
  id: string;
  type: string;
  price: number;
}

export interface BlessingBookBlessingDto {
  id: string;
  donorId: string;
  campaignId: string;
  name: string;
  blessingBookTypeId: string;
  blessingBookType?: BlessingBookTypeDto;
  blessingContent: string;
  status: string;
  amount: number;
  isEmailSent: boolean;
}

export interface BlessingBookDonationDto {
  id: string;
  donorId: string;
  campaignId: string;
  amount: number;
  currencyId: string;
  donationDate?: Date;
}

export interface BlessingBookEntryDto {
  donor: {
    id: string;
    fullName: string;
    lastAndFirstName: string;
    level: string;
    fundraiserId: string;
    contactPersonId: string;
  };
  phone: string;
  email: string;
  blessing?: BlessingBookBlessingDto;
  donation?: BlessingBookDonationDto;
  totalDonated: number;
  matchingDonationsCount: number;
  blessingStatus: 'pending' | 'sent' | 'received' | 'none';
}

export interface BlessingBookDataDto {
  blessingTypes: BlessingBookTypeDto[];
  entries: BlessingBookEntryDto[];
}

@Controller('campaign')
export class CampaignController {
  @BackendMethod({ allowed: Allow.authenticated })
  static async getCampaignsForSelection(excludeIds?: string[]): Promise<CampaignSelectionData> {
    let campaigns = await remult.repo(Campaign).find({
      orderBy: { name: 'asc' }
    });

    // Filter out excluded campaigns
    if (excludeIds && excludeIds.length > 0) {
      campaigns = campaigns.filter(campaign => !excludeIds.includes(campaign.id));
    }

    return { campaigns };
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredCampaigns(
    localFilters: CampaignFilters,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<Campaign[]> {
    // 🎯 Fetch global filters from user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    console.log('CampaignController.findFilteredCampaigns', globalFilters, localFilters);

    // Build orderBy from sortColumns or use default
    let orderBy: any = { name: 'asc' };
    if (sortColumns && sortColumns.length > 0) {
      orderBy = {};
      sortColumns.forEach(sort => {
        orderBy[sort.field] = sort.direction;
      });
    }

    const whereClause = CampaignController.buildWhereClause(globalFilters, localFilters);

    return await remult.repo(Campaign).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy,
      include: { createdBy: true },
      ...(page && pageSize ? { page, limit: pageSize } : {})
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredCampaigns(
    localFilters: CampaignFilters
  ): Promise<number> {
    // 🎯 Fetch global filters from user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    const whereClause = CampaignController.buildWhereClause(globalFilters, localFilters);
    return await remult.repo(Campaign).count(Object.keys(whereClause).length > 0 ? whereClause : undefined);
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getSummaryForFilteredCampaigns(
    localFilters: CampaignFilters
  ): Promise<CampaignSummary> {
    // 🎯 Fetch global filters from user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    const whereClause = CampaignController.buildWhereClause(globalFilters, localFilters);

    const campaigns = await remult.repo(Campaign).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

    // Get currency types for conversion
    const { PayerService } = await import('../../app/services/payer.service');
    const payerService = new PayerService();
    const currencyTypes = payerService.getCurrencyTypesRecord();

    // Get campaign IDs to calculate raised by currency
    const campaignIds = campaigns.map(c => c.id);
    let totalRaisedByCurrency: CurrencyTotal[] = [];

    if (campaignIds.length > 0) {
      const { Donation } = await import('../entity/donation');
      const { Payment } = await import('../entity/payment');
      const { calculateEffectiveAmount, calculatePaymentTotals } = await import('../utils/donation-utils');

      // Get all donations for these campaigns
      const donations = await remult.repo(Donation).find({
        where: { campaignId: { $in: campaignIds } },
        include: { donationMethod: true }
      });

      // Get all payments for these donations with type filtering
      const donationIds = donations.map(d => d.id);
      const payments = donationIds.length > 0
        ? await remult.repo(Payment).find({
            where: { donationId: { $in: donationIds }, isActive: true }
          })
        : [];

      // Create payment totals map with type filtering
      const paymentTotalsRecord = calculatePaymentTotals(donations, payments);
      const paymentTotals = new Map<string, number>(Object.entries(paymentTotalsRecord));

      // Sum by currency
      const currencyTotalsMap = new Map<string, number>();
      for (const donation of donations) {
        const effectiveAmount = calculateEffectiveAmount(donation, paymentTotals.get(donation.id));
        const currencyId = donation.currencyId || 'ILS';
        const current = currencyTotalsMap.get(currencyId) || 0;
        currencyTotalsMap.set(currencyId, current + effectiveAmount);
      }

      // Convert to array
      for (const [currencyId, total] of currencyTotalsMap) {
        const currency = currencyTypes[currencyId];
        totalRaisedByCurrency.push({
          currencyId,
          symbol: currency?.symbol || currencyId,
          total
        });
      }

      // Sort by total descending
      totalRaisedByCurrency.sort((a, b) => b.total - a.total);
    }

    // Calculate totalTargetAmount converted to ILS
    const totalTargetAmount = campaigns.reduce((sum, c) => {
      const rate = currencyTypes[c.currencyId]?.rateInShekel || 1;
      return sum + ((c.targetAmount || 0) * rate);
    }, 0);

    // Calculate totalRaisedAmount converted to ILS (sum of all currency totals)
    const totalRaisedAmount = totalRaisedByCurrency.reduce((sum, c) => {
      const rate = currencyTypes[c.currencyId]?.rateInShekel || 1;
      return sum + (c.total * rate);
    }, 0);

    return {
      activeCampaigns: campaigns.filter(c => c.isActive).length,
      totalTargetAmount,
      totalRaisedAmount,
      totalRaisedByCurrency
    };
  }

  /**
   * Get raised amounts by currency for multiple campaigns
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getRaisedAmountsByCurrency(campaignIds: string[]): Promise<CampaignRaisedByCurrency[]> {
    if (!campaignIds || campaignIds.length === 0) {
      return [];
    }

    const { Donation } = await import('../entity/donation');
    const { Payment } = await import('../entity/payment');
    const { PayerService } = await import('../../app/services/payer.service');
    const { calculateEffectiveAmount, calculatePaymentTotals } = await import('../utils/donation-utils');

    // Get all donations for these campaigns
    const donations = await remult.repo(Donation).find({
      where: { campaignId: { $in: campaignIds } },
      include: { donationMethod: true }
    });

    // Get all payments for these donations with type filtering
    const donationIds = donations.map(d => d.id);
    const payments = donationIds.length > 0
      ? await remult.repo(Payment).find({
          where: { donationId: { $in: donationIds }, isActive: true }
        })
      : [];

    // Create payment totals map with type filtering
    const paymentTotalsRecord = calculatePaymentTotals(donations, payments);
    const paymentTotals = new Map<string, number>(Object.entries(paymentTotalsRecord));

    // Get currency types
    const payerService = new PayerService();
    const currencyTypes = payerService.getCurrencyTypesRecord();

    // Group by campaign and currency
    const campaignCurrencyMap = new Map<string, Map<string, number>>();

    for (const donation of donations) {
      if (!donation.campaignId) continue;

      const effectiveAmount = calculateEffectiveAmount(donation, paymentTotals.get(donation.id));
      const currencyId = donation.currencyId || 'ILS';

      if (!campaignCurrencyMap.has(donation.campaignId)) {
        campaignCurrencyMap.set(donation.campaignId, new Map());
      }

      const currencyMap = campaignCurrencyMap.get(donation.campaignId)!;
      const current = currencyMap.get(currencyId) || 0;
      currencyMap.set(currencyId, current + effectiveAmount);
    }

    // Convert to result format
    const result: CampaignRaisedByCurrency[] = [];

    for (const campaignId of campaignIds) {
      const currencyMap = campaignCurrencyMap.get(campaignId);
      const totals: CurrencyTotal[] = [];

      if (currencyMap) {
        for (const [currencyId, total] of currencyMap) {
          const currency = currencyTypes[currencyId];
          totals.push({
            currencyId,
            symbol: currency?.symbol || currencyId,
            total
          });
        }
      }

      // Sort by total descending
      totals.sort((a, b) => b.total - a.total);

      result.push({ campaignId, totals });
    }

    return result;
  }

  /**
   * Get donation totals for a single campaign (full donations vs commitments)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getCampaignDonationTotals(
    campaignId: string,
    donorIds?: string[]
  ): Promise<CampaignDonationTotals> {
    const { Donation } = await import('../entity/donation');
    const { Payment } = await import('../entity/payment');
    const { PayerService } = await import('../../app/services/payer.service');
    const { calculateEffectiveAmount, calculatePaymentTotals } = await import('../utils/donation-utils');
    const { GlobalFilterController } = await import('./global-filter.controller');

    // Apply global donor filter when no donorIds provided — avoids passing 14k IDs over the wire
    let effectiveDonorIds = donorIds;
    if (effectiveDonorIds === undefined) {
      effectiveDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();
    }
    if (effectiveDonorIds !== undefined && effectiveDonorIds.length === 0) {
      return { fullDonationsCount: 0, commitmentDonationsCount: 0, fullDonationsByCurrency: [], commitmentDonationsByCurrency: [] };
    }

    // Build where clause
    const where: any = { campaignId };
    if (effectiveDonorIds && effectiveDonorIds.length > 0) {
      where.donorId = { $in: effectiveDonorIds };
    }

    // Get all donations for this campaign
    const donations = await remult.repo(Donation).find({
      where,
      include: { donationMethod: true }
    });

    // Get all payments for these donations with type filtering
    const donationIds = donations.map(d => d.id);
    const payments = donationIds.length > 0
      ? await remult.repo(Payment).find({
          where: { donationId: { $in: donationIds }, isActive: true }
        })
      : [];

    // Create payment totals map with type filtering
    const paymentTotalsRecord = calculatePaymentTotals(donations, payments);
    const paymentTotals = new Map<string, number>(Object.entries(paymentTotalsRecord));

    // Get currency types
    const payerService = new PayerService();
    const currencyTypes = payerService.getCurrencyTypesRecord();

    // Separate full donations from commitments
    const fullByCurrency: Record<string, number> = {};
    const commitmentByCurrency: Record<string, number> = {};
    let fullDonationsCount = 0;
    let commitmentDonationsCount = 0;

    for (const donation of donations) {
      const currencyId = donation.currencyId || 'ILS';
      const effectiveAmount = calculateEffectiveAmount(donation, paymentTotals.get(donation.id));

      if (donation.donationType === 'commitment') {
        commitmentDonationsCount++;
        commitmentByCurrency[currencyId] = (commitmentByCurrency[currencyId] || 0) + effectiveAmount;
      } else {
        fullDonationsCount++;
        fullByCurrency[currencyId] = (fullByCurrency[currencyId] || 0) + effectiveAmount;
      }
    }

    // Convert to arrays
    const fullDonationsByCurrency: CurrencyTotal[] = Object.entries(fullByCurrency).map(([currencyId, total]) => ({
      currencyId,
      symbol: currencyTypes[currencyId]?.symbol || currencyId,
      total
    }));

    const commitmentDonationsByCurrency: CurrencyTotal[] = Object.entries(commitmentByCurrency).map(([currencyId, total]) => ({
      currencyId,
      symbol: currencyTypes[currencyId]?.symbol || currencyId,
      total
    }));

    // Sort by total descending
    fullDonationsByCurrency.sort((a, b) => b.total - a.total);
    commitmentDonationsByCurrency.sort((a, b) => b.total - a.total);

    return {
      fullDonationsCount,
      commitmentDonationsCount,
      fullDonationsByCurrency,
      commitmentDonationsByCurrency
    };
  }

  /**
   * Single-call blessing book loader — resolves donors, blessings, contacts, and donations
   * server-side without include (avoids concurrent sub-query problem).
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getBlessingBookData(campaignId: string): Promise<BlessingBookDataDto> {
    const { Campaign } = await import('../entity/campaign');
    const { Donor } = await import('../entity/donor');
    const { Blessing } = await import('../entity/blessing');
    const { BlessingBookType } = await import('../entity/blessing-book-type');
    const { DonorContact } = await import('../entity/donor-contact');
    const { Donation } = await import('../entity/donation');

    const [campaign, blessingTypes] = await Promise.all([
      remult.repo(Campaign).findId(campaignId),
      remult.repo(BlessingBookType).find({ where: { isActive: true }, orderBy: { price: 'asc' } })
    ]);
    if (!campaign) return { blessingTypes: [], entries: [] };

    const blessingTypesDtos: BlessingBookTypeDto[] = blessingTypes.map(bt => ({ id: bt.id, type: bt.type, price: bt.price }));
    const blessingTypeMap = new Map(blessingTypesDtos.map(bt => [bt.id, bt]));

    const donorIds = await CampaignController.resolveBlessingBookDonorIds(campaign);
    if (donorIds.length === 0) return { blessingTypes: blessingTypesDtos, entries: [] };

    const [donors, blessings, contacts, campaignDonations] = await Promise.all([
      remult.repo(Donor).find({ where: { id: { $in: donorIds }, isActive: true } }),
      remult.repo(Blessing).find({ where: { campaignId, donorId: { $in: donorIds } } }),
      remult.repo(DonorContact).find({ where: { donorId: { $in: donorIds }, isPrimary: true, isActive: true } }),
      remult.repo(Donation).find({ where: { campaignId, donorId: { $in: donorIds } }, orderBy: { donationDate: 'desc' } })
    ]);

    // Build blessing map (one per donor, blessingBookType attached from already-loaded types)
    const blessingByDonor = new Map<string, BlessingBookBlessingDto>();
    for (const b of blessings) {
      blessingByDonor.set(b.donorId, {
        id: b.id, donorId: b.donorId, campaignId: b.campaignId,
        name: b.name, blessingBookTypeId: b.blessingBookTypeId,
        blessingBookType: blessingTypeMap.get(b.blessingBookTypeId),
        blessingContent: b.blessingContent, status: b.status,
        amount: b.amount, isEmailSent: b.isEmailSent
      });
    }

    // Build contact maps (primary only)
    const phoneMap = new Map<string, string>();
    const emailMap = new Map<string, string>();
    for (const c of contacts) {
      if (c.donorId && c.type === 'phone' && c.phoneNumber && !phoneMap.has(c.donorId)) {
        phoneMap.set(c.donorId, c.phoneNumber);
      } else if (c.donorId && c.type === 'email' && c.email && !emailMap.has(c.donorId)) {
        emailMap.set(c.donorId, c.email);
      }
    }

    // Group donations by donor
    const donationsByDonor = new Map<string, typeof campaignDonations>();
    for (const d of campaignDonations) {
      if (!d.donorId) continue;
      const list = donationsByDonor.get(d.donorId) ?? [];
      if (!donationsByDonor.has(d.donorId)) donationsByDonor.set(d.donorId, list);
      list.push(d);
    }

    const toDonationDto = (d: typeof campaignDonations[0]): BlessingBookDonationDto => ({
      id: d.id, donorId: d.donorId, campaignId: d.campaignId || '',
      amount: d.amount || 0, currencyId: d.currencyId || 'ILS', donationDate: d.donationDate
    });

    const entries: BlessingBookEntryDto[] = donors.map(donor => {
      const blessing = blessingByDonor.get(donor.id);
      const donorDonations = donationsByDonor.get(donor.id) || [];
      const totalDonated = donorDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

      let matchingDonationsCount = 0;
      let matchingDonation: BlessingBookDonationDto | undefined;
      if (blessing?.blessingBookType) {
        for (const d of donorDonations) {
          if (d.amount === blessing.blessingBookType.price) {
            matchingDonationsCount++;
            if (!matchingDonation) matchingDonation = toDonationDto(d);
          }
        }
      }
      const firstDonation = matchingDonation ?? (donorDonations[0] ? toDonationDto(donorDonations[0]) : undefined);

      return {
        donor: {
          id: donor.id, fullName: donor.fullName || '', lastAndFirstName: donor.lastAndFirstName || '',
          level: donor.level || '', fundraiserId: donor.fundraiserId || '', contactPersonId: donor.contactPersonId || ''
        },
        phone: phoneMap.get(donor.id) || '',
        email: emailMap.get(donor.id) || '',
        blessing, donation: firstDonation,
        totalDonated, matchingDonationsCount,
        blessingStatus: CampaignController.computeBlessingStatus(blessing)
      };
    });

    return { blessingTypes: blessingTypesDtos, entries };
  }

  private static async resolveBlessingBookDonorIds(campaign: Campaign): Promise<string[]> {
    const { GlobalFilterController } = await import('./global-filter.controller');
    const globalDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();
    const invitedIds: string[] = campaign.invitedDonorIds ?? [];

    if (invitedIds.length > 0) {
      if (globalDonorIds === undefined) return invitedIds;
      if (globalDonorIds.length === 0) return [];
      const globalSet = new Set(globalDonorIds);
      return invitedIds.filter(id => globalSet.has(id));
    }

    // No invited list — use donors who donated to this campaign
    const { Donation } = await import('../entity/donation');
    const where: any = { campaignId: campaign.id };
    if (globalDonorIds !== undefined) {
      if (globalDonorIds.length === 0) return [];
      where.donorId = { $in: globalDonorIds };
    }
    const donations = await remult.repo(Donation).find({ where, limit: 100000 });
    return [...new Set(donations.map(d => d.donorId).filter(Boolean))];
  }

  private static computeBlessingStatus(blessing?: BlessingBookBlessingDto): 'pending' | 'sent' | 'received' | 'none' {
    if (!blessing) return 'none';
    if (!blessing.blessingContent || blessing.blessingContent.trim() === '') return 'pending';
    if (blessing.status === 'מאושר') return 'received';
    if (blessing.status === 'בטיפול') return 'sent';
    return 'pending';
  }

  /**
   * Build where clause for filtering campaigns
   */
  private static buildWhereClause(globalFilters: GlobalFilters | undefined, localFilters: CampaignFilters): any {
    const whereClause: any = {};

    // Apply local filters
    if (localFilters.searchTerm && localFilters.searchTerm.trim()) {
      const search = localFilters.searchTerm.trim();
      whereClause.$or = [
        { name: { $contains: search } },
        { description: { $contains: search } }
      ];
    }

    if (localFilters.isActive !== undefined) {
      whereClause.isActive = localFilters.isActive;
    }

    // Apply global date filter if provided
    if (globalFilters && (globalFilters.dateFrom || globalFilters.dateTo)) {
      whereClause.startDate = {};
      if (globalFilters.dateFrom) {
        whereClause.startDate.$gte = globalFilters.dateFrom;
      }
      if (globalFilters.dateTo) {
        whereClause.startDate.$lte = globalFilters.dateTo;
      }
    }

    return whereClause;
  }
}
