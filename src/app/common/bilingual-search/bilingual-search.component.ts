import { Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { isHebrewChar } from '../../../shared/utils/keyboard-layout'

/**
 * bilingual-search - שלב ג׳, 2.3: שדה חיפוש מפוצל, עברית מימין ואנגלית משמאל.
 *
 * יעקב, זום 24.08 (ב׳ 0:35): "לחלק אותה לשתיים... הפילטר הימני הוא עברית,
 * הפילטר השמאלי הוא אנגלית". (ב׳ 0:40): "גם פה לחלק את זה לעברית-אנגלית".
 *
 * כלפי המסך זה עדיין שדה חיפוש אחד: [(ngModel)] על מחרוזת אחת - שני החלקים
 * מחוברים ברווח - כך שהחיפוש בשרת לא משתנה, וכל מסך מחליף שורה אחת בתבנית.
 * כל צד הוא appFieldLang, כך שמקלידים בו בשפה שלו בלי להחליף מקלדת.
 */
@Component({
  selector: 'app-bilingual-search',
  templateUrl: './bilingual-search.component.html',
  styleUrls: ['./bilingual-search.component.scss'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BilingualSearchComponent), multi: true }]
})
export class BilingualSearchComponent implements ControlValueAccessor {
  @Input() placeholderHe = 'חיפוש בעברית'
  @Input() placeholderEn = 'Search in English'

  @ViewChild('heInput', { static: true }) heInput!: ElementRef<HTMLInputElement>
  @ViewChild('enInput', { static: true }) enInput!: ElementRef<HTMLInputElement>

  he = ''
  en = ''
  disabled = false
  /** הצד שהמשתמש עבד בו לאחרונה - אליו חוזר הפוקוס. */
  private last: 'he' | 'en' = 'he'

  private onChange: (v: string) => void = () => { }
  private onTouched: () => void = () => { }

  /** ערך שמגיע מבחוץ (שחזור חיפוש, ניקוי) מתפצל לפי שפת המילים. */
  writeValue(value: string | null | undefined) {
    const words = String(value ?? '').split(/\s+/).filter(Boolean)
    this.he = words.filter(w => isHebrewChar(w)).join(' ')
    this.en = words.filter(w => !isHebrewChar(w)).join(' ')
  }
  registerOnChange(fn: (v: string) => void) { this.onChange = fn }
  registerOnTouched(fn: () => void) { this.onTouched = fn }
  setDisabledState(disabled: boolean) { this.disabled = disabled }

  emit() {
    this.onChange([this.he.trim(), this.en.trim()].filter(Boolean).join(' '))
  }

  touched(side: 'he' | 'en') {
    this.last = side
    this.onTouched()
  }

  /** פוקוס לצד העברי - לחלונות שנפתחים לחיפוש. */
  focus() {
    this.heInput.nativeElement.focus()
  }

  /**
   * החזרת הפוקוס אחרי רענון הרשימה, לצד שבו הקלידו - בלי לגנוב אותו משדה
   * אחר שהמשתמש עבר אליו. היה משוכפל ברשימת התורמים וברשימת התרומות.
   */
  restoreFocus() {
    const target = (this.last === 'en' ? this.enInput : this.heInput).nativeElement
    const active = document.activeElement
    const isOtherInteractive = !!active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)
    if (isOtherInteractive) return
    target.focus()
    const len = target.value.length
    try { target.setSelectionRange(len, len) } catch { /* not all inputs support it */ }
  }
}
