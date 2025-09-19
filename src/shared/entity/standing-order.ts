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
import { Donor } from './donor'
import { Campaign } from './campaign'
import { DonationMethod } from './donation-method'
import { User } from './user'
import { Roles } from '../enum/roles'

@Entity<StandingOrder>('standing_orders', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (order) => {
    if (isBackend()) {
      if (order._.isNew()) {
        order.createdDate = new Date()
      }
      order.updatedDate = new Date()
    }
  },
})
export class StandingOrder extends IdEntity {
  @Fields.number({
    validate: [Validators.required, Validators.min(1)],
    caption: 'סכום',
  })
  amount = 0

  @Fields.string({
    caption: 'מטבע',
  })
  currency = 'ILS'

  @Relations.toOne<StandingOrder, Donor>(() => Donor, {
    caption: 'תורם',
  })
  donor?: Donor

  @Fields.string({
    caption: 'תורם ID',
    validate: Validators.required,
  })
  donorId = ''

  @Relations.toOne<StandingOrder, Campaign>(() => Campaign, {
    caption: 'קמפיין',
  })
  campaign?: Campaign

  @Fields.string({
    caption: 'קמפיין ID',
  })
  campaignId = ''

  @Relations.toOne<StandingOrder, DonationMethod>(() => DonationMethod, {
    caption: 'אמצעי תשלום',
  })
  donationMethod?: DonationMethod

  @Fields.string({
    caption: 'אמצעי תשלום ID',
    validate: Validators.required,
  })
  donationMethodId = ''

  @Fields.string({
    caption: 'תדירות',
    validate: Validators.required,
  })
  frequency: 'monthly' | 'quarterly' | 'semiAnnual' | 'annual' = 'monthly'

  @Fields.date({
    caption: 'תאריך התחלה',
    validate: Validators.required,
  })
  startDate = new Date()

  @Fields.date({
    caption: 'תאריך סיום',
  })
  endDate?: Date

  @Fields.date({
    caption: 'תאריך ביצוע הבא',
  })
  nextExecutionDate?: Date

  @Fields.date({
    caption: 'תשלום הבא',
  })
  nextPaymentDate?: Date

  @Fields.number({
    caption: 'יום חיוב בחודש',
    validate: [Validators.min(1), Validators.max(31)],
  })
  dayOfMonth = 1

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.string({
    caption: 'סטטוס',
    validate: Validators.required,
  })
  status: 'active' | 'paused' | 'completed' | 'cancelled' = 'active'

  @Fields.string({
    caption: 'הערות',
  })
  notes = ''

  // Payment related fields
  @Fields.number({
    caption: 'מספר תשלומים',
    validate: [Validators.min(1)],
  })
  numberOfPayments = 12

  @Fields.number({
    caption: 'תשלומים שהושלמו',
  })
  completedPayments = 0

  @Fields.number({
    caption: 'תשלומים שנכשלו',
  })
  failedPayments = 0

  @Fields.number({
    caption: 'סכום כולל',
  })
  totalAmount = 0

  @Fields.number({
    caption: 'סכום ששולם',
  })
  processedAmount = 0

  @Fields.number({
    caption: 'יתרה לתשלום',
  })
  remainingAmount = 0

  // Payment method fields
  @Fields.string({
    caption: 'סוג תשלום',
  })
  paymentType: 'creditCard' | 'bankTransfer' | 'directDebit' = 'creditCard'

  @Fields.string({
    caption: 'שם בנק',
  })
  bankName = ''

  @Fields.string({
    caption: 'סניף בנק',
  })
  bankBranch = ''

  @Fields.string({
    caption: 'מספר חשבון',
  })
  bankAccount = ''

  @Fields.string({
    caption: 'מספר כרטיס (4 ספרות אחרונות)',
  })
  cardNumber = ''

  @Fields.string({
    caption: 'תוקף כרטיס',
  })
  cardExpiry = ''

  @Fields.string({
    caption: 'שם בעל הכרטיס',
  })
  cardHolderName = ''

  @Fields.boolean({
    caption: 'חידוש אוטומטי',
  })
  autoRenewal = true

  // Fundraiser
  @Relations.toOne<StandingOrder, User>(() => User, {
    caption: 'גייס',
  })
  fundraiser?: User

  @Fields.string({
    caption: 'גייס ID',
  })
  fundraiserId = ''

  @Fields.number({
    allowApiUpdate: false,
    caption: 'מספר חיובים שבוצעו',
  })
  executedCount = 0

  @Fields.number({
    allowApiUpdate: false,
    caption: 'סכום כולל שנחיב',
  })
  totalExecutedAmount = 0

  @Fields.date({
    allowApiUpdate: false,
    caption: 'חיוב אחרון',
  })
  lastExecutionDate?: Date

  @Fields.date({
    allowApiUpdate: false,
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.date({
    allowApiUpdate: false,
    caption: 'תאריख עדכון',
  })
  updatedDate = new Date()

  @Relations.toOne<StandingOrder, User>(() => User, {
    caption: 'נוצר על ידי',
  })
  createdBy?: User

  @Fields.string({
    caption: 'נוצר על ידי ID',
  })
  createdById = ''

  get frequencyText(): string {
    switch (this.frequency) {
      case 'monthly': return 'חודשי'
      case 'quarterly': return 'רבעוני'
      case 'semiAnnual': return 'חצי שנתי'
      case 'annual': return 'שנתי'
      default: return this.frequency
    }
  }

  get statusText(): string {
    switch (this.status) {
      case 'active': return 'פעיל'
      case 'paused': return 'מושהה'
      case 'completed': return 'הושלם'
      case 'cancelled': return 'בוטל'
      default: return this.status
    }
  }

  get isExpired(): boolean {
    if (!this.endDate) return false
    return new Date() > this.endDate
  }

  get daysUntilNextExecution(): number | null {
    if (!this.nextExecutionDate) return null
    const today = new Date()
    const diffTime = this.nextExecutionDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  get isOverdue(): boolean {
    if (!this.nextExecutionDate) return false
    return new Date() > this.nextExecutionDate
  }

  calculateNextExecutionDate(): Date {
    const baseDate = this.lastExecutionDate || this.startDate
    const nextDate = new Date(baseDate)
    
    switch (this.frequency) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3)
        break
      case 'semiAnnual':
        nextDate.setMonth(nextDate.getMonth() + 6)
        break
      case 'annual':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
    }
    
    // Set the day of month
    nextDate.setDate(Math.min(this.dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()))
    
    return nextDate
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async activate() {
    this.status = 'active'
    this.isActive = true
    this.nextExecutionDate = this.calculateNextExecutionDate()
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async pause() {
    this.status = 'paused'
    this.isActive = false
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async cancel() {
    this.status = 'cancelled'
    this.isActive = false
    this.nextExecutionDate = undefined
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async complete() {
    this.status = 'completed'
    this.isActive = false
    this.nextExecutionDate = undefined
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async recordExecution(executedAmount: number) {
    this.executedCount += 1
    this.totalExecutedAmount += executedAmount
    this.lastExecutionDate = new Date()
    this.nextExecutionDate = this.calculateNextExecutionDate()
    
    // Check if we should complete based on end date
    if (this.endDate && this.nextExecutionDate > this.endDate) {
      this.status = 'completed'
      this.isActive = false
      this.nextExecutionDate = undefined
    }
    
    await this.save()
  }
}