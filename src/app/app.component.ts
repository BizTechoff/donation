import { Component, OnInit, ViewChild } from '@angular/core'
import { Router, Route, ActivatedRoute } from '@angular/router'
import { MatSidenav } from '@angular/material/sidenav'

import { UIToolsService } from './common/UIToolsService'
import { openDialog, RouteHelperService } from 'common-ui-elements'

import { DataAreaDialogComponent } from './common/data-area-dialog/data-area-dialog.component'
import { I18nService } from './i18n/i18n.service'
import { SignInController } from './users/SignInController'
import { UpdatePasswordController } from './users/UpdatePasswordController'
import { remult } from 'remult'
import { User } from '../shared/entity/user'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(
    public router: Router,
    public activeRoute: ActivatedRoute,
    private routeHelper: RouteHelperService,
    public uiService: UIToolsService,
    public i18n: I18nService
  ) {}
  remult = remult

  async signIn() {
    const signIn = new SignInController()
    openDialog(
      DataAreaDialogComponent,
      (i) =>
        (i.args = {
          title: this.i18n.currentTerms.signIn,
          object: signIn,
          ok: async () => {
            remult.user = await signIn.signIn()
          },
        })
    )
  }

  ngOnInit(): void {
    // Initialize document direction based on current language
    this.updateDocumentDirection()
    
    // Subscribe to language changes
    this.i18n.language$.subscribe(() => {
      this.updateDocumentDirection()
    })
  }

  private updateDocumentDirection(): void {
    const direction = this.i18n.isRTL ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('dir', direction)
    document.documentElement.setAttribute('lang', this.i18n.currentLanguage)
  }

  signOut() {
    SignInController.signOut()
    remult.user = undefined
    this.router.navigate(['/'])
  }

  async updateInfo() {
    let user = (await remult.repo(User).findId(remult.user!.id))!
    openDialog(
      DataAreaDialogComponent,
      (i) =>
        (i.args = {
          title: this.i18n.currentTerms.updateInfo,
          fields: [user.$.name],
          ok: async () => {
            await user._.save()
          },
        })
    )
  }
  async changePassword() {
    const updatePassword = new UpdatePasswordController()
    openDialog(
      DataAreaDialogComponent,
      (i) =>
        (i.args = {
          title: this.i18n.currentTerms.changePassword,
          object: updatePassword,
          ok: async () => {
            await updatePassword.updatePassword()
          },
        })
    )
  }

  routeName(route: Route) {
    let name = route.path
    if (route.data && route.data['name']) name = route.data['name']
    return name
    return ''
  }

  currentTitle() {
    if (this.activeRoute!.snapshot && this.activeRoute!.firstChild)
      if (this.activeRoute.snapshot.firstChild!.data!['name']) {
        return this.activeRoute.snapshot.firstChild!.data['name']
      } else {
        if (this.activeRoute.firstChild.routeConfig)
          return this.activeRoute.firstChild.routeConfig.path
      }
    return 'donation'
  }
  doesNotRequireLogin() {
    return this.activeRoute?.snapshot?.firstChild?.data?.['noLogin']
  }

  shouldDisplayRoute(route: Route) {
    if (
      !(
        this.routeName(route) &&
        (route.path || '').indexOf(':') < 0 &&
        (route.path || '').indexOf('**') < 0 &&
        !route.data?.['hide']
      )
    )
      return false
    return this.routeHelper.canNavigateToRoute(route)
  }
  //@ts-ignore ignoring this to match angular 7 and 8
  @ViewChild('sidenav') sidenav: MatSidenav
  routeClicked() {
    if (this.uiService.isScreenSmall()) this.sidenav.close()
  }
}
