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

  // Additional personal fields
  @Fields.string({
    caption: 'שם בעל/אשה',
  })
  spouseName = ''

  @Fields.string({
    caption: 'מצב משפחתי',
  })
  maritalStatus: 'married' | 'single' | 'widowed' | 'divorced' | '' = ''

  @Fields.string({
    caption: 'טלפון בית',
  })
  homePhone = ''

  @Fields.string({
    caption: 'טלפון נייד',
  })
  mobilePhone = ''

  // Personal dates
  @Fields.date({
    caption: 'יום נישואין',
  })
  anniversaryDate?: Date

  @Fields.date({
    caption: 'יארצייט אב',
  })
  fatherYahrzeit?: Date

  @Fields.date({
    caption: 'יארצייט אם',
  })
  motherYahrzeit?: Date

  // Categories and levels
  @Fields.string({
    caption: 'רמה',
  })
  level: 'platinum' | 'gold' | 'silver' | 'regular' | '' = ''

  @Fields.string({
    caption: 'איזור',
  })
  region: 'center' | 'north' | 'south' | 'jerusalem' | '' = ''

  @Fields.string({
    caption: 'חוג',
  })
  circle = ''

  @Fields.string({
    caption: 'קבוצת גיל',
  })
  ageGroup: '18-30' | '31-45' | '46-60' | '60+' | '' = ''

  // Contact preferences
  @Fields.string({
    caption: 'שעות קבלה',
  })
  receptionHours = ''

  // Availability days
  @Fields.boolean({
    caption: 'זמין ביום ראשון',
  })
  sundayAvailable = false

  @Fields.boolean({
    caption: 'זמין ביום שני',
  })
  mondayAvailable = false

  @Fields.boolean({
    caption: 'זמין ביום שלישי',
  })
  tuesdayAvailable = false

  @Fields.boolean({
    caption: 'זמין ביום רביעי',
  })
  wednesdayAvailable = false

  @Fields.boolean({
    caption: 'זמין ביום חמישי',
  })
  thursdayAvailable = false

  @Fields.boolean({
    caption: 'זמין ביום שישי',
  })
  fridayAvailable = false

  @Fields.boolean({
    caption: 'זמין בשבת',
  })
  saturdayAvailable = false

  // Contact method preferences
  @Fields.boolean({
    caption: 'מעדיף טלפון',
  })
  preferPhone = false

  @Fields.boolean({
    caption: 'מעדיף אימייל',
  })
  preferEmail = false

  @Fields.boolean({
    caption: 'מעדיף SMS',
  })
  preferSMS = false

  @Fields.boolean({
    caption: 'מעדיף ביקור בבית',
  })
  preferHomeVisit = false

  @Fields.boolean({
    caption: 'מעדיף פגישה במשרד',
  })
  preferOfficeVisit = false

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