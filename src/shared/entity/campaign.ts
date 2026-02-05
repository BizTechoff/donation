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
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
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

  @Fields.string({
    caption: 'מטבע',
    // Note: Stored as currency ID (e.g., 'ILS', 'USD')
    // Use getCurrencyType() from PayerService to get full CurrencyType object
  })
  currencyId = 'ILS'

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
    field: 'createdById'
  })
  createdBy?: User

  @Fields.string({
    caption: 'נוצר על ידי ID',
  })
  createdById = ''

  @Fields.string({ caption: 'מזהה מיקום האירוע' })
  eventLocationId?: string;

  @Relations.toOne(() => Place, {
    field: "eventLocationId",
    caption: 'מיקום האירוע',
    defaultIncluded: true
  })
  eventLocation?: Place;

  @Fields.string({
    caption: 'סוג קמפיין',
  })
  campaignType: 'רגיל' | 'דינער' | '' = 'רגיל'

  @Fields.number({
    caption: 'תרומה סטנדרטית',
    validate: [Validators.min(0)],
  })
  defaultDonationAmount = 0

  @Fields.json({
    caption: 'מוזמנים שנבחרו',
  })
  invitedDonorIds: string[] = []

  @Fields.json({
    caption: 'פילטרי מוזמנים',
  })
  invitedDonorFilters: {
    selectedCountry?: string;
    selectedCity?: string;
    selectedNeighborhood?: string;
    selectedCircleId?: string;
    includeAlumni?: boolean;
    excludeAlumni?: boolean;
    showOnlySelected?: boolean;
    showSelectedFirst?: boolean;
    minAge?: number;
    maxAge?: number;
    excludeAnash?: boolean;
    isAnash?: boolean;
  } = {}

  get isExpired() {
    if (!this.endDate) return false
    return new Date() > this.endDate
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async activate() {
    this.isActive = true
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async complete() {
    this.isActive = false
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async cancel() {
    this.isActive = false
    await this.save()
  }

}