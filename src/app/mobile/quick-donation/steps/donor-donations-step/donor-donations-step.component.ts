import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { remult } from 'remult'
import { Donor, Donation } from '../../../../../shared/entity'
import { CurrencyType } from '../../../../../shared/type/currency.type'

/**
 * תרומות התורם - מסך משלו, נפתח מכפתור "תרומות" בשורת התורם. מהחדשה לישנה,
 * 20 בכל פעם; לחיצה על תרומה פותחת אותה לעריכה בטופס התרומה.
 */
@Component({
  selector: 'app-donor-donations-step',
  templateUrl: './donor-donations-step.component.html',
  styleUrls: ['./donor-donations-step.component.scss']
})
export class DonorDonationsStepComponent implements OnInit {
  @Input() donor!: Donor
  @Input() currencies: Record<string, CurrencyType> = {}
  @Output() back = new EventEmitter<void>()
  @Output() newDonation = new EventEmitter<Donor>()
  @Output() editDonation = new EventEmitter<Donation>()

  private static readonly PAGE_SIZE = 20
  donations: Donation[] = []
  loaded = false
  loading = false
  hasMore = false
  private page = 0

  ngOnInit() {
    void this.load()
  }

  async load(more = false) {
    if (this.loading) return
    this.loading = true
    try {
      this.page = more ? this.page + 1 : 1
      const size = DonorDonationsStepComponent.PAGE_SIZE
      const rows = await remult.repo(Donation).find({
        where: { donorId: this.donor.id },
        orderBy: { donationDate: 'desc', createdDate: 'desc' },
        include: { donationMethod: true, campaign: true },
        limit: size,
        page: this.page
      })
      this.donations = more ? [...this.donations, ...rows] : rows
      this.hasMore = rows.length === size
      this.loaded = true
    } finally {
      this.loading = false
    }
  }

  donorName(): string {
    return `${this.donor.firstName} ${this.donor.lastName}`.trim()
  }

  amount(d: Donation): string {
    const symbol = this.currencies[d.currencyId]?.symbol || d.currencyId || ''
    return `${symbol}${(d.amount || 0).toLocaleString('he-IL')}`
  }

  date(value: Date | null | undefined): string {
    return value ? new Date(value).toLocaleDateString('he-IL') : ''
  }
}
