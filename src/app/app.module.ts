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
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatTableModule } from '@angular/material/table'
import { MatSortModule } from '@angular/material/sort'
import { MatPaginatorModule } from '@angular/material/paginator'
import { MatProgressBarModule } from '@angular/material/progress-bar'
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
import { FamilyRelationDetailsModalComponent } from './routes/modals/family-relation-details-modal/family-relation-details-modal.component'
import { SharedComponentsModule } from './shared/shared-components.module'
import { HebrewDateService } from './services/hebrew-date.service'
import { GlobalFiltersComponent } from './components/global-filters/global-filters.component'
import { QuickActionsComponent } from './components/quick-actions/quick-actions.component'
import { SeedDataComponent } from './components/seed-data/seed-data.component'
import { EventSelectionModalComponent } from './routes/modals/event-selection-modal/event-selection-modal.component'
import { NotesSelectionModalComponent } from './routes/modals/notes-selection-modal/notes-selection-modal.component'
import { CircleSelectionModalComponent } from './routes/modals/circle-selection-modal/circle-selection-modal.component'
import { CompanySelectionModalComponent } from './routes/modals/company-selection-modal/company-selection-modal.component'
import { BankSelectionModalComponent } from './routes/modals/bank-selection-modal/bank-selection-modal.component'
import { OrganizationSelectionModalComponent } from './routes/modals/organization-selection-modal/organization-selection-modal.component'
import { DonorSelectionModalComponent } from './routes/modals/donor-selection-modal/donor-selection-modal.component'
import { DonorAddressTypeSelectionModalComponent } from './routes/modals/donor-address-type-selection-modal/donor-address-type-selection-modal.component'
import { OsmAddressInputComponent } from './common/osm-address-input/osm-address-input.component'
import { LetterPropertiesModalComponent } from './routes/modals/letter-properties-modal/letter-properties-modal.component'
import { ReminderDetailsModalComponent } from './routes/modals/reminder-details-modal/reminder-details-modal.component'
import { DonationDetailsModalComponent } from './routes/modals/donation-details-modal/donation-details-modal.component'
import { CampaignDetailsModalComponent } from './routes/modals/campaign-details-modal/campaign-details-modal.component'
import { CampaignInvitedListModalComponent } from './routes/modals/campaign-invited-list-modal/campaign-invited-list-modal.component'
import { StandingOrderDetailsModalComponent } from './routes/modals/standing-order-details-modal/standing-order-details-modal.component'
import { CertificateDetailsModalComponent } from './routes/modals/certificate-details-modal/certificate-details-modal.component'
import { OrganizationDetailsModalComponent } from './routes/modals/organization-details-modal/organization-details-modal.component'
import { BankDetailsModalComponent } from './routes/modals/bank-details-modal/bank-details-modal.component'
import { CompanyDetailsModalComponent } from './routes/modals/company-details-modal/company-details-modal.component'
import { CircleDetailsModalComponent } from './routes/modals/circle-details-modal/circle-details-modal.component'
import { DonorDonationsModalComponent } from './routes/modals/donor-donations-modal/donor-donations-modal.component'
import { CampaignDonorsModalComponent } from './routes/modals/campaign-donors-modal/campaign-donors-modal.component'
import { CampaignBlessingBookModalComponent } from './routes/modals/campaign-blessing-book-modal/campaign-blessing-book-modal.component'
import { ToggleSwitchComponent } from './shared/toggle-switch/toggle-switch.component'
import { UserDetailsComponent } from './route/user-details/user-details.component'
import { FileUploadComponent } from './components/file-upload/file-upload.component'
import { PaymentListModalComponent } from './routes/modals/payment-list-modal/payment-list-modal.component'

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
    DonationsListComponent,
    CampaignsListComponent,
    StandingOrdersComponent,
    CertificatesComponent,
    RemindersComponent,
    ReportsComponent,
    LanguageSwitcherComponent,
    DonorsMapComponent,
    EventSelectionModalComponent,
    NotesSelectionModalComponent,
    CircleSelectionModalComponent,
    CompanySelectionModalComponent,
    BankSelectionModalComponent,
    OrganizationSelectionModalComponent,
    DonorSelectionModalComponent,
    DonorAddressTypeSelectionModalComponent,
    DonorDetailsModalComponent,
    FamilyRelationDetailsModalComponent,
    LetterPropertiesModalComponent,
    ReminderDetailsModalComponent,
    DonationDetailsModalComponent,
    CampaignDetailsModalComponent,
    CampaignInvitedListModalComponent,
    StandingOrderDetailsModalComponent,
    CertificateDetailsModalComponent,
    OrganizationDetailsModalComponent,
    BankDetailsModalComponent,
    CompanyDetailsModalComponent,
    CircleDetailsModalComponent,
    DonorDonationsModalComponent,
    CampaignDonorsModalComponent,
    CampaignBlessingBookModalComponent,
    ModalNavigationHeaderComponent,
    GlobalFiltersComponent,
    QuickActionsComponent,
    SeedDataComponent,
    ToggleSwitchComponent,
    UserDetailsComponent,
    OsmAddressInputComponent,
    FileUploadComponent,
    PaymentListModalComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    SharedComponentsModule,
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
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    CommonUIElementsModule
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
