import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { CommitmentController, OpenCommitment } from '../../../shared/controllers/commitment.controller'
import { formatCommitmentProgress } from '../../../shared/utils/commitment-utils'

/**
 * commitment-link - שלב ג׳, קבוצה 4: זקיפת תרומה על חשבון התחייבות.
 *
 *   <app-commitment-link [donorId]="..." [currencyId]="..." [donationType]="..."
 *     [isNew]="..." [(commitmentId)]="donation.commitmentId">
 *
 * כל הלוגיקה של השיוך יושבת כאן ולא בכרטיס התרומה: אילו התחייבויות מוצעות,
 * מה ברירת המחדל, ומתי שיוך כבר לא תקף. הכרטיס רק מעביר את ההקשר ומקבל
 * בחזרה commitmentId. כל שינוי בהקשר (תורם, מטבע, סוג) - מכל מקום בכרטיס,
 * גם מבחירת קמפיין שמחליפה מטבע - מגיע לכאן דרך ngOnChanges.
 */
@Component({
  selector: 'app-commitment-link',
  templateUrl: './commitment-link.component.html',
  styleUrls: ['./commitment-link.component.scss']
})
export class CommitmentLinkComponent implements OnChanges {
  @Input() donorId = ''
  @Input() currencyId = ''
  @Input() donationType: string = 'full'
  @Input() isNew = false
  @Input() commitmentId = ''
  @Output() commitmentIdChange = new EventEmitter<string>()

  /** התחייבויות פתוחות של התורם, באותו מטבע, האחרונה ראשונה. */
  options: OpenCommitment[] = []
  /** המשתמש כבר החליט (סימן/הוריד/בחר) - ברירת המחדל לא דורסת. */
  private touched = false
  private loadSeq = 0

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['donorId'] || changes['currencyId'] || changes['donationType']) await this.load()
  }

  get selected(): OpenCommitment | undefined {
    return this.options.find(o => o.id === this.commitmentId)
  }

  progressText(o: OpenCommitment): string {
    return formatCommitmentProgress(o.progress)
  }

  private async load() {
    const seq = ++this.loadSeq
    if (this.donationType !== 'full' || !this.donorId) {
      this.options = []
      this.set('')
      return
    }
    const options = await CommitmentController.getOpenCommitments(this.donorId, this.currencyId, this.commitmentId || undefined)
    if (seq !== this.loadSeq) return // תשובה ישנה - הקשר כבר השתנה
    this.options = options
    // שיוך שכבר לא תקף בהקשר הנוכחי (תורם או מטבע אחר) - יורד.
    if (this.commitmentId && !options.some(o => o.id === this.commitmentId)) this.set('')
    // 4.1 - "כל תרומה נזקפת אוטומטית על חשבון ההתחייבות": תרומה חדשה - לאחרונה.
    if (this.isNew && !this.touched && !this.commitmentId && options.length) this.set(options[0].id)
  }

  protected set(id: string) {
    if (id === (this.commitmentId || '')) return
    this.commitmentId = id
    this.commitmentIdChange.emit(id)
  }
}
