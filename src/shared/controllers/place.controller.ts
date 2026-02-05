import { BackendMethod, remult, Allow } from 'remult'
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
  }> {
    const donorPlaceRepo = remult.repo(DonorPlace)
    const placeRepo = remult.repo(Place)

    // Get all active donor-place links
    const donorPlaces = await donorPlaceRepo.find({
      where: { isActive: true }
    })

    // Get unique placeIds
    const placeIds = [...new Set(donorPlaces.map(dp => dp.placeId).filter(Boolean))] as string[]

    if (placeIds.length === 0) {
      return { cities: [], neighborhoods: [], countryIds: [] }
    }

    // Load only places that have donors
    const places = await placeRepo.find({
      where: { id: placeIds }
    })

    const citiesSet = new Set<string>()
    const neighborhoodsSet = new Set<string>()
    const countryIdsSet = new Set<string>()

    places.forEach(place => {
      if (place.city) citiesSet.add(place.city)
      if (place.neighborhood) neighborhoodsSet.add(place.neighborhood)
      if (place.countryId) countryIdsSet.add(place.countryId)
    })

    return {
      cities: Array.from(citiesSet).sort(),
      neighborhoods: Array.from(neighborhoodsSet).sort(),
      countryIds: Array.from(countryIdsSet)
    }
  }

  @BackendMethod({ allowed: true })
  static async loadBase(): Promise<{
    cities: string[];
    neighborhoods: string[];
  }> {
    const placeRepo = remult.repo(Place)

    // Get all active places
    const places = await placeRepo.find({
      orderBy: { city: 'asc' }
    })

    // Extract unique cities
    const citiesSet = new Set<string>()
    const neighborhoodsSet = new Set<string>()

    places.forEach(place => {
      if (place.city) {
        citiesSet.add(place.city)
      }
      if (place.neighborhood) {
        neighborhoodsSet.add(place.neighborhood)
      }
    })

    // Convert Sets to sorted arrays
    const cities = Array.from(citiesSet).sort()
    const neighborhoods = Array.from(neighborhoodsSet).sort()

    return {
      cities,
      neighborhoods
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
