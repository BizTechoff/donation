import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core'
import { CommitmentController } from '../../../shared/controllers/commitment.controller'
import { UIToolsService } from '../UIToolsService'

/**
 * commitment-donations-button - "תרומות קשורות" בכרטיס של התחייבות.
 *
 * מוטי, 08.11: במקום כפתור "תנועות" שהוסתר (4.1) - כפתור שמציג את התרומות
 * שנזקפו להתחייבות. מופיע רק כשיש כאלה. הרשימה עצמה היא "תרומות של…" הקיימת,
 * מסוננת להתחייבות - בלי מסך חדש.
 */
@Component({
  selector: 'app-commitment-donations-button',
  template: `
    <button *ngIf="count > 0" mat-stroked-button class="action-button" type="button" (click)="open()"
      title="התרומות שנזקפו להתחייבות">
      <mat-icon>receipt_long</mat-icon>
      תרומות קשורות ({{ count }})
    </button>`
})
export class CommitmentDonationsButtonComponent implements OnChanges {
  @Input() commitmentId = ''
  @Input() donorId = ''
  /** מספר התרומות שנזקפו - הכרטיס מסתיר לפיו את "מחק תרומה" של ההתחייבות. */
  @Output() linkedCount = new EventEmitter<number>()

  count = 0

  constructor(private ui: UIToolsService) { }

  async ngOnChanges() {
    if (!this.commitmentId) { this.count = 0; this.linkedCount.emit(0); return }
    const progress = await CommitmentController.getProgress([this.commitmentId])
    this.count = progress[this.commitmentId]?.linkedCount || 0
    this.linkedCount.emit(this.count)
  }

  async open() {
    await this.ui.donorDonationsDialog(this.donorId, 'donations', undefined, this.commitmentId)
    // ייתכן שתרומה נמחקה או נותקה בתוך החלון - הספירה מתעדכנת.
    await this.ngOnChanges()
  }
}
