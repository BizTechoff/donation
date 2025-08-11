import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  BackendMethod,
  Relations,
} from 'remult'
import { EmailField } from '../../app/common/fields/EmailField'
import { PhoneField } from '../../app/common/fields/PhoneField'
import { User } from './user'
import { Roles } from '../enum/roles'

@Entity<Donor>('donors', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (donor) => {
    if (isBackend()) {
      if (donor._.isNew()) {
        donor.createdDate = new Date()
      }
      donor.updatedDate = new Date()
    }
  },
})
export class Donor extends IdEntity {
  @Fields.string({
    validate: Validators.required,
    caption: 'שם פרטי',
  })
  firstName = ''

  @Fields.string({
    validate: Validators.required,
    caption: 'שם משפחה',
  })
  lastName = ''

  @Fields.string({
    caption: 'תעודת זהות',
    validate: [Validators.uniqueOnBackend],
  })
  idNumber = ''

  @EmailField({
    caption: 'דואר אלקטרוני',
  })
  email = ''

  @PhoneField({
    caption: 'טלפון',
  })
  phone = ''

  @Fields.string({
    caption: 'כתובת',
  })
  address = ''

  @Fields.string({
    caption: 'עיר',
  })
  city = ''

  @Fields.string({
    caption: 'מיקוד',
  })
  zipCode = ''

  @Fields.string({
    caption: 'מדינה',
  })
  country = 'ישראל'

  @Fields.number({
    caption: 'קו רוחב',
  })
  latitude?: number

  @Fields.number({
    caption: 'קו אורך',
  })
  longitude?: number

  @Fields.date({
    caption: 'תאריך לידה',
  })
  birthDate?: Date

  @Fields.string({
    caption: 'הערות',
  })
  notes = ''

  @Fields.boolean({
    caption: 'מעוניין בעדכונים',
  })
  wantsUpdates = true

  @Fields.boolean({
    caption: 'מעוניין בקבלות מס',
  })
  wantsTaxReceipts = true

  @Fields.string({
    caption: 'שפה מועדפת',
  })
  preferredLanguage: 'he' | 'en' | 'ar' = 'he'

  @Fields.string({
    caption: 'שפה מועדפת',
  })
  donorType: 'אחר' | 'קבוע' | 'זמני' = 'אחר'

  @Fields.boolean({
    caption: 'תורם פעיל',
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

  @Relations.toOne<Donor, User>(() => User, {
    caption: 'נוצר על ידי',
  })
  createdBy?: User

  @Fields.string({
    caption: 'נוצר על ידי ID',
  })
  createdById = ''

  get fullName() {
    return `${this.firstName} ${this.lastName}`.trim()
  }

  get displayName() {
    return this.fullName || this.email || this.phone || 'לא ידוע'
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async deactivate() {
    this.isActive = false
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async activate() {
    this.isActive = true
    await this.save()
  }
}