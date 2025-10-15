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
import { Campaign } from './campaign'
import { DonationMethod } from './donation-method'
import { Organization } from './organization'
import { Bank } from './bank'
import { Roles } from '../enum/roles'

@Entity<Donation>('donations', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (donation) => {
    if (isBackend()) {
      if (donation._.isNew()) {
        donation.createdDate = new Date()
      }
      donation.updatedDate = new Date()
    }
  },
})
export class Donation extends IdEntity {
  @Fields.number({
    validate: [Validators.required, Validators.min(1)],
    caption: 'סכום',
  })
  amount = 0

  @Fields.string({
    caption: 'מטבע',
  })
  currency = 'ILS'

  @Relations.toOne<Donation, Donor>(() => Donor, {
    caption: 'תורם',
  })
  donor?: Donor

  @Fields.string({
    caption: 'תורם ID',
    validate: Validators.required,
  })
  donorId = ''

  @Relations.toOne<Donation, Campaign>(() => Campaign, {
    caption: 'קמפיין',
  })
  campaign?: Campaign

  @Fields.string({
    caption: 'קמפיין ID',
  })
  campaignId = ''

  @Relations.toOne<Donation, DonationMethod>(() => DonationMethod, {
    caption: 'אמצעי תשלום',
  })
  donationMethod?: DonationMethod

  @Fields.string({
    caption: 'אמצעי תשלום ID',
    validate: Validators.required,
  })
  donationMethodId = ''

  @Fields.string({
    caption: 'הערות',
  })
  notes = ''

  @Fields.string({
    caption: 'סיבה',
  })
  reason = ''

  @Fields.boolean({
    caption: 'תרומה חריגה',
  })
  isExceptional = false

  @Fields.boolean({
    caption: 'חדר תה',
  })
  isUrgent = false

  @Fields.string({
    caption: 'מתרים ID',
  })
  fundraiserId = ''

  @Fields.json({
    caption: 'שותפים לתרומה',
  })
  partnerIds: string[] = []


  @Fields.string({
    caption: 'שם ח"ן',
  })
  bankName = ''

  @Fields.string({
    caption: 'מספר צק',
  })
  checkNumber = ''

  @Fields.string({
    caption: 'מספר שובר',
  })
  voucherNumber = ''

  @Fields.boolean({
    caption: 'תרומה אנונימית',
  })
  isAnonymous = false

  @Fields.boolean({
    caption: 'התקבל אישור',
  })
  receiptIssued = false

  @Fields.string({
    caption: 'מספר אישור',
  })
  receiptNumber = ''

  @Fields.date({
    caption: 'תאריך הוצאת אישור',
  })
  receiptDate?: Date

  @Fields.dateOnly({
    caption: 'תאריך תרומה',
    validate: Validators.required,
  })
  donationDate = new Date()

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

  @Relations.toOne<Donation, User>(() => User, {
    caption: 'נוצר על ידי',
  })
  createdBy?: User

  @Fields.string({
    caption: 'נוצר על ידי ID',
  })
  createdById = ''

  @Fields.string({
    caption: 'סטטוס תרומה',
    validate: Validators.required,
  })
  status: 'pending' | 'completed' | 'cancelled' = 'pending'

  @Fields.string({
    caption: 'סוג תרומה',
    validate: Validators.required,
  })
  donationType: 'full' | 'commitment' | 'standingOrder' = 'full'

  @Fields.string({
    caption: 'סוג הוראת קבע',
  })
  standingOrderType: 'bank' | 'creditCard' | 'organization' = 'bank'

  @Fields.boolean({
    caption: 'ללא הגבלת תשלומים',
  })
  unlimitedPayments = false

  // Additional payment fields
  @Fields.string({
    caption: 'מספר סניף',
  })
  bankBranch = ''

  @Fields.string({
    caption: 'מספר חשבון',
  })
  bankAccount = ''

  @Fields.string({
    caption: 'מספר אסמכתא',
  })
  referenceNumber = ''

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

  @Fields.string({
    caption: 'מספר אישור כרטיס',
  })
  approvalNumber = ''

  @Fields.string({
    caption: 'שם ארגון',
  })
  organizationName = ''

  @Fields.string({
    caption: 'מקבל התשלום',
  })
  receivedBy = ''

  @Fields.string({
    caption: 'פלטפורמת תשלום',
  })
  paymentPlatform = ''

  @Fields.string({
    caption: 'מזהה עסקה',
  })
  transactionId = ''

  @Fields.string({
    caption: 'שם המשלם',
  })
  payerName = ''

  @Fields.string({
    caption: 'תדירות',
  })
  frequency = ''

  @Fields.number({
    caption: 'יום בחודש',
  })
  dayOfMonth?: number

  @Fields.number({
    caption: 'יום בשבוע',
  })
  dayOfWeek?: number

  @Fields.number({
    caption: 'מספר תשלומים',
  })
  numberOfPayments?: number

  @Fields.string({
    caption: 'אסמכתא העברה',
  })
  transferReference = ''

  @Relations.toOne<Donation, Organization>(() => Organization, {
    caption: 'עמותה',
  })
  organization?: Organization

  @Fields.string({
    caption: 'עמותה ID',
  })
  organizationId = ''

  @Relations.toOne<Donation, Bank>(() => Bank, {
    caption: 'בנק',
  })
  bank?: Bank

  @Fields.string({
    caption: 'בנק ID',
  })
  bankId = ''

  @BackendMethod({ allowed: [Roles.admin] })
  async issueReceipt() {
    if (!this.receiptIssued) {
      this.receiptNumber = `R${new Date().getFullYear()}${String(Date.now()).slice(-6)}`
      this.receiptIssued = true
      this.status = 'completed'
      await this.save()
    }
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async cancelDonation() {
    this.status = 'cancelled'
    await this.save()
  }
}