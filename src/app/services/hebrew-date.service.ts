import { Injectable } from '@angular/core';
import { HDate, months } from '@hebcal/core';

@Injectable({
  providedIn: 'root'
})
export class HebrewDateService {
  private hebrewMonths = [
    'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר',
    'אדר א\'', 'אדר ב\'', 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול'
  ];

  private hebrewNumbers = [
    '', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט',
    'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט',
    'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'
  ];

  getHebrewDayString(day: number): string {
    return this.hebrewNumbers[day] || day.toString();
  }

  convertGregorianToHebrew(date: Date): { day: number; month: number; year: number; formatted: string } {
    const hDate = new HDate(date);
    const day = hDate.getDate();
    const month = hDate.getMonth();
    const year = hDate.getFullYear();
    
    const monthName = this.getHebrewMonthName(month, hDate.isLeapYear());
    const dayStr = this.hebrewNumbers[day] || day.toString();
    const yearStr = this.formatHebrewYear(year);
    
    const formatted = `${dayStr} ${monthName} ${yearStr}`;
    
    return { day, month, year, formatted };
  }

  convertHebrewToGregorian(day: number, month: number, year: number): Date {
    const hDate = new HDate(day, month, year);
    return hDate.greg();
  }

  formatHebrewYear(year: number): string {
    const thousands = Math.floor(year / 1000);
    const hundreds = Math.floor((year % 1000) / 100);
    const tens = Math.floor((year % 100) / 10);
    const ones = year % 10;
    
    let result = '';
    
    // Add the thousands (ה for 5000)
    if (thousands === 5) {
      result += 'ה';
    }
    
    // Add hundreds
    const hundredsLetters = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
    if (hundreds > 0) {
      result += hundredsLetters[hundreds];
    }
    
    // Add tens and ones
    const tensLetters = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    const onesLetters = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    
    // Special cases for 15 (טו) and 16 (טז)
    if (tens === 1 && ones === 5) {
      result += 'טו';
    } else if (tens === 1 && ones === 6) {
      result += 'טז';
    } else {
      if (tens > 0) {
        result += tensLetters[tens];
      }
      if (ones > 0) {
        result += onesLetters[ones];
      }
    }
    
    // Add quotes before the last letter
    if (result.length > 1) {
      const lastChar = result.slice(-1);
      const beforeLast = result.slice(0, -1);
      result = beforeLast + '"' + lastChar;
    } else {
      result = result + "'";
    }
    
    return result;
  }

  getHebrewYearString(year: number): string {
    return this.formatHebrewYear(year);
  }

  getHebrewMonthName(month: number, isLeapYear: boolean): string {
    if (isLeapYear) {
      if (month === months.ADAR_I) return this.hebrewMonths[6];
      if (month === months.ADAR_II) return this.hebrewMonths[7];
    }
    
    const monthMap: { [key: number]: number } = {
      [months.TISHREI]: 0,
      [months.CHESHVAN]: 1,
      [months.KISLEV]: 2,
      [months.TEVET]: 3,
      [months.SHVAT]: 4,
      [months.ADAR_I]: 5,
      [months.NISAN]: 8,
      [months.IYYAR]: 9,
      [months.SIVAN]: 10,
      [months.TAMUZ]: 11,
      [months.AV]: 12,
      [months.ELUL]: 13
    };
    
    return this.hebrewMonths[monthMap[month]] || '';
  }

  getHebrewMonthsForYear(year: number): { value: number; name: string }[] {
    const hDate = new HDate(1, months.TISHREI, year);
    const isLeap = hDate.isLeapYear();
    
    const monthsList: { value: number; name: string }[] = [
      { value: months.TISHREI, name: this.hebrewMonths[0] },
      { value: months.CHESHVAN, name: this.hebrewMonths[1] },
      { value: months.KISLEV, name: this.hebrewMonths[2] },
      { value: months.TEVET, name: this.hebrewMonths[3] },
      { value: months.SHVAT, name: this.hebrewMonths[4] }
    ];
    
    if (isLeap) {
      monthsList.push(
        { value: months.ADAR_I, name: this.hebrewMonths[6] },
        { value: months.ADAR_II, name: this.hebrewMonths[7] }
      );
    } else {
      monthsList.push({ value: months.ADAR_I, name: this.hebrewMonths[5] });
    }
    
    monthsList.push(
      { value: months.NISAN, name: this.hebrewMonths[8] },
      { value: months.IYYAR, name: this.hebrewMonths[9] },
      { value: months.SIVAN, name: this.hebrewMonths[10] },
      { value: months.TAMUZ, name: this.hebrewMonths[11] },
      { value: months.AV, name: this.hebrewMonths[12] },
      { value: months.ELUL, name: this.hebrewMonths[13] }
    );
    
    return monthsList;
  }

  getDaysInMonth(month: number, year: number): number {
    const hDate = new HDate(1, month, year);
    return hDate.daysInMonth();
  }

  getCurrentHebrewYear(): number {
    const hDate = new HDate(new Date());
    return hDate.getFullYear();
  }
}