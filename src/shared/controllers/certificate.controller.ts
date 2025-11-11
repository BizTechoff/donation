import { Allow, BackendMethod, remult } from 'remult';
import { Certificate } from '../entity/certificate';
import { Donor } from '../entity/donor';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { GlobalFilterController } from './global-filter.controller';

export interface CertificateFilters {
  certificateType?: string;
  dateFrom?: string;
  dateTo?: string;
  donorSearchText?: string;
  fromParasha?: string;
  toParasha?: string;
  globalFilters?: GlobalFilters;
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
    let whereClause: any = {};

    // Apply global filters first (affects donorId)
    if (filters.globalFilters) {
      const globalDonorIds = await GlobalFilterController.getDonorIds(filters.globalFilters);
      if (globalDonorIds !== undefined) {
        if (globalDonorIds.length === 0) {
          return []; // No donors match global filters
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
        return [];
      }

      whereClause.donorId = { $in: donorIds };
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
    let whereClause: any = {};

    // Apply global filters first (affects donorId)
    if (filters.globalFilters) {
      const globalDonorIds = await GlobalFilterController.getDonorIds(filters.globalFilters);
      if (globalDonorIds !== undefined) {
        if (globalDonorIds.length === 0) {
          return 0; // No donors match global filters
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
        return 0;
      }

      whereClause.donorId = { $in: donorIds };
    }

    const count = await remult.repo(Certificate).count(
      Object.keys(whereClause).length > 0 ? whereClause : undefined
    );

    return count;
  }
}
