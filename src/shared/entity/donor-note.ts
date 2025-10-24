import {
  Allow,
  Entity,
  Fields,
  IdEntity,
  isBackend,
  Relations,
} from 'remult'
import { Donor } from './donor'

@Entity<DonorNote>('donor_notes', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Allow.authenticated,
  allowApiInsert: Allow.authenticated,
  saving: async (donorNote) => {
    if (isBackend()) {
      if (donorNote._.isNew()) {
        donorNote.createdDate = new Date()
      }
      donorNote.updatedDate = new Date()
    }
  },
})
export class DonorNote extends IdEntity {
  @Fields.string({ caption: 'מזהה תורם' })
  donorId?: string;

  @Relations.toOne(() => Donor, {
    field: "donorId",
    caption: 'תורם',
    defaultIncluded: true
  })
  donor?: Donor;

  @Fields.string({
    caption: 'סוג הערה',
    allowNull: false,
  })
  noteType = '' // סוג ההערה מהרשימה

  @Fields.string({
    caption: 'תוכן ההערה',
  })
  content?: string

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
