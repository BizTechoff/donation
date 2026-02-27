import { Component, EventEmitter, Input, Output } from '@angular/core'
import { Donor, Donation, DonationMethod } from '../../../../../shared/entity'
import { CurrencyType } from '../../../../../shared/type/currency.type'

@Component({
  selector: 'app-done-step',
  templateUrl: './done-step.component.html',
  styleUrls: ['./done-step.component.scss']
})
export class DoneStepComponent {
  @Input() donor!: Donor
  @Input() donation!: Donation
  @Input() donationMethods: DonationMethod[] = []
  @Input() currencies: Record<string, CurrencyType> = {}

  @Output() nextDonor = new EventEmitter<void>()
  @Output() finish = new EventEmitter<void>()

  getDonorFullName(): string {
    return `${this.donor.firstName} ${this.donor.lastName}`.trim()
  }

  getMethodName(): string {
    const method = this.donationMethods.find(m => m.id === this.donation.donationMethodId)
    return method?.name || ''
  }

  getFormattedAmount(): string {
    const currency = this.currencies[this.donation.currencyId]
    const symbol = currency?.symbol || '₪'
    return `${symbol}${this.donation.amount.toLocaleString()}`
  }

  getFormattedDate(): string {
    return this.donation.donationDate?.toLocaleDateString('he-IL') || ''
  }
}
