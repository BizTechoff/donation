import {
  Allow,
  Entity,
  Fields,
  IdEntity,
  isBackend,
  Relations,
} from 'remult'
import { Donor } from './donor'

@Entity<DonorContact>('donor_contacts', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Allow.authenticated,
  allowApiInsert: Allow.authenticated,
  saving: async (donorContact) => {
    if (isBackend()) {
      if (donorContact._.isNew()) {
        donorContact.createdDate = new Date()
      }
      donorContact.updatedDate = new Date()
    }
  },
})
export class DonorContact extends IdEntity {
  @Fields.string({ caption: 'מזהה תורם' })
  donorId?: string;

  @Relations.toOne(() => Donor, {
    field: "donorId",
    caption: 'תורם',
    defaultIncluded: true
  })
  donor?: Donor;

  @Fields.string({
    caption: 'סוג',
    allowNull: false,
  })
  type = '' // 'phone' or 'email'

  @Fields.string({
    caption: 'מספר טלפון',
  })
  phoneNumber?: string

  @Fields.string({
    caption: 'אימייל',
  })
  email?: string

  @Fields.string({
    caption: 'קידומת',
  })
  prefix?: string

  @Fields.string({
    caption: 'תיאור',
  })
  description?: string

  @Fields.boolean({
    caption: 'ראשי',
  })
  isPrimary = false

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
