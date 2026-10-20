import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { remult } from 'remult';
import { User } from '../../shared/entity/user';
import { UserSettingsController } from '../../shared/controllers/user-settings.controller';
import { TriStateFilter } from '../../shared/enum/tri-state-filter';

export interface GlobalFilters {
  campaignIds?: string[];
  donorTypeIds?: string[];
  countryIds?: string[];
  cityIds?: string[];
  neighborhoodIds?: string[];
  targetAudienceIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  searchTerm?: string;
  minDonationCount?: number;  // מספר מינימלי של תרומות (לא סכום!)
  isAnash?: TriStateFilter;  // סינון לפי אנ"ש (ברירת מחדל: All)
  isAlumni?: TriStateFilter;  // סינון לפי תלמידנו (ברירת מחדל: All)
}

const DEFAULT_FILTERS: GlobalFilters = { isAnash: TriStateFilter.All, isAlumni: TriStateFilter.All };

@Injectable({
  providedIn: 'root'
})
export class GlobalFilterService {
  private filtersSubject = new BehaviorSubject<GlobalFilters>(DEFAULT_FILTERS);
  public filters$: Observable<GlobalFilters> = this.filtersSubject.asObservable();

  private userRepo = remult.repo(User);

  /**
   * Key under sessionStorage holding the filters across a RELOAD.
   *
   * sessionStorage lives exactly as long as the tab: it survives F5 and dies
   * with the tab or the browser. That is precisely the distinction the global
   * filters need - "clear when the session ends, keep while the user works".
   */
  private static readonly RELOAD_KEY = 'globalFilters.acrossReload';

  constructor() {
    this.restoreOrLoad();
    // Note: donorIds calculation removed - now done in backend from user.settings
  }

  /**
   * On the way out (tab close OR reload) the app clears the filters on the
   * server and stashes them here. If this was a reload, the copy is still in
   * sessionStorage on the way back in and is put back - so F5 keeps the user
   * exactly where they were. If the tab really closed, sessionStorage went with
   * it and there is nothing to restore, which is the intended outcome.
   */
  stashForReload() {
    try {
      sessionStorage.setItem(
        GlobalFilterService.RELOAD_KEY,
        JSON.stringify(this.filtersSubject.value)
      );
    } catch { /* private mode - the filters simply do not survive the reload */ }
  }

  private async restoreOrLoad() {
    let stashed: GlobalFilters | undefined;
    try {
      const raw = sessionStorage.getItem(GlobalFilterService.RELOAD_KEY);
      if (raw) {
        stashed = JSON.parse(raw) as GlobalFilters;
        // Read once: a later close must not resurrect them.
        sessionStorage.removeItem(GlobalFilterService.RELOAD_KEY);
      }
    } catch { /* unreadable - fall through to the server copy */ }

    if (stashed && Object.keys(stashed).length > 0) {
      this.filtersSubject.next(stashed);
      // The server was cleared on the way out - put the filters back, so the
      // backend filters queries by the same set the bar is showing.
      await this.saveFiltersToUserSettings(stashed);
      return;
    }

    await this.loadFiltersFromUserSettings();
  }

  get currentFilters(): GlobalFilters {
    return this.filtersSubject.value;
  }

  async updateFilter(key: keyof GlobalFilters, value: any) {
console.log(`updateFilter: { key: ${key}, value: ${value} }`)

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

    // ⚠️ Save to DB first, THEN notify subscribers
    // This ensures the backend has the updated filters before reports refresh
    if (await this.saveFiltersToUserSettings(updatedFilters)) this.filtersSubject.next(updatedFilters);
  }

  async updateFilters(filters: Partial<GlobalFilters>) {
    const currentFilters = this.filtersSubject.value;
    let updatedFilters = { ...currentFilters, ...filters };

    // Validate date ranges
    updatedFilters = this.validateDateRange(updatedFilters);

    // Validate amount ranges
    updatedFilters = this.validateAmountRange(updatedFilters);

    // ⚠️ Save to DB first, THEN notify subscribers
    // This ensures the backend has the updated filters before reports refresh
    if (await this.saveFiltersToUserSettings(updatedFilters)) this.filtersSubject.next(updatedFilters);
  }

  async clearFilters() {
    // ⚠️ Save to DB first, THEN notify subscribers
    if (await this.saveFiltersToUserSettings(DEFAULT_FILTERS)) this.filtersSubject.next(DEFAULT_FILTERS);
  }

  async clearFilter(key: keyof GlobalFilters) {
    const currentFilters = this.filtersSubject.value;
    const { [key]: _, ...updatedFilters } = currentFilters;
    // ⚠️ Save to DB first, THEN notify subscribers
    if (await this.saveFiltersToUserSettings(updatedFilters)) this.filtersSubject.next(updatedFilters);
  }

  private async loadFiltersFromUserSettings() {
    try {
      const currentUser = remult.user;
      if (currentUser?.id) {
        const user = await this.userRepo.findId(currentUser.id, { useCache: false });
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

  /**
   * Item 33 - the filters live on the server (user.settings.globalFilters) and
   * the bar is only a mirror of them. Three rules keep the two equal:
   *  1. One key only - UserSettingsController.set reads the row fresh on the
   *     server and replaces globalFilters alone, so no other screen's copy of
   *     the settings can be written back over it (and vice versa).
   *  2. One save at a time - quick changes (remove a chip, then clear) are
   *     queued, so the server cannot end on an older state than the bar.
   *  3. The bar moves only after the server said yes. On failure the bar is
   *     reloaded from the server instead of showing a state that is not real.
   * Returns true when saved; callers notify subscribers only then.
   */
  private saveChain: Promise<unknown> = Promise.resolve();

  private async saveFiltersToUserSettings(filters: GlobalFilters): Promise<boolean> {
    if (!remult.user?.id) return false;
    const run = this.saveChain.then(async () => {
      try {
        await UserSettingsController.set('globalFilters', filters);
        return true;
      } catch (error) {
        console.error('Error saving filters to user settings:', error);
        await this.reloadFromServer();
        return false;
      }
    });
    this.saveChain = run.catch(() => undefined);
    return run;
  }

  /** After a failed save - show what the server actually filters by. */
  private async reloadFromServer() {
    try {
      const user = await this.userRepo.findId(remult.user!.id, { useCache: false });
      const filters = user?.settings?.globalFilters;
      if (filters?.dateFrom) filters.dateFrom = new Date(filters.dateFrom);
      if (filters?.dateTo) filters.dateTo = new Date(filters.dateTo);
      this.filtersSubject.next(filters || DEFAULT_FILTERS);
    } catch (error) {
      console.error('Error reloading filters from user settings:', error);
    }
  }

  // Helper method to apply filters to a query
  // ⚠️ שיטה ישנה - לא בשימוש יותר! השרת מטפל בזה
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
      // Filter by country IDs (UUID)
      where.countryId = { $in: filters.countryIds };
    }

    if (filters.cityIds && filters.cityIds.length > 0) {
      // Filter by city IDs (UUID)
      where.cityId = { $in: filters.cityIds };
    }

    if (filters.neighborhoodIds && filters.neighborhoodIds.length > 0) {
      // Filter by neighborhood IDs (UUID)
      where.neighborhoodId = { $in: filters.neighborhoodIds };
    }

    if (filters.targetAudienceIds && filters.targetAudienceIds.length > 0) {
      where.targetAudienceId = { $in: filters.targetAudienceIds };
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
