import { Directive, ElementRef, HostBinding, HostListener, Input, OnDestroy } from '@angular/core'
import { isMailable, openGmailCompose } from '../mail'

/**
 * mailto.directive.ts
 *
 * C3 - a single click on an email address opens a new Gmail message to it.
 *
 * A DIRECTIVE and not a helper method on each component: the first version of
 * this put a two-line composeEmail()/isMailable() pair into every component
 * that shows an email, plus an *ngIf/ng-template pair in every template to fall
 * back to plain text. Four screens today, and every future screen with an email
 * column would have copied the same six lines - the exact drift that produced
 * five different sorting mechanisms in this codebase.
 *
 * Here the whole behaviour - the click, the link styling, and the decision NOT
 * to look like a link when there is no address - lives in one file, and a
 * screen opts in with a single attribute:
 *
 *   <td [appMailto]="getDonorEmail(donor.id)">{{ getDonorEmail(donor.id) }}</td>
 *
 * The cell keeps rendering its own text, so nothing about the column's layout
 * or ellipsis handling changes.
 */
@Directive({
  selector: '[appMailto]'
})
export class MailtoDirective implements OnDestroy {
  /** The address. '-' and empty are treated as "no address" and stay inert. */
  @Input('appMailto') email: string | null | undefined

  /**
   * ישראל, 03.11: הדגשת כתובת לצורך העתקה פותחת חלון דואר - "להדגיש ולהעתיק
   * בלי שזה ייחשב לחיצה". שלושה מקרים של בחירה, ולכל אחד הבחנה משלו:
   *  - גרירה: תזוזת העכבר בין mousedown ל-click גדולה מ-DRAG_PX.
   *  - טקסט שכבר מסומן בתוך התא בזמן ה-click.
   *  - לחיצה כפולה (בחירת מילה): הפתיחה נדחית ב-DOUBLE_CLICK_MS, ולחיצה
   *    שנייה בתוך הזמן הזה מבטלת אותה.
   */
  private static readonly DRAG_PX = 4
  private static readonly DOUBLE_CLICK_MS = 250

  private downX = 0
  private downY = 0
  private pending?: ReturnType<typeof setTimeout>

  constructor(private host: ElementRef<HTMLElement>) { }

  /** Only a real address gets the link look - see .email-link in styles.scss. */
  @HostBinding('class.email-link')
  get isLink(): boolean {
    return isMailable(this.email)
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    this.downX = event.clientX
    this.downY = event.clientY
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    if (!isMailable(this.email)) return
    // The row underneath usually opens a dialog on click; composing an email
    // is a different intent - and so is selecting the address - so neither
    // may trigger that.
    event.stopPropagation()

    // לחיצה שנייה ברצף - בחירת מילה, לא שליחה.
    if (event.detail > 1) {
      this.cancelPending()
      return
    }
    if (this.isSelecting(event)) return

    const email = this.email
    this.pending = setTimeout(() => {
      this.pending = undefined
      // גם אחרי ההמתנה - אם בינתיים סומן טקסט, זו בחירה.
      if (!this.hasSelectionInHost()) openGmailCompose(email)
    }, MailtoDirective.DOUBLE_CLICK_MS)
  }

  ngOnDestroy() {
    this.cancelPending()
  }

  private isSelecting(event: MouseEvent): boolean {
    const moved = Math.abs(event.clientX - this.downX) > MailtoDirective.DRAG_PX
      || Math.abs(event.clientY - this.downY) > MailtoDirective.DRAG_PX
    return moved || this.hasSelectionInHost()
  }

  private hasSelectionInHost(): boolean {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return false
    const node = selection.anchorNode
    return !!node && this.host.nativeElement.contains(node)
  }

  private cancelPending() {
    if (this.pending) clearTimeout(this.pending)
    this.pending = undefined
  }
}
