import { Allow, Entity, Fields, IdEntity, Relations } from 'remult';
import { LetterTitle } from './letter-title';

@Entity('letterTitleDefaults', {
  allowApiCrud: Allow.authenticated,
  caption: 'ברירות מחדל לכותרות מכתב'
})
export class LetterTitleDefault extends IdEntity {

  @Fields.string({
    caption: 'מזהה כותרת',
    validate: (item: LetterTitleDefault) => {
      if (!item.letterTitleId || item.letterTitleId.trim() === '') {
        throw new Error('כותרת היא שדה חובה');
      }
    }
  })
  letterTitleId = '';

  @Relations.toOne<LetterTitleDefault, LetterTitle>(() => LetterTitle, 'letterTitleId')
  letterTitle?: LetterTitle;

  @Fields.string({
    caption: 'שם סוג מכתב',
    validate: (item: LetterTitleDefault) => {
      if (!item.letterName || item.letterName.trim() === '') {
        throw new Error('שם סוג מכתב הוא שדה חובה');
      }
    }
  })
  letterName = ''; // caption of Letter enum, e.g. 'שמחות / נישואין / בן', 'תרומות / מכתב תודה רגיל'

  @Fields.string({
    caption: 'מיקום'
  })
  position: 'prefix' | 'suffix' = 'prefix';

  @Fields.integer({
    caption: 'סדר מיון'
  })
  sortOrder = 0;

  @Fields.createdAt({
    caption: 'תאריך יצירה'
  })
  createdAt = new Date();

  @Fields.updatedAt({
    caption: 'תאריך עדכון'
  })
  updatedAt = new Date();

  get positionDisplay() {
    return this.position === 'prefix' ? 'פתיחה' : 'סגירה';
  }
}
