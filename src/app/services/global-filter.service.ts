import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { remult } from 'remult';
import { User } from '../../shared/entity/user';

export interface GlobalFilters {
  campaignIds?: string[];
  donorTypeIds?: string[];
  countryIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalFilterService {
  private filtersSubject = new BehaviorSubject<GlobalFilters>({});
  public filters$: Observable<GlobalFilters> = this.filtersSubject.asObservable();
  
  private userRepo = remult.repo(User);
  
  constructor() {
    this.loadFiltersFromUserSettings();
  }
  
  get currentFilters(): GlobalFilters {
    return this.filtersSubject.value;
  }
  
  updateFilter(key: keyof GlobalFilters, value: any) {
    const currentFilters = this.filtersSubject.value;
    let updatedFilters = { ...currentFilters, [key]: value };

    // Validate date ranges
    if (key === 'dateFrom' || key === 'dateTo') {
      updatedFilters = this.validateDateRange(updatedFilters);
    }

    // Validate amount ranges
    if (key === 'amountMin' || key === 'amountMax') {
      updatedFilters = this.validateAmountRange(updatedFilters);
    }

    this.filtersSubject.next(updatedFilters);
    this.saveFiltersToUserSettings(updatedFilters);
  }
  
  updateFilters(filters: Partial<GlobalFilters>) {
    const currentFilters = this.filtersSubject.value;
    let updatedFilters = { ...currentFilters, ...filters };

    // Validate date ranges
    updatedFilters = this.validateDateRange(updatedFilters);

    // Validate amount ranges
    updatedFilters = this.validateAmountRange(updatedFilters);

    this.filtersSubject.next(updatedFilters);
    this.saveFiltersToUserSettings(updatedFilters);
  }
  
  clearFilters() {
    this.filtersSubject.next({});
    this.saveFiltersToUserSettings({});
  }

  clearFilter(key: keyof GlobalFilters) {
    const currentFilters = this.filtersSubject.value;
    const { [key]: _, ...updatedFilters } = currentFilters;
    this.filtersSubject.next(updatedFilters);
    this.saveFiltersToUserSettings(updatedFilters);
  }
  
  private async loadFiltersFromUserSettings() {
    try {
      const currentUser = remult.user;
      if (currentUser?.id) {
        const user = await this.userRepo.findId(currentUser.id);
        if (user && user.settings?.globalFilters) {
          const filters = user.settings.globalFilters;
          // Convert date strings back to Date objects
          if (filters.dateFrom) filters.dateFrom = new Date(filters.dateFrom);
          if (filters.dateTo) filters.dateTo = new Date(filters.dateTo);
          this.filtersSubject.next(filters);
        }
      }
    } catch (error) {
      console.error('Error loading filters from user settings:', error);
    }
  }
  
  private async saveFiltersToUserSettings(filters: GlobalFilters) {
    try {
      const currentUser = remult.user;
      if (currentUser?.id) {
        const user = await this.userRepo.findId(currentUser.id);
        if (user) {
          if (!user.settings) {
            user.settings = {
              openModal: 'dialog',
              calendar_heb_holidays_jews_enabled: false,
              calendar_open_heb_and_eng_parallel: false
            };
          }
          user.settings.globalFilters = filters;
          await user.save();
        }
      }
    } catch (error) {
      console.error('Error saving filters to user settings:', error);
    }
  }
  
  // Helper method to apply filters to a query
  applyFiltersToQuery(query: any): any {
    const filters = this.currentFilters;
    const where: any = { ...query.where };

    if (filters.campaignIds && filters.campaignIds.length > 0) {
      where.campaignId = { $in: filters.campaignIds };
    }

    if (filters.donorTypeIds && filters.donorTypeIds.length > 0) {
      where.donorTypeId = { $in: filters.donorTypeIds };
    }

    if (filters.countryIds && filters.countryIds.length > 0) {
      where.countryId = { $in: filters.countryIds };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.donationDate = {};
      if (filters.dateFrom) {
        where.donationDate.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.donationDate.$lte = filters.dateTo;
      }
    }

    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      where.amount = {};
      if (filters.amountMin !== undefined) {
        where.amount.$gte = filters.amountMin;
      }
      if (filters.amountMax !== undefined) {
        where.amount.$lte = filters.amountMax;
      }
    }

    return { ...query, where };
  }

  private validateDateRange(filters: GlobalFilters): GlobalFilters {
    if (filters.dateFrom && filters.dateTo) {
      if (filters.dateFrom > filters.dateTo) {
        // If dateFrom is greater than dateTo, set dateTo to dateFrom
        filters.dateTo = new Date(filters.dateFrom);
      }
    }
    return filters;
  }

  private validateAmountRange(filters: GlobalFilters): GlobalFilters {
    if (filters.amountMin !== undefined && filters.amountMax !== undefined) {
      if (filters.amountMin > filters.amountMax) {
        // If amountMin is greater than amountMax, swap them
        const temp = filters.amountMin;
        filters.amountMin = filters.amountMax;
        filters.amountMax = temp;
      }
    }
    return filters;
  }
}