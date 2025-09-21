import {
  Allow,
  BackendMethod,
  Entity,
  Fields,
  IdEntity,
  Relations,
  Validators,
  isBackend
} from 'remult'
import { EmailField } from '../../app/common/fields/EmailField'
import { PhoneField } from '../../app/common/fields/PhoneField'
import { Roles } from '../enum/roles'
import { Place } from './place'
import { User } from './user'

export interface CompanyInfo {
  id: string
  name: string
  number: string
  role: string
  placeId?: string
  address: string
  neighborhood: string
  location: string
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
    allowNull: true,
    includeInApi: true,
    valueList: [
      // Hebrew titles
      '', 'גב\'', 'הבחור המופלג בתויר"ש כמר', 'הגאון החסיד ר\'', 'הגאון הרב', 'הגאון רבי',
      'הגה"ח ר\'', 'החתן המופלג בתויר"ש כמר', 'המשגיח הרה"ח ר\'', 'הנגיד הרה"ח ר\'', 'הר"ר',
      'הרב', 'הרבנית', 'הרה"ג ר\'', 'הרה"ח ר\'', 'הרה"צ ר\'', 'כ"ק אדמו"ר רבי', 'כ"ק מרן',
      'כמר', 'מג"ש בישיבתנו הרב', 'מוהרה"ח ר\'', 'מורינו הרה"ח ר\'', 'מר', 'מרן', 'מרת',
      'משפחת', 'ראש הישיבה', 'תלמידנו הרה"ח ר\'',
      // English titles
      'Family', 'Mr.', 'Mrs.', 'Mr. & Mrs.', 'Rabbi', 'Rabbi & Mrs.', 'Dr.', 'Dr. & Mrs.'
    ]
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

  // כתובות
  // @Relations.toOne(() => Place, {
  //   caption: 'כתובת מגורים',
  //   includeInApi: true,
  // })
  // homePlaceId?: string

  // @Field(() => Place, {
  //   // serverExpression: async (donor: Donor) => {
  //   //   if (!donor.homePlaceId) return undefined
  //   //   return await remult.repo(Place).findId(donor.homePlaceId)
  //   // },
  //   // includeInApi: true
  // })
  // homePlace?: Place

  @Fields.string()
  homePlaceId?: string;

  @Relations.toOne(() => Place, {
    field: "homePlaceId",
    defaultIncluded: true
  })
  homePlace?: Place;

  @Fields.string()
  vacationPlaceId?: string;

  @Relations.toOne(() => Place, {
    field: "vacationPlaceId",
    defaultIncluded: true
  })
  vacationPlace?: Place;

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

  get fullAddress(): string {
    return this.homePlace?.getDisplayAddress() || ''
  }

  get vacationAddress(): string {
    return this.vacationPlace?.getDisplayAddress() || ''
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