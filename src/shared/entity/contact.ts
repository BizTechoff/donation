import {
  Allow,
  Entity,
  Fields,
  IdEntity,
  Relations,
  Validators,
  isBackend
} from 'remult'
import { Roles } from '../enum/roles'
import { Donor } from './donor'

@Entity<Contact>('contacts', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (contact) => {
    if (isBackend()) {
      if (contact._.isNew()) {
        contact.createdDate = new Date()
      }
      contact.updatedDate = new Date()
    }
  },
})
export class Contact extends IdEntity {
  @Fields.string({
    caption: 'שם פרטי',
    validate: Validators.required
  })
  firstName = ''

  @Fields.string({
    caption: 'שם משפחה',
    validate: Validators.required
  })
  lastName = ''

  @Fields.string({
    caption: 'תפקיד'
  })
  position = ''

  @Fields.string({
    caption: 'טלפון',
    validate: Validators.required
  })
  phone = ''

  @Fields.string({
    caption: 'טלפון נוסף'
  })
  phone2 = ''

  @Fields.string({
    caption: 'דוא"ל',
    validate: Validators.email
  })
  email = ''

  @Fields.string({
    caption: 'כתובת'
  })
  address = ''

  @Relations.toOne<Contact, Donor>(() => Donor, {
    caption: 'תורם משויך',
    field: 'donorId'
  })
  donor?: Donor

  @Fields.string({
    caption: 'תורם ID'
  })
  donorId = ''

  @Fields.string({
    caption: 'הערות'
  })
  notes = ''

  @Fields.boolean({
    caption: 'איש קשר ראשי'
  })
  isPrimary = false

  @Fields.date({
    allowApiUpdate: false,
    caption: 'תאריך יצירה'
  })
  createdDate = new Date()

  @Fields.date({
    allowApiUpdate: false,
    caption: 'תאריך עדכון'
  })
  updatedDate = new Date()
}