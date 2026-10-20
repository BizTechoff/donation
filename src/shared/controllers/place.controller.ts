import { BackendMethod, remult, Allow, SqlDatabase } from 'remult'
import { Place } from '../entity/place'
import { DonorPlace } from '../entity/donor-place'
import { CityDuplicateGroup, CityVariant, groupDuplicateCities } from '../utils/city-matching'

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

    // E1 - only offer cities that an ACTIVE donor actually lives in. Until now
    // this counted every row in "places", so a city whose place was created
    // once and never linked to a donor still showed up in the filter (the
    // client demonstrated it with Alabama, Zoom א׳ 13:02-14:57).
    const { rows: linkedRows } = await (remult.dataProvider as SqlDatabase).execute(
      `SELECT DISTINCT dp."placeId"
         FROM "donor_places" dp
         JOIN "donors" d ON d."id" = dp."donorId"
        WHERE dp."isActive" = true AND d."isActive" = true`
    );
    const placeIdsWithDonors = new Set((linkedRows as any[]).map(r => r.placeId));

    // Group by city and count - only places that have a donor behind them
    const cityMap = new Map<string, CityData>();
    places.forEach(place => {
      if (place.city && placeIdsWithDonors.has(place.id)) {
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

/* ===========================================================================
 * סעיף 2 (E1) - ערים כפולות.
 *
 * שלב א׳: קריאה בלבד. המתודות כאן רק מדווחות מה המצב - הן לא כותבות דבר
 * ולא מוחקות דבר. האיחוד והמחיקה נכנסים אחרי שמוטי יראה את הקבוצות האמיתיות
 * ויאשר אותן.
 * ======================================================================== */

export interface CityDuplicatesReport {
  /** סך הערים השונות שנמצאו בטבלת places. */
  distinctCities: number
  groups: CityDuplicateGroup[]
  /** places שאף גורם לא מצביע עליהן - מועמדות למחיקה בשלב ב׳. */
  orphanPlaceCount: number
}

export class CityDuplicatesController {

  /**
   * דוח הערים הכפולות. אינו כותב דבר.
   *
   * ספירת התורמים היא של תורמים ייחודיים דרך donor_places פעילות - אותו
   * מקור שממנו נבנית רשימת הערים בסינון הגלובלי, כך שמה שמוצג כאן הוא מה
   * שהמשתמש באמת רואה שם.
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getDuplicatesReport(): Promise<CityDuplicatesReport> {
    const places = await remult.repo(Place).find({ limit: 100000 })
    const donorPlaces = await remult.repo(DonorPlace).find({ where: { isActive: true }, limit: 100000 })

    const donorsByPlace = new Map<string, Set<string>>()
    for (const dp of donorPlaces) {
      if (!dp.placeId || !dp.donorId) continue
      const set = donorsByPlace.get(dp.placeId)
      if (set) set.add(dp.donorId)
      else donorsByPlace.set(dp.placeId, new Set([dp.donorId]))
    }

    const byCity = new Map<string, {
      placeCount: number
      donors: Set<string>
      latSum: number
      lngSum: number
      geoCount: number
    }>()
    for (const place of places) {
      const city = place.city?.trim()
      if (!city) continue
      let entry = byCity.get(city)
      if (!entry) {
        entry = { placeCount: 0, donors: new Set<string>(), latSum: 0, lngSum: 0, geoCount: 0 }
        byCity.set(city, entry)
      }
      entry.placeCount++
      for (const donorId of donorsByPlace.get(place.id!) || []) entry.donors.add(donorId)

      // מרכז הכובד של הכתובות שעברו גיאוקודינג. כתובת בלי קואורדינטות פשוט
      // לא נספרת - היא לא מזיזה את המרכז ולא פוסלת את הגרסה.
      if (typeof place.latitude === 'number' && typeof place.longitude === 'number') {
        entry.latSum += place.latitude
        entry.lngSum += place.longitude
        entry.geoCount++
      }
    }

    const variants: CityVariant[] = [...byCity.entries()].map(([name, entry]) => ({
      name,
      placeCount: entry.placeCount,
      donorCount: entry.donors.size,
      geoCount: entry.geoCount,
      lat: entry.geoCount > 0 ? entry.latSum / entry.geoCount : undefined,
      lng: entry.geoCount > 0 ? entry.lngSum / entry.geoCount : undefined
    }))

    return {
      distinctCities: variants.length,
      groups: groupDuplicateCities(variants),
      orphanPlaceCount: await CityDuplicatesController.countOrphanPlaces()
    }
  }

  /**
   * places שאף רשומה לא מצביעה עליהן.
   *
   * חמישה גורמים, ולא ארבעה: donor_places, banks, companies, organizations -
   * וגם campaigns, שמצביע דרך "eventLocationId" ולא "placeId". סריקה לפי שם
   * העמודה לבדה מפספסת אותו, ואז כל מיקום אירוע נראה כיתום.
   *
   * אינו מוחק דבר.
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async countOrphanPlaces(): Promise<number> {
    // אותו דפוס שבשימוש ב-donor-map.controller.
    const sqlDb = remult.dataProvider as SqlDatabase
    const { rows } = await sqlDb.execute(`
      select count(*)::int as count
      from "places" p
      where not exists (select 1 from "donor_places"  dp where dp."placeId" = p."id")
        and not exists (select 1 from "banks"          b where  b."placeId" = p."id")
        and not exists (select 1 from "companies"      c where  c."placeId" = p."id")
        and not exists (select 1 from "organizations"  o where  o."placeId" = p."id")
        -- campaigns מצביע דרך eventLocationId ולא placeId (מיקום אירוע הדינער).
        -- בלי השורה הזו כל מיקום אירוע נספר כיתום, ומחיקה היתה מוחקת אותו.
        and not exists (select 1 from "campaigns"      ca where ca."eventLocationId" = p."id")
    `)
    return rows[0]?.count || 0
  }
}
