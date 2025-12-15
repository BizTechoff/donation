import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-date-fast-input',
  templateUrl: './date-fast-input.component.html',
  styleUrls: ['./date-fast-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateFastInputComponent),
      multi: true
    }
  ]
})
export class DateFastInputComponent implements ControlValueAccessor {

  @Input() placeholder = 'dd/mm/yyyy';
  @Input() disabled = false;
  @Input() required = false;
  @Input() id = '';
  @Input() name = '';

  @Output() dateChange = new EventEmitter<Date | null>();

  displayValue = '';
  private internalDate: Date | null = null;

  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};

  // ControlValueAccessor implementation
  writeValue(value: Date | string | null): void {
    if (value) {
      this.internalDate = typeof value === 'string' ? new Date(value) : value;
      this.displayValue = this.formatDateForDisplay(this.internalDate);
    } else {
      this.internalDate = null;
      this.displayValue = '';
    }
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.displayValue = input.value;
  }

  onBlur(): void {
    this.onTouched();
    this.parseAndFormatInput();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.parseAndFormatInput();
    }
  }

  private parseAndFormatInput(): void {
    const parsed = this.parseFastInput(this.displayValue);

    if (parsed) {
      this.internalDate = parsed;
      this.displayValue = this.formatDateForDisplay(parsed);
      this.onChange(parsed);
      this.dateChange.emit(parsed);
    } else if (this.displayValue.trim() === '') {
      this.internalDate = null;
      this.onChange(null);
      this.dateChange.emit(null);
    }
    // If invalid input, keep what user typed - don't clear
  }

  /**
   * Parse fast input formats:
   * - 6 digits: ddmmyy (e.g., 210205 = 21/02/2005)
   * - 8 digits: ddmmyyyy (e.g., 21022005 = 21/02/2005)
   * - Standard format: dd/mm/yyyy or d/m/yyyy
   * Note: 5 digits not supported due to ambiguity (11111 could be 1/11/11 or 11/1/11)
   */
  private parseFastInput(input: string): Date | null {
    if (!input) return null;

    const trimmed = input.trim();

    // Remove any separators and check if it's digits only
    const digitsOnly = trimmed.replace(/[\/\-\.]/g, '');

    if (/^\d+$/.test(digitsOnly)) {
      // Pure digits - fast input mode
      return this.parseDigitsOnly(digitsOnly);
    } else if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(trimmed)) {
      // Standard format with separators: dd/mm/yyyy or d/m/yy
      return this.parseWithSeparators(trimmed);
    }

    return null;
  }

  private parseDigitsOnly(digits: string): Date | null {
    let day: number, month: number, year: number;

    switch (digits.length) {
      case 6:
        // ddmmyy format: 210205 = 21/02/05
        day = parseInt(digits.substring(0, 2), 10);
        month = parseInt(digits.substring(2, 4), 10);
        year = this.expandYear(parseInt(digits.substring(4, 6), 10));
        break;

      case 8:
        // ddmmyyyy format: 21022005 = 21/02/2005
        day = parseInt(digits.substring(0, 2), 10);
        month = parseInt(digits.substring(2, 4), 10);
        year = parseInt(digits.substring(4, 8), 10);
        break;

      default:
        // 5 digits or other lengths not supported
        return null;
    }

    return this.createValidDate(day, month, year);
  }

  private parseWithSeparators(input: string): Date | null {
    const parts = input.split(/[\/\-\.]/);
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (year < 100) {
      year = this.expandYear(year);
    }

    return this.createValidDate(day, month, year);
  }

  /**
   * Expand 2-digit year to 4-digit year
   * 00-49 -> 2000-2049
   * 50-99 -> 1950-1999
   */
  private expandYear(twoDigitYear: number): number {
    if (twoDigitYear >= 0 && twoDigitYear <= 49) {
      return 2000 + twoDigitYear;
    } else {
      return 1900 + twoDigitYear;
    }
  }

  private createValidDate(day: number, month: number, year: number): Date | null {
    // Validate ranges
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1900 || year > 2100) return null;

    // Create date and validate it's correct (handles invalid dates like 31/02)
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }

    return null;
  }

  private formatDateForDisplay(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
