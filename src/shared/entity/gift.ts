import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields
} from 'remult'
import { Roles } from '../enum/roles'

@Entity<Gift>('gifts', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: [Roles.admin],
  saving: async (gift) => {
    if (isBackend()) {
      if (gift._.isNew()) {
        gift.createdDate = new Date()
      }
      gift.updatedDate = new Date()
    }
  },
})
export class Gift extends IdEntity {
  @Fields.string({
    validate: Validators.required,
    caption: 'שם המתנה',
  })
  name = ''

  @Fields.string({
    caption: 'תיאור',
  })
  description = ''

  @Fields.string({
    caption: 'קטגוריה',
  })
  category = ''

  @Fields.number({
    caption: 'ערך משוער',
  })
  estimatedValue = 0

  @Fields.string({
    caption: 'הערות',
  })
  notes = ''

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
