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
import { Country } from './country'
import { Roles } from '../enum/roles'

export interface CompanyInfo {
  id: string
  name: string
  number: string
  role: string
  street1: string
  street2: string
  neighborhood: string
  city: string
  zipCode: string
  countryId: string
  phone: string
  email: string
  website: string
}

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
    caption: 'תואר',
  })
  title = ''

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
    caption: 'סיומת',
  })
  suffix = ''

  @Fields.string({
    caption: 'כינוי',
  })
  nickname = ''

  @Fields.string({
    caption: 'שם האשה',
  })
  wifeName = ''

  @Fields.string({
    caption: 'תואר האשה',
  })
  wifeTitle = ''

  @Fields.string({
    caption: 'שם פרטי באנגלית',
  })
  firstNameEnglish = ''

  @Fields.string({
    caption: 'שם משפחה באנגלית',
  })
  lastNameEnglish = ''

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

  @PhoneField({
    caption: 'טלפון נוסף',
  })
  additionalPhone = ''

  @Fields.string({
    caption: 'קידומת בינלאומית',
  })
  internationalPrefix = '+972'

  @Fields.string({
    caption: 'רחוב 1',
  })
  street1 = ''

  @Fields.string({
    caption: 'מספר בית',
  })
  houseNumber = ''

  @Fields.string({
    caption: 'רחוב 2',
  })
  street2 = ''

  @Fields.string({
    caption: 'עיר',
  })
  city = ''

  @Fields.string({
    caption: 'שכונה',
  })
  neighborhood = ''

  @Fields.string({
    caption: 'מיקוד',
  })
  zipCode = ''

  @Relations.toOne<Donor, Country>(() => Country, {
    caption: 'מדינה',
  })
  country?: Country

  @Fields.string({
    caption: 'מדינה ID',
  })
  countryId = ''

  @Fields.string({
    caption: 'כתובת נופש',
  })
  vacationAddress = ''

  @Fields.string({
    caption: 'עיר נופש',
  })
  vacationCity = ''

  @Fields.string({
    caption: 'מיקוד נופש',
  })
  vacationZipCode = ''

  @Fields.string({
    caption: 'מדינה נופש',
  })
  vacationCountry = ''

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
  preferredLanguage: 'he' | 'en' | 'yi' | '' = 'he'

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
    caption: 'שם האב',
  })
  fatherName = ''

  @Fields.string({
    caption: 'שם החותן',
  })
  fatherInLawName = ''

  @Fields.string({
    caption: 'קישור משפחתי',
  })
  familyConnection = ''

  @Fields.string({
    caption: 'הערות קישור משפחתי',
  })
  familyConnectionNotes = ''

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
  level: 'quarter' | 'half' | 'full' | 'bronze_lords' | 'silver_stones' | 'gold_pillars' | 'sapphire_diamond' | 'platinum' | 'patron' | 'torah_holder' | 'supreme_level_1' | 'supreme_level_2' | '' = ''

  @Fields.string({
    caption: 'חוג',
  })
  circle = ''

  // Donor characterization fields
  @Fields.boolean({
    caption: 'אנ"ש',
  })
  isAnash = false

  @Fields.boolean({
    caption: 'בוגר',
  })
  isAlumni = false

  @Fields.boolean({
    caption: 'קשר אחר',
  })
  isOtherConnection = false

  @Fields.string({
    caption: 'סוג קשר',
  })
  relationshipType = '' // אבא/סבא/ידיד

  @Fields.string({
    caption: 'קשר של',
  })
  relationshipOf = '' // שם האדם שהתורם קשור אליו

  @Fields.string({
    caption: 'ריגושים',
  })
  interests = ''

  @Fields.string({
    caption: 'תחביבים',
  })
  hobbies = ''

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
    caption: 'בתיאום טלפוני',
  })
  requirePhoneCoordination = false

  @Fields.boolean({
    caption: 'בזמנים מיוחדים: פסח/סוכות',
  })
  preferSpecialTimes = false

  @Fields.boolean({
    caption: 'בקבלת קהל',
  })
  preferPublicReception = false

  @Fields.boolean({
    caption: 'שליחת מכתבים באימייל בלבד',
  })
  emailOnlyCorrespondence = false

  @Fields.boolean({
    caption: 'הוספה אוטומטית לאירועים (לפי מיקום)',
  })
  autoAddToLocationEvents = false

  // Companies and Organizations fields
  @Fields.json({
    caption: 'חברות ועמותות',
  })
  companies: CompanyInfo[] = []

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
    const parts = []
    if (this.title) parts.push(this.title)
    if (this.firstName) parts.push(this.firstName)
    if (this.lastName) parts.push(this.lastName)
    if (this.suffix) parts.push(this.suffix)
    return parts.join(' ').trim()
  }

  get fullNameEnglish() {
    return `${this.firstNameEnglish} ${this.lastNameEnglish}`.trim()
  }

  get fullAddress() {
    const parts = []
    if (this.street1) parts.push(this.street1)
    if (this.street2) parts.push(this.street2)
    if (this.neighborhood) parts.push(this.neighborhood)
    if (this.city) parts.push(this.city)
    if (this.zipCode) parts.push(this.zipCode)
    if (this.country && this.country.name !== 'ישראל') parts.push(this.country.name)
    return parts.join(', ').trim()
  }

  get vacationFullAddress() {
    const parts = []
    if (this.vacationAddress) parts.push(this.vacationAddress)
    if (this.vacationCity) parts.push(this.vacationCity)
    if (this.vacationZipCode) parts.push(this.vacationZipCode)
    if (this.vacationCountry) parts.push(this.vacationCountry)
    return parts.join(', ').trim()
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