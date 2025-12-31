import {
  IdEntity,
  Entity,
  Fields,
  Validators,
  Allow,
} from 'remult'
import { Roles } from '../enum/roles'

@Entity<Event>('events', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
})
export class Event extends IdEntity {
  @Fields.string({
    validate: Validators.required,
    caption: 'תיאור האירוע',
  })
  description = ''

  @Fields.string({
    caption: 'סוג האירוע',
    validate: Validators.required,
  })
  type = 'personal' // personal, religious, family, etc.

  @Fields.boolean({
    caption: 'אירוע חובה',
  })
  isRequired = false

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.integer({
    caption: 'סדר תצוגה',
  })
  sortOrder = 0

  @Fields.string({
    caption: 'קטגוריה',
  })
  category = ''

  @Fields.createdAt({
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.updatedAt({
    caption: 'תאריך עדכון',
  })
  updatedDate = new Date()
}