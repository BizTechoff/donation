import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { remult } from 'remult'
import { SignInController } from '../../users/SignInController'

@Component({
  selector: 'app-mobile-shell',
  templateUrl: './mobile-shell.component.html',
  styleUrls: ['./mobile-shell.component.scss']
})
export class MobileShellComponent {
  remult = remult

  constructor(public router: Router) { }

  get userName(): string {
    return remult.user?.name || ''
  }

  get currentTab(): string {
    if (this.router.url.includes('route-planner')) return 'route'
    return 'donation'
  }

  signOut() {
    SignInController.signOut()
    remult.user = undefined
    this.router.navigate(['/'])
  }
}
