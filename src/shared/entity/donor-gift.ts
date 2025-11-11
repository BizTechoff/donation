import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations
} from 'remult'
import { Roles } from '../enum/roles'
import { Donor } from './donor'
import { Gift } from './gift'
import { Reminder } from './reminder'

@Entity<DonorGift>('donor_gifts', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: [Roles.admin],
  saving: async (donorGift) => {
    if (isBackend()) {
      if (donorGift._.isNew()) {
        donorGift.createdDate = new Date()
      }
      donorGift.updatedDate = new Date()
    }
  },
})
export class DonorGift extends IdEntity {
  @Fields.string({
    caption: 'תורם ID',
    validate: Validators.required,
  })
  donorId = ''

  @Relations.toOne<DonorGift, Donor>(() => Donor, {
    caption: 'תורם',
    field: 'donorId'
  })
  donor?: Donor

  @Fields.string({
    caption: 'מתנה ID',
    validate: Validators.required,
  })
  giftId = ''

  @Relations.toOne<DonorGift, Gift>(() => Gift, {
    caption: 'מתנה',
    field: 'giftId'
  })
  gift?: Gift

  @Fields.dateOnly({
    caption: 'תאריך מסירה',
    validate: Validators.required,
  })
  deliveryDate = new Date()

  @Fields.string({
    caption: 'הערות',
  })
  notes = ''

  @Fields.boolean({
    caption: 'נמסר',
  })
  isDelivered = false

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
