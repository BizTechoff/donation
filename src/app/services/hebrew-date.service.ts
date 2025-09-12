import { Injectable } from '@angular/core';
import { HDate, months, HebrewCalendar, Event } from '@hebcal/core';

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

  getJewishHolidays(month: number, year: number, isDiaspora: boolean = false): Map<number, string[]> {
    const holidays = new Map<number, string[]>();
    
    // מילון חגים - התאמה לפי חודש ויום
    const holidaysList: { [key: string]: { day: number; name: string; diasporaOnly?: boolean } } = {
      // תשרי
      'ROSH_HASHANA_1': { day: 1, name: 'ראש השנה' },
      'ROSH_HASHANA_2': { day: 2, name: 'ראש השנה ב\'' },
      'TZOM_GEDALIAH': { day: 3, name: 'צום גדליה' },
      'YOM_KIPPUR': { day: 10, name: 'יום כיפור' },
      'SUKKOT_1': { day: 15, name: 'סוכות' },
      'SUKKOT_2': { day: 16, name: 'סוכות ב\'' },
      'HOL_HAMOED_SUKKOT': { day: 17, name: 'חול המועד' },
      'HOSHANA_RABBAH': { day: 21, name: 'הושענא רבה' },
      'SHEMINI_ATZERET': { day: 22, name: 'שמיני עצרת' },
      'SIMCHAT_TORAH_IL': { day: 22, name: 'שמחת תורה' },
      'SIMCHAT_TORAH_DIASPORA': { day: 23, name: 'שמחת תורה', diasporaOnly: true }
    };

    // חגים לפי חודש
    if (month === months.TISHREI) {
      holidays.set(1, ['ראש השנה']);
      holidays.set(2, ['ראש השנה ב\'']);
      holidays.set(3, ['צום גדליה']);
      holidays.set(10, ['יום כיפור']);
      holidays.set(15, ['סוכות']);
      holidays.set(16, ['חוה"מ']);
      holidays.set(17, ['חוה"מ']);
      holidays.set(18, ['חוה"מ']);
      holidays.set(19, ['חוה"מ']);
      holidays.set(20, ['חוה"מ']);
      holidays.set(21, ['הוש"ר']);
      if (isDiaspora) {
        holidays.set(22, ['שמיני עצרת']);
        holidays.set(23, ['שמחת תורה']);
      } else {
        holidays.set(22, ['שמ"ע/שמח"ת']);
      }
    } else if (month === months.KISLEV) {
      holidays.set(25, ['חנוכה']);
      holidays.set(26, ['חנוכה']);
      holidays.set(27, ['חנוכה']);
      holidays.set(28, ['חנוכה']);
      holidays.set(29, ['חנוכה']);
      holidays.set(30, ['חנוכה']);
    } else if (month === months.TEVET) {
      const daysInKislev = this.getDaysInMonth(months.KISLEV, year);
      if (daysInKislev === 29) {
        holidays.set(1, ['חנוכה']);
        holidays.set(2, ['חנוכה']);
        holidays.set(3, ['חנוכה']);
      } else {
        holidays.set(1, ['חנוכה']);
        holidays.set(2, ['חנוכה']);
      }
      holidays.set(10, ['צום עשרה בטבת']);
    } else if (month === months.SHVAT) {
      holidays.set(15, ['ט"ו בשבט']);
    } else if (month === months.ADAR_I || month === months.ADAR_II) {
      const isLeapYear = new HDate(1, month, year).isLeapYear();
      const purimMonth = isLeapYear ? months.ADAR_II : months.ADAR_I;
      
      if (month === purimMonth) {
        holidays.set(13, ['תענית אסתר']);
        holidays.set(14, ['פורים']);
        holidays.set(15, ['שושן פורים']);
      }
    } else if (month === months.NISAN) {
      holidays.set(15, ['פסח']);
      holidays.set(16, ['חוה"מ']);
      holidays.set(17, ['חוה"מ']);
      holidays.set(18, ['חוה"מ']);
      holidays.set(19, ['חוה"מ']);
      holidays.set(20, ['חוה"מ']);
      holidays.set(21, ['שביעי פסח']);
      if (isDiaspora) {
        holidays.set(22, ['שמיני של פסח']);
      }
      holidays.set(27, ['יום השואה']);
    } else if (month === months.IYYAR) {
      holidays.set(4, ['יום הזיכרון']);
      holidays.set(5, ['יום העצמאות']);
      holidays.set(14, ['פסח שני']);
      holidays.set(18, ['ל"ג בעומר']);
      holidays.set(28, ['יום ירושלים']);
    } else if (month === months.SIVAN) {
      holidays.set(6, ['שבועות']);
      if (isDiaspora) {
        holidays.set(7, ['שבועות ב\'']);
      }
    } else if (month === months.AV) {
      holidays.set(9, ['תשעה באב']);
      holidays.set(15, ['ט"ו באב']);
    }

    return holidays;
  }

  getHolidayForDate(day: number, month: number, year: number, isDiaspora: boolean = false): string | null {
    const holidays = this.getJewishHolidays(month, year, isDiaspora);
    const holidayList = holidays.get(day);
    return holidayList && holidayList.length > 0 ? holidayList[0] : null;
  }
}