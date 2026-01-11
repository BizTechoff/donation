import { Allow, BackendMethod, remult } from 'remult';
import { Certificate } from '../entity/certificate';
import { Donor } from '../entity/donor';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { GlobalFilterController } from './global-filter.controller';
import { HebrewDateController } from './hebrew-date.controller';

export interface CertificateFilters {
  certificateType?: string;
  dateFrom?: string;
  dateTo?: string;
  donorSearchText?: string;
  fromParasha?: string;
  toParasha?: string;
  // globalFilters removed - now fetched from user.settings in backend
}

export interface CertificateSummary {
  memorialCertificates: number;
  memorialDayCertificates: number;
}

export class CertificateController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredCertificates(
    filters: CertificateFilters,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<Certificate[]> {
    console.log('CertificateController.findFilteredCertificates');

    const whereClause = await CertificateController.buildWhereClause(filters);
    if (whereClause === null) return [];

    // Build orderBy from sortColumns or use default
    let orderBy: any = { createdDate: 'desc' as 'desc' }; // Default sort
    if (sortColumns && sortColumns.length > 0) {
      orderBy = {};
      sortColumns.forEach(sort => {
        let fieldName = sort.field;
        switch (fieldName) {
          case 'eventDate':
            orderBy.eventDate = sort.direction;
            break;
          case 'createdDate':
            orderBy.createdDate = sort.direction;
            break;
          case 'type':
            orderBy.type = sort.direction;
            break;
          case 'amount':
            orderBy.amount = sort.direction;
            break;
          // Note: recipientName, donorName sorting would require joins and are done client-side
          default:
            break;
        }
      });
    }

    // If parasha filter is applied, we need to fetch all and filter in memory
    // because parasha is calculated per date, not stored in DB
    const hasParashaFilter = filters.fromParasha && filters.fromParasha.trim() !== '';

    const findOptions: any = {
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy,
      include: { donor: true, createdBy: true, reminder: true }
    };

    // Only add pagination if no parasha filter (otherwise we filter first, then paginate)
    if (!hasParashaFilter && page && pageSize) {
      findOptions.page = page;
      findOptions.limit = pageSize;
    }

    let certificates = await remult.repo(Certificate).find(findOptions);

    // Load related entities manually if needed
    for (const certificate of certificates) {
      if (certificate.donorId && !certificate.donor) {
        const donor = await remult.repo(Donor).findId(certificate.donorId);
        if (donor) certificate.donor = donor;
      }
    }

    // Apply parasha filter if specified
    if (hasParashaFilter) {
      certificates = CertificateController.filterByParasha(certificates, filters.fromParasha!);

      // Apply pagination after parasha filter
      if (page && pageSize) {
        const startIndex = (page - 1) * pageSize;
        certificates = certificates.slice(startIndex, startIndex + pageSize);
      }
    }

    return certificates;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredCertificates(filters: CertificateFilters): Promise<number> {
    const whereClause = await CertificateController.buildWhereClause(filters);
    if (whereClause === null) return 0;

    const hasParashaFilter = filters.fromParasha && filters.fromParasha.trim() !== '';

    // If parasha filter, we need to count after filtering
    if (hasParashaFilter) {
      const certificates = await remult.repo(Certificate).find({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined
      });
      const filtered = CertificateController.filterByParasha(certificates, filters.fromParasha!);
      return filtered.length;
    }

    const count = await remult.repo(Certificate).count(
      Object.keys(whereClause).length > 0 ? whereClause : undefined
    );

    return count;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getSummaryForFilteredCertificates(filters: CertificateFilters): Promise<CertificateSummary> {
    const whereClause = await CertificateController.buildWhereClause(filters);
    if (whereClause === null) {
      return {
        memorialCertificates: 0,
        memorialDayCertificates: 0
      };
    }

    let certificates = await remult.repo(Certificate).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

    // Apply parasha filter if specified
    const hasParashaFilter = filters.fromParasha && filters.fromParasha.trim() !== '';
    if (hasParashaFilter) {
      certificates = CertificateController.filterByParasha(certificates, filters.fromParasha!);
    }

    return {
      memorialCertificates: certificates.filter(c => c.type === 'memorial').length,
      memorialDayCertificates: certificates.filter(c => c.type === 'memorialDay').length
    };
  }

  /**
   * Build where clause for filtering certificates
   * Returns null if no results should be returned (e.g., no matching donors)
   */
  private static async buildWhereClause(filters: CertificateFilters): Promise<any | null> {
    let whereClause: any = {};

    // 🎯 הקסם: שליפת הגלובלים מה-user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    // Apply global filters first (affects donorId)
    if (globalFilters) {
      const globalDonorIds = await GlobalFilterController.getDonorIds(globalFilters);
      if (globalDonorIds !== undefined) {
        if (globalDonorIds.length === 0) {
          return null; // No donors match global filters
        }
        whereClause.donorId = { $in: globalDonorIds };
      }
    }

    // Apply certificate type filter
    if (filters.certificateType) {
      whereClause.type = filters.certificateType;
    }

    // Apply date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      whereClause.eventDate = { $gte: fromDate };
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (whereClause.eventDate) {
        whereClause.eventDate = {
          ...whereClause.eventDate,
          $lte: toDate
        };
      } else {
        whereClause.eventDate = { $lte: toDate };
      }
    }

    // If we have a donor search term, find matching donors first
    if (filters.donorSearchText && filters.donorSearchText.trim() !== '') {
      const searchLower = filters.donorSearchText.toLowerCase().trim();

      // Build donor search query
      const donorSearchWhere: any = {
        $or: [
          { firstName: { $contains: searchLower } },
          { lastName: { $contains: searchLower } }
        ]
      };

      // If we already have a donorId filter from global filters, combine them
      if (whereClause.donorId?.$in) {
        donorSearchWhere.id = { $in: whereClause.donorId.$in };
      }

      const matchingDonors = await remult.repo(Donor).find({
        where: donorSearchWhere
      });

      const donorIds = matchingDonors.map(d => d.id);

      if (donorIds.length === 0) {
        return null;
      }

      whereClause.donorId = { $in: donorIds };
    }

    // Note: parasha filter is applied after fetching results (see filterByParasha method)
    // This is because we need to check each certificate's eventDate against the parasha

    return whereClause;
  }

  /**
   * Filter certificates by parasha - checks if each certificate's eventDate falls on the selected parasha
   * This works across all years - it just checks if the parasha name matches
   */
  private static filterByParasha(certificates: Certificate[], parashaName: string): Certificate[] {
    if (!parashaName) return certificates;

    // Convert Hebrew parasha name to English for comparison
    const parashaNameEnglish = HebrewDateController.getEnglishParshaName(parashaName);

    return certificates.filter(cert => {
      if (!cert.eventDate) return false;

      const certParasha = HebrewDateController.getParshaForDateSync(cert.eventDate);
      if (!certParasha) return false;

      // Compare - handle combined parshiyot (e.g., "Vayakhel-Pekudei" contains "Vayakhel")
      return certParasha === parashaNameEnglish ||
             certParasha.includes(parashaNameEnglish) ||
             parashaNameEnglish.includes(certParasha);
    });
  }
}
