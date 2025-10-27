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

@Entity<DonorPlace>('donor_places', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Allow.authenticated,
  allowApiInsert: Allow.authenticated,
  saving: async (donorPlace) => {
    if (isBackend()) {
      if (donorPlace._.isNew()) {
        donorPlace.createdDate = new Date()
      }
      donorPlace.updatedDate = new Date()
    }
  },
})
export class DonorPlace extends IdEntity {
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
    caption: 'תיאור הכתובת',
    allowNull: true,
  })
  description = '' // e.g., "בית", "עבודה", "קיץ", "הורים" - kept for backwards compatibility

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
