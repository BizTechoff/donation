import { Component, ElementRef, Input, ViewChild, forwardRef } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'

/** פריט לבחירה - label מוצג, hint (למשל קוד בנק) מוצג קטן ונכלל בחיפוש */
export interface SearchSelectOption {
  id: string
  label: string
  hint?: string
}

/**
 * רשימה נפתחת עם חיפוש - במובייל, במקום select רגיל כשהרשימה ארוכה (בנקים,
 * עמותות). לחיצה פותחת חלון עם שורת חיפוש; מספיק חלק מהשם או מהקוד (יעקב,
 * 17.11: "יש בנקים שהשם הרשמי לא מופיע בצ'ק במלואו"). עובד עם ngModel.
 */
@Component({
  selector: 'app-search-select',
  templateUrl: './search-select.component.html',
  styleUrls: ['./search-select.component.scss'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchSelectComponent), multi: true }]
})
export class SearchSelectComponent implements ControlValueAccessor {
  @Input() options: SearchSelectOption[] = []
  /** הטקסט כשלא נבחר כלום, וגם האפשרות "ללא" ברשימה */
  @Input() emptyLabel = 'בחר'
  @Input() searchPlaceholder = 'חיפוש...'
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>

  value = ''
  open = false
  search = ''
  disabled = false
  private onChange: (v: string) => void = () => { }
  private onTouched: () => void = () => { }

  get selectedLabel(): string {
    return this.options.find(o => o.id === this.value)?.label || ''
  }

  /** חלק מהשם או מה-hint, בלי תלות ברישיות */
  get filtered(): SearchSelectOption[] {
    const term = this.search.trim().toLowerCase()
    if (!term) return this.options
    return this.options.filter(o =>
      o.label.toLowerCase().includes(term) || (o.hint || '').toLowerCase().includes(term))
  }

  openPanel() {
    if (this.disabled) return
    this.search = ''
    this.open = true
    // המקלדת נפתחת מיד על שורת החיפוש
    setTimeout(() => this.searchInput?.nativeElement.focus())
  }

  choose(id: string) {
    this.value = id
    this.onChange(id)
    this.onTouched()
    this.open = false
  }

  close() {
    this.open = false
    this.onTouched()
  }

  writeValue(v: string): void { this.value = v || '' }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn }
  registerOnTouched(fn: () => void): void { this.onTouched = fn }
  setDisabledState(d: boolean): void { this.disabled = d }
}
