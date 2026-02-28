import { Entity, Fields, IdEntity, isBackend } from 'remult'
import { SyncStatus } from '../type/google-contacts.type'

@Entity<GoogleContactMapping>('google_contact_mappings', {
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
export class GoogleContactMapping extends IdEntity {

  @Fields.string({ caption: 'מזהה משתמש' })
  userId = ''

  @Fields.string({ caption: 'מזהה תורם' })
  donorId = ''

  @Fields.string({ caption: 'Google Resource Name' })
  googleResourceName = ''

  @Fields.string({ caption: 'Google ETag' })
  googleEtag = ''

  @Fields.string({ caption: 'Platform Hash' })
  platformHash = ''

  @Fields.string({ caption: 'Google Hash' })
  googleHash = ''

  @Fields.string({ caption: 'סטטוס סנכרון' })
  syncStatus: SyncStatus = 'pending'

  @Fields.date({ caption: 'סנכרון אחרון', allowNull: true })
  lastSyncedAt?: Date

  @Fields.date({ caption: 'תאריך יצירה' })
  createdDate = new Date()

  @Fields.date({ caption: 'תאריך עדכון' })
  updatedDate = new Date()
}
