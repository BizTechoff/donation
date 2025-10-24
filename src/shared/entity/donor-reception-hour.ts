import {
  Allow,
  Entity,
  Fields,
  IdEntity,
  isBackend,
  Relations,
} from 'remult'
import { Donor } from './donor'

@Entity<DonorReceptionHour>('donor_reception_hours', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Allow.authenticated,
  allowApiInsert: Allow.authenticated,
  saving: async (donorReceptionHour) => {
    if (isBackend()) {
      if (donorReceptionHour._.isNew()) {
        donorReceptionHour.createdDate = new Date()
      }
      donorReceptionHour.updatedDate = new Date()
    }
  },
})
export class DonorReceptionHour extends IdEntity {
  @Fields.string({ caption: 'מזהה תורם' })
  donorId?: string;

  @Relations.toOne(() => Donor, {
    field: "donorId",
    caption: 'תורם',
    defaultIncluded: true
  })
  donor?: Donor;

  @Fields.string({
    caption: 'שעת התחלה',
    allowNull: false,
  })
  startTime = '' // Format: HH:MM

  @Fields.string({
    caption: 'שעת סיום',
    allowNull: false,
  })
  endTime = '' // Format: HH:MM

  @Fields.string({
    caption: 'תיאור',
  })
  description?: string

  @Fields.number({
    caption: 'סדר תצוגה',
  })
  sortOrder = 0

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.createdAt({
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.updatedAt({
    caption: 'תאריך עדכון',
  })
  updatedDate = new Date()
}
