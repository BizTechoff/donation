import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { remult } from 'remult'
import { Donor, Donation, Campaign, DonationMethod } from '../../../../../shared/entity'
import { CurrencyType } from '../../../../../shared/type/currency.type'

@Component({
  selector: 'app-donation-form-step',
  templateUrl: './donation-form-step.component.html',
  styleUrls: ['./donation-form-step.component.scss']
})
export class DonationFormStepComponent implements OnInit {
  @Input() donor!: Donor
  @Input() donationMethods: DonationMethod[] = []
  @Input() campaigns: Campaign[] = []
  @Input() currencies: Record<string, CurrencyType> = {}

  @Output() donationSaved = new EventEmitter<Donation>()
  @Output() back = new EventEmitter<void>()

  // Form fields
  amount: number | null = null
  currencyId = 'ILS'
  selectedMethodId = ''
  checkNumber = ''
  campaignId = ''
  reason = ''
  notes = ''
  donationType: 'full' | 'commitment' = 'full'

  showMore = false
  saving = false
  errorMessage = ''

  currencyList: CurrencyType[] = []
  private defaultCashMethodId = ''

  ngOnInit() {
    this.currencyList = Object.values(this.currencies)

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

  get isCheck(): boolean {
    return this.selectedMethod?.type === 'check'
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
        checkNumber: this.checkNumber,
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
