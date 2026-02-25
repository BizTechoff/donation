import { Allow, BackendMethod, Controller } from 'remult';
import { remult } from 'remult';
import { DonorGift } from '../entity';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { GlobalFilterController } from './global-filter.controller';
import { DonorController } from './donor.controller';

export interface DonorGiftFilters {
  searchDonorName?: string;
  selectedDonorId?: string;
  selectedGiftId?: string;
  selectedYear?: string;
}

@Controller('donor-gift')
export class DonorGiftController {
  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredDonorGifts(
    localFilters: DonorGiftFilters,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<DonorGift[]> {
    // 🎯 Fetch global filters using GlobalFilterController
    const globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

    // Get global filters for date filtering
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    console.log('DonorGiftController.findFilteredDonorGifts', globalFilterDonorIds, localFilters);

    // Build orderBy from sortColumns or use default
    let orderBy: any = { deliveryDate: 'desc' };
    if (sortColumns && sortColumns.length > 0) {
      orderBy = {};
      sortColumns.forEach(sort => {
        if (sort.field === 'donor') {
          orderBy['donor.lastName'] = sort.direction;
        } else if (sort.field === 'gift') {
          orderBy['gift.name'] = sort.direction;
        } else {
          orderBy[sort.field] = sort.direction;
        }
      });
    }

    // Build where clause
    let whereClause: any = {};

    // Apply global filters - get filtered donor IDs
    // undefined = אין פילטר, [] = יש פילטר אבל אף תורם לא עונה לו
    if (globalFilterDonorIds !== undefined) {
      if (globalFilterDonorIds.length === 0) {
        return []; // No matching donors, return empty donor gifts
      }
      // Filter donor gifts by donor IDs
      whereClause.donorId = { $in: globalFilterDonorIds };
    }

    // Apply local filters
    if (localFilters.selectedDonorId) {
      whereClause.donorId = localFilters.selectedDonorId;
    }

    if (localFilters.selectedGiftId) {
      whereClause.giftId = localFilters.selectedGiftId;
    }

    // Apply global date filter if provided (on deliveryDate)
    if (globalFilters && (globalFilters.dateFrom || globalFilters.dateTo)) {
      whereClause.deliveryDate = {};
      if (globalFilters.dateFrom) {
        whereClause.deliveryDate.$gte = globalFilters.dateFrom;
      }
      if (globalFilters.dateTo) {
        whereClause.deliveryDate.$lte = globalFilters.dateTo;
      }
    }

    // Filter by year if provided (overrides global date filter)
    if (localFilters.selectedYear) {
      const yearNum = parseInt(localFilters.selectedYear);
      const yearStart = new Date(yearNum, 0, 1);
      const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);
      whereClause.deliveryDate = {
        $gte: yearStart,
        $lte: yearEnd
      };
    }

    // Apply search filter - cross-field search (name, phone, email, address)
    if (localFilters.searchDonorName && localFilters.searchDonorName.trim()) {
      const searchDonorIds = await DonorController.searchDonorIdsAcrossAllFields(
        localFilters.searchDonorName,
        globalFilterDonorIds
      );
      if (searchDonorIds.length === 0) {
        return [];
      }
      whereClause.donorId = { $in: searchDonorIds };
    }

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

    // Get global filters for date filtering
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    // Build where clause
    let whereClause: any = {};

    // Apply global filters - get filtered donor IDs
    // undefined = אין פילטר, [] = יש פילטר אבל אף תורם לא עונה לו
    if (globalFilterDonorIds !== undefined) {
      if (globalFilterDonorIds.length === 0) {
        return 0; // No matching donors, return 0 count
      }
      // Filter donor gifts by donor IDs
      whereClause.donorId = { $in: globalFilterDonorIds };
    }

    // Apply local filters
    if (localFilters.selectedDonorId) {
      whereClause.donorId = localFilters.selectedDonorId;
    }

    if (localFilters.selectedGiftId) {
      whereClause.giftId = localFilters.selectedGiftId;
    }

    // Apply global date filter if provided (on deliveryDate)
    if (globalFilters && (globalFilters.dateFrom || globalFilters.dateTo)) {
      whereClause.deliveryDate = {};
      if (globalFilters.dateFrom) {
        whereClause.deliveryDate.$gte = globalFilters.dateFrom;
      }
      if (globalFilters.dateTo) {
        whereClause.deliveryDate.$lte = globalFilters.dateTo;
      }
    }

    // Filter by year if provided (overrides global date filter)
    if (localFilters.selectedYear) {
      const yearNum = parseInt(localFilters.selectedYear);
      const yearStart = new Date(yearNum, 0, 1);
      const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);
      whereClause.deliveryDate = {
        $gte: yearStart,
        $lte: yearEnd
      };
    }

    // Apply search filter - cross-field search (name, phone, email, address)
    if (localFilters.searchDonorName && localFilters.searchDonorName.trim()) {
      const searchDonorIds = await DonorController.searchDonorIdsAcrossAllFields(
        localFilters.searchDonorName,
        globalFilterDonorIds
      );
      if (searchDonorIds.length === 0) {
        return 0;
      }
      whereClause.donorId = { $in: searchDonorIds };
    }

    return await remult.repo(DonorGift).count(Object.keys(whereClause).length > 0 ? whereClause : undefined);
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getStats(
    localFilters: DonorGiftFilters
  ): Promise<{ deliveredCount: number; pendingCount: number }> {
    // 🎯 Fetch global filters using GlobalFilterController
    const globalFilterDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

    // Get global filters for date filtering
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    // Build where clause
    let whereClause: any = {};

    // Apply global filters - get filtered donor IDs
    // undefined = אין פילטר, [] = יש פילטר אבל אף תורם לא עונה לו
    if (globalFilterDonorIds !== undefined) {
      if (globalFilterDonorIds.length === 0) {
        return { deliveredCount: 0, pendingCount: 0 }; // No matching donors
      }
      // Filter donor gifts by donor IDs
      whereClause.donorId = { $in: globalFilterDonorIds };
    }

    // Apply local filters
    if (localFilters.selectedDonorId) {
      whereClause.donorId = localFilters.selectedDonorId;
    }

    if (localFilters.selectedGiftId) {
      whereClause.giftId = localFilters.selectedGiftId;
    }

    // Apply global date filter if provided (on deliveryDate)
    if (globalFilters && (globalFilters.dateFrom || globalFilters.dateTo)) {
      whereClause.deliveryDate = {};
      if (globalFilters.dateFrom) {
        whereClause.deliveryDate.$gte = globalFilters.dateFrom;
      }
      if (globalFilters.dateTo) {
        whereClause.deliveryDate.$lte = globalFilters.dateTo;
      }
    }

    // Filter by year if provided (overrides global date filter)
    if (localFilters.selectedYear) {
      const yearNum = parseInt(localFilters.selectedYear);
      const yearStart = new Date(yearNum, 0, 1);
      const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);
      whereClause.deliveryDate = {
        $gte: yearStart,
        $lte: yearEnd
      };
    }

    // Apply search filter - cross-field search (name, phone, email, address)
    if (localFilters.searchDonorName && localFilters.searchDonorName.trim()) {
      const searchDonorIds = await DonorController.searchDonorIdsAcrossAllFields(
        localFilters.searchDonorName,
        globalFilterDonorIds
      );
      if (searchDonorIds.length === 0) {
        return { deliveredCount: 0, pendingCount: 0 };
      }
      whereClause.donorId = { $in: searchDonorIds };
    }

    // Get all donor gifts with filters
    const allDonorGifts = await remult.repo(DonorGift).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

    const deliveredCount = allDonorGifts.filter(dg => dg.isDelivered).length;
    const pendingCount = allDonorGifts.filter(dg => !dg.isDelivered).length;

    return { deliveredCount, pendingCount };
  }
}
