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
import { Roles } from '../enum/roles'
import { Place } from './place'
import { User } from './user'

@Entity<Campaign>('campaigns', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: [Roles.admin],
  saving: async (campaign) => {
    if (isBackend()) {
      if (campaign._.isNew()) {
        campaign.createdDate = new Date()
      }
      campaign.updatedDate = new Date()
    }
  },
})
export class Campaign extends IdEntity {
  @Fields.string({
    validate: [Validators.required, Validators.uniqueOnBackend],
    caption: 'שם הקמפיין',
  })
  name = ''

  @Fields.string({
    caption: 'תיאור',
  })
  description = ''

  @Fields.number({
    validate: [Validators.min(0)],
    caption: 'יעד כספי',
  })
  targetAmount = 0

  @Fields.number({
    allowApiUpdate: false,
    caption: 'סכום שנאסף',
  })
  raisedAmount = 0

  @Fields.string({
    caption: 'מטבע',
  })
  currency = 'ILS'

  @Fields.date({
    caption: 'תאריך התחלה',
    validate: Validators.required,
  })
  startDate = new Date()

  @Fields.date({
    caption: 'תאריך סיום',
  })
  endDate?: Date

  @Fields.boolean({
    caption: 'קמפיין פעיל',
  })
  isActive = true

  @Fields.boolean({
    caption: 'מוצג באתר',
  })
  isPublic = true

  @Fields.string({
    caption: 'קטגוריה',
  })
  category = ''

  @Fields.string({
    caption: 'תמונה',
  })
  imageUrl = ''

  @Fields.string({
    caption: 'קישור לעמוד',
  })
  websiteUrl = ''

  @Fields.string({
    caption: 'הערות פנימיות',
  })
  internalNotes = ''

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

  @Relations.toOne<Campaign, User>(() => User, {
    caption: 'נוצר על ידי',
  })
  createdBy?: User

  @Fields.string({
    caption: 'נוצר על ידי ID',
  })
  createdById = ''

  @Relations.toOne<Campaign, User>(() => User, {
    caption: 'אחראי קמפיין',
  })
  manager?: User

  @Fields.string({
    caption: 'אחראי קמפיין ID',
  })
  managerId = ''

  @Fields.string({
    caption: 'סטטוס',
    validate: Validators.required,
  })
  status: 'draft' | 'active' | 'completed' | 'cancelled' = 'draft'

  @Fields.string({ caption: 'מזהה מיקום האירוע' })
  eventLocationId?: string;

  @Relations.toOne(() => Place, {
    field: "eventLocationId",
    caption: 'מיקום האירוע',
    defaultIncluded: true
  })
  eventLocation?: Place;

  @Fields.boolean({
    caption: 'אנ"ש',
  })
  isAnash = false

  @Fields.string({
    caption: 'מעמד',
  })
  status2 = '' // Additional status field

  @Fields.string({
    caption: 'סוג קמפיין',
  })
  campaignType: 'רגיל' | 'דינער' | '' = 'רגיל'

  @Fields.date({
    caption: 'תאריך התחלה עברי',
  })
  hebrewStartDate?: Date

  @Fields.date({
    caption: 'תאריך סיום עברי',
  })
  hebrewEndDate?: Date

  // Invitation criteria fields
  @Fields.json({
    caption: 'רמות מוזמנים',
  })
  invitationLevels: string[] = []

  @Fields.boolean({
    caption: 'רק תושבי המדינה',
  })
  sameCountryOnly = false

  @Fields.number({
    caption: 'גיל מינימלי',
  })
  minAge?: number

  @Fields.number({
    caption: 'גיל מקסימלי',
  })
  maxAge?: number

  @Fields.string({
    caption: 'חוג',
  })
  socialCircle = ''

  @Fields.number({
    caption: 'תרומה סטנדרטית',
    validate: [Validators.min(0)],
  })
  defaultDonationAmount = 0

  // Exclusion criteria fields
  @Fields.boolean({
    caption: 'ללא אנ"ש',
  })
  excludeAnash = false

  @Fields.boolean({
    caption: 'ללא תושבי המדינה',
  })
  excludeSameCountry = false

  @Fields.json({
    caption: 'רמות מוחרגות',
  })
  excludedLevels: string[] = []

  get progressPercentage() {
    if (this.targetAmount === 0) return 0
    return Math.min(100, Math.round((this.raisedAmount / this.targetAmount) * 100))
  }

  get isExpired() {
    if (!this.endDate) return false
    return new Date() > this.endDate
  }

  get remainingAmount() {
    return Math.max(0, this.targetAmount - this.raisedAmount)
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async activate() {
    this.status = 'active'
    this.isActive = true
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async complete() {
    this.status = 'completed'
    this.isActive = false
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async cancel() {
    this.status = 'cancelled'
    this.isActive = false
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async updateRaisedAmount(amount: number) {
    this.raisedAmount += amount
    if (this.raisedAmount >= this.targetAmount && this.status === 'active') {
      this.status = 'completed'
    }
    await this.save()
  }
}