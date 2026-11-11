import { Allow, Entity, Fields } from 'remult';
import { CreatedByField, UpdatedByField } from '../utils/audit-fields'

@Entity('letterTitles', {
  allowApiCrud: Allow.authenticated,
  caption: 'כותרות מכתב'
})
export class LetterTitle {
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
    caption: 'טקסט',
    validate: (letterTitle: LetterTitle) => {
      if (!letterTitle.text || letterTitle.text.trim() === '') {
        throw new Error('טקסט הכותרת הוא שדה חובה');
      }
    }
  })
  text = '';

  @Fields.string({
    caption: 'סוג כותרת'
  })
  type: 'prefix' | 'suffix' = 'prefix';

  @Fields.string({
    caption: 'קטגוריה',
    allowNull: true
  })
  category?: string;

  @Fields.string({
    caption: 'דפוס תבנית מכתב',
    allowNull: true
  })
  letterTypePattern?: string;

  @Fields.boolean({
    caption: 'ברירת מחדל'
  })
  isDefault = false;

  @Fields.integer({
    caption: 'סדר מיון',
    allowNull: true
  })
  sortOrder?: number;

  @Fields.boolean({
    caption: 'פעיל'
  })
  active = true;

  @Fields.createdAt({
    caption: 'תאריך יצירה'
  })
  createdAt = new Date();

  @Fields.updatedAt({
    caption: 'תאריך עדכון'
  })
  updatedAt = new Date();

  get typeDisplay() {
    return this.type === 'prefix' ? 'כותרת עליונה' : 'כותרת תחתונה';
  }
}
