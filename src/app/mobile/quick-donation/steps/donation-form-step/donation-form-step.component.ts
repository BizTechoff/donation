import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core'
import { remult } from 'remult'
import { Donor, Donation, Campaign, DonationMethod, Bank, Organization } from '../../../../../shared/entity'
import { DEFAULT_CURRENCY } from '../../../../../shared/enum/currency'
import { DonationMethodFields, donationMethodFields } from '../../../../../shared/utils/donation-method-fields'
import { CurrencyType } from '../../../../../shared/type/currency.type'
import { PayerService } from '../../../../services/payer.service'

@Component({
  selector: 'app-donation-form-step',
  templateUrl: './donation-form-step.component.html',
  styleUrls: ['./donation-form-step.component.scss']
})
export class DonationFormStepComponent implements OnInit, AfterViewInit {
  @ViewChild('amountInput') amountInput!: ElementRef<HTMLInputElement>
  @Input() donor!: Donor
  @Input() donationMethods: DonationMethod[] = []
  @Input() campaigns: Campaign[] = []
  @Input() currencies: Record<string, CurrencyType> = {}

  @Output() donationSaved = new EventEmitter<Donation>()
  @Output() back = new EventEmitter<void>()

  // Form fields
  amount: number | null = null
  currencyId = DEFAULT_CURRENCY // ליש"ט - כמו במחשב (עד היום ש"ח קבוע כאן)
  selectedMethodId = ''
  checkNumber = ''
  // אמצעי התשלום - אותם שדות כמו בכרטיס התרומה במחשב (shared/utils/donation-method-fields)
  accountNumber = ''
  voucherNumber = ''
  bankId = ''
  organizationId = ''
  banks: Bank[] = []
  organizations: Organization[] = []
  campaignId = ''
  reason = ''
  notes = ''
  donationType: 'full' | 'commitment' = 'full'

  showMore = false
  saving = false
  errorMessage = ''

  currencyList: CurrencyType[] = []

  constructor(private payerService: PayerService) { }
  private defaultCashMethodId = ''

  ngAfterViewInit() {
    setTimeout(() => {
      const el = this.amountInput?.nativeElement
      if (el) {
        el.focus()
        el.select()
      }
    })
  }

  ngOnInit() {
    this.currencyList = Object.values(this.currencies)
    void this.loadBanksAndOrganizations()

    // Set default method to cash
    const cashMethod = this.donationMethods.find(m => m.type === 'cash')
    if (cashMethod) {
      this.selectedMethodId = cashMethod.id
      this.defaultCashMethodId = cashMethod.id
    } else if (this.donationMethods.length > 0) {
      this.selectedMethodId = this.donationMethods[0].id
    }
  }

  get selectedMethod(): DonationMethod | undefined {
    return this.donationMethods.find(m => m.id === this.selectedMethodId)
  }

  /** אילו שדות אמצעי התשלום מקבל - אותו כלל של כרטיס התרומה במחשב. */
  get fields(): DonationMethodFields {
    return donationMethodFields(this.selectedMethod)
  }

  get isCheck(): boolean {
    return this.fields.checkNumber
  }

  private async loadBanksAndOrganizations() {
    const { banks, organizations } = await this.payerService.getBanksAndOrganizations()
    this.banks = banks
    this.organizations = organizations
  }

  get canSave(): boolean {
    return !!(this.amount && this.amount > 0 && this.selectedMethodId)
  }

  getDonorFullName(): string {
    return `${this.donor.firstName} ${this.donor.lastName}`.trim()
  }

  getMethodIcon(method: DonationMethod): string {
    switch (method.type) {
      case 'cash': return 'payments'
      case 'check': return 'receipt_long'
      case 'credit_card': return 'credit_card'
      case 'bank_transfer': return 'account_balance'
      case 'standing_order': return 'autorenew'
      default: return 'payment'
    }
  }

  async save() {
    if (!this.canSave || this.saving) return

    this.saving = true
    this.errorMessage = ''

    try {
      const donation = remult.repo(Donation).create({
        donorId: this.donor.id,
        amount: this.amount!,
        currencyId: this.currencyId,
        donationMethodId: this.selectedMethodId,
        campaignId: this.campaignId,
        // רק השדות שאמצעי התשלום מקבל - בחירה שנשארה מאמצעי קודם לא נשמרת
        checkNumber: this.fields.checkNumber ? this.checkNumber : '',
        accountNumber: this.fields.accountNumber ? this.accountNumber : '',
        voucherNumber: this.fields.voucherNumber ? this.voucherNumber : '',
        bankId: this.fields.bank ? this.bankId : '',
        organizationId: this.fields.organization ? this.organizationId : '',
        reason: this.reason,
        notes: this.notes,
        donationType: this.donationType,
        donationDate: new Date()
      })

      const saved = await remult.repo(Donation).save(donation)
      this.donationSaved.emit(saved)
    } catch (err: any) {
      this.errorMessage = err?.message || 'שגיאה בשמירת התרומה'
    } finally {
      this.saving = false
    }
  }
}
