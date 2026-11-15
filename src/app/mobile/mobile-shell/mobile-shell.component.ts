import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { remult } from 'remult'
import { SignInController } from '../../users/SignInController'
import { APP_VERSION } from '../../app-version'

@Component({
  selector: 'app-mobile-shell',
  templateUrl: './mobile-shell.component.html',
  styleUrls: ['./mobile-shell.component.scss']
})
export class MobileShellComponent {
  remult = remult
  version = APP_VERSION // הגרסה - app-version.ts, אחת עם המחשב

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

  openBizTechoff() {
    window?.open('https://biztechoff.co.il/', '_blank')
  }
}
