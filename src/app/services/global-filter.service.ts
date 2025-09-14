import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { remult } from 'remult';
import { User } from '../../shared/entity/user';

export interface GlobalFilters {
  campaignId?: string;
  donorTypeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  statusFilter?: 'all' | 'active' | 'inactive';
  amountMin?: number;
  amountMax?: number;
  selectedYear?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalFilterService {
  private filtersSubject = new BehaviorSubject<GlobalFilters>({});
  public filters$: Observable<GlobalFilters> = this.filtersSubject.asObservable();
  
  private userRepo = remult.repo(User);
  private storageKey = 'global-filters';
  
  constructor() {
    this.loadFiltersFromStorage();
  }
  
  get currentFilters(): GlobalFilters {
    return this.filtersSubject.value;
  }
  
  updateFilter(key: keyof GlobalFilters, value: any) {
    const currentFilters = this.filtersSubject.value;
    const updatedFilters = { ...currentFilters, [key]: value };
    this.filtersSubject.next(updatedFilters);
    this.saveFiltersToStorage(updatedFilters);
  }
  
  updateFilters(filters: Partial<GlobalFilters>) {
    const currentFilters = this.filtersSubject.value;
    const updatedFilters = { ...currentFilters, ...filters };
    this.filtersSubject.next(updatedFilters);
    this.saveFiltersToStorage(updatedFilters);
  }
  
  clearFilters() {
    this.filtersSubject.next({});
    this.saveFiltersToStorage({});
  }
  
  clearFilter(key: keyof GlobalFilters) {
    const currentFilters = this.filtersSubject.value;
    const { [key]: _, ...updatedFilters } = currentFilters;
    this.filtersSubject.next(updatedFilters);
    this.saveFiltersToStorage(updatedFilters);
  }
  
  private async loadFiltersFromStorage() {
    try {
      // First try to load from user settings if logged in
      const currentUser = remult.user;
      if (currentUser?.id) {
        const user = await this.userRepo.findId(currentUser.id);
        if (user && user.settings?.globalFilters) {
          this.filtersSubject.next(user.settings.globalFilters);
          return;
        }
      }
      
      // Fallback to localStorage
      const storedFilters = localStorage.getItem(this.storageKey);
      if (storedFilters) {
        const filters = JSON.parse(storedFilters);
        // Convert date strings back to Date objects
        if (filters.dateFrom) filters.dateFrom = new Date(filters.dateFrom);
        if (filters.dateTo) filters.dateTo = new Date(filters.dateTo);
        this.filtersSubject.next(filters);
      }
    } catch (error) {
      console.error('Error loading filters from storage:', error);
    }
  }
  
  private async saveFiltersToStorage(filters: GlobalFilters) {
    try {
      // Save to localStorage immediately
      localStorage.setItem(this.storageKey, JSON.stringify(filters));
      
      // Also save to user settings if logged in
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
      console.error('Error saving filters to storage:', error);
    }
  }
  
  // Helper method to apply filters to a query
  applyFiltersToQuery(query: any): any {
    const filters = this.currentFilters;
    const where: any = { ...query.where };
    
    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }
    
    if (filters.donorTypeId) {
      where.donorTypeId = filters.donorTypeId;
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
    
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      where.isActive = filters.statusFilter === 'active';
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
    
    if (filters.selectedYear) {
      const yearStart = new Date(filters.selectedYear, 0, 1);
      const yearEnd = new Date(filters.selectedYear, 11, 31, 23, 59, 59);
      where.donationDate = {
        $gte: yearStart,
        $lte: yearEnd
      };
    }
    
    return { ...query, where };
  }
}