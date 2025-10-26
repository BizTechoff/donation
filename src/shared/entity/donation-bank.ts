import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations,
} from 'remult'
import { Bank } from './bank'
import { Donation } from './donation'
import { Roles } from '../enum/roles'

@Entity<DonationBank>('donation_banks', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (donationBank) => {
    if (isBackend()) {
      if (donationBank._.isNew()) {
        donationBank.createdDate = new Date()
      }
      donationBank.updatedDate = new Date()
    }
  },
})
export class DonationBank extends IdEntity {
  @Relations.toOne<DonationBank, Donation>(() => Donation, {
    caption: 'תרומה',
    field: 'donationId'
  })
  donation?: Donation

  @Fields.string({
    caption: 'תרומה ID',
    validate: Validators.required,
  })
  donationId = ''

  @Relations.toOne<DonationBank, Bank>(() => Bank, {
    caption: 'בנק',
    field: 'bankId'
  })
  bank?: Bank

  @Fields.string({
    caption: 'בנק ID',
    validate: Validators.required,
  })
  bankId = ''

  @Fields.string({
    caption: 'שם משלם',
  })
  payerName = ''

  @Fields.string({
    caption: 'אסמכתא',
  })
  reference = ''

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
