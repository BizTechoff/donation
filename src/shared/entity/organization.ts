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
import { Country } from './country'

@Entity<Organization>('organizations', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: [Roles.admin],
  saving: async (organization) => {
    if (isBackend()) {
      if (organization._.isNew()) {
        organization.createdDate = new Date()
      }
      organization.updatedDate = new Date()
    }
  },
})
export class Organization extends IdEntity {
  @Fields.string({
    validate: Validators.required,
    caption: 'שם העמותה',
  })
  name = ''

  @Fields.string({
    caption: 'כתובת',
  })
  address = ''

  @Fields.string({
    caption: 'עיר',
  })
  city = ''

  @Relations.toOne<Organization, Country>(() => Country, {
    caption: 'מדינה',
  })
  country?: Country

  @Fields.string({
    caption: 'מדינה ID',
  })
  countryId = ''

  @Fields.string({
    caption: 'מטבע',
  })
  currency = 'ILS'

  @Fields.string({
    caption: 'מספר חשבון',
  })
  accountNumber = ''

  @Fields.string({
    caption: 'מספר עמותה (ח"פ)',
  })
  registrationNumber = ''

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
