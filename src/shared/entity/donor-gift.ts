import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations
} from 'remult'
import { Roles } from '../enum/roles'
import { Donor } from './donor'
import { Gift } from './gift'
import { Reminder } from './reminder'

@Entity<DonorGift>('donor_gifts', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin, Roles.secretary],
  allowApiInsert: Allow.authenticated,
  saving: async (donorGift) => {
    if (isBackend()) {
      if (donorGift._.isNew()) {
        donorGift.createdDate = new Date()
      }
      donorGift.updatedDate = new Date()
    }
  },
})
export class DonorGift extends IdEntity {
  @Fields.string({
    caption: 'תורם ID',
    validate: Validators.required,
  })
  donorId = ''

  @Relations.toOne<DonorGift, Donor>(() => Donor, {
    caption: 'תורם',
    field: 'donorId'
  })
  donor?: Donor

  @Fields.string({
    caption: 'מתנה ID',
    validate: Validators.required,
  })
  giftId = ''

  @Relations.toOne<DonorGift, Gift>(() => Gift, {
    caption: 'מתנה',
    field: 'giftId'
  })
  gift?: Gift

  // ── Sortable related-value fields (sqlExpression) ──────────────────────
  // O1 - "סידור לפי תורם / מתנה לא פעיל". The controller used to ask remult to
  // order by 'donor.lastName' / 'gift.name', which are related PATHS, not
  // fields of this entity - remult drops them silently and the rows come back
  // in their previous order. Same pattern as Donor.primaryPhone: let Postgres
  // compute the related value inside the SAME query that loads the rows, so
  // ORDER BY and LIMIT are applied to exactly the value the screen displays.
  // allowNull so an empty value sorts LAST in ascending order (pg default).
  @Fields.string<DonorGift>({
    caption: 'שם תורם',
    allowNull: true,
    sqlExpression: () => `(
      select trim(coalesce(d."lastName",'') || ' ' || coalesce(d."firstName",''))
      from "donors" d where d."id" = "donor_gifts"."donorId")`
  })
  donorName?: string

  @Fields.string<DonorGift>({
    caption: 'שם מתנה',
    allowNull: true,
    sqlExpression: () => `(
      select g."name" from "gifts" g where g."id" = "donor_gifts"."giftId")`
  })
  giftName?: string

  @Fields.dateOnly({
    caption: 'תאריך מסירה',
    validate: Validators.required,
  })
  deliveryDate = new Date()

  @Fields.string({
    caption: 'הערות',
  })
  notes = ''

  @Fields.boolean({
    caption: 'נמסר',
  })
  isDelivered = false

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
}
