import {
  BackendMethod,
  Entity,
  Fields,
  IdEntity,
  Validators,
  isBackend
} from 'remult'
import { DataControl } from '../../app/common-ui-elements/interfaces'
import { terms } from '../../app/terms'
import { Roles } from '../enum/roles'


@Entity<User>('users', {
  allowApiCrud: true,
  defaultOrderBy: { admin: 'desc', manager: 'desc', donator: 'desc', name: 'asc' },
  // allowApiRead: Allow.authenticated,
  // allowApiUpdate: Allow.authenticated,
  // allowApiDelete: false,
  // allowApiInsert: Roles.admin,
  // apiPrefilter: () =>
  //   !remult.isAllowed(Roles.admin) ? { id: [remult.user?.id!] } : {},
  saving: async (user) => {
    if (isBackend()) {
      if (user._.isNew()) {
        user.createDate = new Date()
      }
    }
  },
})
export class User extends IdEntity {
  @Fields.string({
    validate: [Validators.required, Validators.uniqueOnBackend],
    caption: terms.username,
  })
  name = ''
  @Fields.string({ includeInApi: false })
  password = ''
  @Fields.date({
    allowApiUpdate: false,
  })
  createDate = new Date()

  @DataControl<User, boolean>({
    valueChange: (row, col) => {
      if (col.value) {
        row.manager = false
        row.donator = false
      }
    }
  })
  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.admin,
  })
  admin = false


  @DataControl<User, boolean>({
    valueChange: (row, col) => {
      if (col.value) {
        row.admin = false
        row.donator = false
      }
    }
  })
  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.manager,
  })
  manager = false

  @DataControl<User, boolean>({
    valueChange: (row, col) => {
      if (col.value) {
        row.admin = false
        row.manager = false
      }
    }
  })
  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.donator,
  })
  donator = false

  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.disabled,
  })
  disabled = false

  async hashAndSetPassword(password: string) {
    this.password = (await import('password-hash')).generate(password)
  }
  async passwordMatches(password: string) {
    return (
      !this.password ||
      (await import('password-hash')).verify(password, this.password)
    )
  }
  @BackendMethod({ allowed: Roles.admin })
  async resetPassword() {
    this.password = ''
    await this.save()
  }
}
