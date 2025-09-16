import { BackendMethod, remult } from 'remult';
import { seedCountries } from './seed-countries';
import { Roles } from '../shared/enum/roles';

export class SeedController {
  @BackendMethod({ allowed: [Roles.admin] })
  static async seedCountries() {
    console.log('Starting countries seeding...');
    const result = await seedCountries();
    console.log('Countries seeding completed:', result);
    return result;
  }

  @BackendMethod({ allowed: [Roles.admin] })
  static async seedAllData() {
    console.log('Starting full database seeding...');

    // Seed countries first
    const countriesResult = await seedCountries();

    // Add more seed functions here in the future
    // const usersResult = await seedUsers();
    // const donorsResult = await seedDonors();

    return {
      countries: countriesResult,
      // users: usersResult,
      // donors: donorsResult,
    };
  }
}