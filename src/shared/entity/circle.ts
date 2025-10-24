import {
  Allow,
  Entity,
  Fields,
  IdEntity,
  isBackend,
} from 'remult'

@Entity<Circle>('circles', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Allow.authenticated,
  allowApiInsert: Allow.authenticated,
  saving: async (circle) => {
    if (isBackend()) {
      if (circle._.isNew()) {
        circle.createdDate = new Date()
      }
      circle.updatedDate = new Date()
    }
  },
})
export class Circle extends IdEntity {
  @Fields.string({
    caption: 'שם החוג',
    allowNull: false,
  })
  name = ''

  @Fields.string({
    caption: 'שם באנגלית',
  })
  nameEnglish?: string

  @Fields.string({
    caption: 'תיאור',
  })
  description?: string

  @Fields.string({
    caption: 'צבע (hex)',
  })
  color?: string // For tag color, e.g., '#667eea'

  @Fields.string({
    caption: 'אייקון',
  })
  icon?: string // Material icon name, e.g., 'star', 'favorite'

  @Fields.integer({
    caption: 'סדר מיון',
  })
  sortOrder = 0

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.createdAt({
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.updatedAt({
    caption: 'תאריך עדכון',
  })
  updatedDate = new Date()
}
