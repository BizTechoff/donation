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

@Entity<Bank>('banks', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: [Roles.admin],
  saving: async (bank) => {
    if (isBackend()) {
      if (bank._.isNew()) {
        bank.createdDate = new Date()
      }
      bank.updatedDate = new Date()
    }
  },
})
export class Bank extends IdEntity {
  
  @Fields.string({
    validate: Validators.required,
    caption: 'שם הבנק',
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
  })
  currency = 'ILS'

  @Fields.string({
    caption: 'מספר בנק',
  })
  bankCode = ''

  @Fields.string({
    caption: 'מספר סניף',
  })
  branchCode = ''

  @Fields.string({
    caption: 'טלפון',
  })
  phone = ''

  @Fields.string({
    caption: 'SWIFT/BIC',
  })
  swiftCode = ''

  @Fields.string({
    caption: 'IBAN',
  })
  iban = ''

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
