import { Entity, Fields, IdEntity, isBackend } from 'remult'

@Entity<GoogleAuth>('google_auth', {
  allowApiCrud: false,
  saving: async (record) => {
    if (isBackend()) {
      if (record._.isNew()) {
        record.createdDate = new Date()
      }
      record.updatedDate = new Date()
    }
  }
})
export class GoogleAuth extends IdEntity {

  @Fields.string({ caption: 'מזהה משתמש' })
  userId = ''

  @Fields.string({ caption: 'Access Token (מוצפן)' })
  accessToken = ''

  @Fields.string({ caption: 'Refresh Token (מוצפן)' })
  refreshToken = ''

  @Fields.number({ caption: 'תפוגה (epoch ms)' })
  expiresAt = 0

  @Fields.string({ caption: 'חשבון Google' })
  googleEmail = ''

  @Fields.boolean({ caption: 'פעיל' })
  isActive = true

  @Fields.date({ caption: 'תאריך יצירה' })
  createdDate = new Date()

  @Fields.date({ caption: 'תאריך עדכון' })
  updatedDate = new Date()
}
