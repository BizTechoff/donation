import { BackendMethod, Allow, remult } from 'remult';
import { Donor } from '../entity/donor';
import { Place } from '../entity/place';
import { Country } from '../entity/country';
import { Event } from '../entity/event';
import { Contact } from '../entity/contact';
import { User } from '../entity/user';
import { Company } from '../entity/company';
import { Circle } from '../entity/circle';
import { NoteType } from '../entity/note-type';
import { DonorEvent } from '../entity/donor-event';
import { DonorNote } from '../entity/donor-note';
import { DonorPlace } from '../entity/donor-place';
import { DonorReceptionHour } from '../entity/donor-reception-hour';
import { DonorAddress } from '../entity/donor-address';
import { DonorContact } from '../entity/donor-contact';
import { DonorRelation } from '../entity/donor-relation';
import { GlobalFilters } from '../../app/services/global-filter.service';

export interface DonorDetailsData {
  donor: Donor | null | undefined;
  events: Event[];
  countries: Country[];
  contacts: Contact[];
  fundraisers: User[];
  allDonorsForFamily: Donor[];
  companies: Company[];
  circles: Circle[];
  noteTypes: NoteType[];
  donorEvents: DonorEvent[];
  donorNotes: DonorNote[];
  donorPlaces: DonorPlace[];
  donorReceptionHours: DonorReceptionHour[];
  donorAddresses: DonorAddress[];
  donorContacts: DonorContact[];
  donorRelations: DonorRelation[];
  allDonors: Donor[];
}

export class DonorController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonorDetailsData(donorId: string): Promise<DonorDetailsData> {
    // Load donor (or null for new)
    const donor = donorId !== 'new' ? await remult.repo(Donor).findId(donorId, {
      include: {
        homePlace: { include: { country: true } },
        vacationPlace: { include: { country: true } }
      }
    }) : null;

    // Load all reference data in parallel
    const [
      events,
      countries,
      contacts,
      fundraisers,
      allDonorsForFamily,
      companies,
      circles,
      noteTypes,
      allDonors
    ] = await Promise.all([
      remult.repo(Event).find({ where: { isActive: true }, orderBy: { sortOrder: 'asc', description: 'asc' } }),
      remult.repo(Country).find({ orderBy: { name: 'asc' } }),
      remult.repo(Contact).find({ orderBy: { firstName: 'asc', lastName: 'asc' } }),
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
        orderBy: { lastName: 'asc', firstName: 'asc' },
        include: {
          homePlace: { include: { country: true } },
          vacationPlace: { include: { country: true } }
        }
      })
    ]);

    // Load donor-specific data if exists
    let donorEvents: DonorEvent[] = [];
    let donorNotes: DonorNote[] = [];
    let donorPlaces: DonorPlace[] = [];
    let donorReceptionHours: DonorReceptionHour[] = [];
    let donorAddresses: DonorAddress[] = [];
    let donorContacts: DonorContact[] = [];
    let donorRelations: DonorRelation[] = [];

    if (donor?.id) {
      [donorEvents, donorNotes, donorPlaces, donorReceptionHours, donorAddresses, donorContacts, donorRelations] = await Promise.all([
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
        remult.repo(DonorAddress).find({
          where: { donorId: donor.id }
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
      contacts,
      fundraisers,
      allDonorsForFamily,
      companies,
      circles,
      noteTypes,
      donorEvents,
      donorNotes,
      donorPlaces,
      donorReceptionHours,
      donorAddresses,
      donorContacts,
      donorRelations,
      allDonors
    };
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findAll(): Promise<Donor[]> {
    return await remult.repo(Donor).find({
      orderBy: { lastName: 'asc' as 'asc' },
      include: {
        homePlace: { include: { country: true } },
        vacationPlace: { include: { country: true } }
      }
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findActive(): Promise<Donor[]> {
    return await remult.repo(Donor).find({
      where: { isActive: true },
      orderBy: { lastName: 'asc' as 'asc' },
      include: {
        homePlace: { include: { country: true } },
        vacationPlace: { include: { country: true } }
      }
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findFiltered(filters: GlobalFilters): Promise<Donor[]> {
    // console.log('DonorController.findFiltered called with filters:', filters);
    let whereClause: any = { isActive: true };

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

      const donorsWithMatchingCountries = await remult.repo(Donor).find({
        where: {
          isActive: true,
          homePlaceId: { $in: matchingPlaceIds }
        },
        orderBy: { lastName: 'asc' as 'asc' },
        include: {
          homePlace: { include: { country: true } },
          vacationPlace: { include: { country: true } }
        }
      });

      console.log(`DonorController: Found ${donorsWithMatchingCountries.length} donors with matching countries`);
      return donorsWithMatchingCountries;
    }

    return await remult.repo(Donor).find({
      where: whereClause,
      orderBy: { lastName: 'asc' as 'asc' },
      include: {
        homePlace: { include: { country: true } },
        vacationPlace: { include: { country: true } }
      }
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findById(id: string): Promise<Donor | null> {
    const donor = await remult.repo(Donor).findId(id, {
      include: {
        homePlace: { include: { country: true } },
        vacationPlace: { include: { country: true } }
      }
    });
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
  static async countFiltered(filters: GlobalFilters): Promise<number> {
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

      return await remult.repo(Donor).count({
        isActive: true,
        homePlaceId: { $in: matchingPlaceIds }
      });
    }

    return await remult.repo(Donor).count(whereClause);
  }
}