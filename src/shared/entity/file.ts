import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations,
} from 'remult'
import { Donation } from './donation'
import { User } from './user'
import { Roles } from '../enum/roles'

@Entity<DonationFile>('files', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (donationFile) => {
    if (isBackend()) {
      if (donationFile._.isNew()) {
        donationFile.createdDate = new Date()
      }
      donationFile.updatedDate = new Date()
    }
  },
})
export class DonationFile extends IdEntity {
  @Fields.string({
    caption: 'שם קובץ',
    validate: Validators.required,
  })
  fileName = ''

  @Fields.string({
    caption: 'נתיב קובץ',
    validate: Validators.required,
  })
  filePath = ''

  @Fields.string({
    caption: 'סוג קובץ',
  })
  fileType = ''

  @Fields.number({
    caption: 'גודל קובץ',
  })
  fileSize = 0

  @Relations.toOne<DonationFile, Donation>(() => Donation, {
    caption: 'תרומה',
    field: 'donationId'
  })
  donation?: Donation

  @Fields.string({
    caption: 'תרומה ID',
  })
  donationId = ''

  @Fields.string({
    caption: 'תעודה ID',
  })
  certificateId = ''

  @Fields.string({
    caption: 'תיאור',
  })
  description = ''

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

  @Relations.toOne<DonationFile, User>(() => User, {
    caption: 'הועלה על ידי',
    field: 'uploadedById'
  })
  uploadedBy?: User

  @Fields.string({
    caption: 'הועלה על ידי ID',
  })
  uploadedById = ''
}