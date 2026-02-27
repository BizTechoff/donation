import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatCardModule } from '@angular/material/card'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatDialogModule } from '@angular/material/dialog'
import { MatButtonToggleModule } from '@angular/material/button-toggle'

import { MobileRoutingModule } from './mobile-routing.module'
import { MobileShellComponent } from './mobile-shell/mobile-shell.component'
import { QuickDonationComponent } from './quick-donation/quick-donation.component'
import { DonorSelectStepComponent } from './quick-donation/steps/donor-select-step/donor-select-step.component'
import { DonationFormStepComponent } from './quick-donation/steps/donation-form-step/donation-form-step.component'
import { PhotoCaptureStepComponent } from './quick-donation/steps/photo-capture-step/photo-capture-step.component'
import { DoneStepComponent } from './quick-donation/steps/done-step/done-step.component'
import { DonorDetailsStepComponent } from './quick-donation/steps/donor-details-step/donor-details-step.component'
import { RoutePlannerComponent } from './route-planner/route-planner.component'

@NgModule({
  declarations: [
    MobileShellComponent,
    QuickDonationComponent,
    DonorSelectStepComponent,
    DonationFormStepComponent,
    PhotoCaptureStepComponent,
    DoneStepComponent,
    DonorDetailsStepComponent,
    RoutePlannerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MobileRoutingModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatButtonToggleModule
  ]
})
export class MobileModule { }
