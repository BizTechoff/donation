import { ErrorHandler, NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { AuthenticatedGuard, CommonUIElementsModule, NotAuthenticatedGuard } from 'common-ui-elements'

import { ShowDialogOnErrorErrorHandler } from './common/UIToolsService'
import { CertificatesComponent } from './route/certificates/certificates.component'
import { CampaignsListComponent } from './route/campaigns-list/campaigns-list.component'
import { DonationsListComponent } from './route/donations-list/donations-list.component'
import { ReportsComponent } from './route/reports/reports.component'
import { DonorDetailsComponent } from './route/donor-details/donor-details.component'
import { DonorListComponent } from './route/donor-list/donor-list.component'
import { DonorsMapComponent } from './route/donors-map/donors-map.component'
import { HomeComponent } from './route/home/home.component'
import { RemindersComponent } from './route/reminders/reminders.component'
import { StandingOrdersComponent } from './route/standing-orders/standing-orders.component'
import { terms } from './terms'
import { AdminGuard } from './users/AuthGuard'
import { UsersComponent } from './users/users.component'
import { SilentRedirectComponent } from './users/silent-redirect.component'

const defaultRoute = terms.home
const routes: Routes = [
  { path: defaultRoute, component: HomeComponent, canActivate: [NotAuthenticatedGuard] },
  // { path: 'demo', component: DemoDataControlAndDataAreaComponent },
  // Donation system routes
  { path: terms.donorDetails, component: DonorDetailsComponent, canActivate: [AuthenticatedGuard] },
  { path: terms.donorList, component: DonorListComponent, canActivate: [AuthenticatedGuard] },
  { path: terms.donationsList, component: DonationsListComponent, canActivate: [AuthenticatedGuard] },
  { path: terms.campaigns, component: CampaignsListComponent, canActivate: [AuthenticatedGuard] },
  { path: terms.standingOrders, component: StandingOrdersComponent, canActivate: [AuthenticatedGuard] },
  { path: terms.certificates, component: CertificatesComponent, canActivate: [AuthenticatedGuard] },
  { path: terms.reminders, component: RemindersComponent, canActivate: [AuthenticatedGuard] },
  { path: terms.donorsMap, component: DonorsMapComponent, canActivate: [AuthenticatedGuard] },
  { path: terms.reports, component: ReportsComponent, canActivate: [AdminGuard] },
  { path: terms.userAccounts, component: UsersComponent, canActivate: [AdminGuard] },
  { path: '', component: SilentRedirectComponent, pathMatch: 'full' },
  { path: '**', component: SilentRedirectComponent } // תופס כל נתיב 
]

@NgModule({
  imports: [RouterModule.forRoot(routes), CommonUIElementsModule],
  providers: [
    AdminGuard,
    { provide: ErrorHandler, useClass: ShowDialogOnErrorErrorHandler },
  ],
  exports: [RouterModule],
})
export class AppRoutingModule { }
