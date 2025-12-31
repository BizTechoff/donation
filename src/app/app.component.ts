import { Component, OnInit, ViewChild } from '@angular/core'
import { Router, Route, ActivatedRoute } from '@angular/router'
import { MatSidenav } from '@angular/material/sidenav'
import { Observable, map, combineLatest, switchMap } from 'rxjs'

import { UIToolsService } from './common/UIToolsService'
import { openDialog, RouteHelperService } from 'common-ui-elements'

import { DataAreaDialogComponent } from './common/data-area-dialog/data-area-dialog.component'
import { I18nService } from './i18n/i18n.service'
import { SignInController } from './users/SignInController'
import { UpdatePasswordController } from './users/UpdatePasswordController'
import { remult } from 'remult'
import { User } from '../shared/entity/user'
import { Reminder } from '../shared/entity/reminder'
import { terms } from './terms'
import { SidebarService } from './services/sidebar.service'
import { GlobalFilterService } from './services/global-filter.service'
import { ReminderService } from './services/reminder.service'
import { DonorController } from '../shared/controllers/donor.controller'
import { HebrewDateService } from './services/hebrew-date.service'
 
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  version = '2025.12.31' // environment.production ? '2025.08.05' : '2025.07.31'
  currentHebrewDate = this.hebrewDate.convertGregorianToHebrew(new Date())?.formatted

  // Active reminders count - will be updated in ngOnInit
  activeRemindersCount$ = new Observable<number>((observer) => {
    observer.next(0)
    observer.complete()
  })

  constructor(
    public router: Router,
    public activeRoute: ActivatedRoute,
    private routeHelper: RouteHelperService,
    public uiService: UIToolsService,
    public i18n: I18nService,
    private sidebarService: SidebarService,
    private globalFilterService: GlobalFilterService,
    private reminderService: ReminderService,
    private hebrewDate: HebrewDateService
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

    // Initialize active reminders count with live query + global filters support
    if (remult.user?.id) {
      console.log('Initializing activeRemindersCount$ with live query and global filters support')

      const today = new Date()
      today.setHours(23, 59, 59, 999)

      // Create live query for reminders
      const reminderLiveQuery = remult.repo(Reminder).liveQuery({
        where: {
          nextReminderDate: { $lte: today },
          isCompleted: false,
          isActive: true
        }
      })

      // Combine live query with global filters
      this.activeRemindersCount$ = combineLatest([
        new Observable<Reminder[]>(observer => {
          reminderLiveQuery.subscribe({
            next: (result: any) => observer.next(result.items as Reminder[]),
            error: (err: any) => observer.error(err)
          })
        }),
        this.globalFilterService.filters$
      ]).pipe(
        switchMap(async ([reminders, filters]: [Reminder[], any]) => {
          // If no global filters are active, return all reminders count
          if (!filters || (!filters.countryIds?.length && !filters.cityIds?.length &&
              !filters.neighborhoodIds?.length && !filters.campaignIds?.length &&
              !filters.targetAudienceIds?.length)) {
            return reminders.length
          }

          // Filter reminders by global filters (check if donor matches)
          // Global filters are fetched from user.settings in the backend
          const donors = await DonorController.findFilteredDonors()
          const filteredDonorIds = new Set(donors.map(d => d.id))

          const filteredReminders = reminders.filter((r: Reminder) =>
            !r.donorId || filteredDonorIds.has(r.donorId)
          )

          return filteredReminders.length
        })
      )
    }

    // Subscribe to fullscreen mode changes for sidebar management
    this.sidebarService.fullscreenMode$.subscribe(isFullscreen => {
      if (isFullscreen) {
        // Entering fullscreen - save current state and close sidebar
        const currentState = this.isSidebarOpen() ? 'open' : 'close'
        this.sidebarService.saveSidebarState(currentState)
        this.closeSidebar()
      } else {
        // Exiting fullscreen - restore saved state
        const savedState = this.sidebarService.getSavedSidebarState()
        if (savedState === 'open') {
          this.openSidebar()
        }
      }
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

  async navigateToReminders() {
    const { RemindersListModalComponent } = await import('./routes/modals/reminders-list-modal/reminders-list-modal.component')
    await RemindersListModalComponent.open()
  }

  // Sidebar management methods
  getSidebarMode(): 'open' | 'close' {
    if (!remult.user?.id) return 'open';
    return (remult.user as any).settings?.sidebarMode || 'open';
  }

  async setSidebarMode(mode: 'open' | 'close') {
    if (!remult.user?.id) return;

    const userRepo = remult.repo(User);
    const user = await userRepo.findId(remult.user.id);
    if (user) {
      if (!user.settings) {
        user.settings = {
          openModal: 'dialog',
          calendar_heb_holidays_jews_enabled: true,
          calendar_open_heb_and_eng_parallel: true
        };
      }
      user.settings.sidebarMode = mode;
      await userRepo.save(user);

      // Update current user object
      remult.user = user;
    }
  }

  async toggleSidebar() {
    const currentMode = this.getSidebarMode();
    const newMode = currentMode === 'open' ? 'close' : 'open';
    await this.setSidebarMode(newMode);

    if (newMode === 'open') {
      this.sidenav.open();
    } else {
      this.sidenav.close();
    }
  }

  closeSidebar() {
    this.sidenav.close();
  }

  openSidebar() {
    this.sidenav.open();
  }

  isSidebarOpen(): boolean {
    return this.sidenav?.opened || false;
  }

}
