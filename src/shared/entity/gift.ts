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
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
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
    caption: 'מטבע',
    // Note: Stored as currency ID (e.g., 'ILS', 'USD')
    // Use getCurrencyType() from PayerService to get full CurrencyType object
  })
  currencyId = 'ILS'

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
