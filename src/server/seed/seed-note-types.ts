import { remult } from 'remult';
import { createPostgresConnection } from 'remult/postgres';
import { NoteType } from '../../shared/entity';

export async function seedNoteTypes() {
  try {
    console.log('Seeding note types...');

    // Connect to database
    remult.dataProvider = await createPostgresConnection({
      configuration: 'heroku',
      sslInDev: !(process.env['DEV_MODE'] === 'DEV')
    });

    const noteTypeNames = [
      'הערות',
      'הקשר לישיבה',
      'זיהוי אישי',
      'מקורבים',
      'סדרי עדיפויות',
      'פרוייקט חיים',
      'קטגורית תורן',
      'ריגושים',
      'שייכות מגזרית',
      'תחביבים אישיים'
    ];

    const createdNoteTypes = [];
    for (let i = 0; i < noteTypeNames.length; i++) {
      const name = noteTypeNames[i];
      const existing = await remult.repo(NoteType).findFirst({ name });
      if (!existing) {
        const noteType = remult.repo(NoteType).create({
          name,
          sortOrder: i,
          isActive: true
        });
        await remult.repo(NoteType).save(noteType);
        createdNoteTypes.push(noteType);
        console.log(`Note type '${name}' created`);
      } else {
        createdNoteTypes.push(existing);
        console.log(`Note type '${name}' already exists`);
      }
    }

    console.log(`✅ Seeded ${createdNoteTypes.length} note types`);
  } catch (error) {
    console.error('Error seeding note types:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedNoteTypes().then(() => {
    console.log('\nNote types seed completed. Press Ctrl+C to exit.');
  }).catch(error => {
    console.error('Note types seed failed:', error);
    process.exit(1);
  });
}
