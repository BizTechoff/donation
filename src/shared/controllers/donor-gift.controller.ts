import { Allow, BackendMethod, Controller } from 'remult';
import { remult } from 'remult';
import { DonorGift } from '../entity';
import { GlobalFilters } from '../../app/services/global-filter.service';

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
    globalFilters: GlobalFilters,
    localFilters: DonorGiftFilters,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<DonorGift[]> {
    console.log('DonorGiftController.findFilteredDonorGifts', globalFilters, localFilters);

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

    // Apply local filters
    if (localFilters.selectedDonorId) {
      whereClause.donorId = localFilters.selectedDonorId;
    }

    if (localFilters.selectedGiftId) {
      whereClause.giftId = localFilters.selectedGiftId;
    }

    // Apply global date filter if provided (on deliveryDate)
    if (globalFilters.dateFrom || globalFilters.dateTo) {
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

    // Get all donor gifts
    let allDonorGifts = await remult.repo(DonorGift).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy,
      include: {
        donor: true,
        gift: true
      }
    });

    // Apply search filter on donor name (client-side filtering)
    if (localFilters.searchDonorName && localFilters.searchDonorName.trim()) {
      const searchLower = localFilters.searchDonorName.toLowerCase();
      allDonorGifts = allDonorGifts.filter(dg => {
        const donorName = `${dg.donor?.firstName || ''} ${dg.donor?.lastName || ''}`.toLowerCase();
        return donorName.includes(searchLower);
      });
    }

    // Apply pagination
    if (page && pageSize) {
      const startIndex = (page - 1) * pageSize;
      return allDonorGifts.slice(startIndex, startIndex + pageSize);
    }

    return allDonorGifts;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredDonorGifts(
    globalFilters: GlobalFilters,
    localFilters: DonorGiftFilters
  ): Promise<number> {
    // Build where clause
    let whereClause: any = {};

    // Apply local filters
    if (localFilters.selectedDonorId) {
      whereClause.donorId = localFilters.selectedDonorId;
    }

    if (localFilters.selectedGiftId) {
      whereClause.giftId = localFilters.selectedGiftId;
    }

    // Apply global date filter if provided (on deliveryDate)
    if (globalFilters.dateFrom || globalFilters.dateTo) {
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

    // If we have searchDonorName, we need to get all records and filter client-side
    if (localFilters.searchDonorName && localFilters.searchDonorName.trim()) {
      const allDonorGifts = await remult.repo(DonorGift).find({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        include: {
          donor: true
        }
      });

      const searchLower = localFilters.searchDonorName.toLowerCase();
      const filtered = allDonorGifts.filter(dg => {
        const donorName = `${dg.donor?.firstName || ''} ${dg.donor?.lastName || ''}`.toLowerCase();
        return donorName.includes(searchLower);
      });

      return filtered.length;
    }

    return await remult.repo(DonorGift).count(Object.keys(whereClause).length > 0 ? whereClause : undefined);
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getStats(
    globalFilters: GlobalFilters,
    localFilters: DonorGiftFilters
  ): Promise<{ deliveredCount: number; pendingCount: number }> {
    // Build where clause
    let whereClause: any = {};

    // Apply local filters
    if (localFilters.selectedDonorId) {
      whereClause.donorId = localFilters.selectedDonorId;
    }

    if (localFilters.selectedGiftId) {
      whereClause.giftId = localFilters.selectedGiftId;
    }

    // Apply global date filter if provided (on deliveryDate)
    if (globalFilters.dateFrom || globalFilters.dateTo) {
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

    // Get all donor gifts with filters
    let allDonorGifts = await remult.repo(DonorGift).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        donor: true
      }
    });

    // Apply search filter on donor name
    if (localFilters.searchDonorName && localFilters.searchDonorName.trim()) {
      const searchLower = localFilters.searchDonorName.toLowerCase();
      allDonorGifts = allDonorGifts.filter(dg => {
        const donorName = `${dg.donor?.firstName || ''} ${dg.donor?.lastName || ''}`.toLowerCase();
        return donorName.includes(searchLower);
      });
    }

    const deliveredCount = allDonorGifts.filter(dg => dg.isDelivered).length;
    const pendingCount = allDonorGifts.filter(dg => !dg.isDelivered).length;

    return { deliveredCount, pendingCount };
  }
}
