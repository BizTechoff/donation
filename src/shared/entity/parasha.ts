import {
  IdEntity,
  Entity,
  Fields,
  Validators,
  Allow,
} from 'remult'
import { Roles } from '../enum/roles'

@Entity<Parasha>('parashas', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: [Roles.admin],
})
export class Parasha extends IdEntity {
  @Fields.string({
    validate: Validators.required,
    caption: 'שם הפרשה',
  })
  name = ''

  @Fields.date({
    validate: Validators.required,
    caption: 'תאריך התחלה (שבת)',
  })
  startDate = new Date()

  @Fields.date({
    validate: Validators.required,
    caption: 'תאריך סיום (שישי)',
  })
  endDate = new Date()

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.integer({
    caption: 'מספר סידורי',
  })
  sortOrder = 0

  @Fields.createdAt({
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.updatedAt({
    caption: 'תאריך עדכון',
  })
  updatedDate = new Date()

  get displayName() {
    return this.name
  }
}
