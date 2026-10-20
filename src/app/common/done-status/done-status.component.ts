import { Component, EventEmitter, Input, Output } from '@angular/core'
import { UIToolsService } from '../UIToolsService'

/**
 * DoneStatusComponent - the "בוצע / לא בוצע" cell of a list (20.10.2026).
 *
 * Israel: reminders and gifts need their own column that shows what is done
 * and what is not, and the done-action belongs there - not as a ✅/📦 icon
 * among edit and delete in the actions column, where it looked like a second
 * copy of the status and was easy to hit by mistake.
 *
 * One behaviour for every list (shared logic, per the platform rule):
 *  - shows a badge in the done / pending colour;
 *  - a click asks first when `confirmText` / `undoConfirmText` is given, so a
 *    stray click never changes the record;
 *  - `canUndo = false` makes a done row read-only (a completed reminder is
 *    reopened from its card, not from the list);
 *  - emits `toggle` - the screen does the actual save with its own logic.
 */
@Component({
  selector: 'app-done-status',
  templateUrl: './done-status.component.html',
  styleUrls: ['./done-status.component.scss']
})
export class DoneStatusComponent {
  @Input() done = false
  @Input() doneLabel = 'בוצע'
  @Input() pendingLabel = 'לא בוצע'
  /** Question before marking done. Omit when the screen asks on its own. */
  @Input() confirmText?: string
  /** Question before marking NOT done. */
  @Input() undoConfirmText?: string
  @Input() canUndo = true
  @Input() disabled = false
  @Output() toggle = new EventEmitter<boolean>()

  constructor(private ui: UIToolsService) { }

  get clickable(): boolean {
    return !this.disabled && (!this.done || this.canUndo)
  }

  async onClick(event: Event) {
    event.stopPropagation()
    if (!this.clickable) return
    const question = this.done ? this.undoConfirmText : this.confirmText
    if (question && !(await this.ui.yesNoQuestion(question))) return
    this.toggle.emit(!this.done)
  }
}
