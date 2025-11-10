import { Injectable } from '@angular/core';
import { HDate, months, HebrewCalendar, Sedra } from '@hebcal/core';

/**
 * Service for Hebrew date calculations on the client side
 * Uses @hebcal/core directly for instant calculations without server calls
 */
@Injectable({
  providedIn: 'root'
})
export class HebrewDateService {
  // Hebrew day numbers as Hebrew letters
  private hebrewNumbers = [
    '', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט',
    'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט',
    'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'
  ];

  /**
   * Get Hebrew day as Hebrew letters
   */
  getHebrewDayString(day: number): string {
    return this.hebrewNumbers[day] || day.toString();
  }

  /**
   * Convert Gregorian date to Hebrew date
   */
  convertGregorianToHebrew(date: Date): {
    day: number
    month: number
    year: number
    formatted: string
    moed?: string
  } {
    const hDate = new HDate(date);
    const moed = this.getHolidayForDate(hDate.getDate(), hDate.getMonth(), hDate.getFullYear());
    return {
      day: hDate.getDate(),
      month: hDate.getMonth(),
      year: hDate.getFullYear(),
      formatted: hDate.renderGematriya(),
      moed: moed || undefined
    };
  }

  /**
   * Convert Hebrew date to Gregorian date
   */
  convertHebrewToGregorian(day: number, month: number, year: number): Date {
    const hDate = new HDate(day, month, year);
    return hDate.greg();
  }

  /**
   * Get number of days in Hebrew month
   */
  getDaysInMonth(month: number, year: number): number {
    const hDate = new HDate(1, month, year);
    return hDate.daysInMonth();
  }

  /**
   * Get current Hebrew year
   */
  getCurrentHebrewYear(): number {
    return new HDate().getFullYear();
  }

  /**
   * Check if Hebrew year is a leap year
   */
  isLeapYear(year: number): boolean {
    const hDate = new HDate(1, months.TISHREI, year);
    return hDate.isLeapYear();
  }

  /**
   * Get Hebrew months for a specific year (handles leap years)
   */
  getHebrewMonthsForYear(year: number): Array<{ value: number; name: string }> {
    const hDate = new HDate(1, months.TISHREI, year);
    const isLeap = hDate.isLeapYear();

    const monthsList: Array<{ value: number; name: string }> = [
      { value: months.TISHREI, name: 'תשרי' },
      { value: months.CHESHVAN, name: 'חשון' },
      { value: months.KISLEV, name: 'כסלו' },
      { value: months.TEVET, name: 'טבת' },
      { value: months.SHVAT, name: 'שבט' }
    ];

    if (isLeap) {
      monthsList.push({ value: months.ADAR_I, name: 'אדר א\'' });
      monthsList.push({ value: months.ADAR_II, name: 'אדר ב\'' });
    } else {
      monthsList.push({ value: months.ADAR_I, name: 'אדר' });
    }

    monthsList.push(
      { value: months.NISAN, name: 'ניסן' },
      { value: months.IYYAR, name: 'אייר' },
      { value: months.SIVAN, name: 'סיון' },
      { value: months.TAMUZ, name: 'תמוז' },
      { value: months.AV, name: 'אב' },
      { value: months.ELUL, name: 'אלול' }
    );

    return monthsList;
  }

  /**
   * Get Jewish holidays for a specific month and year
   */
  getJewishHolidays(
    month: number,
    year: number,
    isDiaspora: boolean = false
  ): Record<number, string[]> {
    const holidays: Record<number, string[]> = {};

    // Get holidays for the entire year
    const events = HebrewCalendar.calendar({
      year: year,
      isHebrewYear: true,
      candlelighting: false,
      havdalahMins: 0,
      sedrot: false,
      il: !isDiaspora
    });

    // Filter holidays for the requested month
    for (const ev of events) {
      const hd = ev.getDate();
      if (hd.getMonth() === month) {
        const day = hd.getDate();
        if (!holidays[day]) {
          holidays[day] = [];
        }
        holidays[day].push(ev.render('he'));
      }
    }

    return holidays;
  }

  /**
   * Get holiday name for a specific date
   */
  getHolidayForDate(
    day: number,
    month: number,
    year: number,
    isDiaspora: boolean = false
  ): string | null {
    const hDate = new HDate(day, month, year);
    const events = HebrewCalendar.getHolidaysOnDate(hDate, !isDiaspora);

    if (events && events.length > 0) {
      return events.map(e => e.render('he')).join(', ');
    }

    return null;
  }

  /**
   * Get Parsha (Torah portion) for a Shabbat date
   */
  getParshaForDate(date: Date, isDiaspora: boolean = false): string | null {
    const hDate = new HDate(date);
    const hyear = hDate.getFullYear();

    // Create Sedra for that year
    const sedra = new Sedra(hyear, !isDiaspora);

    // Get the parsha for that date
    const parsha = sedra.lookup(hDate);

    if (parsha && parsha.parsha && parsha.parsha.length > 0) {
      return parsha.parsha.map((p: string) => p).join('-');
    }

    return null;
  }

  /**
   * Get Adar month for a given year (handles leap years)
   */
  getAdarMonth(year: number, preferSecond: boolean = true): number {
    const hDate = new HDate(1, months.TISHREI, year);
    const isLeap = hDate.isLeapYear();
    if (isLeap) {
      return preferSecond ? months.ADAR_II : months.ADAR_I;
    }
    return months.ADAR_I;
  }

  /**
   * Format Hebrew year as Hebrew string
   */
  formatHebrewYear(year: number): string {
    const hDate = new HDate(1, months.TISHREI, year);
    const gematriya = hDate.renderGematriya();
    // Extract just the year part (after the space)
    const parts = gematriya.split(' ');
    return parts[parts.length - 1];
  }

  /**
   * Get month constants for client-side use
   */
  getMonthConstants(): Record<string, number> {
    return {
      TISHREI: months.TISHREI,
      CHESHVAN: months.CHESHVAN,
      KISLEV: months.KISLEV,
      TEVET: months.TEVET,
      SHVAT: months.SHVAT,
      ADAR_I: months.ADAR_I,
      ADAR_II: months.ADAR_II,
      NISAN: months.NISAN,
      IYYAR: months.IYYAR,
      SIVAN: months.SIVAN,
      TAMUZ: months.TAMUZ,
      AV: months.AV,
      ELUL: months.ELUL
    };
  }

  /**
   * Get specific month constant by name
   */
  getMonthConstant(name: string): number {
    const constants = this.getMonthConstants();
    return constants[name];
  }
}
