import {
  Allow,
  Entity,
  Fields,
  IdEntity,
  isBackend,
  Relations,
} from 'remult'
import { Donor } from './donor'
import { Event } from './event'
import { Reminder } from './reminder'

@Entity<DonorEvent>('donor_events', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Allow.authenticated,
  allowApiInsert: Allow.authenticated,
  saving: async (donorEvent) => {
    if (isBackend()) {
      if (donorEvent._.isNew()) {
        donorEvent.createdDate = new Date()
      }
      donorEvent.updatedDate = new Date()
    }
  },
})
export class DonorEvent extends IdEntity {


  @Fields.string({ caption: 'מזהה תורם' })
  donorId?: string;

  @Relations.toOne(() => Donor, {
    field: "donorId",
    caption: 'תורם',
    defaultIncluded: true
  })
  donor?: Donor;

  @Fields.string({ caption: 'מזהה אירוע' })
  eventId?: string;

  @Relations.toOne(() => Event, {
    field: "eventId",
    caption: 'אירוע',
    defaultIncluded: true
  })
  event?: Event;

  @Fields.dateOnly({
    caption: 'תאריך',
    allowNull: true,
  })
  date?: Date

  // @Fields.string({
  //   caption: 'הערות',
  //   allowNull: true,
  // })
  // notes = ''

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
