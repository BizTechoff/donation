import { Allow, Entity, Fields, IdEntity, isBackend } from 'remult'
import { Roles } from '../enum/roles'

@Entity<AppSettings>('app_settings', {
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Roles.admin,
  allowApiInsert: Roles.admin,
  allowApiDelete: false,
  saving: async (record) => {
    if (isBackend()) {
      record.updatedDate = new Date()
    }
  }
})
export class AppSettings extends IdEntity {

  @Fields.number({ caption: 'סכום תורם גדול' })
  highDonorAmount = 1500

  @Fields.number({ caption: 'חודשים - תרם לאחרונה' })
  recentDonorMonths = 11

  @Fields.date({ caption: 'תאריך עדכון' })
  updatedDate = new Date()
}
