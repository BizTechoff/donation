import { Allow, BackendMethod, Controller } from 'remult';
import { remult } from 'remult';
import { DonorGift } from '../entity';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { GlobalFilterController } from './global-filter.controller';
import { DonorController } from './donor.controller';
import { buildOrderBy } from '../utils/table-query'

export interface DonorGiftFilters {
  searchDonorName?: string;
  selectedDonorId?: string;
  selectedGiftId?: string;
  selectedYear?: string;
}

@Controller('donor-gift')
export class DonorGiftController {

  /**
   * The WHERE clause for donor gifts, built in ONE place.
   *
   * This block used to be copied three times - once for the page, once for the
   * count and once for the stats - and all three copies carried the same
   * defect: the donor search REPLACED whatever donor restriction was already
   * in force instead of narrowing it. Picking a specific donor in "בחר תורם"
   * and also typing in the search box silently dropped the chosen donor and
   * returned every donor matching the text. Copies drift; one builder cannot.
   *
   * Returns null when the filters can match nothing at all, so each caller
   * returns its own kind of empty result (a list, a zero, a pair of zeros)
   * without duplicating the reasoning.
   */
  private static async buildWhereClause(
    localFilters: DonorGiftFilters,
    globalFilterDonorIds: string[] | undefined,
    globalFilters: GlobalFilters | undefined
  ): Promise<any | null> {
    const whereClause: any = {};

    // Global donor filter. undefined = no filter, [] = a filter no donor meets.
    if (globalFilterDonorIds !== undefined) {
      if (globalFilterDonorIds.length === 0) return null;
      whereClause.donorId = { $in: globalFilterDonorIds };
    }

    // A specific donor NARROWS the global set - it does not escape it. Asking
    // for a donor the global filter excludes is a contradiction, not a widening.
    if (localFilters.selectedDonorId) {
      if (globalFilterDonorIds !== undefined && !globalFilterDonorIds.includes(localFilters.selectedDonorId)) {
        return null;
      }
      whereClause.donorId = localFilters.selectedDonorId;
    }

    if (localFilters.selectedGiftId) {
      whereClause.giftId = localFilters.selectedGiftId;
    }

    // Global date filter (on deliveryDate)
    if (globalFilters && (globalFilters.dateFrom || globalFilters.dateTo)) {
      whereClause.deliveryDate = {};
      if (globalFilters.dateFrom) whereClause.deliveryDate.$gte = globalFilters.dateFrom;
      if (globalFilters.dateTo) whereClause.deliveryDate.$lte = globalFilters.dateTo;
    }

    // A chosen year deliberately replaces the global date filter.
    if (localFilters.selectedYear) {
      const yearNum = parseInt(localFilters.selectedYear);
      whereClause.deliveryDate = {
        $gte: new Date(yearNum, 0, 1),
        $lte: new Date(yearNum, 11, 31, 23, 59, 59)
      };
    }

    // Cross-field donor search, restricted to the donor set already in force -
    // the specific donor if one was chosen, otherwise the global set.
    if (localFilters.searchDonorName && localFilters.searchDonorName.trim()) {
      const restrictTo: string[] | undefined =
        typeof whereClause.donorId === 'string' ? [whereClause.donorId]
          : whereClause.donorId?.$in ?? globalFilterDonorIds;

      const searchDonorIds = await DonorController.searchDonorIdsAcrossAllFields(
        localFilters.searchDonorName,
        restrictTo
      );
      if (searchDonorIds.length === 0) return null;
      whereClause.donorId = { $in: searchDonorIds };
    }

    return whereClause;
  }

  /** The global filters saved on the current user, or undefined. */
  private static async loadGlobalFilters(): Promise<GlobalFilters | undefined> {
    const currentUserId = remult.user?.id;
    if (!currentUserId) return undefined;
    const { User } = await import('../entity/user');
    const user = await remult.repo(User).findId(currentUserId);
    return user?.settings?.globalFilters;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredDonorGifts(
    localFilters: DonorGiftFilters,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<DonorGift[]> {
    // 🎯 Fetch global filters using GlobalFilterController
    const globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

    const globalFilters = await DonorGiftController.loadGlobalFilters();

    console.log('DonorGiftController.findFilteredDonorGifts', globalFilterDonorIds, localFilters);

    // O1 - ordering goes through the shared builder. 'donor' and 'gift' map to
    // the sqlExpression fields on DonorGift; the old code asked for the related
    // paths 'donor.lastName' / 'gift.name', which remult drops without a word,
    // which is why sorting by those two columns did nothing.
    const orderBy = buildOrderBy(
      sortColumns,
      { deliveryDate: 'desc' },
      { donor: 'donorName', gift: 'giftName' }
    );

    const whereClause = await DonorGiftController.buildWhereClause(
      localFilters, globalFilterDonorIds, globalFilters
    );
    if (whereClause === null) return [];

    // Get all donor gifts
    const allDonorGifts = await remult.repo(DonorGift).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy,
      include: {
        donor: true,
        gift: true
      }
    });

    // Apply pagination
    if (page && pageSize) {
      const startIndex = (page - 1) * pageSize;
      return allDonorGifts.slice(startIndex, startIndex + pageSize);
    }

    return allDonorGifts;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredDonorGifts(
    localFilters: DonorGiftFilters
  ): Promise<number> {
    // 🎯 Fetch global filters using GlobalFilterController
    const globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

    const globalFilters = await DonorGiftController.loadGlobalFilters();

    const whereClause = await DonorGiftController.buildWhereClause(
      localFilters, globalFilterDonorIds, globalFilters
    );
    if (whereClause === null) return 0;

    return await remult.repo(DonorGift).count(Object.keys(whereClause).length > 0 ? whereClause : undefined);
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getStats(
    localFilters: DonorGiftFilters
  ): Promise<{ deliveredCount: number; pendingCount: number }> {
    // 🎯 Fetch global filters using GlobalFilterController
    const globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

    const globalFilters = await DonorGiftController.loadGlobalFilters();

    const whereClause = await DonorGiftController.buildWhereClause(
      localFilters, globalFilterDonorIds, globalFilters
    );
    if (whereClause === null) return { deliveredCount: 0, pendingCount: 0 };

    // Get all donor gifts with filters
    const allDonorGifts = await remult.repo(DonorGift).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

    const deliveredCount = allDonorGifts.filter(dg => dg.isDelivered).length;
    const pendingCount = allDonorGifts.filter(dg => !dg.isDelivered).length;

    return { deliveredCount, pendingCount };
  }
}
