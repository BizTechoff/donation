import { BackendMethod, Allow, remult } from 'remult';
import { Donor } from '../entity/donor';
import { Place } from '../entity/place';
import { Country } from '../entity/country';
import { GlobalFilters } from '../../app/services/global-filter.service';

export class DonorController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async findAll(): Promise<Donor[]> {
    return await remult.repo(Donor).find({
      orderBy: { lastName: 'asc' as 'asc' },
      include: {
        homePlace: true,
        vacationPlace: true
      }
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findActive(): Promise<Donor[]> {
    return await remult.repo(Donor).find({
      where: { isActive: true },
      orderBy: { lastName: 'asc' as 'asc' },
      include: {
        homePlace: true,
        vacationPlace: true
      }
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findFiltered(filters: GlobalFilters): Promise<Donor[]> {
    console.log('DonorController.findFiltered called with filters:', filters);
    let whereClause: any = { isActive: true };

    // Apply country filter - search in both Hebrew and English names
    if (filters.countryNames && filters.countryNames.length > 0) {
      console.log('DonorController: Applying country filter for:', filters.countryNames);
      // Find matching countries from the database
      const countryRepo = remult.repo(Country);
      const matchingCountries: Country[] = [];

      for (const countryName of filters.countryNames) {
        // Search by Hebrew name
        let countries = await countryRepo.find({
          where: { name: countryName }
        });
        matchingCountries.push(...countries);

        // Search by English name
        countries = await countryRepo.find({
          where: { nameEn: countryName }
        });
        matchingCountries.push(...countries);
      }

      // Remove duplicates by ID
      const uniqueCountries = Array.from(
        new Map(matchingCountries.map(c => [c.id, c])).values()
      );

      const countryIds = uniqueCountries.map(c => c.id);
      console.log(`DonorController: Found ${uniqueCountries.length} matching countries`);

      if (countryIds.length === 0) {
        console.log('DonorController: No matching countries found');
        return []; // No matching countries found
      }

      // Find places with matching country IDs
      // Also search in country and countryName fields for backward compatibility
      const allCountryNames = [
        ...filters.countryNames,
        ...uniqueCountries.map(c => c.name),
        ...uniqueCountries.map(c => c.nameEn)
      ].filter(Boolean);

      const matchingPlaces = await remult.repo(Place).find({
        where: {
          $or: [
            { countryId: { $in: countryIds } },
            { country: { $in: allCountryNames } },
            { countryName: { $in: allCountryNames } }
          ]
        }
      });

      const matchingPlaceIds = matchingPlaces.map(p => p.id);
      console.log(`DonorController: Found ${matchingPlaces.length} places matching countries`);
      console.log(`DonorController: Place IDs:`, matchingPlaceIds.slice(0, 5)); // Show first 5

      const donorsWithMatchingCountries = await remult.repo(Donor).find({
        where: {
          isActive: true,
          homePlaceId: { $in: matchingPlaceIds }
        },
        orderBy: { lastName: 'asc' as 'asc' },
        include: {
          homePlace: true,
          vacationPlace: true
        }
      });

      console.log(`DonorController: Found ${donorsWithMatchingCountries.length} donors with matching countries`);
      return donorsWithMatchingCountries;
    }

    return await remult.repo(Donor).find({
      where: whereClause,
      orderBy: { lastName: 'asc' as 'asc' },
      include: {
        homePlace: true,
        vacationPlace: true
      }
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async findById(id: string): Promise<Donor | null> {
    const donor = await remult.repo(Donor).findId(id, {
      include: {
        homePlace: true,
        vacationPlace: true
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

    // Apply country filter - search in both Hebrew and English names
    if (filters.countryNames && filters.countryNames.length > 0) {
      // Find matching countries from the database
      const countryRepo = remult.repo(Country);
      const matchingCountries: Country[] = [];

      for (const countryName of filters.countryNames) {
        // Search by Hebrew name
        let countries = await countryRepo.find({
          where: { name: countryName }
        });
        matchingCountries.push(...countries);

        // Search by English name
        countries = await countryRepo.find({
          where: { nameEn: countryName }
        });
        matchingCountries.push(...countries);
      }

      // Remove duplicates by ID
      const uniqueCountries = Array.from(
        new Map(matchingCountries.map(c => [c.id, c])).values()
      );

      const countryIds = uniqueCountries.map(c => c.id);
      console.log(`DonorController: Found ${uniqueCountries.length} matching countries`);

      if (countryIds.length === 0) {
        console.log('DonorController: No matching countries found');
        return 0; // No matching countries found - return 0 count
      }

      // Find places with matching country IDs
      // Also search in country and countryName fields for backward compatibility
      const allCountryNames = [
        ...filters.countryNames,
        ...uniqueCountries.map(c => c.name),
        ...uniqueCountries.map(c => c.nameEn)
      ].filter(Boolean);

      const matchingPlaces = await remult.repo(Place).find({
        where: {
          $or: [
            { countryId: { $in: countryIds } },
            { country: { $in: allCountryNames } },
            { countryName: { $in: allCountryNames } }
          ]
        }
      });

      const matchingPlaceIds = matchingPlaces.map(p => p.id);

      return await remult.repo(Donor).count({
        isActive: true,
        homePlaceId: { $in: matchingPlaceIds }
      });
    }

    return await remult.repo(Donor).count(whereClause);
  }
}