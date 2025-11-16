import { BackendMethod, Allow, remult } from 'remult'
import { Reminder } from '../entity/reminder'
import { HebrewDateController } from './hebrew-date.controller'
import { GlobalFilters } from '../../app/services/global-filter.service'
import { DonorController } from './donor.controller'

/**
 * Controller for handling Hebrew reminder calculations
 * Uses HebrewDateController for all Hebrew date operations
 */
export class ReminderController {
  /**
   * Find reminders with filters, pagination, and sorting
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async findFilteredReminders(
    filters: {
      dateFrom?: Date
      dateTo?: Date
      searchTerm?: string
      reminderType?: string
      donorSearch?: string
    } = {},
    page: number = 1,
    pageSize: number = 50,
    sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = []
  ): Promise<Reminder[]> {
    console.log('ReminderController.findFilteredReminders');

    const where = await ReminderController.buildWhereClause(filters)

    // Build orderBy clause
    const orderBy: any = {}
    if (sortColumns.length > 0) {
      for (const sort of sortColumns) {
        orderBy[sort.field] = sort.direction
      }
    } else {
      // Default sort
      orderBy.dueDate = 'asc'
      orderBy.dueTime = 'asc'
    }

    // Apply pagination
    const skip = (page - 1) * pageSize

    return await remult.repo(Reminder).find({
      where,
      orderBy,
      limit: pageSize,
      page: skip,
      include: { donor: true }
    })
  }

  /**
   * Count reminders with filters
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async countFilteredReminders(
    filters: {
      dateFrom?: Date
      dateTo?: Date
      searchTerm?: string
      reminderType?: string
      donorSearch?: string
    } = {}
  ): Promise<number> {
    const where = await ReminderController.buildWhereClause(filters)
    return await remult.repo(Reminder).count(where)
  }

  /**
   * Get summary statistics for filtered reminders
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getSummaryForFilteredReminders(
    filters: {
      dateFrom?: Date
      dateTo?: Date
      searchTerm?: string
      reminderType?: string
      donorSearch?: string
    } = {}
  ): Promise<{
    todayCount: number
    pendingCount: number
    overdueCount: number
    completedThisMonthCount: number
  }> {
    const where = await ReminderController.buildWhereClause(filters)
    const reminders = await remult.repo(Reminder).find({ where, include: { donor: true } })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    return {
      todayCount: reminders.filter(r => {
        const dueDate = new Date(r.nextReminderDate!)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate.getTime() === today.getTime() && !r.isCompleted
      }).length,
      pendingCount: reminders.filter(r => !r.isCompleted).length,
      overdueCount: reminders.filter(r => {
        const dueDate = new Date(r.nextReminderDate!)
        return dueDate < today && !r.isCompleted
      }).length,
      completedThisMonthCount: reminders.filter(r => {
        if (!r.isCompleted || !r.completedDate) return false
        const completedDate = new Date(r.completedDate)
        return completedDate >= startOfMonth && completedDate <= today
      }).length
    }
  }

  /**
   * Build where clause for filtering reminders
   */
  private static async buildWhereClause(
    filters: {
      dateFrom?: Date
      dateTo?: Date
      searchTerm?: string
      reminderType?: string
      donorSearch?: string
    } = {}
  ): Promise<any> {
    const where: any = { isActive: true }

    // 🎯 Fetch global filters from user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    // Apply reminder type filter
    if (filters.reminderType && filters.reminderType.trim() !== '') {
      where.type = filters.reminderType
    }

    // Apply global filters - get filtered donor IDs
    if (globalFilters) {
      const donors = await DonorController.findFilteredDonors()
      const filteredDonorIds = donors.map(d => d.id)

      if (filteredDonorIds.length === 0) {
        // No matching donors, but still show reminders without donor
        where.donorId = null
      } else {
        // Filter reminders by donor IDs OR reminders without donor
        where.$or = [
          { donorId: { $in: filteredDonorIds } },
          { donorId: null }
        ]
      }
    }

    // Donor search filter
    if (filters.donorSearch && filters.donorSearch.trim() !== '') {
      const searchLower = filters.donorSearch.toLowerCase().trim()
      const Donor = (await import('../entity/donor')).Donor

      const matchingDonors = await remult.repo(Donor).find({
        where: {
          $or: [
            { firstName: { $contains: searchLower } },
            { lastName: { $contains: searchLower } }
          ]
        }
      })

      const donorIds = matchingDonors.map(d => d.id)

      if (donorIds.length === 0) {
        // No matching donors found
        where.donorId = null // This will return no reminders
      } else {
        // Combine with existing donor filter if exists
        if (where.$or) {
          // Already have donor filter from global filters
          where.$and = [
            { $or: where.$or },
            { donorId: { $in: donorIds } }
          ]
          delete where.$or
        } else {
          where.donorId = { $in: donorIds }
        }
      }
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.dueDate = {}
      if (filters.dateFrom) {
        where.dueDate.$gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.dueDate.$lte = filters.dateTo
      }
    }

    // Search term filter
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const searchLower = filters.searchTerm.toLowerCase().trim()
      where.$or = [
        { title: { $contains: searchLower } },
        { description: { $contains: searchLower } }
      ]
    }

    return where
  }

  /**
   * Calculate next reminder date for all reminders (recurring and one-time)
   * @param reminderData Reminder configuration
   * @returns Next occurrence date (Gregorian)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async calculateNextReminderDate(reminderData: {
    isRecurring: boolean
    recurringPattern: 'daily' | 'weekly' | 'monthly' | 'yearly'
    dueDate: Date
    dueTime?: string
    recurringWeekDay?: number
    recurringDayOfMonth?: number
    recurringMonth?: number
    yearlyRecurringType?: 'date' | 'occasion'
    specialOccasion?: string
  }): Promise<Date | undefined> {
    // For one-time reminders, nextReminderDate = dueDate + dueTime
    if (!reminderData.isRecurring) {
      const nextDate = new Date(reminderData.dueDate)

      // Add time if specified
      if (reminderData.dueTime) {
        const [hours, minutes] = reminderData.dueTime.split(':').map(Number)
        nextDate.setHours(hours, minutes, 0, 0)
      } else {
        nextDate.setHours(10, 0, 0, 0) // Default time 10:00
      }

      return nextDate
    }

    // For recurring reminders, calculate next occurrence from NOW
    const baseDate = new Date() // Always calculate from current time
    const nextDate = new Date(baseDate)

    switch (reminderData.recurringPattern) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1)
        break

      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7)
        // If specific weekday is set, adjust to that day
        if (reminderData.recurringWeekDay !== undefined) {
          const currentDay = nextDate.getDay()
          const targetDay = reminderData.recurringWeekDay
          const daysToAdd = (targetDay - currentDay + 7) % 7
          if (daysToAdd === 0 && currentDay === targetDay) {
            // If it's the same day, move to next week
            nextDate.setDate(nextDate.getDate() + 7)
          } else {
            nextDate.setDate(nextDate.getDate() + daysToAdd)
          }
        }
        break

      case 'monthly':
        // Use Hebrew calendar for monthly calculations
        if (reminderData.recurringDayOfMonth !== undefined) {
          const hebrewNextDate = await ReminderController.calculateNextHebrewMonthlyReminder(
            reminderData.recurringDayOfMonth,
            baseDate
          )
          // Add dueTime to Hebrew date
          if (reminderData.dueTime) {
            const [hours, minutes] = reminderData.dueTime.split(':').map(Number)
            hebrewNextDate.setHours(hours, minutes, 0, 0)
          } else {
            hebrewNextDate.setHours(10, 0, 0, 0)
          }
          return hebrewNextDate
        }
        // Fallback to Gregorian
        nextDate.setMonth(nextDate.getMonth() + 1)
        break

      case 'yearly':
        // Use Hebrew calendar for yearly calculations
        if (reminderData.yearlyRecurringType === 'occasion') {
          // Calculate next occurrence of special occasion (holiday)
          if (reminderData.specialOccasion) {
            const occasionDate = await ReminderController.calculateNextSpecialOccasion(
              reminderData.specialOccasion,
              baseDate
            )
            // Add dueTime to occasion date
            if (reminderData.dueTime) {
              const [hours, minutes] = reminderData.dueTime.split(':').map(Number)
              occasionDate.setHours(hours, minutes, 0, 0)
            } else {
              occasionDate.setHours(10, 0, 0, 0)
            }
            return occasionDate
          }
        } else if (
          reminderData.yearlyRecurringType === 'date' &&
          reminderData.recurringMonth !== undefined &&
          reminderData.recurringDayOfMonth !== undefined
        ) {
          const yearlyDate = await ReminderController.calculateNextHebrewYearlyReminder(
            reminderData.recurringMonth,
            reminderData.recurringDayOfMonth,
            baseDate
          )
          // Add dueTime to yearly date
          if (reminderData.dueTime) {
            const [hours, minutes] = reminderData.dueTime.split(':').map(Number)
            yearlyDate.setHours(hours, minutes, 0, 0)
          } else {
            yearlyDate.setHours(10, 0, 0, 0)
          }
          return yearlyDate
        }
        // Fallback to Gregorian
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break

      default:
        return undefined
    }

    // Add dueTime to the calculated next date
    if (reminderData.dueTime) {
      const [hours, minutes] = reminderData.dueTime.split(':').map(Number)
      nextDate.setHours(hours, minutes, 0, 0)
    } else {
      nextDate.setHours(10, 0, 0, 0) // Default time 10:00
    }

    return nextDate
  }

  /**
   * Calculate next reminder date for Hebrew yearly recurring reminders
   * @param hebrewMonth Internal month number (1-13)
   * @param hebrewDay Day of month (1-30)
   * @param currentDate Current date to calculate from
   * @returns Next occurrence as Gregorian Date
   */
  private static async calculateNextHebrewYearlyReminder(
    hebrewMonth: number,
    hebrewDay: number,
    currentDate: Date
  ): Promise<Date> {
    const currentHebDate = await HebrewDateController.getHebrewDateComponents(currentDate)
    let targetYear = currentHebDate.year

    // Convert internal month to hebcal month
    const hebcalMonth = await ReminderController.internalToHebcalMonth(hebrewMonth)
    if (!hebcalMonth) {
      throw new Error(`Invalid Hebrew month: ${hebrewMonth}`)
    }

    // Check if we need to move to next year
    const targetDateCheck = await HebrewDateController.createSafeHebrewDate(hebrewDay, hebcalMonth, targetYear)

    if (!targetDateCheck || targetDateCheck.gregorianDate <= currentDate) {
      // Move to next year
      targetYear++
    }

    // Create date for next year and handle edge cases
    const nextDate = await HebrewDateController.createSafeHebrewDate(hebrewDay, hebcalMonth, targetYear)
    if (!nextDate) {
      throw new Error(`Failed to create Hebrew date for ${hebrewDay}/${hebrewMonth}/${targetYear}`)
    }

    return nextDate.gregorianDate
  }

  /**
   * Calculate next occurrence of a Hebrew monthly reminder
   * @param hebrewDay Day of month (1-30)
   * @param currentDate Current date to calculate from
   * @returns Next occurrence as Gregorian Date
   */
  private static async calculateNextHebrewMonthlyReminder(
    hebrewDay: number,
    currentDate: Date
  ): Promise<Date> {
    const currentHebDate = await HebrewDateController.getHebrewDateComponents(currentDate)
    let targetMonth = currentHebDate.month
    let targetYear = currentHebDate.year

    // Get days in current month to handle cases where requested day doesn't exist
    const daysInCurrentMonth = await HebrewDateController.getDaysInMonth(targetMonth, targetYear)

    // Check if we need to move to next month
    // If requested day 30 but current month only has 29 days (like כט), move to next month
    // OR if we're already past the requested day in current month
    if (currentHebDate.day >= hebrewDay || hebrewDay > daysInCurrentMonth) {
      // Move to next Hebrew month
      targetMonth++
      if (targetMonth > 13) {
        targetMonth = 1
        targetYear++
      }
    }

    // Create date for next occurrence
    // createSafeHebrewDate will adjust day 30 to day 29 if target month only has 29 days
    const nextDate = await HebrewDateController.createSafeHebrewDate(hebrewDay, targetMonth, targetYear)
    if (!nextDate) {
      throw new Error(`Failed to create Hebrew date for monthly reminder`)
    }

    return nextDate.gregorianDate
  }


  /**
   * Convert internal month numbering (1-13) to hebcal month numbers
   * @param internalMonth Internal month number
   * @returns Hebcal month number
   */
  private static async internalToHebcalMonth(internalMonth: number): Promise<number | null> {
    const monthConstants = await HebrewDateController.getMonthConstants()

    const mapping: { [key: number]: number } = {
      1: monthConstants['TISHREI'],   // תשרי
      2: monthConstants['CHESHVAN'],  // חשון
      3: monthConstants['KISLEV'],    // כסלו
      4: monthConstants['TEVET'],     // טבת
      5: monthConstants['SHVAT'],     // שבט
      6: monthConstants['ADAR_I'],    // אדר / אדר א'
      7: monthConstants['ADAR_II'],   // אדר ב'
      8: monthConstants['NISAN'],     // ניסן
      9: monthConstants['IYYAR'],     // אייר
      10: monthConstants['SIVAN'],    // סיון
      11: monthConstants['TAMUZ'],    // תמוז
      12: monthConstants['AV'],       // אב
      13: monthConstants['ELUL']      // אלול
    }

    return mapping[internalMonth] || null
  }


  /**
   * Calculate next Purim date (handles leap years automatically)
   * @param currentDate Current date
   * @returns Next Purim date
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async calculateNextPurim(currentDate: Date): Promise<Date> {
    const currentHebDate = await HebrewDateController.getHebrewDateComponents(currentDate)
    let targetYear = currentHebDate.year

    // Purim is always on 14 Adar (Adar II in leap years)
    const purimMonth = await HebrewDateController.getAdarMonth(targetYear, true)

    // Check if Purim already passed this year
    const isPurimBeforeOrEqual = await HebrewDateController.isHebrewDateBeforeOrEqual(14, purimMonth, targetYear, currentDate)
    if (isPurimBeforeOrEqual) {
      // Move to next year
      targetYear++
    }

    // Calculate for target year
    const purimMonthNext = await HebrewDateController.getAdarMonth(targetYear, true)
    const purimDate = await HebrewDateController.convertHebrewToGregorian(14, purimMonthNext, targetYear)
    return purimDate
  }

  /**
   * Find active reminders (for notifications/alerts)
   * Filters by nextReminderDate <= today
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async findActiveReminders(): Promise<Reminder[]> {
    console.log('ReminderController.findActiveReminders');
    const reminderRepo = remult.repo(Reminder)

    // 🎯 Fetch global filters from user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters | undefined = undefined;
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters;
    }

    // Build where clause
    const where: any = {
      isActive: true,
      isCompleted: false
    }

    // Apply global filters - get filtered donor IDs
    if (globalFilters && (globalFilters.countryIds?.length || globalFilters.cityIds?.length ||
        globalFilters.neighborhoodIds?.length || globalFilters.campaignIds?.length ||
        globalFilters.targetAudienceIds?.length)) {
      const donors = await DonorController.findFilteredDonors()
      const filteredDonorIds = donors.map(d => d.id)

      if (filteredDonorIds.length === 0) {
        return [] // No matching donors, return empty reminders
      }

      // Filter reminders by donor IDs
      where.donorId = { $in: filteredDonorIds }
    }

    // Filter by nextReminderDate <= today
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    where.nextReminderDate = { $lte: today }

    return await reminderRepo.find({
      where,
      orderBy: {
        priority: 'asc',
        nextReminderDate: 'asc'
      },
      include: {
        donor: true,
        assignedTo: true
      }
    })
  }

  /**
   * Calculate next occurrence of a special occasion (holiday)
   * @param occasionName Name of the holiday in Hebrew
   * @param currentDate Current date to calculate from
   * @returns Next occurrence as Gregorian Date
   */
  private static async calculateNextSpecialOccasion(
    occasionName: string,
    currentDate: Date
  ): Promise<Date> {
    const currentHebDate = await HebrewDateController.getHebrewDateComponents(currentDate)
    let targetYear = currentHebDate.year

    // Get month constants
    const monthConstants = await HebrewDateController.getMonthConstants()

    // Map of occasion names to their Hebrew dates
    // Format: [month, day] where month is hebcal month number
    const occasionDates: { [key: string]: { month: number, day: number, useAdar?: boolean } } = {
      'ראש השנה': { month: monthConstants['TISHREI'], day: 1 },
      'ראש השנה ב\'': { month: monthConstants['TISHREI'], day: 2 },
      'צום גדליה': { month: monthConstants['TISHREI'], day: 3 },
      'יום כיפור': { month: monthConstants['TISHREI'], day: 10 },
      'סוכות': { month: monthConstants['TISHREI'], day: 15 },
      'חוה"מ סוכות': { month: monthConstants['TISHREI'], day: 16 }, // First day of Chol HaMoed
      'הוש"ר': { month: monthConstants['TISHREI'], day: 21 }, // Hoshana Rabba
      'שמ"ע/שמח"ת': { month: monthConstants['TISHREI'], day: 22 }, // Shemini Atzeret / Simchat Torah
      'חנוכה': { month: monthConstants['KISLEV'], day: 25 },
      'צום עשרה בטבת': { month: monthConstants['TEVET'], day: 10 },
      'ט"ו בשבט': { month: monthConstants['SHVAT'], day: 15 },
      'תענית אסתר': { month: 0, day: 13, useAdar: true }, // 13 Adar (or Adar II in leap year)
      'פורים': { month: 0, day: 14, useAdar: true }, // 14 Adar (or Adar II in leap year)
      'שושן פורים': { month: 0, day: 15, useAdar: true }, // 15 Adar (or Adar II in leap year)
      'פסח': { month: monthConstants['NISAN'], day: 15 },
      'חוה"מ פסח': { month: monthConstants['NISAN'], day: 16 }, // First day of Chol HaMoed
      'שביעי פסח': { month: monthConstants['NISAN'], day: 21 },
      'יום השואה': { month: monthConstants['NISAN'], day: 27 },
      'יום הזיכרון': { month: monthConstants['IYYAR'], day: 4 },
      'יום העצמאות': { month: monthConstants['IYYAR'], day: 5 },
      'פסח שני': { month: monthConstants['IYYAR'], day: 14 },
      'ל"ג בעומר': { month: monthConstants['IYYAR'], day: 18 },
      'יום ירושלים': { month: monthConstants['IYYAR'], day: 28 },
      'שבועות': { month: monthConstants['SIVAN'], day: 6 },
      'צום יז\' בתמוז': { month: monthConstants['TAMUZ'], day: 17 },
      'תשעה באב': { month: monthConstants['AV'], day: 9 },
      'ט"ו באב': { month: monthConstants['AV'], day: 15 }
    }

    const occasionInfo = occasionDates[occasionName]
    if (!occasionInfo) {
      // If occasion not found, fallback to one year from now
      const fallback = new Date(currentDate)
      fallback.setFullYear(fallback.getFullYear() + 1)
      return fallback
    }

    let occasionMonth = occasionInfo.month

    // Handle Adar-based holidays (need to check for leap year)
    if (occasionInfo.useAdar) {
      occasionMonth = await HebrewDateController.getAdarMonth(targetYear, true)
    }

    // Check if occasion already passed this year
    const isOccasionBeforeOrEqual = await HebrewDateController.isHebrewDateBeforeOrEqual(
      occasionInfo.day,
      occasionMonth,
      targetYear,
      currentDate
    )

    if (isOccasionBeforeOrEqual) {
      // Move to next year
      targetYear++

      // Recalculate month for next year (important for Adar-based holidays)
      if (occasionInfo.useAdar) {
        occasionMonth = await HebrewDateController.getAdarMonth(targetYear, true)
      }
    }

    // Create date for next occurrence
    return await HebrewDateController.convertHebrewToGregorian(occasionInfo.day, occasionMonth, targetYear)
  }
}
