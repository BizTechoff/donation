import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
} from 'remult'
import { Roles } from '../enum/roles'
import { CreatedByField, UpdatedByField } from '../utils/audit-fields'

@Entity<BlessingBookType>('blessing_book_types', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (blessingType) => {
    if (isBackend()) {
      if (blessingType._.isNew()) {
        blessingType.createdDate = new Date()
      }
      blessingType.updatedDate = new Date()
    }
  },
})
export class BlessingBookType extends IdEntity {
  // שלב ג׳ 9.1 - מי הזין ומי עדכן (shared/utils/audit-fields)
  @CreatedByField()
  createdById = ''

  @UpdatedByField()
  updatedById = ''

  @Fields.string({
    caption: 'סוג ברכה',
    validate: Validators.required,
  })
  type = ''

  @Fields.number({
    caption: 'מחיר',
    validate: Validators.required,
  })
  price = 0

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.date({
    allowApiUpdate: false,
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.date({
    allowApiUpdate: false,
    caption: 'תאריך עדכון',
  })
  updatedDate = new Date()
}
