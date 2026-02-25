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

    // Apply search term filter - cross-field search (name, phone, email, address)
    // Each word must match at least one field, AND between words
    if (searchTerm && searchTerm.trim()) {
      const matchingIds = await DonorController.searchDonorIdsAcrossAllFields(searchTerm, donorIds);
      if (matchingIds.length === 0) {
        return [];
      }
      whereClause.id = { $in: matchingIds };
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

    // Apply search term filter - cross-field search (name, phone, email, address)
    // Each word must match at least one field, AND between words
    if (searchTerm && searchTerm.trim()) {
      const matchingIds = await DonorController.searchDonorIdsAcrossAllFields(searchTerm, donorIds);
      if (matchingIds.length === 0) {
        return 0;
      }
      whereClause.id = { $in: matchingIds };
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

  /**
   * Cross-field search: each word must match at least one field (name, phone, email, address).
   * For multiple words - AND between words, OR between fields within each word.
   * Example: "Lakewood New מוטי" → "Lakewood" in address AND "New" in address AND "מוטי" in name.
   */
  static async searchDonorIdsAcrossAllFields(
    searchTerm: string,
    restrictToDonorIds?: string[]
  ): Promise<string[]> {
    if (!searchTerm || !searchTerm.trim()) return [];

    const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];
    console.log(`[CrossFieldSearch] searchTerm="${searchTerm}", words=[${words.join(', ')}]`);

    const nameFields = (word: string) => [
      { title: { $contains: word } },
      { firstName: { $contains: word } },
      { lastName: { $contains: word } },
      { suffix: { $contains: word } },
      { titleEnglish: { $contains: word } },
      { firstNameEnglish: { $contains: word } },
      { lastNameEnglish: { $contains: word } },
      { suffixEnglish: { $contains: word } },
      { idNumber: { $contains: word } }
    ];

    // For each word, find all donor IDs matching in ANY field
    const perWordSets: Set<string>[] = [];

    for (const word of words) {
      const wordDonorIds = new Set<string>();

      // Search in donor name fields
      const nameWhere: any = { $or: nameFields(word) };
      if (restrictToDonorIds) {
        nameWhere.id = { $in: restrictToDonorIds };
      }
      const matchingDonors = await remult.repo(Donor).find({ where: nameWhere, limit: 10000 });
      matchingDonors.forEach(d => wordDonorIds.add(d.id));

      // Search in contacts (phone/email) and places (address)
      const cpIds = await DonorController.searchDonorIdsFromContactsAndPlaces([word], restrictToDonorIds);
      cpIds.forEach(id => wordDonorIds.add(id));

      console.log(`[CrossFieldSearch] word="${word}" → nameMatches=${matchingDonors.length}, contactPlaceMatches=${cpIds.length}, totalUnique=${wordDonorIds.size}`);
      perWordSets.push(wordDonorIds);
    }

    if (perWordSets.length === 0) return [];

    // Intersect all per-word sets: each word must match somewhere
    let result = perWordSets[0];
    for (let i = 1; i < perWordSets.length; i++) {
      const before = result.size;
      result = new Set([...result].filter(id => perWordSets[i].has(id)));
      console.log(`[CrossFieldSearch] intersect with word="${words[i]}": ${before} → ${result.size}`);
    }

    console.log(`[CrossFieldSearch] final result: ${result.size} donors`);
    return [...result];
  }

  /**
   * Search for donorIds by matching contacts (phone/email) and places (address)
   * Uses raw SQL for case-insensitive search on PostgreSQL
   */
  static async searchDonorIdsFromContactsAndPlaces(
    words: string[],
    restrictToDonorIds?: string[]
  ): Promise<string[]> {
    if (!words || words.length === 0) return [];

    const allDonorIds = new Set<string>();

    // Search in DonorContact (phone & email)
    const contactOrConditions: any[] = [];
    for (const word of words) {
      contactOrConditions.push(
        { phoneNumber: { $contains: word } },
        { email: { $contains: word } }
      );
    }

    const contactWhere: any = {
      isActive: true,
      $or: contactOrConditions
    };
    if (restrictToDonorIds) {
      contactWhere.donorId = { $in: restrictToDonorIds };
    }

    const matchingContacts = await remult.repo(DonorContact).find({
      where: contactWhere,
      limit: 10000
    });
    matchingContacts.forEach(c => { if (c.donorId) allDonorIds.add(c.donorId); });

    // Search in Place (all address fields) - search both original and lowercase for case-insensitive match
    const placeOrConditions: any[] = [];
    const addressFields = ['fullAddress', 'city', 'street', 'houseNumber', 'building', 'apartment', 'neighborhood', 'state', 'postcode'];
    for (const word of words) {
      const lowerWord = word.toLowerCase();
      for (const field of addressFields) {
        placeOrConditions.push({ [field]: { $contains: word } });
        // Also search lowercase for case-insensitive match on PostgreSQL
        if (lowerWord !== word) {
          placeOrConditions.push({ [field]: { $contains: lowerWord } });
        }
      }
    }

    const matchingPlaces = await remult.repo(Place).find({
      where: { $or: placeOrConditions },
      limit: 10000
    });
    const placeIds = matchingPlaces.map(p => p.id);

    if (placeIds.length > 0) {
      const dpWhere: any = {
        placeId: { $in: placeIds },
        isActive: true
      };
      if (restrictToDonorIds) {
        dpWhere.donorId = { $in: restrictToDonorIds };
      }

      const donorPlaces = await remult.repo(DonorPlace).find({
        where: dpWhere,
        limit: 10000
      });
      donorPlaces.forEach(dp => { if (dp.donorId) allDonorIds.add(dp.donorId); });
    }

    return [...allDonorIds];
  }
}