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
import { User } from './user'
import { Donor } from './donor'
import { Reminder } from './reminder'
import { Roles } from '../enum/roles'

@Entity<Certificate>('certificates', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (certificate) => {
    if (isBackend()) {
      if (certificate._.isNew()) {
        certificate.createdDate = new Date()
      }
      certificate.updatedDate = new Date()
    }
  },
})
export class Certificate extends IdEntity {
  @Fields.string({
    validate: Validators.required,
    caption: 'סוג תעודה',
  })
  type: 'donation' | 'memorial' | 'memorialDay' | 'appreciation' = 'memorialDay'

  @Fields.string({
    caption: 'טקסט סוג התעודה',
  })
  typeText = ''

  @Relations.toOne<Certificate, Donor>(() => Donor, {
    caption: 'תורם',
    field: 'donorId'
  })
  donor?: Donor

  @Fields.string({
    caption: 'תורם ID',
    validate: Validators.required,
  })
  donorId = ''

  @Fields.string({
    caption: 'שם המקבל/נהנה',
  })
  recipientName = ''

  @Fields.number({
    caption: 'סכום התרומה',
  })
  amount?: number

  @Fields.string({
    caption: 'שם האירוע',
  })
  eventName = ''

  @Fields.date({
    caption: 'תאריך האירוع',
    validate: Validators.required,
  })
  eventDate = new Date()

  @Fields.string({
    caption: 'כותרת ראשית',
  })
  mainTitle = ''

  @Fields.string({
    caption: 'טקסט מרכזי',
  })
  mainText = ''

  @Fields.string({
    caption: 'הקדשה מיוחדת',
  })
  specialText = ''

  @Fields.string({
    caption: 'תאריך עברי',
  })
  hebrewDate = ''

  @Fields.string({
    caption: 'חתימה',
  })
  signature = ''

  @Fields.string({
    caption: 'תבנית עיצוב',
  })
  template: 'classic' | 'modern' | 'elegant' = 'classic'

  @Fields.string({
    caption: 'גודל נייר',
  })
  paperSize: 'a4' | 'a3' | 'letter' = 'a4'

  @Fields.string({
    caption: 'כיוון הדף',
  })
  orientation: 'portrait' | 'landscape' = 'portrait'

  @Fields.string({
    caption: 'סטטוס התעודה',
  })
  status: 'draft' | 'ready' | 'printed' | 'delivered' = 'draft'

  @Fields.string({
    caption: 'טקסט סטטוס',
  })
  statusText = ''

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

  @Relations.toOne<Certificate, User>(() => User, {
    caption: 'נוצר על ידי',
    field: 'createdById'
  })
  createdBy?: User

  @Fields.string({
    caption: 'נוצר על ידי ID',
  })
  createdById = ''

  @Fields.json({
    caption: 'קבצים מצורפים',
  })
  attachments: Array<{
    name: string
    path: string
    size: number
  }> = []

  get displayName() {
    return `${this.typeText} - ${this.recipientName}`
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async markAsPrinted() {
    this.status = 'printed'
    this.statusText = 'הודפס'
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async markAsDelivered() {
    this.status = 'delivered'
    this.statusText = 'נמסר'
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async markAsReady() {
    this.status = 'ready'
    this.statusText = 'מוכן להדפסה'
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async backToDraft() {
    this.status = 'draft'
    this.statusText = 'טיוטה'
    await this.save()
  }
}