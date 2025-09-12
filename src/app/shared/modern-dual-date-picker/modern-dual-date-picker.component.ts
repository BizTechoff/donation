import { Component, Input, Output, EventEmitter, OnInit, forwardRef, ViewChild, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { months } from '@hebcal/core';

@Component({
  selector: 'app-modern-dual-date-picker',
  templateUrl: './modern-dual-date-picker.component.html',
  styleUrls: ['./modern-dual-date-picker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ModernDualDatePickerComponent),
      multi: true
    }
  ]
})
export class ModernDualDatePickerComponent implements OnInit, ControlValueAccessor {
  @Input() label: string = '';
  @Input() disabled: boolean = false;
  @Output() dateChange = new EventEmitter<Date | null>();
  
  @ViewChild('hebrewPopup', { static: false }) hebrewPopup!: ElementRef;
  @ViewChild('gregorianPopup', { static: false }) gregorianPopup!: ElementRef;

  // Current date values
  currentDate: Date | null = null;
  hebrewDateDisplay: string = '';
  gregorianDateDisplay: string = '';
  
  // Popup states
  showHebrewPopup = false;
  showGregorianPopup = false;
  
  // Hebrew calendar state
  hebrewSelectedDay: number = 1;
  hebrewSelectedMonth: number = months.TISHREI;
  hebrewSelectedYear: number = 5785;
  hebrewMonths: { value: number; name: string }[] = [];
  hebrewDaysInMonth: number[][] = [];
  
  // Gregorian calendar state
  gregorianSelectedDate: Date = new Date();
  gregorianMonth: number = new Date().getMonth();
  gregorianYear: number = new Date().getFullYear();
  gregorianDaysInMonth: (number | null)[][] = [];
  
  // Days of week labels
  hebrewDaysOfWeek = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  gregorianDaysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  gregorianMonths = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
  
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private hebrewDateService: HebrewDateService) {}

  ngOnInit() {
    this.initializeCalendars();
    this.setupClickOutsideListener();
  }

  initializeCalendars() {
    const today = new Date();
    this.hebrewSelectedYear = this.hebrewDateService.getCurrentHebrewYear();
    this.updateHebrewMonths();
    this.generateHebrewCalendar();
    this.generateGregorianCalendar();
  }

  setupClickOutsideListener() {
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (this.showHebrewPopup && this.hebrewPopup && 
          !this.hebrewPopup.nativeElement.contains(target) &&
          !target.closest('.hebrew-trigger')) {
        this.showHebrewPopup = false;
      }
      
      if (this.showGregorianPopup && this.gregorianPopup && 
          !this.gregorianPopup.nativeElement.contains(target) &&
          !target.closest('.gregorian-trigger')) {
        this.showGregorianPopup = false;
      }
    });
  }

  // Hebrew calendar methods
  toggleHebrewPopup(event: Event) {
    event.stopPropagation();
    this.showHebrewPopup = !this.showHebrewPopup;
    this.showGregorianPopup = false;
    if (this.showHebrewPopup && this.currentDate) {
      const hebrew = this.hebrewDateService.convertGregorianToHebrew(this.currentDate);
      this.hebrewSelectedDay = hebrew.day;
      this.hebrewSelectedMonth = hebrew.month;
      this.hebrewSelectedYear = hebrew.year;
      this.updateHebrewMonths();
      this.generateHebrewCalendar();
    }
  }

  updateHebrewMonths() {
    this.hebrewMonths = this.hebrewDateService.getHebrewMonthsForYear(this.hebrewSelectedYear);
  }

  generateHebrewCalendar() {
    const daysInMonth = this.hebrewDateService.getDaysInMonth(this.hebrewSelectedMonth, this.hebrewSelectedYear);
    const weeks: number[][] = [];
    let week: number[] = [];
    
    // Get first day of month
    const firstDay = this.hebrewDateService.convertHebrewToGregorian(1, this.hebrewSelectedMonth, this.hebrewSelectedYear);
    const startDayOfWeek = firstDay.getDay();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      week.push(0);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    
    // Add remaining days to last week
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(0);
      }
      weeks.push(week);
    }
    
    this.hebrewDaysInMonth = weeks;
  }

  selectHebrewDay(day: number) {
    if (day === 0) return;
    this.hebrewSelectedDay = day;
    const date = this.hebrewDateService.convertHebrewToGregorian(
      this.hebrewSelectedDay,
      this.hebrewSelectedMonth,
      this.hebrewSelectedYear
    );
    this.setDate(date);
    this.showHebrewPopup = false;
  }

  changeHebrewMonth(direction: number) {
    const currentIndex = this.hebrewMonths.findIndex(m => m.value === this.hebrewSelectedMonth);
    const newIndex = currentIndex + direction;
    
    if (newIndex < 0) {
      this.hebrewSelectedYear--;
      this.updateHebrewMonths();
      this.hebrewSelectedMonth = this.hebrewMonths[this.hebrewMonths.length - 1].value;
    } else if (newIndex >= this.hebrewMonths.length) {
      this.hebrewSelectedYear++;
      this.updateHebrewMonths();
      this.hebrewSelectedMonth = this.hebrewMonths[0].value;
    } else {
      this.hebrewSelectedMonth = this.hebrewMonths[newIndex].value;
    }
    
    this.generateHebrewCalendar();
  }

  // Gregorian calendar methods
  toggleGregorianPopup(event: Event) {
    event.stopPropagation();
    this.showGregorianPopup = !this.showGregorianPopup;
    this.showHebrewPopup = false;
    if (this.showGregorianPopup && this.currentDate) {
      this.gregorianSelectedDate = new Date(this.currentDate);
      this.gregorianMonth = this.gregorianSelectedDate.getMonth();
      this.gregorianYear = this.gregorianSelectedDate.getFullYear();
      this.generateGregorianCalendar();
    }
  }

  generateGregorianCalendar() {
    const firstDay = new Date(this.gregorianYear, this.gregorianMonth, 1);
    const lastDay = new Date(this.gregorianYear, this.gregorianMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      week.push(null);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    
    // Add remaining days to last week
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }
    
    this.gregorianDaysInMonth = weeks;
  }

  selectGregorianDay(day: number | null) {
    if (day === null) return;
    const date = new Date(this.gregorianYear, this.gregorianMonth, day);
    this.setDate(date);
    this.showGregorianPopup = false;
  }

  changeGregorianMonth(direction: number) {
    this.gregorianMonth += direction;
    if (this.gregorianMonth < 0) {
      this.gregorianMonth = 11;
      this.gregorianYear--;
    } else if (this.gregorianMonth > 11) {
      this.gregorianMonth = 0;
      this.gregorianYear++;
    }
    this.generateGregorianCalendar();
  }

  // Common methods
  setDate(date: Date | null) {
    this.currentDate = date;
    this.updateDisplayStrings();
    this.onChange(date);
    this.dateChange.emit(date);
  }

  updateDisplayStrings() {
    if (this.currentDate) {
      // Hebrew display
      const hebrew = this.hebrewDateService.convertGregorianToHebrew(this.currentDate);
      this.hebrewDateDisplay = hebrew.formatted;
      
      // Gregorian display
      const day = this.currentDate.getDate();
      const month = this.currentDate.getMonth() + 1;
      const year = this.currentDate.getFullYear();
      this.gregorianDateDisplay = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    } else {
      this.hebrewDateDisplay = '';
      this.gregorianDateDisplay = '';
    }
  }

  clearDate() {
    this.setDate(null);
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value) {
      this.currentDate = value instanceof Date ? value : new Date(value);
      this.updateDisplayStrings();
    } else {
      this.currentDate = null;
      this.hebrewDateDisplay = '';
      this.gregorianDateDisplay = '';
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

  getCurrentHebrewMonthName(): string {
    const month = this.hebrewMonths.find(m => m.value === this.hebrewSelectedMonth);
    return month ? month.name : '';
  }

  getCurrentHebrewYearString(): string {
    return this.hebrewDateService.getHebrewYearString(this.hebrewSelectedYear);
  }

  getHebrewDayString(day: number): string {
    return this.hebrewDateService.getHebrewDayString(day);
  }

  isSelectedHebrewDay(day: number): boolean {
    if (!this.currentDate || day === 0) return false;
    const hebrew = this.hebrewDateService.convertGregorianToHebrew(this.currentDate);
    return hebrew.day === day && 
           hebrew.month === this.hebrewSelectedMonth && 
           hebrew.year === this.hebrewSelectedYear;
  }

  isSelectedGregorianDay(day: number | null): boolean {
    if (!this.currentDate || day === null) return false;
    return this.currentDate.getDate() === day && 
           this.currentDate.getMonth() === this.gregorianMonth && 
           this.currentDate.getFullYear() === this.gregorianYear;
  }

  isToday(day: number | null): boolean {
    if (day === null) return false;
    const today = new Date();
    return day === today.getDate() && 
           this.gregorianMonth === today.getMonth() && 
           this.gregorianYear === today.getFullYear();
  }
}