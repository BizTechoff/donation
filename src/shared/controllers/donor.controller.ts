import { BackendMethod, Allow, remult } from 'remult';
import { Donor } from '../entity/donor';
import { Place } from '../entity/place';
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
    let whereClause: any = { isActive: true };

    // Apply country filter using nested query
    if (filters.countryNames && filters.countryNames.length > 0) {
      whereClause.homePlace = await remult.repo(Place).find({
        where: {
          country: { $in: filters.countryNames }
        }
      });
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

    // Apply country filter using nested query
    if (filters.countryNames && filters.countryNames.length > 0) {
      whereClause.homePlace = await remult.repo(Place).find({
        where: {
          country: { $in: filters.countryNames }
        }
      });
    }

    return await remult.repo(Donor).count(whereClause);
  }
}