import {
  Allow,
  Entity,
  Fields,
  IdEntity,
  isBackend,
  Relations,
} from 'remult'
import { Donor } from './donor'
import { Place } from './place'

@Entity<DonorAddress>('donor_addresses', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Allow.authenticated,
  allowApiInsert: Allow.authenticated,
  saving: async (donorAddress) => {
    if (isBackend()) {
      if (donorAddress._.isNew()) {
        donorAddress.createdDate = new Date()
      }
      donorAddress.updatedDate = new Date()
    }
  },
})
export class DonorAddress extends IdEntity {
  @Fields.string({ caption: 'מזהה תורם' })
  donorId?: string;

  @Relations.toOne(() => Donor, {
    field: "donorId",
    caption: 'תורם',
    defaultIncluded: true
  })
  donor?: Donor;

  @Fields.string({ caption: 'מזהה מיקום' })
  placeId?: string;

  @Relations.toOne(() => Place, {
    field: "placeId",
    caption: 'מיקום',
    defaultIncluded: true
  })
  place?: Place;

  @Fields.string({
    caption: 'שם הכתובת',
    allowNull: false,
  })
  addressName = '' // e.g., "בית", "עבודה", "קיץ", "הורים"

  @Fields.boolean({
    caption: 'כתובת ראשית',
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
