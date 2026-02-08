import { Component, Input, Output, EventEmitter, OnInit, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HebrewDateService } from '../../services/hebrew-date.service';

@Component({
  selector: 'app-dual-date-picker',
  templateUrl: './dual-date-picker.component.html',
  styleUrls: ['./dual-date-picker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DualDatePickerComponent),
      multi: true
    }
  ]
})
export class DualDatePickerComponent implements OnInit, ControlValueAccessor {
  @Input() label: string = '';
  @Input() hebrewLabel: string = 'תאריך עברי';
  @Input() gregorianLabel: string = 'תאריך לועזי';
  @Output() dateChange = new EventEmitter<Date | null>();

  gregorianDate: string = '';
  hebrewDay: number = 1;
  hebrewMonth: number = 1;
  hebrewYear: number = 5785;

  hebrewMonths: { value: number; name: string }[] = [];
  hebrewDays: { value: number; display: string }[] = [];
  hebrewYears: { value: number; display: string }[] = [];

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  disabled = false;

  constructor(private hebrewDateService: HebrewDateService) {}

  ngOnInit() {
    this.initializeHebrewYears();
    this.updateHebrewDate();
  }

  initializeHebrewYears() {
    const currentYear = this.hebrewDateService.getCurrentHebrewYear();
    this.hebrewYears = [];
    for (let i = currentYear - 120; i <= currentYear + 1; i++) {
      this.hebrewYears.push({
        value: i,
        display: this.hebrewDateService.formatHebrewYear(i)
      });
    }
    this.hebrewYear = currentYear;
    this.updateHebrewMonths();
  }

  updateHebrewMonths() {
    this.hebrewMonths = this.hebrewDateService.getHebrewMonthsForYear(this.hebrewYear);
    if (this.hebrewMonths.length > 0 && !this.hebrewMonths.find(m => m.value === this.hebrewMonth)) {
      this.hebrewMonth = this.hebrewMonths[0].value;
    }
    this.updateHebrewDays();
  }

  updateHebrewDays() {
    const daysInMonth = this.hebrewDateService.getDaysInMonth(this.hebrewMonth, this.hebrewYear);
    this.hebrewDays = Array.from({ length: daysInMonth }, (_, i) => ({
      value: i + 1,
      display: this.hebrewDateService.getHebrewDayString(i + 1)
    }));
    if (this.hebrewDay > daysInMonth) {
      this.hebrewDay = daysInMonth;
    }
  }

  onGregorianChange() {
    if (this.gregorianDate) {
      const date = new Date(this.gregorianDate);
      const hebrew = this.hebrewDateService.convertGregorianToHebrew(date);
      this.hebrewDay = hebrew.day;
      this.hebrewMonth = hebrew.month;
      this.hebrewYear = hebrew.year;
      this.updateHebrewMonths();
      this.emitChange(date);
    } else {
      this.emitChange(null);
    }
  }

  onHebrewYearChange() {
    this.updateHebrewMonths();
    this.syncGregorianDate();
  }

  onHebrewMonthChange() {
    this.updateHebrewDays();
    this.syncGregorianDate();
  }

  onHebrewDayChange() {
    this.syncGregorianDate();
  }

  syncGregorianDate() {
    try {
      const date = this.hebrewDateService.convertHebrewToGregorian(
        this.hebrewDay,
        this.hebrewMonth,
        this.hebrewYear
      );
      this.gregorianDate = this.formatDateForInput(date);
      this.emitChange(date);
    } catch (error) {
      console.error('Error converting Hebrew date:', error);
    }
  }

  updateHebrewDate() {
    if (this.gregorianDate) {
      const date = new Date(this.gregorianDate);
      const hebrew = this.hebrewDateService.convertGregorianToHebrew(date);
      this.hebrewDay = hebrew.day;
      this.hebrewMonth = hebrew.month;
      this.hebrewYear = hebrew.year;
      this.updateHebrewMonths();
    }
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private emitChange(date: Date | null) {
    this.onChange(date);
    this.dateChange.emit(date);
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value) {
      const date = value instanceof Date ? value : new Date(value);
      this.gregorianDate = this.formatDateForInput(date);
      this.updateHebrewDate();
    } else {
      this.gregorianDate = '';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  getFormattedHebrewDate(): string {
    if (!this.gregorianDate) return '';
    try {
      const date = new Date(this.gregorianDate);
      const hebrew = this.hebrewDateService.convertGregorianToHebrew(date);
      return hebrew.formatted;
    } catch {
      return '';
    }
  }

  getFormattedGregorianDate(): string {
    if (!this.gregorianDate) return '';
    try {
      const date = new Date(this.gregorianDate);
      return date.toLocaleDateString('he-IL');
    } catch {
      return '';
    }
  }
}
