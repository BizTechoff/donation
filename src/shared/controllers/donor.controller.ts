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
    // 🎯 Fetch global filters from user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters = {};
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters || {};
    }

    // Merge global filters with additional filters
    const filters: GlobalFilters = { ...globalFilters, ...additionalFilters };

    console.log('DonorController.findFilteredDonors', filters, 'searchTerm:', searchTerm);

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

    // Start with all active donors
    let donorIds: string[] | undefined = undefined;

    // Apply place-based filters (country, city, neighborhood)
    if (filters.countryIds?.length || filters.cityIds?.length || filters.neighborhoodIds?.length) {
      const placeWhere: any = {};

      if (filters.countryIds && filters.countryIds.length > 0) {
        placeWhere.countryId = { $in: filters.countryIds };
        console.log(`DonorController: Filtering by countryIds:`, filters.countryIds);

        // Debug: Check what countryIds actually exist in Places
        const distinctCountries = await remult.repo(Place).find({ limit: 100 });
        const uniqueCountryIds = [...new Set(distinctCountries.map(p => p.countryId).filter(id => id))];
        console.log(`DonorController: DEBUG - Unique countryIds in Places (first 100):`, uniqueCountryIds);
        console.log(`DonorController: DEBUG - Looking for countryId:`, filters.countryIds[0]);
        console.log(`DonorController: DEBUG - Does it exist in Places?:`, uniqueCountryIds.includes(filters.countryIds[0]));

        // Debug: Check Countries table
        const Country = (await import('../entity/country')).Country;
        const allCountries = await remult.repo(Country).find();
        const usaCountry = allCountries.find(c => c.name === 'ארצות הברית' || c.name === 'United States' || c.name === 'USA');
        console.log(`DonorController: DEBUG - USA Country:`, usaCountry ? { id: usaCountry.id, name: usaCountry.name } : 'NOT FOUND');
        console.log(`DonorController: DEBUG - OLD USA ID in Places: 2b172f98-33a9-4540-9996-28d51148eb4b`);
        console.log(`DonorController: DEBUG - NEW USA ID in Countries:`, usaCountry?.id);
      }

      if (filters.cityIds && filters.cityIds.length > 0) {
        placeWhere.city = { $in: filters.cityIds };
        console.log(`DonorController: Filtering by cityIds:`, filters.cityIds);
      }

      if (filters.neighborhoodIds && filters.neighborhoodIds.length > 0) {
        placeWhere.neighborhood = { $in: filters.neighborhoodIds };
        console.log(`DonorController: Filtering by neighborhoodIds:`, filters.neighborhoodIds);
      }

      console.log(`DonorController: placeWhere query:`, JSON.stringify(placeWhere, null, 2));

      // Find matching places
      const matchingPlaces = await remult.repo(Place).find({ where: placeWhere });
      const matchingPlaceIds = matchingPlaces.map(p => p.id);

      console.log(`DonorController: Found ${matchingPlaces.length} places matching location filters`);
      console.log(`DonorController: Sample places (first 3):`, matchingPlaces.slice(0, 3).map(p => ({ id: p.id, city: p.city, countryId: p.countryId })));

      // Debug: Check how many places have countryId populated
      if (filters.countryIds && filters.countryIds.length > 0 && matchingPlaces.length === 0) {
        const allPlaces = await remult.repo(Place).find({ limit: 10 });
        console.log(`DonorController: DEBUG - Sample of all places (first 10):`, allPlaces.map(p => ({
          id: p.id,
          city: p.city,
          countryId: p.countryId,
          fullAddress: p.fullAddress
        })));

        const allPlacesCount = await remult.repo(Place).count();
        console.log(`DonorController: DEBUG - Total places in DB: ${allPlacesCount}`);

        // Count places with non-null countryId
        const placesWithCountryCount = allPlaces.filter(p => p.countryId).length;
        console.log(`DonorController: DEBUG - Places with countryId in sample: ${placesWithCountryCount} out of ${allPlaces.length}`);
      }

      if (matchingPlaceIds.length === 0) {
        return []; // No matching places found
      }

      // Find DonorPlace entries with matching places
      const donorPlaces = await remult.repo(DonorPlace).find({
        where: {
          placeId: { $in: matchingPlaceIds },
          isActive: true
        }
      });

      donorIds = [...new Set(donorPlaces.map(dp => dp.donorId).filter((id): id is string => !!id))];
      console.log(`DonorController: Found ${donorIds?.length || 0} unique donors with matching locations`);

      if (donorIds.length === 0) {
        return [];
      }
    }

    // Apply campaign filter
    if (filters.campaignIds && filters.campaignIds.length > 0) {
      const Donation = (await import('../entity/donation')).Donation;
      const donations = await remult.repo(Donation).find({
        where: { campaignId: { $in: filters.campaignIds } }
      });

      const campaignDonorIds = [...new Set(donations.map(d => d.donorId).filter(id => id))];

      if (donorIds) {
        // Intersect with existing donor IDs
        donorIds = donorIds.filter(id => campaignDonorIds.includes(id));
      } else {
        donorIds = campaignDonorIds;
      }

      console.log(`DonorController: After campaign filter: ${donorIds.length} donors`);

      if (donorIds.length === 0) {
        return [];
      }
    }

    // Apply target audience filter
    if (filters.targetAudienceIds && filters.targetAudienceIds.length > 0) {
      const TargetAudience = (await import('../entity/target-audience')).TargetAudience;
      const targetAudiences = await remult.repo(TargetAudience).find({
        where: { id: { $in: filters.targetAudienceIds } }
      });

      // Collect all donor IDs from all matching target audiences
      const audienceDonorIds = [
        ...new Set(
          targetAudiences.flatMap(ta => ta.donorIds || [])
        )
      ];

      if (donorIds) {
        // Intersect with existing donor IDs
        donorIds = donorIds.filter(id => audienceDonorIds.includes(id));
      } else {
        donorIds = audienceDonorIds;
      }

      console.log(`DonorController: After target audience filter: ${donorIds.length} donors`);

      if (donorIds.length === 0) {
        return [];
      }
    }

    // Build final where clause
    let whereClause: any = { isActive: true };
    if (donorIds) {
      whereClause.id = { $in: donorIds };
    }

    // Apply search term filter
    if (searchTerm && searchTerm.trim()) {
      const search = searchTerm.trim();
      whereClause.$or = [
        { firstName: { $contains: search } },
        { lastName: { $contains: search } },
        { firstNameEnglish: { $contains: search } },
        { lastNameEnglish: { $contains: search } },
        { idNumber: { $contains: search } }
      ];
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
    // 🎯 Fetch global filters from user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters = {};
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters || {};
    }

    // Merge global filters with additional filters
    const filters: GlobalFilters = { ...globalFilters, ...additionalFilters };

    // Start with all active donors
    let donorIds: string[] | undefined = undefined;

    // Apply place-based filters (country, city, neighborhood)
    if (filters.countryIds?.length || filters.cityIds?.length || filters.neighborhoodIds?.length) {
      const placeWhere: any = {};

      if (filters.countryIds && filters.countryIds.length > 0) {
        placeWhere.countryId = { $in: filters.countryIds };
      }

      if (filters.cityIds && filters.cityIds.length > 0) {
        placeWhere.city = { $in: filters.cityIds };
      }

      if (filters.neighborhoodIds && filters.neighborhoodIds.length > 0) {
        placeWhere.neighborhood = { $in: filters.neighborhoodIds };
      }

      // Find matching places
      const matchingPlaces = await remult.repo(Place).find({ where: placeWhere });
      const matchingPlaceIds = matchingPlaces.map(p => p.id);

      console.log(`DonorController.countFiltered: Found ${matchingPlaces.length} places matching location filters`);

      if (matchingPlaceIds.length === 0) {
        return 0;
      }

      // Find DonorPlace entries with matching places
      const donorPlaces = await remult.repo(DonorPlace).find({
        where: {
          placeId: { $in: matchingPlaceIds },
          isActive: true
        }
      });

      donorIds = [...new Set(donorPlaces.map(dp => dp.donorId).filter((id): id is string => !!id))];
      console.log(`DonorController.countFiltered: Found ${donorIds?.length || 0} unique donors with matching locations`);

      if (donorIds.length === 0) {
        return 0;
      }
    }

    // Apply campaign filter
    if (filters.campaignIds && filters.campaignIds.length > 0) {
      const Donation = (await import('../entity/donation')).Donation;
      const donations = await remult.repo(Donation).find({
        where: { campaignId: { $in: filters.campaignIds } }
      });

      const campaignDonorIds = [...new Set(donations.map(d => d.donorId).filter(id => id))];

      if (donorIds) {
        // Intersect with existing donor IDs
        donorIds = donorIds.filter(id => campaignDonorIds.includes(id));
      } else {
        donorIds = campaignDonorIds;
      }

      if (donorIds.length === 0) {
        return 0;
      }
    }

    // Apply target audience filter
    if (filters.targetAudienceIds && filters.targetAudienceIds.length > 0) {
      const TargetAudience = (await import('../entity/target-audience')).TargetAudience;
      const targetAudiences = await remult.repo(TargetAudience).find({
        where: { id: { $in: filters.targetAudienceIds } }
      });

      // Collect all donor IDs from all matching target audiences
      const audienceDonorIds = [
        ...new Set(
          targetAudiences.flatMap(ta => ta.donorIds || [])
        )
      ];

      if (donorIds) {
        // Intersect with existing donor IDs
        donorIds = donorIds.filter(id => audienceDonorIds.includes(id));
      } else {
        donorIds = audienceDonorIds;
      }

      if (donorIds.length === 0) {
        return 0;
      }
    }

    // Build final where clause
    let whereClause: any = { isActive: true };
    if (donorIds) {
      whereClause.id = { $in: donorIds };
    }

    // Apply search term filter
    if (searchTerm && searchTerm.trim()) {
      const search = searchTerm.trim();
      whereClause.$or = [
        { firstName: { $contains: search } },
        { lastName: { $contains: search } },
        { idNumber: { $contains: search } }
      ];
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
    const [donorContacts, donorPlaces, places] = await Promise.all([
      remult.repo(DonorContact).find({
        where: { donorId: { $in: donorIds } }
      }),
      remult.repo(DonorPlace).find({
        where: { donorId: { $in: donorIds } }
      }),
      remult.repo(Place).find()
    ]);

    // Build maps for efficient lookup
    const donorEmailMap: Record<string, string> = {};
    const donorPhoneMap: Record<string, string> = {};
    const donorPlaceMap: Record<string, Place> = {};

    // Create place lookup map
    const placesMap = new Map<string, Place>();
    places.forEach(place => placesMap.set(place.id, place));

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

    // Populate place map
    donorPlaces.forEach(dp => {
      if (dp.donorId && dp.placeId) {
        const place = placesMap.get(dp.placeId);
        if (place && !donorPlaceMap[dp.donorId]) {
          donorPlaceMap[dp.donorId] = place;
        }
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