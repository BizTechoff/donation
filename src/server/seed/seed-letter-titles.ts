import { remult } from 'remult';
import { createPostgresConnection } from 'remult/postgres';
import { LetterTitle } from '../../shared/entity';

export async function seedLetterTitles() {
  try {
    console.log('Seeding letter titles...');

    // Connect to database
    remult.dataProvider = await createPostgresConnection({
      configuration: 'heroku',
      sslInDev: !(process.env['DEV_MODE'] === 'DEV')
    });

    // Prefix lines (שורות פתיחה)
    const prefixLines = [
      'כבוד ידידנו הנדיב הנכבד, אוהב תורה ורודף חסד',
      'לכבוד ידידנו היקר והנעלה',
      'כבוד ידידנו הנכבד והנדיב',
      'לידידנו הנעלה והיקר',
      'כבוד הרב הגאון והחסיד',
      'לכבוד החבר היקר'
    ];

    // Suffix lines (שורות סיום)
    const suffixLines = [
      'א כשר און א פרייליכען פסח',
      'א פרייליכען יום טוב',
      'בברכת גמר חתימה טובה',
      'בברכת הצלחה רבה וכט"ס',
      'בברכת כתיבה וחתימה טובה',
      'ביקרא דאורייתא וכט"ס',
      'בברכה והצלחה',
      'בכבוד רב ובברכה',
      'בברכת הרב',
      'בידידות ובברכה',
      'בכבוד ובהוקרה',
      'בברכת התורה',
      'בברכת חג שמח',
      'בברכת שבת שלום'
    ];

    const createdTitles = [];

    // Create prefix lines
    for (let i = 0; i < prefixLines.length; i++) {
      const text = prefixLines[i];
      const existing = await remult.repo(LetterTitle).findFirst({ text, type: 'prefix' });
      if (!existing) {
        const letterTitle = remult.repo(LetterTitle).create({
          text,
          type: 'prefix',
          sortOrder: i,
          active: true
        });
        await remult.repo(LetterTitle).save(letterTitle);
        createdTitles.push(letterTitle);
        console.log(`Prefix line '${text}' created`);
      } else {
        createdTitles.push(existing);
        console.log(`Prefix line '${text}' already exists`);
      }
    }

    // Create suffix lines
    for (let i = 0; i < suffixLines.length; i++) {
      const text = suffixLines[i];
      const existing = await remult.repo(LetterTitle).findFirst({ text, type: 'suffix' });
      if (!existing) {
        const letterTitle = remult.repo(LetterTitle).create({
          text,
          type: 'suffix',
          sortOrder: i,
          active: true
        });
        await remult.repo(LetterTitle).save(letterTitle);
        createdTitles.push(letterTitle);
        console.log(`Suffix line '${text}' created`);
      } else {
        createdTitles.push(existing);
        console.log(`Suffix line '${text}' already exists`);
      }
    }

    console.log(`✅ Seeded ${createdTitles.length} letter titles (${prefixLines.length} prefix, ${suffixLines.length} suffix)`);
  } catch (error) {
    console.error('Error seeding letter titles:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedLetterTitles().then(() => {
    console.log('\nLetter titles seed completed. Press Ctrl+C to exit.');
  }).catch(error => {
    console.error('Letter titles seed failed:', error);
    process.exit(1);
  });
}
