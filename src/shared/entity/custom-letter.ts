import { Allow, Entity, Fields, IdEntity, isBackend, Validators } from 'remult'
import { Letter } from '../enum/letter'
import { CreatedByField, UpdatedByField } from '../utils/audit-fields'
import { assertUniqueCatalogName, normalizeCatalogName } from '../utils/catalog-name'

/**
 * שלב ג׳ 5.4 - מכתב שהלקוח הוסיף, כשכפול של מכתב מובנה.
 *
 * רק השם ומכתב הבסיס. השדות והלוגיקה - של מכתב הבסיס; התבנית - קובץ במודול
 * הקבצים (DonationFile.letterId), ועד שהועלתה - התבנית של הבסיס.
 * הרשימה המאוחדת: shared/utils/letter-catalog.
 */
@Entity<CustomLetter>('custom_letters', {
  allowApiCrud: Allow.authenticated,
  allowApiDelete: false,
  caption: 'מכתבים שנוספו',
  defaultOrderBy: { caption: 'asc' },
  saving: async (letter) => {
    if (isBackend()) {
      letter.caption = normalizeCatalogName(letter.caption)
      // השם קובע את הקטגוריה ואת ברירות המחדל (LetterTitleDefault) - לא יכול
      // להיות זהה לשם של מכתב מובנה.
      if (Letter.getFields().some(l => l.caption === letter.caption)) {
        throw new Error(`"${letter.caption}" כבר קיים`)
      }
      await assertUniqueCatalogName(CustomLetter, 'caption', letter)
    }
  }
})
export class CustomLetter extends IdEntity {
  @CreatedByField()
  createdById = ''

  @UpdatedByField()
  updatedById = ''

  /** "קטגוריה / ... / שם" - כמו במכתבים המובנים; הקטגוריה נגזרת ממנו. */
  @Fields.string({ caption: 'שם המכתב', validate: Validators.required })
  caption = ''

  /** Letter.id של המכתב המובנה שממנו שוכפל. */
  @Fields.string({ caption: 'מכתב בסיס', validate: Validators.required })
  baseLetterId = ''

  @Fields.boolean({ caption: 'פעיל' })
  isActive = true

  @Fields.createdAt({ caption: 'תאריך יצירה' })
  createdDate = new Date()

  @Fields.updatedAt({ caption: 'תאריך עדכון' })
  updatedDate = new Date()
}
