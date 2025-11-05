import { Allow, BackendMethod, remult } from 'remult';
import { Bank } from '../entity/bank';
import { Campaign } from '../entity/campaign';
import { Company } from '../entity/company';
import { Donation } from '../entity/donation';
import { DonationBank } from '../entity/donation-bank';
import { DonationMethod } from '../entity/donation-method';
import { DonationOrganization } from '../entity/donation-organization';
import { Donor } from '../entity/donor';
import { Organization } from '../entity/organization';

export interface DonationFilters {
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  selectedMethodId?: string;
  amountFrom?: number;
  selectedCampaignId?: string;
  donorId?: string;
}

export interface DonationDetailsData {
  donation: Donation | null | undefined;
  donors: Donor[];
  campaigns: Campaign[];
  donationMethods: DonationMethod[];
  availablePartners: Donor[];
  organizations: Organization[];
  banks: Bank[];
  payerCompanies: Company[];
  donationBanks: DonationBank[];
  donationOrganizations: DonationOrganization[];
}

export class DonationController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonationDetailsData(donationId: string, donorId?: string): Promise<DonationDetailsData> {
    // Load donation (or null for new)
    const donation = donationId !== 'new' ? await remult.repo(Donation).findId(donationId, {
      include: { donor: true }
    }) : null;

    // Determine which donorId to use for loading companies
    const effectiveDonorId = donation?.donorId || donorId;

    // Load all reference data in parallel
    const [
      donors,
      campaigns,
      donationMethods,
      availablePartners,
      organizations,
      banks
    ] = await Promise.all([
      remult.repo(Donor).find({
        where: { isActive: true },
        orderBy: { firstName: 'asc' }
      }),
      remult.repo(Campaign).find({
        orderBy: { name: 'asc' }
      }),
      remult.repo(DonationMethod).find({
        orderBy: { name: 'asc' }
      }),
      remult.repo(Donor).find({
        where: { isActive: true },
        orderBy: { firstName: 'asc' }
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

    // Load payer companies if we have a donorId
    let payerCompanies: Company[] = [];
    if (effectiveDonorId) {
      const donor = await remult.repo(Donor).findId(effectiveDonorId);
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

    if (donation?.id) {
      [donationBanks, donationOrganizations] = await Promise.all([
        remult.repo(DonationBank).find({
          where: { donationId: donation.id, isActive: true },
          include: { bank: true },
          orderBy: { createdDate: 'asc' }
        }),
        remult.repo(DonationOrganization).find({
          where: { donationId: donation.id, isActive: true },
          include: { organization: true },
          orderBy: { createdDate: 'asc' }
        })
      ]);
    }

    return {
      donation,
      donors,
      campaigns,
      donationMethods,
      availablePartners,
      organizations,
      banks,
      payerCompanies,
      donationBanks,
      donationOrganizations
    };
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredDonations(
    filters: DonationFilters,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<Donation[]> {
    let whereClause: any = {};

    // Apply campaign filter
    if (filters.selectedCampaignId) {
      whereClause.campaignId = filters.selectedCampaignId;
    }

    // Apply donation method filter
    if (filters.selectedMethodId) {
      whereClause.donationMethodId = filters.selectedMethodId;
    }

    // Apply amount filter (amount >= amountFrom)
    if (filters.amountFrom !== undefined && filters.amountFrom !== null && filters.amountFrom > 0) {
      whereClause.amount = { $gte: filters.amountFrom };
    }

    // Apply date range filter
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

    // Build orderBy from sortColumns or use default
    let orderBy: any = { donationDate: 'desc' as 'desc' }; // Default sort
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
            orderBy.currency = sort.direction;
            break;
          case 'donationDate':
            orderBy.donationDate = sort.direction;
            break;
          // Note: donorName, address, meth
          // od, campaign, fundraiser sorting would require joins and are done client-side
          default:
            console.log('DonationController: Unsupported sort field for server-side:', fieldName);
            break;
        }
      });
    }

    // If we have a search term, we need to find matching donors first
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const searchLower = filters.searchTerm.toLowerCase().trim();

      const matchingDonors = await remult.repo(Donor).find({
        where: {
          $or: [
            { firstName: { $contains: searchLower } },
            { lastName: { $contains: searchLower } }
          ]
        }
      });

      const donorIds = matchingDonors.map(d => d.id);

      if (donorIds.length === 0) {
        // No matching donors found
        return [];
      }

      // Add donor filter to where clause
      if (whereClause.donorId) {
        // If there's already a specific donor filter, merge with search results
        whereClause.donorId = { $in: [whereClause.donorId, ...donorIds] };
      } else {
        whereClause.donorId = { $in: donorIds };
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

    return donations;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredDonations(filters: DonationFilters): Promise<number> {
    let whereClause: any = {};

    // Apply campaign filter
    if (filters.selectedCampaignId) {
      whereClause.campaignId = filters.selectedCampaignId;
    }

    // Apply donation method filter
    if (filters.selectedMethodId) {
      whereClause.donationMethodId = filters.selectedMethodId;
    }

    // Apply amount filter (amount >= amountFrom)
    if (filters.amountFrom !== undefined && filters.amountFrom !== null && filters.amountFrom > 0) {
      whereClause.amount = { $gte: filters.amountFrom };
    }

    // Apply date range filter
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

    // If we have a search term, we need to find matching donors first
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      const matchingDonors = await remult.repo(Donor).find({
        where: {
          $or: [
            { firstName: { $contains: searchLower } },
            { lastName: { $contains: searchLower } }
          ]
        }
      });

      const donorIds = matchingDonors.map(d => d.id);

      if (donorIds.length === 0) {
        return 0;
      }

      // Add donor filter to where clause
      if (whereClause.donorId) {
        whereClause.donorId = { $in: [whereClause.donorId, ...donorIds] };
      } else {
        whereClause.donorId = { $in: donorIds };
      }
    }

    const count = await remult.repo(Donation).count(
      Object.keys(whereClause).length > 0 ? whereClause : undefined
    );

    return count;
  }
}
