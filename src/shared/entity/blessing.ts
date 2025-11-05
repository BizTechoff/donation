import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations,
} from 'remult'
import { Campaign } from './campaign'
import { Donor } from './donor'
import { BlessingBookType } from './blessing-book-type'
import { Roles } from '../enum/roles'

@Entity<Blessing>('blessings', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (blessing) => {
    if (isBackend()) {
      if (blessing._.isNew()) {
        blessing.createdDate = new Date()
      }
      blessing.updatedDate = new Date()
    }
  },
})
export class Blessing extends IdEntity {
  @Fields.string({
    validate: Validators.required,
    caption: 'שם',
  })
  name = ''

  @Fields.string({
    caption: 'סוג ברכה',
  })
  blessingType: 'מוכנה' | 'מותאמת אישית' | 'לא נבחר' | '' = ''

  @Fields.string({
    caption: 'הערות',
  })
  notes = ''

  @Fields.string({
    caption: 'מצב',
  })
  status: 'ממתין' | 'אישר' | 'סירב' | 'בתהליך' | '' = 'ממתין'

  @Fields.string({
    caption: 'טלפון',
  })
  phone = ''

  @Fields.string({
    caption: 'נייד',
  })
  mobile = ''

  @Fields.string({
    caption: 'אימייל',
  })
  email = ''

  @Relations.toOne<Blessing, BlessingBookType>(() => BlessingBookType, {
    caption: 'סוג ברכה (גודל)',
    field: 'blessingBookTypeId'
  })
  blessingBookType?: BlessingBookType

  @Fields.string({
    caption: 'סוג ברכה ID',
  })
  blessingBookTypeId = ''

  @Fields.number({
    caption: 'סכום',
  })
  amount = 0

  @Fields.string({
    caption: 'תוכן הברכה',
  })
  blessingContent = ''

  @Fields.boolean({
    caption: 'ברכה מוכנה',
  })
  isPreMade = false

  @Fields.boolean({
    caption: 'דורש הכנה',
  })
  needsPreparation = false

  @Relations.toOne<Blessing, Campaign>(() => Campaign, {
    caption: 'קמפיין',
    field: 'campaignId'
  })
  campaign?: Campaign

  @Fields.string({
    caption: 'קמפיין ID',
  })
  campaignId = ''

  @Relations.toOne<Blessing, Donor>(() => Donor, {
    caption: 'תורם',
    field: 'donorId'
  })
  donor?: Donor

  @Fields.string({
    caption: 'תורם ID',
  })
  donorId = ''

  @Fields.boolean({
    caption: 'האם נשלח אימייל',
  })
  isEmailSent = false

  @Fields.date({
    caption: 'תאריך שליחת אימייל',
  })
  emailSentAt?: Date

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

  get displayName() {
    return this.name || 'ללא שם'
  }

  get statusDisplay() {
    switch (this.status) {
      case 'ממתין': return 'ממתין לתגובה'
      case 'אישר': return 'אישר השתתפות'
      case 'סירב': return 'סירב להשתתף'
      case 'בתהליך': return 'בתהליך עריכה'
      default: return 'לא צוין'
    }
  }

  get blessingTypeDisplay() {
    switch (this.blessingType) {
      case 'מוכנה': return 'ברכה מוכנה'
      case 'מותאמת אישית': return 'ברכה מותאמת אישית'
      case 'לא נבחר': return 'עדיין לא נבחר'
      default: return 'לא צוין'
    }
  }
}