import { ErrorHandler, Injectable, NgZone } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'

import {
  BusyService,
  CommonUIElementsPluginsService,
  openDialog,
  SelectValueDialogComponent,
} from 'common-ui-elements'
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
    private busy: BusyService
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
  async yesNoQuestion(question: string) {
    return await openDialog(
      YesNoQuestionComponent,
      (d) => (d.args = { message: question }),
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

  async donorDetailsDialog(donorId: string): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/donor-details-modal/donor-details-modal.component')).DonorDetailsModalComponent,
      (dlg) => dlg.args = { donorId },
      (dlg) => dlg.changed || dlg.shouldClose
    )
  }

  async campaignDetailsDialog(campaignId: string): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/campaign-details-modal/campaign-details-modal.component')).CampaignDetailsModalComponent,
      (dlg) => dlg.args = { campaignId },
      (dlg) => dlg.changed || dlg.shouldClose
    )
  }

  async campaignDonorsDialog(campaignId: string): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/campaign-donors-modal/campaign-donors-modal.component')).CampaignDonorsModalComponent,
      (dlg) => dlg.args = { campaignId },
      (dlg) => dlg.shouldClose
    )
  }

  async donationDetailsDialog(donationId: string, options?: { donorId?: string; campaignId?: string }): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/donation-details-modal/donation-details-modal.component')).DonationDetailsModalComponent,
      (dlg) => dlg.args = { donationId, donorId: options?.donorId, campaignId: options?.campaignId },
      (dlg) => dlg.changed
    )
  }

  async selectEventDialog(availableEvents: any[], title?: string): Promise<any> {
    return await openDialog(
      (await import('../routes/modals/event-selection-modal/event-selection-modal.component')).EventSelectionModalComponent,
      (dlg) => dlg.args = { availableEvents, title },
      (dlg) => dlg.selectedEvent
    );
  }

  async standingOrderDetailsDialog(standingOrderId: string, options?: { donorId?: string }): Promise<boolean> {
    return await openDialog(
      (await import('../routes/modals/standing-order-details-modal/standing-order-details-modal.component')).StandingOrderDetailsModalComponent,
      (dlg) => dlg.args = { standingOrderId, donorId: options?.donorId },
      (dlg) => dlg.changed || dlg.shouldClose
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
