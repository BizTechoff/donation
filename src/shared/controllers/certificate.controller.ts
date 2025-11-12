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
  globalFilters?: GlobalFilters;
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

    const findOptions: any = {
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy,
      include: { donor: true, createdBy: true, reminder: true }
    };

    // Add pagination if provided
    if (page && pageSize) {
      findOptions.page = page;
      findOptions.limit = pageSize;
    }

    const certificates = await remult.repo(Certificate).find(findOptions);

    // Load related entities manually if needed
    for (const certificate of certificates) {
      if (certificate.donorId && !certificate.donor) {
        const donor = await remult.repo(Donor).findId(certificate.donorId);
        if (donor) certificate.donor = donor;
      }
    }

    return certificates;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredCertificates(filters: CertificateFilters): Promise<number> {
    const whereClause = await CertificateController.buildWhereClause(filters);
    if (whereClause === null) return 0;

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

    const certificates = await remult.repo(Certificate).find({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

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

    // Apply global filters first (affects donorId)
    if (filters.globalFilters) {
      const globalDonorIds = await GlobalFilterController.getDonorIds(filters.globalFilters);
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
        return null;
      }

      whereClause.donorId = { $in: donorIds };
    }

    // Apply parasha filter
    if (filters.fromParasha) {
      const parashaRange = await HebrewDateController.getParshaDateRange(filters.fromParasha);

console.log('parashaRange',  parashaRange)
      if (parashaRange) {
        const parashaStartDate = parashaRange.startDate;
        const parashaEndDate = parashaRange.endDate;
console.log('parashaStartDate',  parashaStartDate,parashaEndDate)
        // If we already have date filters, intersect with parasha range
        if (whereClause.eventDate) {
          // Combine existing date filters with parasha range
          const existingGte = whereClause.eventDate.$gte;
          const existingLte = whereClause.eventDate.$lte;

          whereClause.eventDate = {
            $gte: existingGte && existingGte > parashaStartDate ? existingGte : parashaStartDate,
            $lte: existingLte && existingLte < parashaEndDate ? existingLte : parashaEndDate
          };
        } else {
          whereClause.eventDate = {
            $gte: parashaStartDate,
            $lte: parashaEndDate
          };
        }
      } else {
        // Parasha not found - return no results
        return null;
      }
    }

    return whereClause;
  }
}
