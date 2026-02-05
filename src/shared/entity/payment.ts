import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations,
} from 'remult'
import { Donation } from './donation'
import { Roles } from '../enum/roles'

@Entity<Payment>('payments', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (payment) => {
    if (isBackend()) {
      if (payment._.isNew()) {
        payment.createdDate = new Date()
      }
      payment.updatedDate = new Date()
    }
  },
})
export class Payment extends IdEntity {
  
  @Relations.toOne<Payment, Donation>(() => Donation, {
    caption: 'תרומה',
    field: 'donationId'
  })
  donation?: Donation

  @Fields.string({
    caption: 'תרומה ID',
    validate: Validators.required,
  })
  donationId = ''

  @Fields.number({
    validate: [Validators.required, Validators.min(0)],
    caption: 'סכום תשלום',
  })
  amount = 0

  @Fields.string({
    caption: 'מטבע',
  })
  currencyId = 'ILS'

  @Fields.dateOnly({
    caption: 'תאריך תשלום',
    validate: Validators.required,
  })
  paymentDate = new Date()

  @Fields.string({
    caption: 'סטטוס',
    allowNull: true,
  })
  status = 'pending' // pending, completed, failed, cancelled

  @Fields.string({
    caption: 'אסמכתא',
    allowNull: true,
  })
  reference = ''

  @Fields.string({
    caption: 'מזהה תשלום',
    allowNull: true,
  })
  paymentIdentifier = ''

  @Fields.string({
    caption: 'סוג',
    allowNull: true,
  })
  type = '' // getTransactionTypeLabel 'full' | 'commitment' - נקבע מסוג התרומה

  @Fields.string({
    caption: 'הערות',
    allowNull: true,
  })
  notes = ''

  @Fields.date({
    caption: 'תאריך יצירה',
    allowNull: true,
  })
  createdDate?: Date

  @Fields.date({
    caption: 'תאריך עדכון',
    allowNull: true,
  })
  updatedDate?: Date

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true
}
