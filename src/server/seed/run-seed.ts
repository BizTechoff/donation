import { remult } from 'remult';
import { createPostgresConnection } from 'remult/postgres';
import { seedCountries } from './seed-countries';
import { seedDonorsWithCountries } from './seed-donors-with-countries';
import { seedLetterTitles } from './seed-letter-titles';

export async function runSeed() {
  try {
    console.log('Starting database seed...');

    // Connect to database
    remult.dataProvider = await createPostgresConnection({
      configuration: 'heroku',
      sslInDev: !(process.env['DEV_MODE'] === 'DEV')
    });

    // Seed countries first
    console.log('\n1. Seeding countries...');
    await seedCountries();

    // Seed donors with locations
    console.log('\n2. Seeding donors with country locations...');
    await seedDonorsWithCountries();

    // Seed letter titles (prefix and suffix lines)
    console.log('\n3. Seeding letter titles...');
    await seedLetterTitles();

    console.log('\n✅ Database seed completed successfully!');
    console.log('\nYou can now test the global filters with countries in both Hebrew and English.');
    console.log('Try filtering by: ישראל, Israel, אוסטרליה, Australia, etc.');

  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runSeed().then(() => {
    console.log('\nSeed process finished. Press Ctrl+C to exit.');
  }).catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}