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

  @Fields.number({
    allowApiUpdate: false,
    caption: 'סכום שנאסף',
  })
  raisedAmount = 0

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

  get progressPercentage() {
    // console.log('this.targetAmount',this.targetAmount)
    // console.log('this.raisedAmount',this.raisedAmount)
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

  @BackendMethod({ allowed: [Roles.admin] })
  async updateRaisedAmount(amount: number) {
    this.raisedAmount += amount
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async recalculateRaisedAmount() {
    if (isBackend()) {
      const { remult } = await import('remult')
      const { Donation } = await import('./donation')
      const { Payment } = await import('./payment')
      const { calculateEffectiveAmount } = await import('../utils/donation-utils')

      const donations = await remult.repo(Donation).find({
        where: {
          campaignId: this.id
        },
        include: { donationMethod: true }
      })

      // Load all payments for these donations
      const donationIds = donations.map(d => d.id)
      const payments = donationIds.length > 0
        ? await remult.repo(Payment).find({
            where: { donationId: { $in: donationIds }, isActive: true }
          })
        : []

      // Create payment totals map
      const paymentTotals = new Map<string, number>()
      for (const payment of payments) {
        const current = paymentTotals.get(payment.donationId) || 0
        paymentTotals.set(payment.donationId, current + payment.amount)
      }

      // Calculate total using effective amounts
      const oldAmount = this.raisedAmount
      this.raisedAmount = donations.reduce((sum: number, donation: any) => {
        const paymentTotal = paymentTotals.get(donation.id)
        return sum + calculateEffectiveAmount(donation, paymentTotal)
      }, 0)

      await this.save()
      console.log(`Campaign ${this.name}: Recalculated raisedAmount from ${oldAmount} to ${this.raisedAmount} (${donations.length} donations)`)
    }
  }

  @BackendMethod({ allowed: [Roles.admin] })
  static async recalculateAllCampaignsRaisedAmount() {
    if (isBackend()) {
      const { remult } = await import('remult')
      const { Donation } = await import('./donation')
      const { Payment } = await import('./payment')
      const { calculateEffectiveAmount } = await import('../utils/donation-utils')

      const campaigns = await remult.repo(Campaign).find()

      // Load all donations with their methods
      const allDonations = await remult.repo(Donation).find({
        where: { campaignId: { $ne: '' } },
        include: { donationMethod: true }
      })

      // Load all payments
      const donationIds = allDonations.map(d => d.id)
      const allPayments = donationIds.length > 0
        ? await remult.repo(Payment).find({
            where: { donationId: { $in: donationIds }, isActive: true }
          })
        : []

      // Create payment totals map
      const paymentTotals = new Map<string, number>()
      for (const payment of allPayments) {
        const current = paymentTotals.get(payment.donationId) || 0
        paymentTotals.set(payment.donationId, current + payment.amount)
      }

      // Group donations by campaign
      const donationsByCampaign = new Map<string, any[]>()
      for (const donation of allDonations) {
        if (!donation.campaignId) continue
        const list = donationsByCampaign.get(donation.campaignId) || []
        list.push(donation)
        donationsByCampaign.set(donation.campaignId, list)
      }

      let updatedCount = 0
      for (const campaign of campaigns) {
        const donations = donationsByCampaign.get(campaign.id) || []

        // Calculate total using effective amounts
        const calculatedAmount = donations.reduce((sum: number, donation: any) => {
          const paymentTotal = paymentTotals.get(donation.id)
          return sum + calculateEffectiveAmount(donation, paymentTotal)
        }, 0)

        if (campaign.raisedAmount !== calculatedAmount) {
          const oldAmount = campaign.raisedAmount
          campaign.raisedAmount = calculatedAmount
          await campaign.save()
          updatedCount++
          console.log(`Campaign ${campaign.name}: Updated raisedAmount from ${oldAmount} to ${calculatedAmount}`)
        }
      }

      console.log(`Recalculated raisedAmount for ${updatedCount} campaigns out of ${campaigns.length} total campaigns`)
      return updatedCount
    }
    return 0
  }
}