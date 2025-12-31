import {
  Allow,
  Entity,
  Fields,
  IdEntity,
  isBackend,
  Validators,
} from 'remult'
import { Roles } from '../enum/roles'

@Entity<DonorAddressType>('donor_address_types', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (addressType) => {
    if (isBackend()) {
      if (addressType._.isNew()) {
        addressType.createdDate = new Date()
      }
      addressType.updatedDate = new Date()
    }
  },
})
export class DonorAddressType extends IdEntity {
  @Fields.string({
    validate: Validators.required,
    caption: 'שם סוג כתובת',
  })
  name = ''

  @Fields.string({
    caption: 'תיאור',
  })
  description = ''

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.createdAt({
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.updatedAt({
    caption: 'תאריך עדכון',
  })
  updatedDate = new Date()
}
