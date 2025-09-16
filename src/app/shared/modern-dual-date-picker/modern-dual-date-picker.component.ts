import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, forwardRef, ViewChild, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
export class ModernDualDatePickerComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() label: string = '';
  @Input() disabled: boolean = false;
  @Input() isCalendarJewEnabled: boolean = true; // Toggle for showing Jewish holidays
  @Input() isDiaspora: boolean = false; // For diaspora holidays
  @Input() calendar_open_heb_and_eng_parallel: boolean = true; // Open both calendars in parallel
  @Input() showOnlyHebrew: boolean = false; // Show only Hebrew date picker
  @Input() showOnlyGregorian: boolean = false; // Show only Gregorian date picker  
  @Input() compact: boolean = false; // Compact mode for table cells
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
  hebrewYearsList: number[] = [];
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
  
  // Static property to track all instances for global popup management
  private static allInstances: Set<ModernDualDatePickerComponent> = new Set();

  constructor(private hebrewDateService: HebrewDateService) {
    // Add this instance to the global set
    ModernDualDatePickerComponent.allInstances.add(this);
  }

  ngOnInit() {
    this.initializeCalendars();
    this.setupClickOutsideListener();
  }

  initializeCalendars() {
    const today = new Date();
    
    // Initialize Hebrew calendar with today's Hebrew date
    const hebrewToday = this.hebrewDateService.convertGregorianToHebrew(today);
    this.hebrewSelectedYear = hebrewToday.year;
    this.hebrewSelectedMonth = hebrewToday.month;
    this.hebrewSelectedDay = hebrewToday.day;
    
    // Initialize Gregorian calendar with today's date
    this.gregorianSelectedDate = today;
    this.gregorianMonth = today.getMonth();
    this.gregorianYear = today.getFullYear();
    
    // Generate calendars
    this.generateHebrewYearsList();
    this.updateHebrewMonths();
    this.generateHebrewCalendar();
    this.generateGregorianCalendar();
  }

  setupClickOutsideListener() {
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // In parallel mode, check if click is outside the entire parallel container
      if (this.calendar_open_heb_and_eng_parallel && this.showHebrewPopup && this.showGregorianPopup) {
        const isInsideParallelContainer = target.closest('.parallel-popups-container') || 
                                         target.closest('.hebrew-trigger') || 
                                         target.closest('.gregorian-trigger');
        if (!isInsideParallelContainer) {
          this.showHebrewPopup = false;
          this.showGregorianPopup = false;
        }
        return; // Don't run the individual checks in parallel mode
      }
      
      // Check if click is outside Hebrew popup (single mode only)
      if (this.showHebrewPopup) {
        const isInsideHebrewPopup = target.closest('.hebrew-popup') || target.closest('.hebrew-trigger');
        if (!isInsideHebrewPopup) {
          this.showHebrewPopup = false;
        }
      }
      
      // Check if click is outside Gregorian popup (single mode only)
      if (this.showGregorianPopup) {
        const isInsideGregorianPopup = target.closest('.gregorian-popup') || target.closest('.gregorian-trigger');
        if (!isInsideGregorianPopup) {
          this.showGregorianPopup = false;
        }
      }
    });
  }

  // Hebrew calendar methods
  toggleHebrewPopup(event: Event) {
    event.stopPropagation();
    
    // Close popups on other instances first
    if (!this.showHebrewPopup) {
      this.closeOtherInstancesPopups();
    }
    
    this.showHebrewPopup = !this.showHebrewPopup;
    
    if (this.calendar_open_heb_and_eng_parallel) {
      // Open both calendars in parallel mode
      this.showGregorianPopup = this.showHebrewPopup;
    } else {
      // Traditional mode - close the other calendar
      this.showGregorianPopup = false;
    }
    
    if (this.showHebrewPopup && this.currentDate) {
      const hebrew = this.hebrewDateService.convertGregorianToHebrew(this.currentDate);
      this.hebrewSelectedDay = hebrew.day;
      this.hebrewSelectedMonth = hebrew.month;
      this.hebrewSelectedYear = hebrew.year;
      this.updateHebrewMonths();
      this.generateHebrewCalendar();
    }
    
    if (this.showGregorianPopup && this.currentDate) {
      this.gregorianSelectedDate = new Date(this.currentDate);
      this.gregorianMonth = this.gregorianSelectedDate.getMonth();
      this.gregorianYear = this.gregorianSelectedDate.getFullYear();
      this.generateGregorianCalendar();
    }
  }

  generateHebrewYearsList() {
    const currentYear = this.hebrewDateService.getCurrentHebrewYear();
    this.hebrewYearsList = [];
    
    // Generate years from 50 years ago to 50 years forward
    for (let year = currentYear - 50; year <= currentYear + 50; year++) {
      this.hebrewYearsList.push(year);
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
    this.closeAllPopups();
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
    
    // Sync Gregorian calendar if parallel mode is enabled and both popups are open
    if (this.calendar_open_heb_and_eng_parallel && this.showGregorianPopup && this.showHebrewPopup) {
      this.syncGregorianWithHebrew();
    }
  }

  onHebrewMonthChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.hebrewSelectedMonth = parseInt(target.value);
    this.generateHebrewCalendar();
    
    // Sync Gregorian calendar if parallel mode is enabled and both popups are open
    if (this.calendar_open_heb_and_eng_parallel && this.showGregorianPopup && this.showHebrewPopup) {
      this.syncGregorianWithHebrew();
    }
  }

  onHebrewYearChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.hebrewSelectedYear = parseInt(target.value);
    this.updateHebrewMonths();
    this.generateHebrewCalendar();
    
    // Sync Gregorian calendar if parallel mode is enabled and both popups are open
    if (this.calendar_open_heb_and_eng_parallel && this.showGregorianPopup && this.showHebrewPopup) {
      this.syncGregorianWithHebrew();
    }
  }

  // Gregorian calendar methods
  toggleGregorianPopup(event: Event) {
    event.stopPropagation();
    
    // Close popups on other instances first
    if (!this.showGregorianPopup) {
      this.closeOtherInstancesPopups();
    }
    
    this.showGregorianPopup = !this.showGregorianPopup;
    
    if (this.calendar_open_heb_and_eng_parallel) {
      // Open both calendars in parallel mode
      this.showHebrewPopup = this.showGregorianPopup;
    } else {
      // Traditional mode - close the other calendar
      this.showHebrewPopup = false;
    }
    
    if (this.showGregorianPopup && this.currentDate) {
      this.gregorianSelectedDate = new Date(this.currentDate);
      this.gregorianMonth = this.gregorianSelectedDate.getMonth();
      this.gregorianYear = this.gregorianSelectedDate.getFullYear();
      this.generateGregorianCalendar();
    }
    
    if (this.showHebrewPopup && this.currentDate) {
      const hebrew = this.hebrewDateService.convertGregorianToHebrew(this.currentDate);
      this.hebrewSelectedDay = hebrew.day;
      this.hebrewSelectedMonth = hebrew.month;
      this.hebrewSelectedYear = hebrew.year;
      this.updateHebrewMonths();
      this.generateHebrewCalendar();
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
    this.closeAllPopups();
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
    
    // Sync Hebrew calendar if parallel mode is enabled and both popups are open
    if (this.calendar_open_heb_and_eng_parallel && this.showGregorianPopup && this.showHebrewPopup) {
      this.syncHebrewWithGregorian();
    }
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

  ngOnDestroy() {
    // Remove this instance from the global set
    ModernDualDatePickerComponent.allInstances.delete(this);
  }

  closeAllPopups() {
    this.showHebrewPopup = false;
    this.showGregorianPopup = false;
  }

  // Close popups on all other instances when opening this one
  closeOtherInstancesPopups() {
    ModernDualDatePickerComponent.allInstances.forEach(instance => {
      if (instance !== this) {
        instance.closeAllPopups();
      }
    });
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

  getHebrewYearString(year: number): string {
    return this.hebrewDateService.getHebrewYearString(year);
  }

  getHebrewDayString(day: number): string {
    return this.hebrewDateService.getHebrewDayString(day);
  }

  getHolidayForDay(day: number): string | null {
    if (!this.isCalendarJewEnabled || day === 0) return null;
    return this.hebrewDateService.getHolidayForDate(day, this.hebrewSelectedMonth, this.hebrewSelectedYear, this.isDiaspora);
  }

  toggleHolidays() {
    this.isCalendarJewEnabled = !this.isCalendarJewEnabled;
  }

  goToToday() {
    const today = new Date();
    const hebrewToday = this.hebrewDateService.convertGregorianToHebrew(today);
    
    // Check if we're already showing today's month
    if (this.hebrewSelectedMonth !== hebrewToday.month || 
        this.hebrewSelectedYear !== hebrewToday.year) {
      // Update to today's month and year
      this.hebrewSelectedYear = hebrewToday.year;
      this.hebrewSelectedMonth = hebrewToday.month;
      this.updateHebrewMonths();
      this.generateHebrewCalendar();
      
      // Sync Gregorian calendar if parallel mode is enabled and both popups are open
      if (this.calendar_open_heb_and_eng_parallel && this.showGregorianPopup && this.showHebrewPopup) {
        this.gregorianMonth = today.getMonth();
        this.gregorianYear = today.getFullYear();
        this.generateGregorianCalendar();
      }
    }
  }

  isCurrentMonth(): boolean {
    const today = new Date();
    const hebrewToday = this.hebrewDateService.convertGregorianToHebrew(today);
    return this.hebrewSelectedMonth === hebrewToday.month && 
           this.hebrewSelectedYear === hebrewToday.year;
  }

  isSelectedHebrewDay(day: number): boolean {
    if (!this.currentDate || day === 0) return false;
    const hebrew = this.hebrewDateService.convertGregorianToHebrew(this.currentDate);
    return hebrew.day === day && 
           hebrew.month === this.hebrewSelectedMonth && 
           hebrew.year === this.hebrewSelectedYear;
  }

  isTodayHebrew(day: number): boolean {
    if (day === 0) return false;
    const today = new Date();
    const hebrewToday = this.hebrewDateService.convertGregorianToHebrew(today);
    return hebrewToday.day === day && 
           hebrewToday.month === this.hebrewSelectedMonth && 
           hebrewToday.year === this.hebrewSelectedYear;
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

  // Synchronization methods for parallel calendar mode
  syncGregorianWithHebrew() {
    // Convert middle of Hebrew month to Gregorian to get the most representative month
    const daysInHebrewMonth = this.hebrewDateService.getDaysInMonth(this.hebrewSelectedMonth, this.hebrewSelectedYear);
    const middleDay = Math.ceil(daysInHebrewMonth / 2);
    const hebrewDate = this.hebrewDateService.convertHebrewToGregorian(middleDay, this.hebrewSelectedMonth, this.hebrewSelectedYear);
    this.gregorianMonth = hebrewDate.getMonth();
    this.gregorianYear = hebrewDate.getFullYear();
    this.generateGregorianCalendar();
  }

  syncHebrewWithGregorian() {
    // Convert middle of Gregorian month to Hebrew to get the most representative month
    const daysInGregorianMonth = new Date(this.gregorianYear, this.gregorianMonth + 1, 0).getDate();
    const middleDay = Math.ceil(daysInGregorianMonth / 2);
    const gregorianDate = new Date(this.gregorianYear, this.gregorianMonth, middleDay);
    const hebrew = this.hebrewDateService.convertGregorianToHebrew(gregorianDate);
    this.hebrewSelectedMonth = hebrew.month;
    this.hebrewSelectedYear = hebrew.year;
    this.updateHebrewMonths();
    this.generateHebrewCalendar();
  }
}