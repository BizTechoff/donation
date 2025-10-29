import { Component, OnInit, ViewChild } from '@angular/core'
import { Router, Route, ActivatedRoute } from '@angular/router'
import { MatSidenav } from '@angular/material/sidenav'
import { Observable, map, combineLatest } from 'rxjs'

import { UIToolsService } from './common/UIToolsService'
import { openDialog, RouteHelperService } from 'common-ui-elements'

import { DataAreaDialogComponent } from './common/data-area-dialog/data-area-dialog.component'
import { I18nService } from './i18n/i18n.service'
import { SignInController } from './users/SignInController'
import { UpdatePasswordController } from './users/UpdatePasswordController'
import { remult } from 'remult'
import { User } from '../shared/entity/user'
import { terms } from './terms'
 
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  version = '2025.10.29' // environment.production ? '2025.08.05' : '2025.07.31'
  
  constructor(
    public router: Router,
    public activeRoute: ActivatedRoute,
    private routeHelper: RouteHelperService,
    public uiService: UIToolsService,
    public i18n: I18nService
  ) {}
  remult = remult
  terms=terms

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
            if(remult.user){
              this.router.navigate([`/${this.i18n.currentTerms.donationsList}`]);
            }
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
    
    // Translate route names using i18n
    if (name && this.i18n.currentTerms[name as keyof typeof this.i18n.currentTerms]) {
      return this.i18n.currentTerms[name as keyof typeof this.i18n.currentTerms]
    }
    
    return name || ''
  }

  getRouteNameObservable(route: Route): Observable<string> {
    let name = route.path
    if (route.data && route.data['name']) name = route.data['name']
    
    return this.i18n.terms$.pipe(
      map(terms => {
        if (name && terms[name as keyof typeof terms]) {
          return terms[name as keyof typeof terms] as string
        }
        return name || ''
      })
    )
  }

  currentTitle() {
    let title = 'donation'
    
    if (this.activeRoute!.snapshot && this.activeRoute!.firstChild) {
      if (this.activeRoute.snapshot.firstChild!.data!['name']) {
        title = this.activeRoute.snapshot.firstChild!.data['name']
      } else {
        if (this.activeRoute.firstChild.routeConfig) {
          title = this.activeRoute.firstChild.routeConfig.path || 'donation'
        }
      }
    }
    
    // Translate title using i18n
    if (title && this.i18n.currentTerms[title as keyof typeof this.i18n.currentTerms]) {
      return this.i18n.currentTerms[title as keyof typeof this.i18n.currentTerms]
    }
    
    return title
  }

  getCurrentTitleObservable(): Observable<string> {
    let title = 'donation'
    
    if (this.activeRoute!.snapshot && this.activeRoute!.firstChild) {
      if (this.activeRoute.snapshot.firstChild!.data!['name']) {
        title = this.activeRoute.snapshot.firstChild!.data['name']
      } else {
        if (this.activeRoute.firstChild.routeConfig) {
          title = this.activeRoute.firstChild.routeConfig.path || 'donation'
        }
      }
    }
    
    return this.i18n.terms$.pipe(
      map(terms => {
        if (title && terms[title as keyof typeof terms]) {
          return terms[title as keyof typeof terms] as string
        }
        return title
      })
    )
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

  getUserInitials(): string {
    if (!remult.user?.name) return ''
    const names = remult.user.name.trim().split(' ')
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase()
    }
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }  

  openBizTechoff() {
    window?.open(`https://biztechoff.co.il/`, '_blank')
    // window?.open(`https://biztechoff.co.il/v/${this.version}`, '_blank')
  }

}
