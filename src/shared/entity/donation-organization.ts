import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations,
} from 'remult'
import { Organization } from './organization'
import { Donation } from './donation'
import { Roles } from '../enum/roles'
import { CreatedByField, UpdatedByField } from '../utils/audit-fields'

@Entity<DonationOrganization>('donation_organizations', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin, Roles.secretary],
  allowApiInsert: Allow.authenticated,
  saving: async (donationOrganization) => {
    if (isBackend()) {
      if (donationOrganization._.isNew()) {
        donationOrganization.createdDate = new Date()
      }
      donationOrganization.updatedDate = new Date()
    }
  },
})
export class DonationOrganization extends IdEntity {
  // שלב ג׳ 9.1 - מי הזין ומי עדכן (shared/utils/audit-fields)
  @CreatedByField()
  createdById = ''

  @UpdatedByField()
  updatedById = ''

  @Relations.toOne<DonationOrganization, Donation>(() => Donation, {
    caption: 'תרומה',
    field: 'donationId'
  })
  donation?: Donation

  @Fields.string({
    caption: 'תרומה ID',
    validate: Validators.required,
  })
  donationId = ''

  @Relations.toOne<DonationOrganization, Organization>(() => Organization, {
    caption: 'עמותה',
    field: 'organizationId'
  })
  organization?: Organization

  @Fields.string({
    caption: 'עמותה ID',
    validate: Validators.required,
  })
  organizationId = ''

  @Fields.string({
    caption: 'שם משלם',
  })
  payerName = ''

  @Fields.string({
    caption: 'אסמכתא',
  })
  reference = ''

  @Fields.string({
    caption: 'מזהה תשלום',
    allowNull: true,
  })
  paymentIdentifier = ''

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
