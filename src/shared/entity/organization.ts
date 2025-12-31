import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations,
} from 'remult'
import { Roles } from '../enum/roles'
import { Place } from './place'

@Entity<Organization>('organizations', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (organization) => {
    if (isBackend()) {
      if (organization._.isNew()) {
        organization.createdDate = new Date()
      }
      organization.updatedDate = new Date()
    }
  },
})
export class Organization extends IdEntity {// ארגונים שתורמים בעצמם
  @Fields.string({
    validate: Validators.required,
    caption: 'שם העמותה',
  })
  name = ''

  @Fields.string()
  placeId?: string

  @Relations.toOne(() => Place, {
    field: "placeId",
    caption: 'כתובת',
    defaultIncluded: true
  })
  place?: Place

  @Fields.string({
    caption: 'מטבע',
    // Note: Stored as currency ID (e.g., 'ILS', 'USD')
    // Use getCurrencyType() from PayerService to get full CurrencyType object
  })
  currencyId = 'ILS'

  @Fields.string({
    caption: 'מספר חשבון',
  })
  accountNumber = ''

  @Fields.string({
    caption: 'מספר עמותה (ח"פ)',
  })
  registrationNumber = ''

  @Fields.string({
    caption: 'מזהה משלם',
  })
  payerIdentifier = ''

  @Fields.string({
    caption: 'טלפון',
  })
  phone = ''

  @Fields.string({
    caption: 'אימייל',
  })
  email = ''

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
