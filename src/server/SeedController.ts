import { BackendMethod, remult } from 'remult';
import { seedCountries } from './seed-countries';
import { seedDatabase } from './seed';
import { Roles } from '../shared/enum/roles';
import { Country } from '../shared/entity/country';

export class SeedController {
  @BackendMethod({ allowed: [Roles.admin] })
  static async seedCountries() {
    console.log('Starting countries seeding...');
    const result = await seedCountries();
    console.log('Countries seeding completed:', result);
    return result;
  }

  @BackendMethod({ allowed: [Roles.admin] })
  static async seedDatabase() {
    console.log('Starting full database seeding...');
    const result = await seedDatabase();
    console.log('Database seeding completed');
    return 'Database seeding completed successfully!';
  }
}