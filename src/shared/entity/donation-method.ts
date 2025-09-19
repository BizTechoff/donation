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
import { Roles } from '../enum/roles'

@Entity<DonationMethod>('donation_methods', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: [Roles.admin],
  saving: async (method) => {
    if (isBackend()) {
      if (method._.isNew()) {
        method.createdDate = new Date()
      }
      method.updatedDate = new Date()
    }
  },
})
export class DonationMethod extends IdEntity {
  @Fields.string({
    validate: [Validators.required, Validators.uniqueOnBackend],
    caption: 'שם אמצעי התשלום',
  })
  name = ''

  @Fields.string({
    caption: 'תיאור',
  })
  description = ''

  @Fields.string({
    caption: 'סוג',
    validate: Validators.required,
  })
  type: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'crypto' | 'other' = 'cash'

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.boolean({
    caption: 'דורש אישור',
  })
  requiresApproval = false

  @Fields.boolean({
    caption: 'אמצעי מקוון',
  })
  isOnline = false

  @Fields.number({
    caption: 'עמלה באחוזים',
    validate: [Validators.min(0), Validators.max(100)],
  })
  feePercentage = 0

  @Fields.number({
    caption: 'עמלה קבועה',
    validate: [Validators.min(0)],
  })
  fixedFee = 0

  @Fields.string({
    caption: 'מטבע',
  })
  currency = 'ILS'

  @Fields.number({
    caption: 'סכום מינימלי',
    validate: [Validators.min(0)],
  })
  minAmount = 0

  @Fields.number({
    caption: 'סכום מקסימלי',
    validate: [Validators.min(0)],
  })
  maxAmount = 0

  @Fields.string({
    caption: 'הוראות תשלום',
  })
  paymentInstructions = ''

  @Fields.string({
    caption: 'פרטי חשבון בנק',
    includeInApi: Roles.admin,
  })
  bankDetails = ''

  @Fields.string({
    caption: 'מזהה ספק חיצוני',
    includeInApi: Roles.admin,
  })
  externalProviderId = ''

  @Fields.json({
    caption: 'הגדרות נוספות',
    includeInApi: Roles.admin,
  })
  settings: any = {}

  @Fields.number({
    allowApiUpdate: false,
    caption: 'סך תרומות',
  })
  totalDonationsCount = 0

  @Fields.number({
    allowApiUpdate: false,
    caption: 'סכום כולל',
  })
  totalAmount = 0

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

  @Relations.toOne<DonationMethod, User>(() => User, {
    caption: 'נוצר על ידי',
  })
  createdBy?: User

  @Fields.string({
    caption: 'נוצר על ידי ID',
  })
  createdById = ''

  get displayName() {
    return `${this.name}${this.isActive ? '' : ' (לא פעיל)'}`
  }

  get totalFeePercentage() {
    return this.feePercentage
  }

  get isAvailable() {
    return this.isActive
  }

  calculateFee(amount: number): number {
    const percentageFee = (amount * this.feePercentage) / 100
    return percentageFee + this.fixedFee
  }

  calculateNetAmount(amount: number): number {
    return amount - this.calculateFee(amount)
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async activate() {
    this.isActive = true
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async deactivate() {
    this.isActive = false
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async updateStats(donationAmount: number) {
    this.totalDonationsCount += 1
    this.totalAmount += donationAmount
    await this.save()
  }
}