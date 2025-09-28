import { APP_INITIALIZER, NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { CommonModule } from '@angular/common'
import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { FormsModule } from '@angular/forms'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatListModule } from '@angular/material/list'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatCardModule } from '@angular/material/card'
import { MatDialogModule } from '@angular/material/dialog'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatSelectModule } from '@angular/material/select'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatNativeDateModule } from '@angular/material/core'
import { MatChipsModule } from '@angular/material/chips'
import { MatTooltipModule } from '@angular/material/tooltip'
import { CommonUIElementsModule } from 'common-ui-elements'
import { UsersComponent } from './users/users.component'
import { YesNoQuestionComponent } from './common/yes-no-question/yes-no-question.component'
import { DataAreaDialogComponent } from './common/data-area-dialog/data-area-dialog.component'
import { UIToolsService } from './common/UIToolsService'
import { AdminGuard } from './users/AuthGuard'
import { remult } from 'remult'
import { SignInController } from './users/SignInController'
import { TextAreaDataControlComponent } from './common/textarea-data-control/textarea-data-control.component'
import { DotsMenuComponent } from './common/dot-menu.component'
import { AddressInputComponent } from './common/address-input/address-input.component'
import { MultiSelectListDialogComponent } from './common/multi-select-list-dialog/multi-select-list-dialog.component'
import { InputImageComponent } from './common/input-image/input-image.component';
import { DemoDataControlAndDataAreaComponent } from './demo-data-control-and-data-area/demo-data-control-and-data-area.component'
import { HomeComponent } from './route/home/home.component'
import { DonorListComponent } from './route/donor-list/donor-list.component'
import { DonorDetailsComponent } from './route/donor-details/donor-details.component'
import { DonationsListComponent } from './route/donations-list/donations-list.component'
import { ModalNavigationHeaderComponent } from './shared/modal-navigation-header/modal-navigation-header.component'
import { CampaignsListComponent } from './route/campaigns-list/campaigns-list.component'
import { StandingOrdersComponent } from './route/standing-orders/standing-orders.component'
import { CertificatesComponent } from './route/certificates/certificates.component'
import { RemindersComponent } from './route/reminders/reminders.component'
import { ReportsComponent } from './route/reports/reports.component'
import { LanguageSwitcherComponent } from './i18n/language-switcher.component'
import { DonorsMapComponent } from './route/donors-map/donors-map.component'
import { DonorDetailsModalComponent } from './routes/modals/donor-details-modal/donor-details-modal.component'
import { DualDatePickerComponent } from './shared/dual-date-picker/dual-date-picker.component'
import { SharedComponentsModule } from './shared/shared-components.module'
import { HebrewDateService } from './services/hebrew-date.service'
import { GlobalFiltersComponent } from './components/global-filters/global-filters.component'
import { QuickActionsComponent } from './components/quick-actions/quick-actions.component'
import { SeedDataComponent } from './components/seed-data/seed-data.component'

@NgModule({
  declarations: [
    AppComponent,
    UsersComponent,
    HomeComponent,
    YesNoQuestionComponent,
    DataAreaDialogComponent,
    TextAreaDataControlComponent,
    AddressInputComponent,
    DotsMenuComponent,
    MultiSelectListDialogComponent,
    InputImageComponent,
    DemoDataControlAndDataAreaComponent,
    DonorListComponent,
    DonorDetailsComponent,
    DonationsListComponent,
    CampaignsListComponent,
    StandingOrdersComponent,
    CertificatesComponent,
    RemindersComponent,
    ReportsComponent,
    LanguageSwitcherComponent,
    DonorsMapComponent,
    DualDatePickerComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    SharedComponentsModule,
    ModalNavigationHeaderComponent,
    AppRoutingModule,
    FormsModule,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatTooltipModule,
    CommonUIElementsModule,
    GlobalFiltersComponent,
    QuickActionsComponent,
    SeedDataComponent,
  ],
  providers: [
    UIToolsService,
    AdminGuard,
    HebrewDateService,
    { provide: APP_INITIALIZER, useFactory: initApp, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

export function initApp() {
  const loadCurrentUserBeforeAppStarts = async () => {
    await remult.initUser()
  }
  return loadCurrentUserBeforeAppStarts
}
