import {
  IdEntity,
  Entity,
  Fields,
  Relations,
  Allow,
  isBackend,
} from 'remult'
import { Donor } from './donor'
import { Roles } from '../enum/roles'

@Entity<DonorRelation>('donor_relations', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (donorRelation) => {
    if (isBackend()) {
      if (donorRelation._.isNew()) {
        donorRelation.createdDate = new Date()
      }
      donorRelation.updatedDate = new Date()
    }
  },
})
export class DonorRelation extends IdEntity {
  
  @Relations.toOne<DonorRelation, Donor>(() => Donor, {
    caption: 'תורם 1',
    field: 'donor1Id'
  })
  donor1?: Donor

  @Fields.string({
    caption: 'תורם 1 ID',
  })
  donor1Id = ''

  @Relations.toOne<DonorRelation, Donor>(() => Donor, {
    caption: 'תורם 2',
    field: 'donor2Id'
  })
  donor2?: Donor

  @Fields.string({
    caption: 'תורם 2 ID',
  })
  donor2Id = ''

  @Fields.string({
    caption: 'סוג קשר 1',
  })
  relationshipType1 = ''

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
