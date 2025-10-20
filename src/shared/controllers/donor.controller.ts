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
    console.log('DonorController.findFiltered called with filters:', filters);
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