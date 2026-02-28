import { Entity, Fields, IdEntity, isBackend } from 'remult'
import { SyncLogStatus, SyncType } from '../type/google-contacts.type'

@Entity<GoogleSyncLog>('google_sync_logs', {
  allowApiCrud: false,
  saving: async (record) => {
    if (isBackend()) {
      if (record._.isNew()) {
        record.createdDate = new Date()
      }
    }
  }
})
export class GoogleSyncLog extends IdEntity {

  @Fields.string({ caption: 'מזהה משתמש' })
  userId = ''

  @Fields.string({ caption: 'סוג סנכרון' })
  syncType: SyncType = 'manual'

  @Fields.string({ caption: 'סטטוס' })
  status: SyncLogStatus = 'started'

  @Fields.number({ caption: 'תורמים שנשלחו' })
  donorsPushed = 0

  @Fields.number({ caption: 'אנשי קשר שנמשכו' })
  contactsPulled = 0

  @Fields.number({ caption: 'קונפליקטים' })
  conflicts = 0

  @Fields.number({ caption: 'שגיאות' })
  errors = 0

  @Fields.json({ caption: 'פרטי שגיאות', allowNull: true })
  errorDetails?: string[]

  @Fields.number({ caption: 'משך (ms)' })
  duration = 0

  @Fields.date({ caption: 'תאריך יצירה' })
  createdDate = new Date()
}
