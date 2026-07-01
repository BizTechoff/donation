import { Injectable } from '@angular/core'
import { AuthenticatedGuard } from 'common-ui-elements'
import { Roles } from '../../shared/enum/roles'

@Injectable()
export class AdminGuard extends AuthenticatedGuard {
  override isAllowed() {
    return Roles.admin
  }
}

@Injectable()
export class AdminOrSecretary extends AuthenticatedGuard {
  override isAllowed() {
    return [Roles.admin, Roles.secretary]
  }
}
