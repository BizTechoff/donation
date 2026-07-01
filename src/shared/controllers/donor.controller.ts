import { Allow, BackendMethod, Controller, remult, SqlDatabase } from 'remult';
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
import { ContactPerson } from '../entity/contact-person';
import { ExportLookups, LookupItem } from '../type/lookup.type';

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
  contactPersons: ContactPerson[];
}

export interface DonorSelectionData {
  donors: Donor[];
  donorEmailMap: Record<string, string>;
  donorPhoneMap: Record<string, string>;
  donorPlaceMap: Record<string, Place>;
}

export interface DonorSelectionPageData extends DonorSelectionData {
  totalCount: number;
}

export interface DonorSelectionFilters {
  isAnash?: boolean;
  excludeAnash?: boolean;
  isAlumni?: boolean;
  excludeAlumni?: boolean;
  country?: string;
  city?: string;
  neighborhood?: string;
  circleId?: string;
  minAge?: number;
  maxAge?: number;
}

export interface InvitedDonorRow {
  id: string;
  firstName: string;
  lastName: string;
  isAnash: boolean;
  isAlumni: boolean;
  level: string;
  circleIds: string[];
  fundraiserId?: string;
  contactPersonId?: string;
  phone: string;
  email: string;
  city: string;
  neighborhood: string;
  country: string;
}

export interface InvitedDonorsPageParams {
  page: number;
  pageSize: number;
  showOnlyIds?: string[];
  freeSearch?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface InvitedDonorsPageResult {
  rows: InvitedDonorRow[];
  totalCount: number;
  filterOptions: {
    countries: string[];
    cities: string[];
    neighborhoods: string[];
  };
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
      contactPersons
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
      remult.repo(ContactPerson).find({
        orderBy: { name: 'asc' }
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
      contactPersons
    };
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getExportLookups(): Promise<ExportLookups> {
    const [fundraiserUsers, secretaryUsers, contactPersons] = await Promise.all([
      remult.repo(User).find({ where: { donator: true, disabled: false }, orderBy: { name: 'asc' } }),
      remult.repo(User).find({ where: { secretary: true, disabled: false }, orderBy: { name: 'asc' } }),
      remult.repo(ContactPerson).find({ orderBy: { name: 'asc' } })
    ]);
    const toItem = (u: { id: string; name: string }): LookupItem => ({ id: u.id, name: u.name });
    return {
      fundraisers: fundraiserUsers.map(toItem),
      secretaries: secretaryUsers.map(toItem),
      contactPersons: contactPersons.map(toItem)
    };
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonorsForSelectionPage(params: {
    search?: string;
    page: number;
    pageSize: number;
    excludeIds?: string[];
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  }): Promise<DonorSelectionPageData> {
    const { search, page, pageSize, excludeIds, sortColumns } = params;

    // excludeIds are applied at the SQL level in both queries below, so page
    // size, totalCount and select-all all agree. No in-memory post-filter.
    const donors = await DonorController.findFilteredDonors(search, undefined, page, pageSize, sortColumns, excludeIds);
    const totalCount = await DonorController.countFilteredDonors(search, undefined, excludeIds);

    const filteredDonors = donors;

    const donorIds = filteredDonors.map(d => d.id);

    const [donorContacts, primaryPlacesMap] = await Promise.all([
      remult.repo(DonorContact).find({ where: { donorId: { $in: donorIds } } }),
      DonorPlace.getPrimaryForDonors(donorIds)
    ]);

    const donorEmailMap: Record<string, string> = {};
    const donorPhoneMap: Record<string, string> = {};
    const donorPlaceMap: Record<string, Place> = {};

    donorContacts.forEach(contact => {
      if (contact.donorId) {
        if (contact.email && !donorEmailMap[contact.donorId]) donorEmailMap[contact.donorId] = contact.email;
        if (contact.phoneNumber && !donorPhoneMap[contact.donorId]) donorPhoneMap[contact.donorId] = contact.phoneNumber;
      }
    });

    primaryPlacesMap.forEach((donorPlace, donorId) => {
      if (donorPlace.place) donorPlaceMap[donorId] = donorPlace.place;
    });

    return { donors: filteredDonors, totalCount, donorEmailMap, donorPhoneMap, donorPlaceMap };
  }

  /**
   * Returns all donors that match the current selection filter (search + excludeIds).
   *
   * Used by donor-selection-modal's "select all" checkbox to select donors across
   * every page of the current filter (not only the visible page). Returns FULL
   * Donor objects (not just ids) so the caller can push straight into
   * selectedDonors without a second round-trip - the server already loaded them,
   * sending only ids and then re-loading the same rows would be a pessimization.
   *
   * excludeIds applied at SQL level - result matches getDonorsForSelectionPage
   * totalCount exactly, so header "select all (N)" matches footer "N out of N".
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getAllDonorsForSelection(params: {
    search?: string;
    excludeIds?: string[];
  }): Promise<Donor[]> {
    const { search, excludeIds } = params;
    return await DonorController.findFilteredDonors(search, undefined, undefined, undefined, undefined, excludeIds);
  }

  /**
   * Get only donor IDs without loading full donor objects - much faster for maps
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredIds(additionalFilters?: Partial<GlobalFilters>): Promise<string[]> {
    const donors = await DonorController.findFilteredDonors(undefined, additionalFilters);
    return donors.map(d => d.id);
  }

  /**
   * Applies excludeIds to a whereClause that may already have `id: { $in: [...] }`.
   * Filters the $in list when present, otherwise adds `id: { '!=': excludeIds }`.
   * Returns `false` if the resulting id list is provably empty (caller can early-out).
   */
  private static applyExcludeIdsToWhere(whereClause: any, excludeIds?: string[]): boolean {
    if (!excludeIds?.length) return true;
    const excludeSet = new Set(excludeIds);
    if (whereClause.id?.$in) {
      const filtered = (whereClause.id.$in as string[]).filter(id => !excludeSet.has(id));
      if (filtered.length === 0) return false;
      whereClause.id = { $in: filtered };
    } else {
      // No pre-existing $in restriction — use Remult "!=" against the array.
      whereClause.id = { '!=': excludeIds };
    }
    return true;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredDonors(
    searchTerm?: string,
    additionalFilters?: Partial<GlobalFilters>,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>,
    excludeIds?: string[]
  ): Promise<Donor[]> {
    console.log(`[findFilteredDonors] start - searchTerm="${searchTerm}", page=${page}, excludeIds=${excludeIds?.length ?? 0}`);
    console.time('[findFilteredDonors] TOTAL');
    const { GlobalFilterController } = await import('./global-filter.controller');

    console.time('[findFilteredDonors] 1.GlobalFilter.getDonorIds');
    const donorIds = await GlobalFilterController.getDonorIdsFromUserSettings();
    console.timeEnd('[findFilteredDonors] 1.GlobalFilter.getDonorIds');

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
      console.time('[findFilteredDonors] 2.searchAcrossAllFields');
      const matchingIds = await DonorController.searchDonorIdsAcrossAllFields(searchTerm, donorIds);
      console.timeEnd('[findFilteredDonors] 2.searchAcrossAllFields');
      console.log(`[findFilteredDonors]   matchingIds=${matchingIds.length}`);
      if (matchingIds.length === 0) {
        console.timeEnd('[findFilteredDonors] TOTAL');
        return [];
      }
      whereClause.id = { $in: matchingIds };
    }

    // Apply excludeIds at SQL level so counts, paging and select-all all agree.
    if (!DonorController.applyExcludeIdsToWhere(whereClause, excludeIds)) {
      console.timeEnd('[findFilteredDonors] TOTAL');
      return [];
    }

    console.time('[findFilteredDonors] 3.repo.find (final page query)');
    const result = await remult.repo(Donor).find({
      where: whereClause,
      orderBy,
      ...(page && pageSize ? { page, limit: pageSize } : {})
    });
    console.timeEnd('[findFilteredDonors] 3.repo.find (final page query)');
    console.log(`[findFilteredDonors]   donors returned=${result.length}`);
    console.timeEnd('[findFilteredDonors] TOTAL');
    return result;
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
  static async countFilteredDonors(
    searchTerm?: string,
    additionalFilters?: Partial<GlobalFilters>,
    excludeIds?: string[]
  ): Promise<number> {
    console.log(`[countFilteredDonors] start - searchTerm="${searchTerm}", excludeIds=${excludeIds?.length ?? 0}`);
    console.time('[countFilteredDonors] TOTAL');
    const { GlobalFilterController } = await import('./global-filter.controller');

    console.time('[countFilteredDonors] 1.GlobalFilter.getDonorIds');
    const donorIds = await GlobalFilterController.getDonorIdsFromUserSettings();
    console.timeEnd('[countFilteredDonors] 1.GlobalFilter.getDonorIds');

    if (donorIds !== undefined && donorIds.length === 0) {
      console.timeEnd('[countFilteredDonors] TOTAL');
      return 0;
    }

    let whereClause: any = { isActive: true };
    if (donorIds) {
      whereClause.id = { $in: donorIds };
    }

    if (searchTerm && searchTerm.trim()) {
      console.time('[countFilteredDonors] 2.searchAcrossAllFields');
      const matchingIds = await DonorController.searchDonorIdsAcrossAllFields(searchTerm, donorIds);
      console.timeEnd('[countFilteredDonors] 2.searchAcrossAllFields');
      console.log(`[countFilteredDonors]   matchingIds=${matchingIds.length}`);
      if (matchingIds.length === 0) {
        console.timeEnd('[countFilteredDonors] TOTAL');
        return 0;
      }
      whereClause.id = { $in: matchingIds };
    }

    // Apply excludeIds at SQL level - keeps count in sync with paged data & select-all.
    if (!DonorController.applyExcludeIdsToWhere(whereClause, excludeIds)) {
      console.timeEnd('[countFilteredDonors] TOTAL');
      return 0;
    }

    console.time('[countFilteredDonors] 3.repo.count');
    const c = await remult.repo(Donor).count(whereClause);
    console.timeEnd('[countFilteredDonors] 3.repo.count');
    console.log(`[countFilteredDonors]   count=${c}`);
    console.timeEnd('[countFilteredDonors] TOTAL');
    return c;
  }

  private static escapeSqlLike(s: string): string {
    return s.replace(/'/g, "''").replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  private static buildIlikeClauses(columns: string[], words: string[]): string {
    const clauses: string[] = [];
    for (const word of words) {
      const ew = DonorController.escapeSqlLike(word);
      for (const col of columns) {
        clauses.push(`"${col}" ILIKE '%${ew}%'`);
      }
    }
    return `(${clauses.join(' OR ')})`;
  }

  private static buildInLiteral(ids: string[]): string {
    return ids.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
  }

  private static async sqlSelectIds(sqlDb: SqlDatabase, sql: string, col: string): Promise<string[]> {
    const { rows } = await sqlDb.execute(sql);
    return (rows as any[]).map((r: any) => r[col]).filter(Boolean);
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

    const sqlDb = remult.dataProvider as SqlDatabase;
    const nameCols = ['title', 'firstName', 'lastName', 'suffix', 'titleEnglish', 'firstNameEnglish', 'lastNameEnglish', 'suffixEnglish', 'idNumber'];

    // For each word, find all donor IDs matching in ANY field
    const perWordSets: Set<string>[] = [];

    for (const word of words) {
      const wordDonorIds = new Set<string>();

      // SELECT id only — avoids loading full Donor objects (ILIKE = case-insensitive)
      let nameSql = `SELECT "id" FROM "donors" WHERE ${DonorController.buildIlikeClauses(nameCols, [word])}`;
      if (restrictToDonorIds && restrictToDonorIds.length > 0) {
        nameSql += ` AND "id" IN (${DonorController.buildInLiteral(restrictToDonorIds)})`;
      }
      const nameIds = await DonorController.sqlSelectIds(sqlDb, nameSql, 'id');
      nameIds.forEach(id => wordDonorIds.add(id));

      // Search in contacts (phone/email) and places (address)
      const cpIds = await DonorController.searchDonorIdsFromContactsAndPlaces([word], restrictToDonorIds);
      cpIds.forEach(id => wordDonorIds.add(id));

      console.log(`[CrossFieldSearch] word="${word}" → nameMatches=${nameIds.length}, contactPlaceMatches=${cpIds.length}, totalUnique=${wordDonorIds.size}`);
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

  @BackendMethod({ allowed: Allow.authenticated })
  static async getInvitedDonorsPage(params: InvitedDonorsPageParams): Promise<InvitedDonorsPageResult> {
    const { page, pageSize, showOnlyIds, freeSearch, sortField = 'firstName', sortDirection = 'asc' } = params;

    let candidateIds = await DonorController.resolveGlobalCandidateIds();
    if (candidateIds !== null && candidateIds.length === 0) {
      return { rows: [], totalCount: 0, filterOptions: { countries: [], cities: [], neighborhoods: [] } };
    }

    if (showOnlyIds && showOnlyIds.length > 0) {
      const showSet = new Set(showOnlyIds);
      candidateIds = candidateIds ? candidateIds.filter(id => showSet.has(id)) : [...showSet];
    }

    if (freeSearch && freeSearch.trim()) {
      const searchIds = await DonorController.searchDonorIdsAcrossAllFields(freeSearch, candidateIds ?? undefined);
      candidateIds = searchIds;
    }

    const isFirstLoad = page === 1 && !showOnlyIds?.length && !freeSearch;

    const orderBy: any = sortField === 'lastName'
      ? { lastName: sortDirection, firstName: sortDirection }
      : { firstName: sortDirection, lastName: sortDirection };

    const pageWhere: any = { isActive: true };
    if (candidateIds) pageWhere.id = { $in: candidateIds };

    const [donors, totalCount] = await Promise.all([
      remult.repo(Donor).find({ where: pageWhere, orderBy, page, limit: pageSize }),
      candidateIds ? Promise.resolve(candidateIds.length) : remult.repo(Donor).count({ isActive: true })
    ]);

    const donorIds = donors.map(d => d.id);
    const [donorContacts, primaryPlacesMap] = await Promise.all([
      donorIds.length > 0
        ? remult.repo(DonorContact).find({ where: { donorId: { $in: donorIds }, isActive: true } })
        : Promise.resolve([]),
      donorIds.length > 0
        ? DonorPlace.getPrimaryForDonors(donorIds)
        : Promise.resolve(new Map<string, DonorPlace>())
    ]);

    const rows = DonorController.buildInvitedRows(donors, donorContacts, primaryPlacesMap);
    const filterOptions = isFirstLoad
      ? await DonorController.loadInvitedFilterOptions()
      : { countries: [], cities: [], neighborhoods: [] };

    return { rows, totalCount, filterOptions };
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getMatchingDonorIds(filters: DonorSelectionFilters): Promise<{ inclusiveIds: string[]; exclusiveIds: string[] }> {
    let candidateIds = await DonorController.resolveGlobalCandidateIds();
    if (candidateIds !== null && candidateIds.length === 0) {
      return { inclusiveIds: [], exclusiveIds: [] };
    }

    const [inclusiveIds, exclusiveIds] = await Promise.all([
      DonorController.resolveInclusiveIds(candidateIds, filters),
      DonorController.resolveExclusiveIds(candidateIds, filters)
    ]);

    return { inclusiveIds, exclusiveIds };
  }

  private static async resolveGlobalCandidateIds(): Promise<string[] | null> {
    const { GlobalFilterController } = await import('./global-filter.controller');
    return (await GlobalFilterController.getDonorIdsFromUserSettings()) ?? null;
  }

  private static async resolveInclusiveIds(candidateIds: string[] | null, filters: DonorSelectionFilters): Promise<string[]> {
    const hasInclusive = filters.isAnash || filters.isAlumni || filters.country || filters.city || filters.neighborhood || filters.circleId;
    if (!hasInclusive) return [];

    const where: any = { isActive: true };
    if (candidateIds) where.id = { $in: candidateIds };
    if (filters.isAnash) where.isAnash = true;
    if (filters.isAlumni) where.isAlumni = true;

    let donors = await remult.repo(Donor).find({ where, limit: 100000 });

    if (filters.circleId) {
      donors = donors.filter(d => d.circleIds?.includes(filters.circleId!));
    }

    let matchingIds = donors.map(d => d.id);

    if (filters.country || filters.city || filters.neighborhood) {
      matchingIds = await DonorController.filterDonorsByPlace(matchingIds, filters);
    }

    return matchingIds;
  }

  private static async resolveExclusiveIds(candidateIds: string[] | null, filters: DonorSelectionFilters): Promise<string[]> {
    if (!filters.excludeAnash && !filters.excludeAlumni) return [];

    const where: any = { isActive: true };
    if (candidateIds) where.id = { $in: candidateIds };

    if (filters.excludeAnash && filters.excludeAlumni) {
      where.$or = [{ isAnash: true }, { isAlumni: true }];
    } else if (filters.excludeAnash) {
      where.isAnash = true;
    } else {
      where.isAlumni = true;
    }

    const donors = await remult.repo(Donor).find({ where, limit: 100000 });
    return donors.map(d => d.id);
  }

  private static async filterDonorsByPlace(donorIds: string[], filters: DonorSelectionFilters): Promise<string[]> {
    const placeWhere: any = {};
    if (filters.city) placeWhere.city = filters.city;
    if (filters.neighborhood) placeWhere.neighborhood = filters.neighborhood;

    const places = await remult.repo(Place).find({ where: placeWhere, limit: 10000 });
    const filteredPlaces = filters.country
      ? places.filter(p => p.country?.name === filters.country)
      : places;

    const placeIds = filteredPlaces.map(p => p.id);
    if (placeIds.length === 0) return [];

    const donorIdSet = new Set(donorIds);
    const donorPlaces = await remult.repo(DonorPlace).find({
      where: { placeId: { $in: placeIds }, isActive: true },
      include: { place: true, addressType: true },
      limit: 100000
    });

    return [...new Set(
      donorPlaces.map(dp => dp.donorId).filter((id): id is string => !!id && donorIdSet.has(id))
    )];
  }

  private static async loadInvitedFilterOptions(): Promise<{ countries: string[]; cities: string[]; neighborhoods: string[] }> {
    const places = await remult.repo(Place).find({ limit: 10000 });
    const countries = [...new Set(places.map(p => p.country?.name).filter((n): n is string => !!n && n.trim() !== ''))].sort();
    const cities = [...new Set(places.map(p => p.city).filter((c): c is string => !!c && c.trim() !== ''))].sort();
    const neighborhoods = [...new Set(places.map(p => p.neighborhood).filter((n): n is string => !!n && n.trim() !== ''))].sort();
    return { countries, cities, neighborhoods };
  }

  private static buildInvitedRows(
    donors: Donor[],
    contacts: DonorContact[],
    primaryPlacesMap: Map<string, DonorPlace>
  ): InvitedDonorRow[] {
    const phoneMap = new Map<string, string>();
    const emailMap = new Map<string, string>();
    for (const c of contacts) {
      if (c.donorId) {
        if (c.phoneNumber && !phoneMap.has(c.donorId)) phoneMap.set(c.donorId, c.phoneNumber);
        if (c.email && !emailMap.has(c.donorId)) emailMap.set(c.donorId, c.email);
      }
    }
    return donors.map(d => {
      const dp = primaryPlacesMap.get(d.id);
      const place = dp?.place;
      return {
        id: d.id,
        firstName: d.firstName || '',
        lastName: d.lastName || '',
        isAnash: d.isAnash || false,
        isAlumni: d.isAlumni || false,
        level: d.level || '',
        circleIds: d.circleIds || [],
        fundraiserId: d.fundraiserId || undefined,
        contactPersonId: d.contactPersonId || undefined,
        phone: phoneMap.get(d.id) || '',
        email: emailMap.get(d.id) || '',
        city: place?.city || '',
        neighborhood: place?.neighborhood || '',
        country: place?.country?.name || ''
      };
    });
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

    const sqlDb = remult.dataProvider as SqlDatabase;
    const allDonorIds = new Set<string>();
    const restrictClause = restrictToDonorIds && restrictToDonorIds.length > 0
      ? ` AND "donorId" IN (${DonorController.buildInLiteral(restrictToDonorIds)})`
      : '';

    // donor_contacts: SELECT donorId only
    const contactSql = `SELECT "donorId" FROM "donor_contacts" WHERE "isActive" = true AND ${DonorController.buildIlikeClauses(['phoneNumber', 'email'], words)}${restrictClause}`;
    (await DonorController.sqlSelectIds(sqlDb, contactSql, 'donorId')).forEach(id => allDonorIds.add(id));

    // places: SELECT id only, then donor_places for donorIds
    const addrCols = ['fullAddress', 'city', 'street', 'houseNumber', 'building', 'apartment', 'neighborhood', 'state', 'postcode'];
    const placeIds = await DonorController.sqlSelectIds(sqlDb, `SELECT "id" FROM "places" WHERE ${DonorController.buildIlikeClauses(addrCols, words)}`, 'id');

    if (placeIds.length > 0) {
      const dpSql = `SELECT "donorId" FROM "donor_places" WHERE "isActive" = true AND "placeId" IN (${DonorController.buildInLiteral(placeIds)})${restrictClause}`;
      (await DonorController.sqlSelectIds(sqlDb, dpSql, 'donorId')).forEach(id => allDonorIds.add(id));
    }

    return [...allDonorIds];
  }
}