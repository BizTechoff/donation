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

@Entity<Country>('countries', {
  allowApiCrud: [Roles.admin],
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: [Roles.admin],
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
  currency = ''

  @Fields.string({
    caption: 'סמל מטבע',
  })
  currencySymbol = ''

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
