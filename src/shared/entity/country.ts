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

  @BackendMethod({ allowed: [Roles.admin] })
  static async seedCountries() {
    const repo = remult.repo(Country)

    const countries = [
      { name: 'ישראל', nameEn: 'Israel', code: 'IL' },
      { name: 'ארצות הברית', nameEn: 'United States', code: 'US' },
      { name: 'בריטניה', nameEn: 'United Kingdom', code: 'UK' },
      { name: 'קנדה', nameEn: 'Canada', code: 'CA' },
      { name: 'אוסטרליה', nameEn: 'Australia', code: 'AU' },
      { name: 'צרפת', nameEn: 'France', code: 'FR' },
      { name: 'גרמניה', nameEn: 'Germany', code: 'DE' },
      { name: 'איטליה', nameEn: 'Italy', code: 'IT' },
      { name: 'ספרד', nameEn: 'Spain', code: 'ES' },
      { name: 'הולנד', nameEn: 'Netherlands', code: 'NL' },
      { name: 'בלגיה', nameEn: 'Belgium', code: 'BE' },
      { name: 'שוויץ', nameEn: 'Switzerland', code: 'CH' },
      { name: 'אוסטריה', nameEn: 'Austria', code: 'AT' },
      { name: 'דנמרק', nameEn: 'Denmark', code: 'DK' },
      { name: 'שוודיה', nameEn: 'Sweden', code: 'SE' },
      { name: 'נורווגיה', nameEn: 'Norway', code: 'NO' },
      { name: 'ברזיל', nameEn: 'Brazil', code: 'BR' },
      { name: 'ארגנטינה', nameEn: 'Argentina', code: 'AR' },
      { name: 'מקסיקו', nameEn: 'Mexico', code: 'MX' },
      { name: 'דרום אפריקה', nameEn: 'South Africa', code: 'ZA' },
    ]

    for (const countryData of countries) {
      const existing = await repo.findFirst({ name: countryData.name })
      if (!existing) {
        const country = repo.create()
        country.name = countryData.name
        country.nameEn = countryData.nameEn
        country.code = countryData.code
        country.isActive = true
        await country.save()
      }
    }

    return `Created ${countries.length} countries`
  }
}