import { Directive, ElementRef, HostListener, Input, OnInit } from '@angular/core'
import { FieldLang, charForKey } from '../../../shared/utils/keyboard-layout'

/**
 * field-lang.directive.ts - שלב ג׳, קבוצה 2: שדה עברי / שדה אנגלי.
 *
 *   <input [(ngModel)]="donor.firstName" appFieldLang="he">
 *   <input [(ngModel)]="donor.firstNameEnglish" appFieldLang="en">
 *
 * יעקב, זום 24.08 (ב׳ 0:32): "כל שדות האנגלית צריכות להיות החלפה אוטומטית
 * מעברית לאנגלית, מאנגלית לעברית, ומוגדר משמאל ימין".
 *
 * איזה שדה הוא עברי ואיזה אנגלי - זו הכרעה על הנתון, ולכן היא נכתבת בתבנית
 * ולא מנוחשת. כל ההתנהגות עצמה - כאן בלבד. המיפוי - keyboard-layout.ts.
 */
@Directive({
  selector: '[appFieldLang]'
})
export class FieldLangDirective implements OnInit {
  @Input('appFieldLang') lang: FieldLang = 'he'

  constructor(private el: ElementRef<HTMLInputElement | HTMLTextAreaElement>) { }

  ngOnInit() {
    const node = this.el.nativeElement
    node.setAttribute('lang', this.lang)
    // lang מסייע גם למקלדות וירטואליות ולבודק האיות לבחור את השפה הנכונה.
    if (!node.getAttribute('dir')) node.setAttribute('dir', this.lang === 'en' ? 'ltr' : 'rtl')
  }

  /**
   * לפי המקש הפיזי - לא לפי התו שמערכת ההפעלה הפיקה. כשהתו שונה ממה שהמקש
   * צריך לתת בשפת השדה, התו הנכון נכתב במקומו.
   */
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
    // Caps Lock הופך אותיות לטיניות בלבד, כמו במקלדת עצמה - Shift ו-Caps
    // מבטלים זה את זה. על מקשי פיסוק Caps לא משפיע.
    const caps = event.getModifierState?.('CapsLock') && /^Key[A-Z]$/.test(event.code)
    const wanted = charForKey(event.code, caps ? !event.shiftKey : event.shiftKey, this.lang)
    if (!wanted || wanted === event.key) return
    event.preventDefault()
    this.insert(wanted)
  }

  /** הכנסת טקסט במקום הסמן, ועדכון ngModel דרך אירוע input רגיל. */
  protected insert(text: string) {
    const node = this.el.nativeElement
    const start = node.selectionStart ?? node.value.length
    const end = node.selectionEnd ?? node.value.length
    node.setRangeText(text, start, end, 'end')
    node.dispatchEvent(new Event('input', { bubbles: true }))
  }
}
