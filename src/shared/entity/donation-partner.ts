import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations,
} from 'remult'
import { Donor } from './donor'
import { Donation } from './donation'
import { Roles } from '../enum/roles'

@Entity<DonationPartner>('donation_partners', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (donationPartner) => {
    if (isBackend()) {
      if (donationPartner._.isNew()) {
        donationPartner.createdDate = new Date()
      }
      donationPartner.updatedDate = new Date()
    }
  },
})
export class DonationPartner extends IdEntity {
  @Relations.toOne<DonationPartner, Donation>(() => Donation, {
    caption: 'תרומה',
    field: 'donationId'
  })
  donation?: Donation

  @Fields.string({
    caption: 'תרומה ID',
    validate: Validators.required,
  })
  donationId = ''

  @Relations.toOne<DonationPartner, Donor>(() => Donor, {
    caption: 'שותף תורם',
    field: 'partnerId'
  })
  partner?: Donor

  @Fields.string({
    caption: 'שותף תורם ID',
    validate: Validators.required,
  })
  partnerId = ''

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