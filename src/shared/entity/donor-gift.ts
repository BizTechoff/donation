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
import { DEFAULT_CURRENCY } from '../enum/currency'
import { Reminder } from './reminder'
import { CreatedByField, UpdatedByField } from '../utils/audit-fields'

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
  // שלב ג׳ 9.1 - מי הזין ומי עדכן (shared/utils/audit-fields)
  @CreatedByField()
  createdById = ''

  @UpdatedByField()
  updatedById = ''

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

  // שלב ג׳ 6.5 - מתנה משותפת: מארז אחד לכמה מקבלים (ישראל, 24.08: "סידור
  // שוקולדים לרגל שמחה ויש שם כמה מיועדים לקבל את הערכה"). כל מקבל מקבל שורה
  // משלו - כך המתנה מופיעה אצל כל אחד מהם - והשורות מקושרות במזהה הקבוצה.
  // העלות נרשמת בשורה הראשונה בלבד, כך שבסיכום היא נספרת פעם אחת. ריק = לא משותפת.
  @Fields.string({
    caption: 'קבוצת מתנה משותפת',
  })
  sharedGroupId = ''

  /** שמות שאר המקבלים של אותה מתנה משותפת, מחושב ב-SQL (ריק אם אינה משותפת). */
  @Fields.string<DonorGift>({
    caption: 'משותפת עם',
    allowNull: true,
    sqlExpression: () => `(
      select string_agg(trim(coalesce(d."lastName",'') || ' ' || coalesce(d."firstName",'')), ', ')
      from "donor_gifts" g2 join "donors" d on d."id" = g2."donorId"
      where coalesce("donor_gifts"."sharedGroupId",'') <> ''
        and g2."sharedGroupId" = "donor_gifts"."sharedGroupId"
        and g2."id" <> "donor_gifts"."id")`
  })
  sharedWith?: string

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

  // שלב ג׳ 6.3 - העלות בפועל של המתנה הזו. ישראל, 24.08: "המחיר משתנה בין
  // אחד לשני, ואני רוצה לציין לבד כמה שילמתי עבור כל אחד". ברירת המחדל
  // נלקחת מהערך המשוער בקטלוג, וניתנת לשינוי.
  @Fields.number({
    caption: 'עלות',
  })
  cost = 0

  @Fields.string({
    caption: 'מטבע העלות',
  })
  costCurrencyId = DEFAULT_CURRENCY

  // שלב ג׳ 6.4 - סיבת שליחת המתנה (ישראל, 24.08). אותו עוזר בחירה כמו
  // בסיבת תרומה - "לרגל ...", או הקלדה חופשית.
  @Fields.string({
    caption: 'סיבת שליחה',
  })
  reason = ''

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
