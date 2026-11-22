import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core'
import { SearchSelectOption } from '../../../search-select/search-select.component'
import { remult } from 'remult'
import { Donor, Donation, Campaign, DonationMethod, Bank, Organization } from '../../../../../shared/entity'
import { DEFAULT_CURRENCY } from '../../../../../shared/enum/currency'
import { todayDateOnly } from '../../../../../shared/utils/date-only'
import { donorCountryCurrencyId } from '../../../../../shared/utils/donor-currency'
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
  /** תרומה קיימת לעריכה - אותו טופס; בלי - תרומה חדשה */
  @Input() donation?: Donation

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
  // לרשימות עם חיפוש (app-search-select) - נבנות פעם אחת בטעינה
  bankOptions: SearchSelectOption[] = []
  organizationOptions: SearchSelectOption[] = []
  campaignId = ''
  reason = ''
  notes = ''
  donationType: 'full' | 'commitment' = 'full'
  donationDate: Date = todayDateOnly()
  // אמצעי התשלום לבחירה - הפעילים, ובעריכה גם האמצעי של התרומה אם הוא כבר לא פעיל
  methods: DonationMethod[] = []

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
    this.methods = this.donationMethods

    if (this.donation) {
      this.fillFromDonation(this.donation)
      return
    }

    // תרומה חדשה - המטבע לפי מדינת התורם (אותו כלל של המחשב); בלי מדינה - ליש"ט
    void this.setCurrencyFromDonorCountry()

    // Set default method to cash
    const cashMethod = this.donationMethods.find(m => m.type === 'cash')
    if (cashMethod) {
      this.selectedMethodId = cashMethod.id
      this.defaultCashMethodId = cashMethod.id
    } else if (this.donationMethods.length > 0) {
      this.selectedMethodId = this.donationMethods[0].id
    }
  }

  private async setCurrencyFromDonorCountry() {
    const before = this.currencyId
    try {
      const currencyId = await donorCountryCurrencyId(this.donor.id)
      // רק אם המשתמש לא בחר מטבע בינתיים, ורק מטבע שקיים ברשימה
      if (currencyId && this.currencyId === before && this.currencies[currencyId]) {
        this.currencyId = currencyId
      }
    } catch (err) {
      console.error('donor country currency failed', err)
    }
  }

  get isEdit(): boolean {
    return !!this.donation
  }

  /** עריכה - הטופס נטען מהתרומה. שדות שאין בטופס (תדירות, תשלומים וכו') לא נוגעים בהם. */
  private fillFromDonation(d: Donation) {
    this.amount = d.amount
    this.currencyId = d.currencyId || DEFAULT_CURRENCY
    this.selectedMethodId = d.donationMethodId
    this.checkNumber = d.checkNumber || ''
    this.accountNumber = d.accountNumber || ''
    this.voucherNumber = d.voucherNumber || ''
    this.bankId = d.bankId || ''
    this.organizationId = d.organizationId || ''
    this.campaignId = d.campaignId || ''
    this.reason = d.reason || ''
    this.notes = d.notes || ''
    this.donationType = d.donationType === 'commitment' ? 'commitment' : 'full'
    this.donationDate = d.donationDate ? new Date(d.donationDate) : todayDateOnly()
    this.showMore = !!(this.reason || this.notes || this.donationType === 'commitment')
    if (d.donationMethodId && !this.methods.some(m => m.id === d.donationMethodId)) {
      void remult.repo(DonationMethod).findId(d.donationMethodId).then(m => {
        if (m) this.methods = [...this.methods, m]
      })
    }
  }

  get selectedMethod(): DonationMethod | undefined {
    return this.methods.find(m => m.id === this.selectedMethodId)
  }

  /** אילו שדות אמצעי התשלום מקבל - אותו כלל של כרטיס התרומה במחשב. */
  get fields(): DonationMethodFields {
    // בעריכת הו"ק - סוג ההוראה של התרומה קובע בנק/עמותה (במובייל אין בחירה בו)
    return donationMethodFields(this.selectedMethod, this.donation?.standingOrderType)
  }

  get isCheck(): boolean {
    return this.fields.checkNumber
  }

  private async loadBanksAndOrganizations() {
    const { banks, organizations } = await this.payerService.getBanksAndOrganizations()
    this.banks = banks
    this.organizations = organizations
    this.bankOptions = banks.map(b => ({ id: b.id, label: b.name, hint: b.bankCode || '' }))
    this.organizationOptions = organizations.map(o => ({ id: o.id, label: o.name, hint: o.registrationNumber || '' }))
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
      if (this.donation) {
        this.donationSaved.emit(await this.saveEdit(this.donation))
        return
      }
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
        donationDate: this.donationDate || todayDateOnly()
      })

      const saved = await remult.repo(Donation).save(donation)
      this.donationSaved.emit(saved)
    } catch (err: any) {
      this.errorMessage = err?.message || 'שגיאה בשמירת התרומה'
    } finally {
      this.saving = false
    }
  }

  /**
   * עדכון תרומה קיימת - אותה רשומה, רק השדות שבטופס. שדה של אמצעי תשלום שהטופס
   * לא מציג נשאר כמו שהוא; הוא מתאפס רק כשמחליפים אמצעי תשלום (כמו בתרומה חדשה).
   */
  private async saveEdit(d: Donation): Promise<Donation> {
    const methodChanged = d.donationMethodId !== this.selectedMethodId
    const f = this.fields
    const pick = (applies: boolean, value: string, current: string) =>
      applies ? value : (methodChanged ? '' : current)
    d.amount = this.amount!
    d.currencyId = this.currencyId
    d.donationMethodId = this.selectedMethodId
    d.campaignId = this.campaignId
    d.checkNumber = pick(f.checkNumber, this.checkNumber, d.checkNumber)
    d.accountNumber = pick(f.accountNumber, this.accountNumber, d.accountNumber)
    d.voucherNumber = pick(f.voucherNumber, this.voucherNumber, d.voucherNumber)
    d.bankId = pick(f.bank, this.bankId, d.bankId)
    d.organizationId = pick(f.organization, this.organizationId, d.organizationId)
    d.reason = this.reason
    d.notes = this.notes
    d.donationType = this.donationType
    d.donationDate = this.donationDate || d.donationDate
    return await remult.repo(Donation).save(d)
  }
}
