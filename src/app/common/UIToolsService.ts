import { ErrorHandler, Injectable, NgZone } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'

import {
  BusyService,
  CommonUIElementsPluginsService,
  openDialog,
  SelectValueDialogComponent,
} from 'common-ui-elements'
import { Place } from '../../shared/entity/place'
import { terms } from '../terms'
import {
  AreaDialogArgs,
  GridDialogArgs,
  InputAddressResult,
  MultiSelectOptions,
  UITools,
} from './UITools'
import { AddressInputComponent } from './address-input/address-input.component'
import { InputImageComponent } from './input-image/input-image.component'
import { MultiSelectListDialogComponent } from './multi-select-list-dialog/multi-select-list-dialog.component'
import { TextAreaDataControlComponent } from './textarea-data-control/textarea-data-control.component'
import { YesNoQuestionComponent } from './yes-no-question/yes-no-question.component'

@Injectable()
export class UIToolsService implements UITools {
  report(what: string, context: string, taskId?: string) { }
  constructor(
    zone: NgZone,
    private snackBar: MatSnackBar,
    commonUIPlugin: CommonUIElementsPluginsService,
    public busy: BusyService
  ) {
    this.mediaMatcher.addListener((mql) =>
      zone.run(() => /*this.mediaMatcher = mql*/ ''.toString())
    )
    this.enhanceFieldOptionsAndDataControlOptions(commonUIPlugin)
  }
  multiSelectValueDialog<T>(args: MultiSelectOptions<T>): Promise<void> {
    return openDialog(MultiSelectListDialogComponent, (x) => x.args(args))
  }

  info(info: string): any {
    this.snackBar.open(info, terms.close, { duration: 4000 })
  }
  async error(err: any, taskId?: string) {
    const message = extractError(err)
    if (message == 'Network Error') return
    this.report(terms.error, message, taskId)
    return await openDialog(
      YesNoQuestionComponent,
      (d) =>
      (d.args = {
        message,
        isAQuestion: false,
      })
    )
  }
  async gridDialog(args: GridDialogArgs): Promise<void> {
    await openDialog(
      (
        await import('./grid-dialog/grid-dialog.component')
      ).GridDialogComponent,
      (x) => (x.args = args)
    )
  }
  async areaDialog(args: AreaDialogArgs): Promise<void> {
    await openDialog(
      (
        await import('./data-area-dialog/data-area-dialog.component')
      ).DataAreaDialogComponent,
      (x) => (x.args = args)
    )
  }
  private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 720px)`)

  isScreenSmall() {
    return this.mediaMatcher.matches
  }
  async yesNoQuestion(question: string, isAQuestion = false) {
    return await openDialog(
      YesNoQuestionComponent,
      (d) => (d.args = { message: question, isAQuestion: isAQuestion }),
      (d) => d.okPressed
    )
  }
  async confirmDelete(of: string) {
    return await this.yesNoQuestion(
      terms.areYouSureYouWouldLikeToDelete + ' ' + of + '?'
    )
  }

  async selectValuesDialog<T extends { caption?: string }>(args: {
    values: T[]
    onSelect: (selected: T) => void
    title?: string
  }): Promise<void> {
    await openDialog(SelectValueDialogComponent, (x) => x.args(args))
  }

  async donorDetailsDialog(donorId: string, options?: { initialPlace?: Place }): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/donor-details-modal/donor-details-modal.component')).DonorDetailsModalComponent,
      (dlg) => dlg.args = {
        donorId,
        initialPlace: options?.initialPlace
      }
    )
  }

  async campaignDetailsDialog(campaignId: string): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/campaign-details-modal/campaign-details-modal.component')).CampaignDetailsModalComponent,
      (dlg) => dlg.args = { campaignId }
    )
  }

  async campaignDonorsDialog(campaignId: string): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/campaign-donors-modal/campaign-donors-modal.component')).CampaignDonorsModalComponent,
      (dlg) => dlg.args = { campaignId }
    )
  }

  async donationDetailsDialog(donationId: string, options?: { donorId?: string; campaignId?: string; amount?: number }): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/donation-details-modal/donation-details-modal.component')).DonationDetailsModalComponent,
      (dlg) => dlg.args = { donationId, donorId: options?.donorId, campaignId: options?.campaignId, amount: options?.amount }
    )
  }

  async selectEventDialog(availableEvents: any[], title?: string): Promise<any> {
    return await openDialog(
      (await import('../routes/modals/event-selection-modal/event-selection-modal.component')).EventSelectionModalComponent,
      (dlg) => dlg.args = { availableEvents, title }
    );
  }

  async donorGiftDetailsDialog(donorGiftId: string, options?: { donorId?: string }): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/donor-gift-details-modal/donor-gift-details-modal.component')).DonorGiftDetailsModalComponent,
      (dlg) => dlg.args = { donorGiftId, donorId: options?.donorId }
    )
  }

  async certificateDetailsDialog(certificateId?: string, options?: { donorId?: string; donationId?: string }): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/certificate-details-modal/certificate-details-modal.component')).CertificateDetailsModalComponent,
      (dlg) => dlg.args = { certificateId, donorId: options?.donorId, donationId: options?.donationId }
    )
  }

  async reminderDetailsDialog(reminderId?: string, options?: {
    userId?: string;
    donorId?: string;
    reminderType?: 'donation_followup' | 'thank_you' | 'receipt' | 'birthday' | 'holiday' | 'general' | 'meeting' | 'phone_call' | 'memorialDay' | 'memorial' | 'yahrzeit';
    reminderDate?: Date;
    isRecurringYearly?: boolean;
    hideDonorField?: boolean; // Hide donor field when opened from entity that already has donor (default: true)
    sourceEntity?: 'donation' | 'certificate' | 'donor_gift' | 'donor_event'; // Source entity type for dynamic title
    donorName?: string; // Donor name for dynamic title
    sourceEntityType?: 'donation' | 'certificate' | 'donor_gift' | 'donor_event'; // Source entity type to save in reminder
    sourceEntityId?: string; // Source entity ID to save in reminder
  }): Promise<boolean | string> {
    return await openDialog(
      (await import('../routes/modals/reminder-details-modal/reminder-details-modal.component')).ReminderDetailsModalComponent,
      (dlg) => dlg.args = {
        reminderId,
        userId: options?.userId,
        donorId: options?.donorId,
        reminderType: options?.reminderType,
        reminderDate: options?.reminderDate,
        isRecurringYearly: options?.isRecurringYearly,
        hideDonorField: options?.hideDonorField !== undefined ? options.hideDonorField : true, // Default to true
        sourceEntity: options?.sourceEntity,
        donorName: options?.donorName,
        sourceEntityType: options?.sourceEntityType,
        sourceEntityId: options?.sourceEntityId
      }
    )
  }

  async letterPropertiesDialog(donationId: string): Promise<any> {
    return await openDialog(
      (await import('../routes/modals/letter-properties-modal/letter-properties-modal.component')).LetterPropertiesModalComponent,
      (dlg) => dlg.args = { donationId }
    )
  }

  async bankDetailsDialog(bankId?: string): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/bank-details-modal/bank-details-modal.component')).BankDetailsModalComponent,
      (dlg) => dlg.args = { bankId }
    )
  }

  async companyDetailsDialog(companyId?: string): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/company-details-modal/company-details-modal.component')).CompanyDetailsModalComponent,
      (dlg) => dlg.args = { companyId }
    )
  }

  async organizationDetailsDialog(organizationId?: string): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/organization-details-modal/organization-details-modal.component')).OrganizationDetailsModalComponent,
      (dlg) => dlg.args = { organizationId }
    )
  }

  async donorDonationsDialog(donorId: string, donationType: 'donations' | 'gifts' | 'receipts', donorName?: string): Promise<void> {
    return await openDialog(
      (await import('../routes/modals/donor-donations-modal/donor-donations-modal.component')).DonorDonationsModalComponent,
      (dlg) => dlg.args = { donorId, donationType, donorName }
    )
  }

  async campaignDonationsDialog(campaignId: string, campaignName?: string): Promise<void> {
    return await openDialog(
      (await import('../routes/modals/campaign-donations-modal/campaign-donations-modal.component')).CampaignDonationsModalComponent,
      (dlg) => dlg.args = { campaignId, campaignName }
    )
  }

  async campaignBlessingBookDialog(campaignId: string, campaignName?: string): Promise<void> {
    return await openDialog(
      (await import('../routes/modals/campaign-blessing-book-modal/campaign-blessing-book-modal.component')).CampaignBlessingBookModalComponent,
      (dlg) => dlg.args = { campaignId, campaignName }
    )
  }

  async campaignInvitedListDialog(campaignId: string): Promise<void> {
    return await openDialog(
      (await import('../routes/modals/campaign-invited-list-modal/campaign-invited-list-modal.component')).CampaignInvitedListModalComponent,
      (dlg) => dlg.args = { campaignId }
    )
  }

  async paymentListDialog(donationId: string, donationAmount?: number): Promise<void> {
    return await openDialog(
      (await import('../routes/modals/payment-list-modal/payment-list-modal.component')).PaymentListModalComponent,
      (dlg) => dlg.args = { donationId, donationAmount }
    )
  }

  async paymentDetailsDialog(paymentId: string, options?: { donationId?: string; amount?: number }): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/payment-details-modal/payment-details-modal.component')).PaymentDetailsModalComponent,
      (dlg) => dlg.args = { paymentId, donationId: options?.donationId, amount: options?.amount }
    )
  }

  async mapSelectedDonorsDialog(donors: any[], polygonPoints?: { lat: number; lng: number }[]): Promise<any> {
    return await openDialog(
      (await import('../routes/modals/map-selected-donors-modal/map-selected-donors-modal.component')).MapSelectedDonorsModalComponent,
      (dlg) => dlg.args = { donors, polygonPoints }
    )
  }

  async openAudienceSelection(options?: { title?: string; multiSelect?: boolean; selectedIds?: string[] }): Promise<any> {
    return await openDialog(
      (await import('../routes/modals/audience-selection-modal/audience-selection-modal.component')).AudienceSelectionModalComponent,
      (dlg) => dlg.args = {
        title: options?.title,
        multiSelect: options?.multiSelect,
        selectedIds: options?.selectedIds
      }
    )
  }

  async targetAudienceDetailsDialog(targetAudienceId?: string, options?: {
    initialDonors?: any[];
    polygonPoints?: { lat: number; lng: number }[];
    metadata?: any;
  }): Promise<any> {
    return await openDialog(
      (await import('../routes/modals/target-audience-details-modal/target-audience-details-modal.component')).TargetAudienceDetailsModalComponent,
      (dlg) => dlg.args = {
        targetAudienceId,
        initialDonors: options?.initialDonors,
        polygonPoints: options?.polygonPoints,
        metadata: options?.metadata
      }
    )
  }

  private enhanceFieldOptionsAndDataControlOptions(
    commonUIPlugin: CommonUIElementsPluginsService
  ) {
    commonUIPlugin.dataControlAugmenter = (fieldMetadata, options) => {
      if (fieldMetadata?.options.clickWithUI) {
        if (!options.click) {
          options.click = (entity, fieldRef) =>
            fieldMetadata.options.clickWithUI!(this, entity, fieldRef)
        }
      }
      if (fieldMetadata.options.valueList && !options.valueList)
        options.valueList = fieldMetadata.options.valueList
      if (fieldMetadata.options.width)
        options.width = fieldMetadata.options.width
      if (fieldMetadata.options.customInput && !options.customComponent) {
        fieldMetadata.options.customInput({
          image() {
            {
              options.customComponent = {
                component: InputImageComponent,
              }
            }
          },
          textarea() {
            options.customComponent = {
              component: TextAreaDataControlComponent,
            }
          },
          inputAddress(
            onSelect?: (result: InputAddressResult, entityInstance: any) => void
          ) {
            options.customComponent = {
              component: AddressInputComponent,
              args: onSelect,
            }
          },
        })
      }
    }
  }
}
@Injectable()
export class ShowDialogOnErrorErrorHandler extends ErrorHandler {
  constructor(private ui: UIToolsService, private zone: NgZone) {
    super()
  }
  lastErrorString = ''
  lastErrorTime!: number
  override async handleError(error: any) {
    super.handleError(error)
    if (
      this.lastErrorString == error.toString() &&
      new Date().valueOf() - this.lastErrorTime < 100
    )
      return
    this.lastErrorString = error.toString()
    this.lastErrorTime = new Date().valueOf()
    this.zone.run(() => {
      this.ui.error(error)
    })
  }
}

export function extractError(err: any): string {
  if (typeof err === 'string') return err
  if (err.modelState) {
    if (err.message) return err.message
    for (const key in err.modelState) {
      if (err.modelState.hasOwnProperty(key)) {
        const element = err.modelState[key]
        return key + ': ' + element
      }
    }
  }
  if (err.rejection) return extractError(err.rejection) //for promise failed errors and http errors
  if (err.httpStatusCode == 403) return terms.unauthorizedOperation
  if (err.message) {
    let r = err.message
    if (err.error && err.error.message) r = err.error.message
    return r
  }
  if (err.error) return extractError(err.error)

  return JSON.stringify(err)
}
