import { Allow, Entity, Fields, IdEntity, isBackend } from 'remult'
import { assertUniqueCatalogName, normalizeCatalogName } from '../utils/catalog-name'
import { CreatedByField, UpdatedByField } from '../utils/audit-fields'

/**
 * שלב ג׳ 7.4 - סוגי התזכורת כקטלוג שהמשתמש מנהל: הוספה ועריכת שם.
 *
 * התזכורת שומרת רק את הקוד (reminders.type), והשם יושב כאן בלבד - כך שתיקון
 * שם במקום אחד מתעדכן ברשימה, בחלון, בסינון, בהדפסה, בייצוא ובמיון.
 *
 * 12 סוגי המערכת נטענים פעם אחת עם הקודים הקיימים (server/reminder-types.ts),
 * ולכן אין מיגרציה לתזכורות. את שמם אפשר לשנות; את הקוד לא, ואין מחיקה -
 * הקוד מזהה תזכורות שנוצרות אוטומטית מתרומה, מתנה ותעודה. במקום מחיקה: isActive.
 */
@Entity<ReminderType>('reminderTypes', {
  allowApiCrud: Allow.authenticated,
  allowApiDelete: false,
  caption: 'סוגי תזכורת',
  defaultOrderBy: { sortOrder: 'asc', name: 'asc' },
  saving: async (type) => {
    if (isBackend()) {
      type.name = normalizeCatalogName(type.name)
      await assertUniqueCatalogName(ReminderType, 'name', type)
      // סוג שהמשתמש הוסיף מקבל קוד אוטומטי. הקוד לא נכתב מהקליינט (allowApiUpdate: false).
      if (type._.isNew() && !type.code) type.code = 'custom_' + Date.now().toString(36)
    }
  }
})
export class ReminderType extends IdEntity {
  // שלב ג׳ 9.1 - מי הזין ומי עדכן (shared/utils/audit-fields)
  @CreatedByField()
  createdById = ''

  @UpdatedByField()
  updatedById = ''

  @Fields.string({ caption: 'קוד', allowApiUpdate: false })
  code = ''

  @Fields.string({ caption: 'שם הסוג' })
  name = ''

  @Fields.integer({ caption: 'סדר מיון' })
  sortOrder = 0

  @Fields.boolean({ caption: 'פעיל' })
  isActive = true

  @Fields.boolean({ caption: 'סוג מערכת', allowApiUpdate: false })
  isSystem = false

  @Fields.createdAt({ caption: 'תאריך יצירה' })
  createdDate = new Date()

  @Fields.updatedAt({ caption: 'תאריך עדכון' })
  updatedDate = new Date()
}
