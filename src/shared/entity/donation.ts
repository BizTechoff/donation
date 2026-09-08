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
import { calculateEffectiveAmount, calculatePaymentTotals, isPaymentBased } from '../utils/donation-utils'
import { DEFAULT_CURRENCY } from '../enum/currency'

@Entity<Donation>('donations', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin, Roles.secretary],
  allowApiInsert: Allow.authenticated,
  defaultOrderBy: { donationDate: 'desc', createdDate: 'desc' },
  // saving: async (donation) => {
  //   if (isBackend()) {
  //     if (donation._.isNew()) {
  //       donation.createdDate = new Date()
  //     }
  //     donation.updatedDate = new Date()
  //   }
  // },
  // saved: async (donation, event) => {
  //   if (isBackend()) {
  //     const { remult } = await import('remult')

  //     // עדכון ממוצע תרומות של התורם
  //     if (donation.donorId) {
  //       await updateDonorAverage(donation.donorId, remult)
  //     }

  //     // Note: Campaign raised amount is now calculated on demand, no need to update cached value
  //   }
  // },
  deleted: async (donation) => {
    if (isBackend()) {
      const { remult } = await import('remult')

      // עדכון ממוצע תרומות של התורם לאחר מחיקה
      if (donation.donorId) {
        await updateDonorAverage(donation.donorId, remult)
      }

      // Note: Campaign raised amount is now calculated on demand, no need to update cached value
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
    // Note: Stored as currency ID (e.g., 'ILS', 'USD')
    // Use getCurrencyType() from PayerService to get full CurrencyType object
  })
  currencyId = DEFAULT_CURRENCY

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

  // ── Sortable related-value fields (sqlExpression) ──────────────────────
  // P6 / W1 - "רשימת התרומות, לפי איזה סדר?". These five columns used to be
  // sorted POST-FETCH: the server pulled one page of 50 rows and reordered
  // that page in memory. So the sort only ever rearranged the rows already on
  // screen - page 2 started over, and the list was never sorted as a whole.
  // That is what the client sees as "מיון לפי תורם לא תקין".
  //
  // Same pattern as Donor.primaryPhone and DonorGift.donorName: Postgres
  // computes the related value inside the SAME query that loads the rows, so
  // ORDER BY runs over the whole result set BEFORE LIMIT, and the value sorted
  // is exactly the value displayed.
  // allowNull so an empty value sorts LAST in ascending order (pg default).
  @Fields.string<Donation>({
    caption: 'שם תורם',
    allowNull: true,
    sqlExpression: () => `(
      select trim(coalesce(d."lastName",'') || ' ' || coalesce(d."firstName",''))
      from "donors" d where d."id" = "donations"."donorId")`
  })
  donorName?: string

  // Matches DonorPlace.getPrimaryForDonors, which is what fills the column:
  // the active primary place, 'בית' preferred.
  @Fields.string<Donation>({
    caption: 'כתובת תורם',
    allowNull: true,
    sqlExpression: () => `(
      select trim(coalesce(p."city",'') || ' ' || coalesce(p."street",''))
      from "donor_places" dp
      join "places" p on p."id" = dp."placeId"
      left join "donor_address_types" dat on dat."id" = dp."addressTypeId"
      where dp."donorId" = "donations"."donorId" and dp."isActive" = true
      order by dp."isPrimary" desc, case when dat."name" = 'בית' then 0 else 1 end
      limit 1)`
  })
  donorAddress?: string

  @Fields.string<Donation>({
    caption: 'אופן תרומה',
    allowNull: true,
    sqlExpression: () => `(
      select dm."name" from "donation_methods" dm
      where dm."id" = "donations"."donationMethodId")`
  })
  methodName?: string

  @Fields.string<Donation>({
    caption: 'קמפיין',
    allowNull: true,
    sqlExpression: () => `(
      select c."name" from "campaigns" c where c."id" = "donations"."campaignId")`
  })
  campaignName?: string

  // The fundraiser hangs off the DONOR, not off the donation - two hops.
  @Fields.string<Donation>({
    caption: 'מגייס',
    allowNull: true,
    sqlExpression: () => `(
      select u."name" from "users" u
      where u."id" = (select d."fundraiserId" from "donors" d
                      where d."id" = "donations"."donorId"))`
  })
  fundraiserName?: string

  @Fields.string({
    caption: 'הערות',
  })
  notes = ''

  @Fields.string({ caption: 'מזהה תרומה מאקסל', allowNull: true })
  excelDonationId = ''

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

  @Fields.number({
    caption: 'מספר קבלה',
  })
  receiptNumber?: number

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
  const { Payment } = await import('./payment')
  const donations = await remult.repo(Donation).find({
    where: {
      donorId: donorId,
      isExceptional: false
    },
    include: { donationMethod: true }
  })

  // טען סכומי תשלומים בפועל עבור התחייבויות והו"ק עם סינון לפי סוג
  const paymentBasedDonations = donations.filter((d: Donation) => isPaymentBased(d))
  const paymentBasedIds = paymentBasedDonations.map((d: Donation) => d.id)
  let paymentTotals: Record<string, number> = {}
  if (paymentBasedIds.length > 0) {
    const payments = await remult.repo(Payment).find({
      where: { donationId: { $in: paymentBasedIds }, isActive: true }
    })
    paymentTotals = calculatePaymentTotals(paymentBasedDonations, payments)
  }

  const donor = await remult.repo(Donor).findId(donorId)
  if (donor) {
    if (donations.length === 0) {
      donor.ns = 0
    } else {
      const sum = donations.reduce((acc: number, donation: Donation) =>
        acc + calculateEffectiveAmount(donation, paymentTotals[donation.id]), 0)
      donor.ns = sum / donations.length
    }
    await donor.save()
  }
}

// Note: updateCampaignRaisedAmount was removed - raisedAmount is now calculated on demand