import { AuthenticatedGuard } from 'common-ui-elements'
import { Injectable } from '@angular/core'
import { Roles } from '../../shared/enum/roles'

@Injectable()
export class AdminGuard extends AuthenticatedGuard {
  override isAllowed() {
    return Roles.admin
  }
}
