import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { MobileShellComponent } from './mobile-shell/mobile-shell.component'
import { QuickDonationComponent } from './quick-donation/quick-donation.component'
import { RoutePlannerComponent } from './route-planner/route-planner.component'

const routes: Routes = [
  {
    path: '',
    component: MobileShellComponent,
    children: [
      { path: 'quick-donation', component: QuickDonationComponent },
      { path: 'route-planner', component: RoutePlannerComponent },
      { path: '', redirectTo: 'quick-donation', pathMatch: 'full' }
    ]
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MobileRoutingModule { }
