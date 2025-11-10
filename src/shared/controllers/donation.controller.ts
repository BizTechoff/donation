import { Allow, BackendMethod, remult } from 'remult';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { Bank } from '../entity/bank';
import { Campaign } from '../entity/campaign';
import { Company } from '../entity/company';
import { Donation } from '../entity/donation';
import { DonationBank } from '../entity/donation-bank';
import { DonationMethod } from '../entity/donation-method';
import { DonationOrganization } from '../entity/donation-organization';
import { Donor } from '../entity/donor';
import { Organization } from '../entity/organization';
import { Place } from '../entity/place';
import { DonorPlace } from '../entity/donor-place';
import { TargetAudience } from '../entity/target-audience';

export interface DonationFilters {
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  selectedMethodId?: string;
  amountFrom?: number;
  selectedCampaignId?: string;
  donorId?: string;
  globalFilters?: GlobalFilters; // Add global filters support
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

export interface DonationSelectionData {
  donations: Donation[];
  donorMap: Record<string, Donor>;
  campaignMap: Record<string, Campaign>;
}

export class DonationController {

  /**
   * Helper method to get donor IDs that match global filters
   */
  private static async getDonorIdsFromGlobalFilters(globalFilters: GlobalFilters): Promise<string[] | undefined> {
    let donorIds: string[] | undefined = undefined;

    // Apply place-based filters (country, city, neighborhood)
    if (globalFilters.countryIds?.length || globalFilters.cityIds?.length || globalFilters.neighborhoodIds?.length) {
      const placeWhere: any = {};

      if (globalFilters.countryIds && globalFilters.countryIds.length > 0) {
        placeWhere.countryId = { $in: globalFilters.countryIds };
      }

      if (globalFilters.cityIds && globalFilters.cityIds.length > 0) {
        placeWhere.city = { $in: globalFilters.cityIds };
      }

      if (globalFilters.neighborhoodIds && globalFilters.neighborhoodIds.length > 0) {
        placeWhere.neighborhood = { $in: globalFilters.neighborhoodIds };
      }

      const matchingPlaces = await remult.repo(Place).find({ where: placeWhere });
      const matchingPlaceIds = matchingPlaces.map(p => p.id);

      if (matchingPlaceIds.length === 0) {
        return []; // No matching places - return empty array to indicate no results
      }

      const donorPlaces = await remult.repo(DonorPlace).find({
        where: {
          placeId: { $in: matchingPlaceIds },
          isActive: true
        }
      });

      donorIds = [...new Set(donorPlaces.map(dp => dp.donorId).filter((id): id is string => !!id))];

      if (donorIds.length === 0) {
        return [];
      }
    }

    // Apply target audience filter
    if (globalFilters.targetAudienceIds && globalFilters.targetAudienceIds.length > 0) {
      const targetAudiences = await remult.repo(TargetAudience).find({
        where: { id: { $in: globalFilters.targetAudienceIds } }
      });

      const audienceDonorIds = [
        ...new Set(
          targetAudiences.flatMap(ta => ta.donorIds || [])
        )
      ];

      if (donorIds) {
        donorIds = donorIds.filter(id => audienceDonorIds.includes(id));
      } else {
        donorIds = audienceDonorIds;
      }

      if (donorIds.length === 0) {
        return [];
      }
    }

    return donorIds;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonationsForSelection(excludeIds?: string[]): Promise<DonationSelectionData> {
    let donations = await remult.repo(Donation).find({
      orderBy: { donationDate: 'desc' },
      limit: 500 // Limit to most recent 500 donations for performance
    });

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
    console.log('DonationController.findFilteredDonations', JSON.stringify(filters, null, 2));
    let whereClause: any = {};
    let globalDonorIds: string[] | undefined = undefined;

    // Apply global filters first
    if (filters.globalFilters) {
      console.log('Applying global filters...');
      // Get donor IDs from global filters (location + target audience)
      globalDonorIds = await DonationController.getDonorIdsFromGlobalFilters(filters.globalFilters);
      console.log(`Found ${globalDonorIds?.length || 0} donors matching global filters`);

      if (globalDonorIds && globalDonorIds.length === 0) {
        console.log('No matching donors from global filters, returning empty array');
        return []; // No matching donors from global filters
      }

      // Apply campaign filter from global filters
      if (filters.globalFilters.campaignIds && filters.globalFilters.campaignIds.length > 0) {
        whereClause.campaignId = { $in: filters.globalFilters.campaignIds };
      }

      // Apply date range filter from global filters
      if (filters.globalFilters.dateFrom || filters.globalFilters.dateTo) {
        whereClause.donationDate = {};
        if (filters.globalFilters.dateFrom) {
          whereClause.donationDate.$gte = filters.globalFilters.dateFrom;
        }
        if (filters.globalFilters.dateTo) {
          whereClause.donationDate.$lte = filters.globalFilters.dateTo;
        }
      }

      // Apply amount range filter from global filters
      if (filters.globalFilters.amountMin !== undefined || filters.globalFilters.amountMax !== undefined) {
        whereClause.amount = {};
        if (filters.globalFilters.amountMin !== undefined) {
          whereClause.amount.$gte = filters.globalFilters.amountMin;
        }
        if (filters.globalFilters.amountMax !== undefined) {
          whereClause.amount.$lte = filters.globalFilters.amountMax;
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

      const searchDonorIds = matchingDonors.map(d => d.id);

      if (searchDonorIds.length === 0) {
        // No matching donors found
        return [];
      }

      // Intersect search results with global filter results
      if (globalDonorIds) {
        const intersected = globalDonorIds.filter(id => searchDonorIds.includes(id));
        if (intersected.length === 0) {
          return [];
        }
        // Add donor filter to where clause
        if (whereClause.donorId) {
          whereClause.donorId = { $in: [whereClause.donorId, ...intersected] };
        } else {
          whereClause.donorId = { $in: intersected };
        }
      } else {
        // No global filters, just use search results
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

    return donations;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredDonations(filters: DonationFilters): Promise<number> {
    let whereClause: any = {};
    let globalDonorIds: string[] | undefined = undefined;

    // Apply global filters first
    if (filters.globalFilters) {
      globalDonorIds = await DonationController.getDonorIdsFromGlobalFilters(filters.globalFilters);

      if (globalDonorIds && globalDonorIds.length === 0) {
        return 0;
      }

      // Apply campaign filter from global filters
      if (filters.globalFilters.campaignIds && filters.globalFilters.campaignIds.length > 0) {
        whereClause.campaignId = { $in: filters.globalFilters.campaignIds };
      }

      // Apply date range filter from global filters
      if (filters.globalFilters.dateFrom || filters.globalFilters.dateTo) {
        whereClause.donationDate = {};
        if (filters.globalFilters.dateFrom) {
          whereClause.donationDate.$gte = filters.globalFilters.dateFrom;
        }
        if (filters.globalFilters.dateTo) {
          whereClause.donationDate.$lte = filters.globalFilters.dateTo;
        }
      }

      // Apply amount range filter from global filters
      if (filters.globalFilters.amountMin !== undefined || filters.globalFilters.amountMax !== undefined) {
        whereClause.amount = {};
        if (filters.globalFilters.amountMin !== undefined) {
          whereClause.amount.$gte = filters.globalFilters.amountMin;
        }
        if (filters.globalFilters.amountMax !== undefined) {
          whereClause.amount.$lte = filters.globalFilters.amountMax;
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

    // If we have a search term, find matching donors
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

      const searchDonorIds = matchingDonors.map(d => d.id);

      if (searchDonorIds.length === 0) {
        return 0;
      }

      // Intersect with global filter results
      if (globalDonorIds) {
        const intersected = globalDonorIds.filter(id => searchDonorIds.includes(id));
        if (intersected.length === 0) {
          return 0;
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
          return 0;
        }
      } else {
        whereClause.donorId = { $in: globalDonorIds };
      }
    }

    const count = await remult.repo(Donation).count(
      Object.keys(whereClause).length > 0 ? whereClause : undefined
    );

    return count;
  }
}
