import { Entity, Fields } from 'remult';

@Entity('noteTypes', {
  allowApiCrud: true,
  caption: 'סוגי הערות'
})
export class NoteType {
  @Fields.uuid({
    caption: 'מזהה'
  })
  id = '';

  @Fields.string({
    caption: 'שם סוג ההערה',
    validate: (noteType: NoteType) => {
      if (!noteType.name || noteType.name.trim() === '') {
        throw new Error('שם סוג ההערה הוא שדה חובה');
      }
    }
  })
  name = '';

  @Fields.integer({
    caption: 'סדר מיון',
    allowNull: true
  })
  sortOrder?: number;

  @Fields.boolean({
    caption: 'פעיל'
  })
  isActive = true;

  @Fields.createdAt({
    caption: 'תאריך יצירה'
  })
  createdAt = new Date();

  @Fields.updatedAt({
    caption: 'תאריך עדכון'
  })
  updatedAt = new Date();
}
