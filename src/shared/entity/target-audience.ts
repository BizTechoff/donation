import {
  Allow,
  Entity,
  Field,
  Fields,
  IdEntity,
  Relations,
  Validators,
  isBackend
} from 'remult'
import { Roles } from '../enum/roles'
import { User } from './user'

@Entity<TargetAudience>('target_audiences', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (targetAudience) => {
    if (isBackend()) {
      if (targetAudience._.isNew()) {
        targetAudience.createdDate = new Date()
      }
      targetAudience.updatedDate = new Date()
    }
  },
})
export class TargetAudience extends IdEntity {
  @Fields.string({
    caption: 'שם קהל היעד',
    validate: [Validators.required, Validators.minLength(2)],
    includeInApi: true
  })
  name = ''

  @Fields.string({
    caption: 'תיאור',
    allowNull: true,
    includeInApi: true
  })
  description = ''

  @Fields.json({
    caption: 'מזהי תורמים',
    includeInApi: true
  })
  donorIds: string[] = []

  @Fields.json({
    caption: 'נקודות פוליגון',
    allowNull: true,
    includeInApi: true
  })
  polygonPoints?: { lat: number; lng: number }[]

  @Relations.toOne<TargetAudience, User>(() => User, {
    field: 'createdByUserId',
    caption: 'נוצר על ידי',
    includeInApi: true
  })
  createdByUser?: User

  @Fields.string({
    allowNull: true,
    includeInApi: true
  })
  createdByUserId?: string

  @Fields.date({
    caption: 'תאריך יצירה',
    includeInApi: true
  })
  createdDate = new Date()

  @Fields.date({
    caption: 'תאריך עדכון אחרון',
    includeInApi: true
  })
  updatedDate = new Date()

  @Fields.boolean({
    caption: 'פעיל',
    includeInApi: true
  })
  isActive = true

  @Fields.integer({
    caption: 'מספר תורמים',
    serverExpression: (targetAudience: TargetAudience) => targetAudience.donorIds?.length || 0,
    includeInApi: true
  })
  donorCount = 0

  // Metadata
  @Fields.json({
    caption: 'מטא-דאטה',
    allowNull: true,
    includeInApi: true
  })
  metadata?: {
    source?: string // 'map_polygon' | 'manual' | 'import' etc.
    polygonData?: any // Store polygon coordinates if created from map
    totalDonations?: number // Sum of donations from all donors
    averageDonation?: number // Average donation amount
    createdFrom?: string // Additional context
  }
}
