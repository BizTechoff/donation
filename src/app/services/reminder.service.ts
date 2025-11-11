import { Injectable } from '@angular/core';
import { Reminder } from '../../shared/entity';
import { ReminderController } from '../../shared/controllers/reminder.controller';
import { HebrewDateController } from '../../shared/controllers/hebrew-date.controller';
import { GlobalFilters } from './global-filter.service';

/**
 * Service for reminder calculations on the client side
 * Wraps ReminderController backend methods
 */
@Injectable({
  providedIn: 'root'
})
export class ReminderService {
  /**
   * Find reminders with filters, pagination, and sorting
   */
  async findFiltered(
    filters: {
      globalFilters?: GlobalFilters
      dateFrom?: Date
      dateTo?: Date
      searchTerm?: string
    } = {},
    page: number = 1,
    pageSize: number = 50,
    sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = []
  ): Promise<Reminder[]> {
    return await ReminderController.findFilteredReminders(filters, page, pageSize, sortColumns);
  }

  /**
   * Count reminders with filters
   */
  async countFiltered(
    filters: {
      globalFilters?: GlobalFilters
      dateFrom?: Date
      dateTo?: Date
      searchTerm?: string
    } = {}
  ): Promise<number> {
    return await ReminderController.countFilteredReminders(filters);
  }

  /**
   * Calculate next reminder date for recurring reminders
   */
  async calculateNextReminderDate(reminderData: {
    isRecurring: boolean
    recurringPattern: 'daily' | 'weekly' | 'monthly' | 'yearly'
    dueDate: Date
    completedDate?: Date
    recurringWeekDay?: number
    recurringDayOfMonth?: number
    recurringMonth?: number
    yearlyRecurringType?: 'date' | 'occasion'
    specialOccasion?: string
  }): Promise<Date | undefined> {
    return await ReminderController.calculateNextReminderDate(reminderData);
  }

  /**
   * Check if a Hebrew year is a leap year
   */
  async isHebrewLeapYear(year: number): Promise<boolean> {
    return await HebrewDateController.isLeapYear(year);
  }

  /**
   * Get the correct Adar month for a given year (handles leap years)
   */
  async getAdarMonth(year: number, preferSecond: boolean = true): Promise<number> {
    return await HebrewDateController.getAdarMonth(year, preferSecond);
  }

  /**
   * Calculate next Purim date (handles leap years automatically)
   */
  async calculateNextPurim(currentDate: Date): Promise<Date> {
    return await ReminderController.calculateNextPurim(currentDate);
  }
}
