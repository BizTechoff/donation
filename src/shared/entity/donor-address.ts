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
import { DonorAddressType } from './donor-address-type'

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

  @Fields.string({ caption: 'מזהה סוג כתובת' })
  addressTypeId?: string;

  @Relations.toOne(() => DonorAddressType, {
    field: "addressTypeId",
    caption: 'סוג כתובת',
    defaultIncluded: true
  })
  addressType?: DonorAddressType;

  @Fields.string({
    caption: 'שם הכתובת',
    allowNull: true,
  })
  addressName = '' // e.g., "בית", "עבודה", "קיץ", "הורים" - kept for backwards compatibility

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
