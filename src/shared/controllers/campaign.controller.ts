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
    globalFilters: GlobalFilters,
    localFilters: CampaignFilters,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<Campaign[]> {
    console.log('CampaignController.findFilteredCampaigns', globalFilters, localFilters);

    // Build orderBy from sortColumns or use default
    let orderBy: any = { name: 'asc' };
    if (sortColumns && sortColumns.length > 0) {
      orderBy = {};
      sortColumns.forEach(sort => {
        orderBy[sort.field] = sort.direction;
      });
    }

    // Build where clause
    let whereClause: any = {};

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
    if (globalFilters.dateFrom || globalFilters.dateTo) {
      whereClause.startDate = {};
      if (globalFilters.dateFrom) {
        whereClause.startDate.$gte = globalFilters.dateFrom;
      }
      if (globalFilters.dateTo) {
        whereClause.startDate.$lte = globalFilters.dateTo;
      }
    }

    return await remult.repo(Campaign).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy,
      include: { createdBy: true },
      ...(page && pageSize ? { page, limit: pageSize } : {})
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredCampaigns(
    globalFilters: GlobalFilters,
    localFilters: CampaignFilters
  ): Promise<number> {
    // Build where clause
    let whereClause: any = {};

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
    if (globalFilters.dateFrom || globalFilters.dateTo) {
      whereClause.startDate = {};
      if (globalFilters.dateFrom) {
        whereClause.startDate.$gte = globalFilters.dateFrom;
      }
      if (globalFilters.dateTo) {
        whereClause.startDate.$lte = globalFilters.dateTo;
      }
    }

    return await remult.repo(Campaign).count(Object.keys(whereClause).length > 0 ? whereClause : undefined);
  }
}
