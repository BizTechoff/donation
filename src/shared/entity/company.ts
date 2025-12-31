import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  Relations,
} from 'remult'
import { Roles } from '../enum/roles'
import { Place } from './place'

@Entity<Company>('companies', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (company) => {
    if (isBackend()) {
      if (company._.isNew()) {
        company.createdDate = new Date()
      }
      company.updatedDate = new Date()
    }
  },
})
export class Company extends IdEntity { // חברות\עמותות שהתורם מקוושר אליו ודרכו מטעמם הגיעה התרומה
  @Fields.string({
    validate: Validators.required,
    caption: 'שם החברה',
  })
  name = ''

  @Fields.string({
    caption: 'מספר חברה (ח"פ)',
  })
  number = ''

  @Fields.string()
  placeId?: string

  @Relations.toOne(() => Place, {
    field: "placeId",
    caption: 'כתובת',
    defaultIncluded: true
  })
  place?: Place

  @Fields.string({
    caption: 'טלפון',
  })
  phone = ''

  @Fields.string({
    caption: 'אימייל',
  })
  email = ''

  @Fields.string({
    caption: 'אתר אינטרנט',
  })
  website = ''

  @Fields.string({
    caption: 'הערות',
  })
  notes = ''

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

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
