import { Component, Input, OnChanges } from '@angular/core'
import { CommitmentBanner, CommitmentController } from '../../../shared/controllers/commitment.controller'
import { formatCommitmentProgress } from '../../../shared/utils/commitment-utils'
import { PayerService } from '../../services/payer.service'

/**
 * commitment-banner - שלב ג׳ 4.4: "שולם מתוך סה"כ" בכותרת כרטיס התרומות.
 *
 * L1 (זום ב׳ ~1:01-1:05): בכותרת כרטיס התרומות, באותו גודל כמו "תרומות של…"
 * ובצבע כתום - סה"כ שולם מתוך סה"כ כל ההתחייבויות (2 התחייבויות של 5,000 ->
 * 100/10,000). מטבע לכל שורה. התחייבות שנסגרה יורדת מכאן (4.5, L6/L7), וכשאין
 * פתוחות - הרכיב לא מציג כלום.
 *
 *   <app-commitment-banner [donorId]="..." [refreshKey]="..."></app-commitment-banner>
 */
@Component({
  selector: 'app-commitment-banner',
  templateUrl: './commitment-banner.component.html',
  styleUrls: ['./commitment-banner.component.scss']
})
export class CommitmentBannerComponent implements OnChanges {
  @Input() donorId = ''
  /** כל שינוי בערך טוען מחדש - למשל אחרי שנוספה תרומה. */
  @Input() refreshKey: unknown

  rows: CommitmentBanner[] = []
  private currencyTypes = this.payer.getCurrencyTypesRecord()

  constructor(private payer: PayerService) { }

  async ngOnChanges() {
    this.rows = this.donorId ? await CommitmentController.getDonorBanner(this.donorId) : []
  }

  text(row: CommitmentBanner): string {
    return formatCommitmentProgress(row, this.currencyTypes[row.currencyId]?.symbol || '')
  }
}
