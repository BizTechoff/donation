import { Allow, BackendMethod, remult } from 'remult';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { Circle } from '../entity/circle';
import { Company } from '../entity/company';
import { Country } from '../entity/country';
import { Donor } from '../entity/donor';
import { DonorContact } from '../entity/donor-contact';
import { DonorEvent } from '../entity/donor-event';
import { DonorNote } from '../entity/donor-note';
import { DonorPlace } from '../entity/donor-place';
import { DonorReceptionHour } from '../entity/donor-reception-hour';
import { DonorRelation } from '../entity/donor-relation';
import { Event } from '../entity/event';
import { NoteType } from '../entity/note-type';
import { Place } from '../entity/place';
import { User } from '../entity/user';

export interface DonorDetailsData {
  donor: Donor | null | undefined;
  events: Event[];
  countries: Country[];
  fundraisers: User[];
  allDonorsForFamily: Donor[];
  companies: Company[];
  circles: Circle[];
  noteTypes: NoteType[];
  donorEvents: DonorEvent[];
  donorNotes: DonorNote[];
  donorPlaces: DonorPlace[];
  donorReceptionHours: DonorReceptionHour[];
  donorContacts: DonorContact[];
  donorRelations: DonorRelation[];
  allDonors: Donor[];
}

export class DonorController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonorDetailsData(donorId: string): Promise<DonorDetailsData> {
    // Load donor (or null for new)
    const donor = donorId !== 'new' ? await remult.repo(Donor).findId(donorId) : null;

    // Load all reference data in parallel
    const [
      events,
      countries,
      fundraisers,
      allDonorsForFamily,
      companies,
      circles,
      noteTypes,
      allDonors
    ] = await Promise.all([
      remult.repo(Event).find({ where: { isActive: true }, orderBy: { sortOrder: 'asc', description: 'asc' } }),
      remult.repo(Country).find({ orderBy: { name: 'asc' } }),
      remult.repo(User).find({ where: { donator: true, disabled: false }, orderBy: { name: 'asc' } }),
      remult.repo(Donor).find({
        where: { isActive: true },
        orderBy: { lastName: 'asc', firstName: 'asc' },
        limit: 500
      }),
      remult.repo(Company).find({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: { place: true }
      }),
      remult.repo(Circle).find({ orderBy: { name: 'asc' } }),
      remult.repo(NoteType).find({ where: { isActive: true }, orderBy: { sortOrder: 'asc', name: 'asc' } }),
      remult.repo(Donor).find({
        orderBy: { lastName: 'asc', firstName: 'asc' }
      })
    ]);

    // Load donor-specific data if exists
    let donorEvents: DonorEvent[] = [];
    let donorNotes: DonorNote[] = [];
    let donorPlaces: DonorPlace[] = [];
    let donorReceptionHours: DonorReceptionHour[] = [];
    let donorContacts: DonorContact[] = [];
    let donorRelations: DonorRelation[] = [];

    if (donor?.id) {
      [donorEvents, donorNotes, donorPlaces, donorReceptionHours, donorContacts, donorRelations] = await Promise.all([
        remult.repo(DonorEvent).find({
          where: { donorId: donor.id },
          include: { event: true }
        }),
        remult.repo(DonorNote).find({
          where: { donorId: donor.id, isActive: true },
          include: { noteTypeEntity: true }
        }),
        remult.repo(DonorPlace).find({
          where: { donorId: donor.id },
          include: { place: { include: { country: true } } }
        }),
        remult.repo(DonorReceptionHour).find({
          where: { donorId: donor.id, isActive: true },
          orderBy: { sortOrder: 'asc', startTime: 'asc' }
        }),
        remult.repo(DonorContact).find({
          where: { donorId: donor.id }
        }),
        remult.repo(DonorRelation).find({
          where: {
            $or: [
              { donor1Id: donor.id },
              { donor2Id: donor.id }
            ]
          },
          include: { donor1: true, donor2: true }
        })
      ]);
    }

    return {
      donor,
      events,
      countries,
      fundraisers,
      allDonorsForFamily,
      companies,
      circles,
      noteTypes,
      donorEvents,
      donorNotes,
      donorPlaces,
      donorReceptionHours,
      donorContacts,
      donorRelations,
      allDonors
    };
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findAll(): Promise<Donor[]> {
    return await remult.repo(Donor).find({
      orderBy: { lastName: 'asc' as 'asc' }
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findActive(): Promise<Donor[]> {
    return await remult.repo(Donor).find({
      where: { isActive: true },
      orderBy: { lastName: 'asc' as 'asc' }
    });
  }

  /**
   * Get only donor IDs without loading full donor objects - much faster for maps
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredIds(filters: GlobalFilters): Promise<string[]> {
    const donors = await DonorController.findFilteredDonors(filters);
    return donors.map(d => d.id);
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredDonors(
    filters: GlobalFilters,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<Donor[]> {
    console.log('DonorController.findFilteredDonors');
    let whereClause: any = { isActive: true };

    // Build orderBy from sortColumns or use default
    let orderBy: any = { lastName: 'asc' as 'asc' }; // Default sort
    if (sortColumns && sortColumns.length > 0) {
      orderBy = {};
      sortColumns.forEach(sort => {
        // Map frontend field names to backend entity fields
        let fieldName = sort.field;
        if (fieldName === 'fullName') {
          // Sort by lastName, then firstName
          orderBy.lastName = sort.direction;
          orderBy.firstName = sort.direction;
        } else if (fieldName === 'createdDate') {
          orderBy.createdDate = sort.direction;
        }
        // Note: address, phone, email sorting would require joins and are done client-side
      });
    }

    // Apply country filter by country ID
    if (filters.countryIds && filters.countryIds.length > 0) {
      console.log('DonorController: Applying country filter for IDs:', filters.countryIds);

      // Find places with matching country IDs
      const matchingPlaces = await remult.repo(Place).find({
        where: { countryId: { $in: filters.countryIds } }
      });

      const matchingPlaceIds = matchingPlaces.map(p => p.id);
      console.log(`DonorController: Found ${matchingPlaces.length} places matching countries`);

      if (matchingPlaceIds.length === 0) {
        console.log('DonorController: No matching places found');
        return []; // No matching places found
      }

      // Find DonorPlace entries with matching places
      const donorPlaces = await remult.repo(DonorPlace).find({
        where: {
          placeId: { $in: matchingPlaceIds },
          isActive: true
        }
      });

      const donorIds = [...new Set(donorPlaces.map(dp => dp.donorId).filter(id => id))];
      console.log(`DonorController: Found ${donorIds.length} unique donors with matching countries`);

      if (donorIds.length === 0) {
        return [];
      }

      const donorsWithMatchingCountries = await remult.repo(Donor).find({
        where: {
          id: { $in: donorIds },
          isActive: true
        },
        orderBy,
        ...(page && pageSize ? { page, limit: pageSize } : {})
      });

      console.log(`DonorController: Found ${donorsWithMatchingCountries.length} donors with matching countries`);
      return donorsWithMatchingCountries;
    }

    return await remult.repo(Donor).find({
      where: whereClause,
      orderBy,
      ...(page && pageSize ? { page, limit: pageSize } : {})
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findById(id: string): Promise<Donor | null> {
    const donor = await remult.repo(Donor).findId(id);
    return donor || null;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async count(): Promise<number> {
    return await remult.repo(Donor).count();
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countActive(): Promise<number> {
    return await remult.repo(Donor).count({ isActive: true });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredDonors(filters: GlobalFilters): Promise<number> {
    let whereClause: any = { isActive: true };

    // Apply country filter by country ID
    if (filters.countryIds && filters.countryIds.length > 0) {
      console.log('DonorController.countFiltered: Applying country filter for IDs:', filters.countryIds);

      // Find places with matching country IDs
      const matchingPlaces = await remult.repo(Place).find({
        where: { countryId: { $in: filters.countryIds } }
      });

      const matchingPlaceIds = matchingPlaces.map(p => p.id);
      console.log(`DonorController.countFiltered: Found ${matchingPlaces.length} places matching countries`);

      if (matchingPlaceIds.length === 0) {
        console.log('DonorController.countFiltered: No matching places found');
        return 0; // No matching places found - return 0 count
      }

      // Find DonorPlace entries with matching places
      const donorPlaces = await remult.repo(DonorPlace).find({
        where: {
          placeId: { $in: matchingPlaceIds },
          isActive: true
        }
      });

      const donorIds = [...new Set(donorPlaces.map(dp => dp.donorId).filter(id => id))];
      console.log(`DonorController.countFiltered: Found ${donorIds.length} unique donors with matching countries`);

      if (donorIds.length === 0) {
        return 0;
      }

      return await remult.repo(Donor).count({
        id: { $in: donorIds },
        isActive: true
      });
    }

    return await remult.repo(Donor).count(whereClause);
  }
}