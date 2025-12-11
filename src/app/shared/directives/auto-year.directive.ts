// shared/directives/auto-year.directive.ts
import { Directive, HostListener, ElementRef, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Directive({
  selector: '[autoYear]',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AutoYearDirective),
    multi: true
  }]
})
export class AutoYearDirective implements ControlValueAccessor {
  
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>) {}

//   @HostListener('input', ['$event.target.value'])
//   onInput(value: string) {
//     this.onChange(this.parseAndComplete(value));
//   }

 @HostListener('input', ['$event'])
  onInput(event: Event) {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.onChange(this.parseAndComplete(value));
  }
  
  @HostListener('blur')
  onBlur() {
    this.onTouched();
    const completed = this.parseAndComplete(this.el.nativeElement.value);
    if (completed) {
      this.el.nativeElement.value = this.formatForDisplay(completed);
      this.onChange(completed);
    }
  }

  // מקבל קלט גמיש ומחזיר פורמט ISO (YYYY-MM-DD)
  private parseAndComplete(value: string): string {
    if (!value) return '';
    
    // מנקה את הקלט
    const cleaned = value.replace(/[^\d]/g, '');
    
    // מנסה לפרסר פורמטים שונים
    let day: string, month: string, year: string;

    if (cleaned.length === 6) {
      // DDMMYY
      day = cleaned.substring(0, 2);
      month = cleaned.substring(2, 4);
      year = this.expandYear(cleaned.substring(4, 6));
    } else if (cleaned.length === 8) {
      // DDMMYYYY
      day = cleaned.substring(0, 2);
      month = cleaned.substring(2, 4);
      year = cleaned.substring(4, 8);
    } else {
      // מנסה לפרסר עם מפרידים
      const parts = value.split(/[\/\-\.]/);
      if (parts.length === 3) {
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
        year = parts[2].length === 2 ? this.expandYear(parts[2]) : parts[2];
      } else {
        return value; // לא מצליח לפרסר
      }
    }

    // וידוא תקינות
    if (this.isValidDate(year, month, day)) {
      return `${year}-${month}-${day}`;
    }
    
    return value;
  }

  // ממיר שנה דו-ספרתית לארבע ספרות
  private expandYear(yy: string): string {
    const year = parseInt(yy, 10);
    // 00-39 = 2000-2039, 40-99 = 1940-1999
    return (year <= 39 ? 2000 + year : 1900 + year).toString();
  }

  // פורמט להצגה (DD/MM/YYYY)
  private formatForDisplay(isoDate: string): string {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  // בדיקת תקינות תאריך
  private isValidDate(year: string, month: string, day: string): boolean {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    if (y < 1900 || y > 2100) return false;
    
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && 
           date.getMonth() === m - 1 && 
           date.getDate() === d;
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    if (value) {
      this.el.nativeElement.value = this.formatForDisplay(value);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }
}