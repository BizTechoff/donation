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
import { SeedDataComponent } from './components/seed-data/seed-data.component'

const defaultRoute = terms.home
const routes: Routes = [
  { path: defaultRoute, component: HomeComponent, canActivate: [NotAuthenticatedGuard], data: { name: 'home' } },
  // { path: 'demo', component: DemoDataControlAndDataAreaComponent },
  // Donation system routes
  // { path: terms.donorDetails, component: DonorDetailsComponent, canActivate: [AuthenticatedGuard], data: { name: 'donorDetails' } },
  { path: terms.donorList, component: DonorListComponent, canActivate: [AuthenticatedGuard], data: { name: 'donorList' } },
  { path: terms.donationsList, component: DonationsListComponent, canActivate: [AuthenticatedGuard], data: { name: 'donationsList' } },
  { path: terms.campaigns, component: CampaignsListComponent, canActivate: [AuthenticatedGuard], data: { name: 'campaigns' } },
  // { path: terms.standingOrders, component: StandingOrdersComponent, canActivate: [AuthenticatedGuard], data: { name: 'standingOrders' } },
  { path: terms.certificates, component: CertificatesComponent, canActivate: [AuthenticatedGuard], data: { name: 'certificates' } },
  { path: terms.reminders, component: RemindersComponent, canActivate: [AuthenticatedGuard], data: { name: 'reminders' } },
  { path: terms.donorsMap, component: DonorsMapComponent, canActivate: [AuthenticatedGuard], data: { name: 'donorsMap' } },
  { path: terms.reports, component: ReportsComponent, canActivate: [AdminGuard], data: { name: 'reports' } },
  { path: terms.userAccounts, component: UsersComponent, canActivate: [AdminGuard], data: { name: 'userAccounts' } },
  // { path: 'seed-data', component: SeedDataComponent, canActivate: [AdminGuard], data: { name: 'seedData' } },
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
