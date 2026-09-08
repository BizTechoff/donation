import { Directive, ElementRef, HostListener } from '@angular/core';

/**
 * form-field.directive.ts
 *
 * ONE directive for the platform-wide form field behaviours the client asked
 * for in the 24.08.2026 Zoom. It attaches to every <input>/<select> without
 * being written per field, so the rules live in a single place:
 *
 *  Z10 - Enter moves to the next field, exactly like Tab. Yaakov: "אני מקיש
 *        אנטר, הוא נשאר על המקום… זה דבר שמשתמשים בו כל הזמן".
 *  B3  - Numeric fields render left-to-right, so a leading + and the digit
 *        grouping read correctly inside the RTL layout. Yaakov extended this
 *        to "כל שדה מספר בפלטפורמה".
 *
 * Deliberately NOT handled here: which fields are "English" (that is a data
 * question, H2/B4), and number formatting (see the shared amount pipe).
 */
@Directive({
  selector: 'input, select'
})
export class FormFieldDirective {
  constructor(private el: ElementRef<HTMLInputElement | HTMLSelectElement>) {
    const node = this.el.nativeElement;
    // B3 - numbers, tel and email always read LTR, even inside an RTL form.
    const ltrTypes = ['number', 'tel', 'email', 'url'];
    if (node instanceof HTMLInputElement && ltrTypes.includes(node.type) && !node.getAttribute('dir')) {
      node.setAttribute('dir', 'ltr');
      // Keep the field visually where the RTL layout puts it.
      node.style.textAlign = node.style.textAlign || 'right';
    }
  }

  /** Z10 - Enter behaves like Tab: move to the next focusable field. */
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;

    const node = this.el.nativeElement;
    // Never hijack Enter where it has its own meaning.
    if (node instanceof HTMLInputElement && (node.type === 'submit' || node.type === 'button')) return;
    if (node.tagName === 'TEXTAREA') return;
    // An open autocomplete/select list needs Enter to pick the option.
    if (node.getAttribute('aria-expanded') === 'true') return;

    const form = node.closest('form, .modal-content, .section, body');
    if (!form) return;

    const focusable = Array.from(
      form.querySelectorAll<HTMLElement>('input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(e => !e.hasAttribute('disabled') && (e as HTMLInputElement).type !== 'hidden' && e.offsetParent !== null);

    const index = focusable.indexOf(node as HTMLElement);
    if (index === -1 || index === focusable.length - 1) return;

    event.preventDefault();
    focusable[index + 1].focus();
    const next = focusable[index + 1] as HTMLInputElement;
    if (typeof next.select === 'function' && next.tagName === 'INPUT') next.select();
  }
}
