import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  BackendMethod,
} from 'remult'
import { remult } from 'remult'
import { Roles } from '../enum/roles'
import { CreatedByField, UpdatedByField } from '../utils/audit-fields'

@Entity<Country>('countries', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (country) => {
    if (isBackend()) {
      if (country._.isNew()) {
        country.createdDate = new Date()
      }
      country.updatedDate = new Date()
    }
  },
})
export class Country extends IdEntity {
  // שלב ג׳ 9.1 - מי הזין ומי עדכן (shared/utils/audit-fields)
  @CreatedByField()
  createdById = ''

  @UpdatedByField()
  updatedById = ''

  @Fields.string({
    caption: 'שם מדינה',
    validate: Validators.required,
  })
  name = ''

  @Fields.string({
    caption: 'שם מדינה באנגלית',
  })
  nameEn = ''

  @Fields.string({
    caption: 'קוד מדינה',
  })
  code = ''

  @Fields.string({
    caption: 'קידומת טלפון',
  })
  phonePrefix = ''

  @Fields.string({
    caption: 'מטבע',
  })
  currencyId = ''

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.boolean({
    caption: 'הצג מדינה במכתב',
  })
  includeCountryInLetter = true

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

  /**
   * Getter for display name combining Hebrew and English names
   * Usage: country.displayName // "ישראל / Israel"
   */
  get displayName(): string {
    if (this.name && this.nameEn) {
      return `${this.name} / ${this.nameEn}`;
    }
    return this.name || this.nameEn || this.code || '';
  }

}
