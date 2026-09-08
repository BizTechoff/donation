import { Directive, HostBinding, HostListener, Input } from '@angular/core'
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
export class MailtoDirective {
  /** The address. '-' and empty are treated as "no address" and stay inert. */
  @Input('appMailto') email: string | null | undefined

  /** Only a real address gets the link look - see .email-link in styles.scss. */
  @HostBinding('class.email-link')
  get isLink(): boolean {
    return isMailable(this.email)
  }

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    if (!isMailable(this.email)) return
    // The row underneath usually opens a dialog on click; composing an email
    // is a different intent, so it must not also trigger that.
    event.stopPropagation()
    openGmailCompose(this.email)
  }
}
