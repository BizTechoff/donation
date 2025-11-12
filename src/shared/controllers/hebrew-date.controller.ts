import { BackendMethod, Allow } from 'remult'
import { HDate, months, HebrewCalendar, Event, Sedra } from '@hebcal/core'

/**
 * Controller for all Hebrew date calculations and conversions
 * This is the ONLY place where @hebcal/core should be imported for date operations
 */
export class HebrewDateController {
  // Mapping from English parsha names to Hebrew
  private static readonly PARSHA_ENGLISH_TO_HEBREW: Record<string, string> = {
    'Bereshit': 'בראשית',
    'Noach': 'נח',
    'Lech-Lecha': 'לך לך',
    'Vayera': 'וירא',
    'Chayei Sara': 'חיי שרה',
    'Toldot': 'תולדות',
    'Vayetzei': 'ויצא',
    'Vayishlach': 'וישלח',
    'Vayeshev': 'וישב',
    'Miketz': 'מקץ',
    'Vayigash': 'ויגש',
    'Vayechi': 'ויחי',
    'Shemot': 'שמות',
    'Vaera': 'וארא',
    'Bo': 'בא',
    'Beshalach': 'בשלח',
    'Yitro': 'יתרו',
    'Mishpatim': 'משפטים',
    'Terumah': 'תרומה',
    'Tetzaveh': 'תצוה',
    'Ki Tisa': 'כי תשא',
    'Vayakhel': 'ויקהל',
    'Pekudei': 'פקודי',
    'Vayikra': 'ויקרא',
    'Tzav': 'צו',
    'Shmini': 'שמיני',
    'Tazria': 'תזריע',
    'Metzora': 'מצורע',
    'Achrei Mot': 'אחרי מות',
    'Kedoshim': 'קדושים',
    'Emor': 'אמור',
    'Behar': 'בהר',
    'Bechukotai': 'בחוקותי',
    'Bamidbar': 'במדבר',
    'Nasso': 'נשא',
    'Beha\'alotcha': 'בהעלותך',
    'Sh\'lach': 'שלח לך',
    'Korach': 'קרח',
    'Chukat': 'חקת',
    'Balak': 'בלק',
    'Pinchas': 'פינחס',
    'Matot': 'מטות',
    'Masei': 'מסעי',
    'Devarim': 'דברים',
    'Vaetchanan': 'ואתחנן',
    'Eikev': 'עקב',
    'Re\'eh': 'ראה',
    'Shoftim': 'שופטים',
    'Ki Teitzei': 'כי תצא',
    'Ki Tavo': 'כי תבוא',
    'Nitzavim': 'נצבים',
    'Vayeilech': 'וילך',
    'Ha\'azinu': 'האזינו',
    'Vezot Haberakhah': 'וזאת הברכה',
    // Combined parshiyot
    'Vayakhel-Pekudei': 'ויקהל-פקודי',
    'Tazria-Metzora': 'תזריע-מצורע',
    'Achrei Mot-Kedoshim': 'אחרי מות-קדושים',
    'Behar-Bechukotai': 'בהר-בחוקותי',
    'Chukat-Balak': 'חקת-בלק',
    'Matot-Masei': 'מטות-מסעי',
    'Nitzavim-Vayeilech': 'נצבים-וילך'
  };

  // Reverse mapping from Hebrew to English
  private static readonly PARSHA_HEBREW_TO_ENGLISH: Record<string, string> = Object.fromEntries(
    Object.entries(HebrewDateController.PARSHA_ENGLISH_TO_HEBREW).map(([eng, heb]) => [heb, eng])
  );
  /**
   * Convert Gregorian date to Hebrew date
   * @param date Gregorian date
   * @returns Hebrew date components and formatted string
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async convertGregorianToHebrew(date: Date): Promise<{
    day: number
    month: number
    year: number
    formatted: string
    monthName: string
  }> {
    // Ensure date is a Date object (could be string when sent from client)
    const dateObj = date instanceof Date ? date : new Date(date)
    const hDate = new HDate(dateObj)
    const isLeap = hDate.isLeapYear()

    return {
      day: hDate.getDate(),
      month: hDate.getMonth(),
      year: hDate.getFullYear(),
      formatted: hDate.renderGematriya(),
      monthName: HebrewDateController.getHebrewMonthName(hDate.getMonth(), isLeap)
    }
  }

  /**
   * Convert Hebrew date to Gregorian date
   * @param day Hebrew day
   * @param month Hebrew month (hebcal month number)
   * @param year Hebrew year
   * @returns Gregorian Date
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async convertHebrewToGregorian(
    day: number,
    month: number,
    year: number
  ): Promise<Date> {
    const hDate = new HDate(day, month, year)
    return hDate.greg()
  }

  /**
   * Get number of days in a Hebrew month
   * @param month Hebrew month (hebcal month number)
   * @param year Hebrew year
   * @returns Number of days in the month
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getDaysInMonth(month: number, year: number): Promise<number> {
    const hDate = new HDate(1, month, year)
    return hDate.daysInMonth()
  }

  /**
   * Get current Hebrew year
   * @returns Current Hebrew year
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getCurrentHebrewYear(): Promise<number> {
    return new HDate().getFullYear()
  }

  /**
   * Check if a Hebrew year is a leap year
   * @param year Hebrew year
   * @returns true if leap year
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async isLeapYear(year: number): Promise<boolean> {
    const hDate = new HDate(1, months.TISHREI, year)
    return hDate.isLeapYear()
  }

  /**
   * Get Hebrew months for a specific year (handles leap years)
   * @param year Hebrew year
   * @returns Array of month objects with value and name
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getHebrewMonthsForYear(year: number): Promise<Array<{ value: number; name: string }>> {
    const hDate = new HDate(1, months.TISHREI, year)
    const isLeap = hDate.isLeapYear()

    const monthsList: Array<{ value: number; name: string }> = [
      { value: months.TISHREI, name: 'תשרי' },
      { value: months.CHESHVAN, name: 'חשון' },
      { value: months.KISLEV, name: 'כסלו' },
      { value: months.TEVET, name: 'טבת' },
      { value: months.SHVAT, name: 'שבט' }
    ]

    if (isLeap) {
      monthsList.push({ value: months.ADAR_I, name: 'אדר א\'' })
      monthsList.push({ value: months.ADAR_II, name: 'אדר ב\'' })
    } else {
      monthsList.push({ value: months.ADAR_I, name: 'אדר' })
    }

    monthsList.push(
      { value: months.NISAN, name: 'ניסן' },
      { value: months.IYYAR, name: 'אייר' },
      { value: months.SIVAN, name: 'סיון' },
      { value: months.TAMUZ, name: 'תמוז' },
      { value: months.AV, name: 'אב' },
      { value: months.ELUL, name: 'אלול' }
    )

    return monthsList
  }

  /**
   * Get Jewish holidays for a specific Hebrew month and year
   * @param month Hebrew month (hebcal month number)
   * @param year Hebrew year
   * @param isDiaspora Whether to include diaspora holidays
   * @returns Map of day to holiday names
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getJewishHolidays(
    month: number,
    year: number,
    isDiaspora: boolean = false
  ): Promise<Record<number, string[]>> {
    const holidays: Record<number, string[]> = {}

    // Get holidays for the entire year
    const events = HebrewCalendar.calendar({
      year: year,
      isHebrewYear: true,
      candlelighting: false,
      havdalahMins: 0,
      sedrot: false,
      il: !isDiaspora
    })

    // Filter holidays for the requested month
    for (const ev of events) {
      const hd = ev.getDate()
      if (hd.getMonth() === month) {
        const day = hd.getDate()
        if (!holidays[day]) {
          holidays[day] = []
        }
        holidays[day].push(ev.render('he'))
      }
    }

    return holidays
  }

  /**
   * Get holiday name for a specific Hebrew date
   * @param day Hebrew day
   * @param month Hebrew month
   * @param year Hebrew year
   * @param isDiaspora Whether to check diaspora holidays
   * @returns Holiday name or null
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getHolidayForDate(
    day: number,
    month: number,
    year: number,
    isDiaspora: boolean = false
  ): Promise<string | null> {
    const hDate = new HDate(day, month, year)
    const events = HebrewCalendar.getHolidaysOnDate(hDate, !isDiaspora)

    if (events && events.length > 0) {
      return events.map(e => e.render('he')).join(', ')
    }

    return null
  }

  /**
   * Get Parsha (Torah portion) for a given Shabbat date
   * @param date Gregorian date of Shabbat
   * @param isDiaspora Whether to use diaspora schedule
   * @returns Parsha name in Hebrew
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getParshaForDate(
    date: Date,
    isDiaspora: boolean = false
  ): Promise<string | null> {
    // Ensure date is a Date object (could be string when sent from client)
    const dateObj = date instanceof Date ? date : new Date(date)
    const hDate = new HDate(dateObj)
    const hyear = hDate.getFullYear()

    // Create Sedra for that year
    const sedra = new Sedra(hyear, !isDiaspora)

    // Get the parsha for that date
    const parsha = sedra.lookup(hDate)

    if (parsha && parsha.parsha && parsha.parsha.length > 0) {
      return parsha.parsha.map((p: string) => p).join('-')
    }

    return null
  }

  /**
   * Get date range for a specific parsha
   * Returns the Saturday (Shabbat) of the parsha and the following Friday
   * @param parashaName Name of the parsha in Hebrew
   * @param year Hebrew year (optional, defaults to current year)
   * @param isDiaspora Whether to use diaspora schedule
   * @returns Object with startDate (Saturday) and endDate (Friday) or null if not found
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getParshaDateRange(
    parashaName: string,
    year?: number,
    isDiaspora: boolean = false
  ): Promise<{ startDate: Date; endDate: Date } | null> {
    console.log('getParshaDateRange called with:', { parashaName, year, isDiaspora })

    // Convert Hebrew parsha name to English if needed
    const parashaNameEnglish = HebrewDateController.PARSHA_HEBREW_TO_ENGLISH[parashaName] || parashaName
    console.log('Searching for parsha (English):', parashaNameEnglish)

    const currentHYear = new HDate().getFullYear()
    const yearsToSearch = year ? [year] : [currentHYear, currentHYear + 1, currentHYear - 1]

    console.log('Searching in years:', yearsToSearch)

    // Search in multiple years
    for (const hyear of yearsToSearch) {
      console.log(`Searching in year ${hyear}`)

      // Create Sedra for that year
      const sedra = new Sedra(hyear, !isDiaspora)

      // Get all Saturdays in the year
      const startOfYear = new HDate(1, months.TISHREI, hyear)
      const endOfYear = new HDate(29, months.ELUL, hyear)

      // Convert to Gregorian
      const startGreg = startOfYear.greg()
      const endGreg = endOfYear.greg()

      console.log(`Year ${hyear} range: ${startGreg.toISOString()} to ${endGreg.toISOString()}`)

      // Find all Saturdays in the year
      let currentDate = new Date(startGreg)

      // Move to first Saturday
      while (currentDate.getDay() !== 6) {
        currentDate.setDate(currentDate.getDate() + 1)
      }

      let saturdayCount = 0

      // Search for the parsha
      while (currentDate <= endGreg) {
        const hDate = new HDate(currentDate)
        const parsha = sedra.lookup(hDate)

        if (parsha && parsha.parsha && parsha.parsha.length > 0) {
          const currentParshaEnglish = parsha.parsha.map((p: string) => p).join('-')
          saturdayCount++

          if (saturdayCount <= 5 || currentParshaEnglish === parashaNameEnglish) {
            console.log(`Saturday ${currentDate.toISOString().split('T')[0]}: ${currentParshaEnglish}`)
          }

          if (currentParshaEnglish === parashaNameEnglish) {
            // Found the parsha! Return Saturday to Friday
            const startDate = new Date(currentDate)
            startDate.setHours(0, 0, 0, 0)

            const endDate = new Date(currentDate)
            endDate.setDate(endDate.getDate() + 6) // Add 6 days to get to Friday
            endDate.setHours(23, 59, 59, 999)

            console.log('Found parsha!', { startDate, endDate })
            return { startDate, endDate }
          }
        }

        // Move to next Saturday
        currentDate.setDate(currentDate.getDate() + 7)
      }

      console.log(`Total Saturdays in year ${hyear}: ${saturdayCount}`)
    }

    console.log('Parsha not found:', parashaName)
    return null
  }

  /**
   * Get the correct Adar month for a given year (handles leap years)
   * @param year Hebrew year
   * @param preferSecond If true and leap year, return Adar II, otherwise Adar I
   * @returns Hebcal month number for Adar
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getAdarMonth(year: number, preferSecond: boolean = true): Promise<number> {
    const hDate = new HDate(1, months.TISHREI, year)
    const isLeap = hDate.isLeapYear()
    if (isLeap) {
      return preferSecond ? months.ADAR_II : months.ADAR_I
    }
    return months.ADAR_I
  }

  /**
   * Format Hebrew year as Hebrew string
   * @param year Hebrew year number
   * @returns Formatted Hebrew year string
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async formatHebrewYear(year: number): Promise<string> {
    const hDate = new HDate(1, months.TISHREI, year)
    const gematriya = hDate.renderGematriya()
    // Extract just the year part (after the space)
    const parts = gematriya.split(' ')
    return parts[parts.length - 1]
  }

  /**
   * Parse Hebrew year string back to number
   * @param hebrewYearStr Hebrew year string (e.g., 'תשפ"ה')
   * @returns Hebrew year number (e.g., 5785)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async parseHebrewYear(hebrewYearStr: string): Promise<number> {
    // Try to find a matching year by iterating through recent years
    // This is a simple approach that works for recent years
    const currentYear = new HDate().getFullYear()

    // Search in range of current year ± 20 years
    for (let year = currentYear + 20; year >= currentYear - 20; year--) {
      const formatted = await HebrewDateController.formatHebrewYear(year)
      if (formatted === hebrewYearStr) {
        return year
      }
    }

    // If not found, throw error
    throw new Error(`Could not parse Hebrew year: ${hebrewYearStr}`)
  }

  /**
   * Get month constants for client-side use
   * @returns Object with month constant values
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getMonthConstants(): Promise<Record<string, number>> {
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
    }
  }

  /**
   * Get Hebrew date components from Gregorian date
   * Used by ReminderController for date calculations
   * @param date Gregorian date
   * @returns Hebrew date components (day, month, year)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getHebrewDateComponents(date: Date): Promise<{
    day: number
    month: number
    year: number
  }> {
    // Ensure date is a Date object (could be string when sent from client)
    const dateObj = date instanceof Date ? date : new Date(date)
    const hDate = new HDate(dateObj)
    return {
      day: hDate.getDate(),
      month: hDate.getMonth(),
      year: hDate.getFullYear()
    }
  }

  /**
   * Compare a Hebrew date with a Gregorian date
   * @param hebrewDay Hebrew day
   * @param hebrewMonth Hebrew month (hebcal month number)
   * @param hebrewYear Hebrew year
   * @param gregorianDate Gregorian date to compare
   * @returns true if Hebrew date is after Gregorian date
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async isHebrewDateAfter(
    hebrewDay: number,
    hebrewMonth: number,
    hebrewYear: number,
    gregorianDate: Date
  ): Promise<boolean> {
    // Ensure date is a Date object (could be string when sent from client)
    const dateObj = gregorianDate instanceof Date ? gregorianDate : new Date(gregorianDate)
    const hDate = new HDate(hebrewDay, hebrewMonth, hebrewYear)
    return hDate.greg() > dateObj
  }

  /**
   * Compare a Hebrew date with a Gregorian date (less than or equal)
   * @param hebrewDay Hebrew day
   * @param hebrewMonth Hebrew month (hebcal month number)
   * @param hebrewYear Hebrew year
   * @param gregorianDate Gregorian date to compare
   * @returns true if Hebrew date is less than or equal to Gregorian date
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async isHebrewDateBeforeOrEqual(
    hebrewDay: number,
    hebrewMonth: number,
    hebrewYear: number,
    gregorianDate: Date
  ): Promise<boolean> {
    // Ensure date is a Date object (could be string when sent from client)
    const dateObj = gregorianDate instanceof Date ? gregorianDate : new Date(gregorianDate)
    const hDate = new HDate(hebrewDay, hebrewMonth, hebrewYear)
    return hDate.greg() <= dateObj
  }

  /**
   * Create a safe Hebrew date with validation
   * Handles Adar I/II in leap/non-leap years correctly
   * Returns the actual day if requested day exceeds month length
   * @param day Hebrew day (1-30)
   * @param month Hebrew month (hebcal month number)
   * @param year Hebrew year
   * @returns Object with the Gregorian date and actual day used
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async createSafeHebrewDate(
    day: number,
    month: number,
    year: number
  ): Promise<{ gregorianDate: Date; actualDay: number } | null> {
    try {
      // Check if this is a leap year
      const testDate = new HDate(1, months.TISHREI, year)
      const isLeapYear = testDate.isLeapYear()

      // Handle Adar months in leap/non-leap years
      let actualMonth = month

      if (month === months.ADAR_II && !isLeapYear) {
        // Adar II requested but year is NOT leap → use Adar I (the only Adar)
        actualMonth = months.ADAR_I
        console.log(`Adjusting Adar II to Adar I for non-leap year ${year}`)
      } else if (month === months.ADAR_I && isLeapYear) {
        // Adar I requested and year IS leap → keep Adar I (user explicitly requested it)
        actualMonth = months.ADAR_I
      }
      // Note: If Adar II requested and year IS leap → keep Adar II
      // Note: If Adar I requested and year is NOT leap → keep Adar I (it's the only Adar)

      // Get actual days in this month for this year
      const monthTestDate = new HDate(1, actualMonth, year)
      const daysInMonth = monthTestDate.daysInMonth()

      // Handle day 30 in 29-day months - use day 29 instead
      const actualDay = Math.min(day, daysInMonth)

      const hDate = new HDate(actualDay, actualMonth, year)
      return {
        gregorianDate: hDate.greg(),
        actualDay: actualDay
      }
    } catch (e) {
      console.error(`Failed to create Hebrew date: ${day}/${month}/${year}`, e)
      return null
    }
  }

  /**
   * Get Gregorian date range for a Hebrew year
   * A Hebrew year starts on 1 Tishrei and ends on 29 Elul
   * @param hebrewYear Hebrew year
   * @returns Object with start and end Gregorian dates
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getHebrewYearDateRange(hebrewYear: number): Promise<{
    startDate: Date
    endDate: Date
  }> {
    // Hebrew year starts on 1 Tishrei
    const startHDate = new HDate(1, months.TISHREI, hebrewYear)

    // Hebrew year ends on 29 Elul of the same Hebrew year
    const endHDate = new HDate(29, months.ELUL, hebrewYear)

    return {
      startDate: startHDate.greg(),
      endDate: endHDate.greg()
    }
  }

  /**
   * Helper method to get Hebrew month name
   */
  private static getHebrewMonthName(month: number, isLeapYear: boolean): string {
    if (isLeapYear) {
      if (month === months.ADAR_I) return 'אדר א\''
      if (month === months.ADAR_II) return 'אדר ב\''
    }

    const monthNames: Record<number, string> = {
      [months.TISHREI]: 'תשרי',
      [months.CHESHVAN]: 'חשון',
      [months.KISLEV]: 'כסלו',
      [months.TEVET]: 'טבת',
      [months.SHVAT]: 'שבט',
      [months.ADAR_I]: 'אדר',
      [months.NISAN]: 'ניסן',
      [months.IYYAR]: 'אייר',
      [months.SIVAN]: 'סיון',
      [months.TAMUZ]: 'תמוז',
      [months.AV]: 'אב',
      [months.ELUL]: 'אלול'
    }

    return monthNames[month] || ''
  }
}
