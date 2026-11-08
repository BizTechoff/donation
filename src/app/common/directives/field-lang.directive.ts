import { Directive, ElementRef, HostListener, Input, OnInit } from '@angular/core'
import { FieldLang, charForKey } from '../../../shared/utils/keyboard-layout'
import { capitalizeWords, isWordStart } from '../../../shared/utils/text-case'

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
    const mapped = charForKey(event.code, caps ? !event.shiftKey : event.shiftKey, this.lang)
    const typed = mapped ?? (event.key.length === 1 ? event.key : null)
    if (!typed) return
    const toInsert = this.lang === 'en' && this.atWordStart() ? typed.toLocaleUpperCase('en') : typed
    if (toInsert === event.key) return
    event.preventDefault()
    this.insert(toInsert)
  }

  /**
   * 2.2 - אות ראשונה גדולה בכל מילה בשדה אנגלי. בהקלדה - לפי מיקום הסמן;
   * ביציאה מהשדה - על כל הערך, כדי לתפוס גם הדבקה ומילוי אוטומטי.
   */
  @HostListener('blur')
  onBlur() {
    if (this.lang !== 'en') return
    const node = this.el.nativeElement
    const fixed = capitalizeWords(node.value)
    if (fixed === node.value) return
    node.value = fixed
    node.dispatchEvent(new Event('input', { bubbles: true }))
  }

  private atWordStart(): boolean {
    const node = this.el.nativeElement
    return isWordStart(node.value, node.selectionStart ?? node.value.length)
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
