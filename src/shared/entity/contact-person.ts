import {
  Allow,
  Entity,
  Fields,
  IdEntity,
  isBackend,
} from 'remult'

@Entity<ContactPerson>('contact-persons', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Allow.authenticated,
  allowApiInsert: Allow.authenticated,
  saving: async (contactPerson) => {
    if (isBackend()) {
      if (contactPerson._.isNew()) {
        contactPerson.createdDate = new Date()
      }
      contactPerson.updatedDate = new Date()
    }
  },
})
export class ContactPerson extends IdEntity {
  @Fields.string({
    caption: 'שם',
    allowNull: false,
  })
  name = ''

  @Fields.string({
    caption: 'אימייל',
  })
  email?: string

  @Fields.string({
    caption: 'נייד',
  })
  mobile?: string

  @Fields.createdAt({
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.updatedAt({
    caption: 'תאריך עדכון',
  })
  updatedDate = new Date()
}
