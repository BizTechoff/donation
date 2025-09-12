import {
  IdEntity,
  Entity,
  Fields,
  Relations,
  Allow,
  isBackend,
} from 'remult'
import { Roles } from '../enum/roles'
import { Donor } from './donor'
import { Event } from './event'

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
  @Relations.toOne<DonorEvent, Donor>(() => Donor, {
    caption: 'תורם',
  })
  donor?: Donor

  @Fields.string({
    caption: 'מזהה תורם',
  })
  donorId = ''

  @Relations.toOne<DonorEvent, Event>(() => Event, {
    caption: 'אירוע',
  })
  event?: Event

  @Fields.string({
    caption: 'מזהה אירוע',
  })
  eventId = ''

  @Fields.dateOnly({
    caption: 'תאריך עברי',
    allowNull: true,
  })
  hebrewDate?: Date

  @Fields.dateOnly({
    caption: 'תאריך לועזי',
    allowNull: true,
  })
  gregorianDate?: Date

  @Fields.string({
    caption: 'הערות',
    allowNull: true,
  })
  notes = ''

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