import { BackendMethod, remult, Allow, SqlDatabase } from 'remult'
import { Place } from '../entity/place'
import { DonorPlace } from '../entity/donor-place'

export interface CityData {
  city: string;
  countryId?: string;
  placeCount: number;
}

export interface NeighborhoodData {
  neighborhood: string;
  city?: string;
  countryId?: string;
  placeCount: number;
}

export class PlaceController {

  /**
   * Loads only cities/neighborhoods/countries that have donors linked via DonorPlace.
   * Used by global filters to show only relevant filter options.
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async loadBaseForDonors(): Promise<{
    cities: string[];
    neighborhoods: string[];
    countryIds: string[];
    countryNames: string[];  // נוסף עבור dropdown של פילטר מדינות (תצוגה ידידותית למשתמש)
  }> {
    // ── גרסה מקורית (שמורה): טעינת כל donor_places + places מלאים ל-memory. ~25MB.
    // const donorPlaceRepo = remult.repo(DonorPlace)
    // const placeRepo = remult.repo(Place)
    // const donorPlaces = await donorPlaceRepo.find({ where: { isActive: true } })
    // const placeIds = [...new Set(donorPlaces.map(dp => dp.placeId).filter(Boolean))] as string[]
    // if (placeIds.length === 0) return { cities: [], neighborhoods: [], countryIds: [] }
    // const places = await placeRepo.find({ where: { id: placeIds } })
    // const citiesSet = new Set<string>(); const neighborhoodsSet = new Set<string>(); const countryIdsSet = new Set<string>();
    // places.forEach(p => { if (p.city) citiesSet.add(p.city); if (p.neighborhood) neighborhoodsSet.add(p.neighborhood); if (p.countryId) countryIdsSet.add(p.countryId); })
    // return { cities: [...citiesSet].sort(), neighborhoods: [...neighborhoodsSet].sort(), countryIds: [...countryIdsSet] }

    // ── אופטימיזציה: SQL DISTINCT ב-3 שאילתות קצרות (אחת לכל שדה) - מחזירות רק ערכים ייחודיים.
    //    שאילתת המדינות כוללת JOIN ל-countries כדי להחזיר גם id וגם name.
    const sqlDb = remult.dataProvider as SqlDatabase
    const [citiesResult, neighborhoodsResult, countriesResult] = await Promise.all([
      sqlDb.execute(
        `SELECT DISTINCT p."city" FROM "places" p
         JOIN "donor_places" dp ON dp."placeId" = p."id"
         WHERE dp."isActive" = true AND p."city" IS NOT NULL AND p."city" != ''
         ORDER BY p."city"`
      ),
      sqlDb.execute(
        `SELECT DISTINCT p."neighborhood" FROM "places" p
         JOIN "donor_places" dp ON dp."placeId" = p."id"
         WHERE dp."isActive" = true AND p."neighborhood" IS NOT NULL AND p."neighborhood" != ''
         ORDER BY p."neighborhood"`
      ),
      sqlDb.execute(
        `SELECT DISTINCT c."id", c."name" FROM "places" p
         JOIN "donor_places" dp ON dp."placeId" = p."id"
         JOIN "countries" c ON c."id" = p."countryId"
         WHERE dp."isActive" = true
         ORDER BY c."name"`
      )
    ])
    return {
      cities: (citiesResult.rows as any[]).map(r => r.city),
      neighborhoods: (neighborhoodsResult.rows as any[]).map(r => r.neighborhood),
      countryIds: (countriesResult.rows as any[]).map(r => r.id),
      countryNames: (countriesResult.rows as any[]).map(r => r.name)
    }
  }

  @BackendMethod({ allowed: true })
  static async loadBase(): Promise<{
    cities: string[];
    neighborhoods: string[];
  }> {
    // ── גרסה מקורית (שמורה): טעינת כל places ב-memory. ~10MB.
    // const placeRepo = remult.repo(Place)
    // const places = await placeRepo.find({ orderBy: { city: 'asc' } })
    // const citiesSet = new Set<string>(); const neighborhoodsSet = new Set<string>();
    // places.forEach(p => { if (p.city) citiesSet.add(p.city); if (p.neighborhood) neighborhoodsSet.add(p.neighborhood); })
    // return { cities: [...citiesSet].sort(), neighborhoods: [...neighborhoodsSet].sort() }

    // ── אופטימיזציה: SQL DISTINCT.
    const sqlDb = remult.dataProvider as SqlDatabase
    const [citiesResult, neighborhoodsResult] = await Promise.all([
      sqlDb.execute(`SELECT DISTINCT "city" FROM "places" WHERE "city" IS NOT NULL AND "city" != '' ORDER BY "city"`),
      sqlDb.execute(`SELECT DISTINCT "neighborhood" FROM "places" WHERE "neighborhood" IS NOT NULL AND "neighborhood" != '' ORDER BY "neighborhood"`)
    ])
    return {
      cities: (citiesResult.rows as any[]).map(r => r.city),
      neighborhoods: (neighborhoodsResult.rows as any[]).map(r => r.neighborhood)
    }
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getCitiesForSelection(countryId?: string): Promise<{ cities: CityData[] }> {
    const placeRepo = remult.repo(Place);

    // Build query
    const where: any = {};
    if (countryId) {
      where.countryId = countryId;
    }

    // Get all places matching criteria
    const places = await placeRepo.find({
      where,
      orderBy: { city: 'asc' }
    });

    // Group by city and count
    const cityMap = new Map<string, CityData>();
    places.forEach(place => {
      if (place.city) {
        const existing = cityMap.get(place.city);
        if (existing) {
          existing.placeCount++;
        } else {
          cityMap.set(place.city, {
            city: place.city,
            countryId: place.countryId,
            placeCount: 1
          });
        }
      }
    });

    // Convert to array and sort
    const cities = Array.from(cityMap.values()).sort((a, b) => a.city.localeCompare(b.city));

    return { cities };
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getNeighborhoodsForSelection(city?: string, countryId?: string): Promise<{ neighborhoods: NeighborhoodData[] }> {
    const placeRepo = remult.repo(Place);

    // Build query
    const where: any = {};
    if (countryId) {
      where.countryId = countryId;
    }
    if (city) {
      where.city = city;
    }

    // Get all places matching criteria
    const places = await placeRepo.find({
      where,
      orderBy: { neighborhood: 'asc' }
    });

    // Group by neighborhood and count
    const neighborhoodMap = new Map<string, NeighborhoodData>();
    places.forEach(place => {
      if (place.neighborhood) {
        const existing = neighborhoodMap.get(place.neighborhood);
        if (existing) {
          existing.placeCount++;
        } else {
          neighborhoodMap.set(place.neighborhood, {
            neighborhood: place.neighborhood,
            city: place.city,
            countryId: place.countryId,
            placeCount: 1
          });
        }
      }
    });

    // Convert to array and sort
    const neighborhoods = Array.from(neighborhoodMap.values()).sort((a, b) =>
      a.neighborhood.localeCompare(b.neighborhood)
    );

    return { neighborhoods };
  }
}
