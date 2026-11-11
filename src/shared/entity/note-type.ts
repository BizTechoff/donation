import { Allow, Entity, Fields } from 'remult';
import { CreatedByField, UpdatedByField } from '../utils/audit-fields'

@Entity('noteTypes', {
  allowApiCrud: Allow.authenticated,
  caption: 'סוגי הערות'
})
export class NoteType {
  // שלב ג׳ 9.1 - מי הזין ומי עדכן (shared/utils/audit-fields)
  @CreatedByField()
  createdById = ''

  @UpdatedByField()
  updatedById = ''

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
