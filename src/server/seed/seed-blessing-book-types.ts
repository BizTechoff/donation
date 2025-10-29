import { remult } from 'remult';
import { createPostgresConnection } from 'remult/postgres';
import { BlessingBookType } from '../../shared/entity/blessing-book-type';

export async function seedBlessingBookTypes() {
  try {
    console.log('Seeding blessing book types...');

    // Connect to database
    remult.dataProvider = await createPostgresConnection({
      configuration: 'heroku',
      sslInDev: !(process.env['DEV_MODE'] === 'DEV')
    });

    const blessingBookTypes = [
      { type: 'רבע', price: 250 },
      { type: 'חצי', price: 360 },
      { type: 'שלם', price: 500 },
      { type: 'אדני נחושת', price: 600 },
      { type: 'אבני כסף', price: 750 },
      { type: 'עמודי זהב', price: 1000 },
      { type: 'ספיר ויהלום', price: 2000 },
      { type: 'פלאטיניום', price: 2500 },
      { type: 'פטרון', price: 3600 },
      { type: 'מחזיק תורה', price: 5000 },
      { type: 'עץ חיים', price: 10000 },
      { type: 'כתר תורה', price: 18000 }
    ];

    const createdTypes = [];
    for (const typeData of blessingBookTypes) {
      const existing = await remult.repo(BlessingBookType).findFirst({ type: typeData.type });
      if (!existing) {
        const blessingType = remult.repo(BlessingBookType).create({
          type: typeData.type,
          price: typeData.price,
          isActive: true
        });
        await remult.repo(BlessingBookType).save(blessingType);
        createdTypes.push(blessingType);
        console.log(`Blessing book type '${typeData.type}' (₪${typeData.price}) created`);
      } else {
        createdTypes.push(existing);
        console.log(`Blessing book type '${typeData.type}' already exists`);
      }
    }

    console.log(`✅ Seeded ${createdTypes.length} blessing book types`);
  } catch (error) {
    console.error('Error seeding blessing book types:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedBlessingBookTypes().then(() => {
    console.log('\nBlessing book types seed completed. Press Ctrl+C to exit.');
  }).catch(error => {
    console.error('Blessing book types seed failed:', error);
    process.exit(1);
  });
}
