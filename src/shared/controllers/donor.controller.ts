import { Allow, BackendMethod, Controller, remult } from 'remult';
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

export interface DonorSelectionData {
  donors: Donor[];
  donorEmailMap: Record<string, string>;
  donorPhoneMap: Record<string, string>;
  donorPlaceMap: Record<string, Place>;
}

@Controller('donor')
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
  static async findFilteredIds(additionalFilters?: Partial<GlobalFilters>): Promise<string[]> {
    const donors = await DonorController.findFilteredDonors(undefined, additionalFilters);
    return donors.map(d => d.id);
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredDonors(
    searchTerm?: string,
    additionalFilters?: Partial<GlobalFilters>,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<Donor[]> {
    const { GlobalFilterController } = await import('./global-filter.controller');

    // 🎯 קבל donorIds מסוננים מ-GlobalFilterController (כולל כל הפילטרים: מיקום, קהל יעד, קמפיין, סכום)
    const donorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

    console.log('DonorController.findFilteredDonors - donorIds from GlobalFilter:', donorIds?.length ?? 'all');

    // אם יש פילטרים גלובליים ואין תוצאות - החזר מערך ריק
    if (donorIds !== undefined && donorIds.length === 0) {
      return [];
    }

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

    // Build final where clause
    let whereClause: any = { isActive: true };
    if (donorIds) {
      whereClause.id = { $in: donorIds };
    }

    // Apply search term filter - split by spaces to support full name search
    if (searchTerm && searchTerm.trim()) {
      const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);
      if (words.length === 1) {
        // Single word - search in any field
        const search = words[0];
        whereClause.$or = [
          { firstName: { $contains: search } },
          { lastName: { $contains: search } },
          { firstNameEnglish: { $contains: search } },
          { lastNameEnglish: { $contains: search } },
          { idNumber: { $contains: search } }
        ];
      } else {
        // Multiple words - each word must match at least one field
        whereClause.$and = words.map(word => ({
          $or: [
            { firstName: { $contains: word } },
            { lastName: { $contains: word } },
            { firstNameEnglish: { $contains: word } },
            { lastNameEnglish: { $contains: word } },
            { idNumber: { $contains: word } }
          ]
        }));
      }
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
  static async countFilteredDonors(searchTerm?: string, additionalFilters?: Partial<GlobalFilters>): Promise<number> {
    const { GlobalFilterController } = await import('./global-filter.controller');

    // 🎯 קבל donorIds מסוננים מ-GlobalFilterController (כולל כל הפילטרים: מיקום, קהל יעד, קמפיין, סכום)
    const donorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

    // אם יש פילטרים גלובליים ואין תוצאות - החזר 0
    if (donorIds !== undefined && donorIds.length === 0) {
      return 0;
    }

    // Build final where clause
    let whereClause: any = { isActive: true };
    if (donorIds) {
      whereClause.id = { $in: donorIds };
    }

    // Apply search term filter - split by spaces to support full name search
    if (searchTerm && searchTerm.trim()) {
      const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);
      if (words.length === 1) {
        const search = words[0];
        whereClause.$or = [
          { firstName: { $contains: search } },
          { lastName: { $contains: search } },
          { firstNameEnglish: { $contains: search } },
          { lastNameEnglish: { $contains: search } },
          { idNumber: { $contains: search } }
        ];
      } else {
        whereClause.$and = words.map(word => ({
          $or: [
            { firstName: { $contains: word } },
            { lastName: { $contains: word } },
            { firstNameEnglish: { $contains: word } },
            { lastNameEnglish: { $contains: word } },
            { idNumber: { $contains: word } }
          ]
        }));
      }
    }

    return await remult.repo(Donor).count(whereClause);
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonorsForSelection(excludeIds?: string[]): Promise<DonorSelectionData> {
    // Load donors using global filters (fetched from user.settings in the backend)
    let donors = await DonorController.findFilteredDonors();

    // Filter out excluded IDs
    if (excludeIds && excludeIds.length > 0) {
      donors = donors.filter(donor => !excludeIds.includes(donor.id));
    }

    const donorIds = donors.map(d => d.id);

    // Load all related data in parallel
    const [donorContacts, primaryPlacesMap] = await Promise.all([
      remult.repo(DonorContact).find({
        where: { donorId: { $in: donorIds } }
      }),
      // Use helper method to get primary addresses (respects isPrimary flag)
      DonorPlace.getPrimaryForDonors(donorIds)
    ]);

    // Build maps for efficient lookup
    const donorEmailMap: Record<string, string> = {};
    const donorPhoneMap: Record<string, string> = {};
    const donorPlaceMap: Record<string, Place> = {};

    // Populate email and phone maps
    donorContacts.forEach(contact => {
      if (contact.donorId) {
        if (contact.email && !donorEmailMap[contact.donorId]) {
          donorEmailMap[contact.donorId] = contact.email;
        }
        if (contact.phoneNumber && !donorPhoneMap[contact.donorId]) {
          donorPhoneMap[contact.donorId] = contact.phoneNumber;
        }
      }
    });

    // Populate place map from primary places
    primaryPlacesMap.forEach((donorPlace, donorId) => {
      if (donorPlace.place) {
        donorPlaceMap[donorId] = donorPlace.place;
      }
    });

    return {
      donors,
      donorEmailMap,
      donorPhoneMap,
      donorPlaceMap
    };
  }
}