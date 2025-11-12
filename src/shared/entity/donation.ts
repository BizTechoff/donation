import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations,
} from 'remult'
import { User } from './user'
import { Donor } from './donor'
import { Campaign } from './campaign'
import { DonationMethod } from './donation-method'
import { Organization } from './organization'
import { Bank } from './bank'
import { Reminder } from './reminder'
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
  saved: async (donation, event) => {
    if (isBackend()) {
      const { remult } = await import('remult')

      // עדכון ממוצע תרומות של התורם
      if (donation.donorId) {
        await updateDonorAverage(donation.donorId, remult)
      }

      // עדכון סכום שנאסף של הקמפיין
      if (donation.campaignId) {
        await updateCampaignRaisedAmount(donation.campaignId, remult)
      }

      // אם הקמפיין שונה (במקרה של עדכון), עדכן גם את הקמפיין הישן
      if (!event.isNew && event.originalId && event.fields.campaignId.valueChanged()) {
        const oldCampaignId = event.fields.campaignId.originalValue
        if (oldCampaignId && oldCampaignId !== donation.campaignId) {
          await updateCampaignRaisedAmount(oldCampaignId, remult)
        }
      }
    }
  },
  deleted: async (donation) => {
    if (isBackend()) {
      const { remult } = await import('remult')

      // עדכון ממוצע תרומות של התורם לאחר מחיקה
      if (donation.donorId) {
        await updateDonorAverage(donation.donorId, remult)
      }

      // עדכון סכום שנאסף של הקמפיין לאחר מחיקה
      if (donation.campaignId) {
        await updateCampaignRaisedAmount(donation.campaignId, remult)
      }
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
    field: 'donorId'
  })
  donor?: Donor

  @Fields.string({
    caption: 'תורם ID',
    validate: Validators.required,
  })
  donorId = ''

  @Relations.toOne<Donation, Campaign>(() => Campaign, {
    caption: 'קמפיין',
    field: 'campaignId'
  })
  campaign?: Campaign

  @Fields.string({
    caption: 'קמפיין ID',
  })
  campaignId = ''

  @Relations.toOne<Donation, DonationMethod>(() => DonationMethod, {
    caption: 'אמצעי תשלום',
    field: 'donationMethodId'
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

  @Fields.json({
    caption: 'שותפים לתרומה',
  })
  partnerIds: string[] = []

  @Fields.string({
    caption: 'מספר צק',
  })
  checkNumber = ''

  @Fields.string({
    caption: 'מספר שובר',
  })
  voucherNumber = ''

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
    field: 'createdById'
  })
  createdBy?: User

  @Fields.string({
    caption: 'נוצר על ידי ID',
  })
  createdById = ''

  @Fields.string({
    caption: 'סוג תרומה',
    validate: Validators.required,
  })
  donationType: 'full' | 'commitment' = 'full'

  @Fields.string({
    caption: 'סוג הוראת קבע',
  })
  standingOrderType: 'bank' | 'creditCard' | 'organization' = 'bank'

  @Fields.boolean({
    caption: 'ללא הגבלת תשלומים',
  })
  unlimitedPayments = false

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

  @Relations.toOne<Donation, Organization>(() => Organization, {
    caption: 'עמותה',
    field: 'organizationId'
  })
  organization?: Organization

  @Fields.string({
    caption: 'עמותה ID',
  })
  organizationId = ''

  @Relations.toOne<Donation, Bank>(() => Bank, {
    caption: 'בנק',
    field: 'bankId'
  })
  bank?: Bank

  @Fields.string({
    caption: 'בנק ID',
  })
  bankId = ''

  @Fields.json({
    caption: 'קבצים מצורפים',
  })
  attachments: Array<{
    name: string
    path: string
    size: number
  }> = []

}

// פונקציה לעדכון ממוצע תרומות של תורם
async function updateDonorAverage(donorId: string, remult: any) {
  const { Donor } = await import('./donor')
  const donations = await remult.repo(Donation).find({
    where: {
      donorId: donorId,
      isExceptional: false
    }
  })

  const donor = await remult.repo(Donor).findId(donorId)
  if (donor) {
    if (donations.length === 0) {
      donor.ns = 0
    } else {
      const sum = donations.reduce((acc: number, donation: Donation) => acc + donation.amount, 0)
      donor.ns = sum / donations.length
    }
    await donor.save()
  }
}

// פונקציה לעדכון סכום שנאסף של קמפיין
async function updateCampaignRaisedAmount(campaignId: string, remult: any) {
  const { Campaign } = await import('./campaign')
  const donations = await remult.repo(Donation).find({
    where: {
      campaignId: campaignId
    }
  })

  const campaign = await remult.repo(Campaign).findId(campaignId)
  if (campaign) {
    const sum = donations.reduce((acc: number, donation: Donation) => acc + donation.amount, 0)
    campaign.raisedAmount = sum
    await campaign.save()
    console.log(`Campaign ${campaign.name} (${campaignId}): Updated raisedAmount to ${sum} from ${donations.length} donations`)
  }
}