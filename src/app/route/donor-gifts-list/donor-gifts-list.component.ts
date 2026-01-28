import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { remult } from 'remult';
import { DonorGift, Donor, Gift, Reminder } from '../../../shared/entity';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';
import { GlobalFilterService } from '../../services/global-filter.service';
import { BusyService } from '../../common-ui-elements/src/angular/wait/busy-service';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { DonorGiftController, DonorGiftFilters } from '../../../shared/controllers/donor-gift.controller';
import { openDialog } from 'common-ui-elements';
import { DonorGiftDetailsModalComponent } from '../../routes/modals/donor-gift-details-modal/donor-gift-details-modal.component';
import { GiftCatalogModalComponent } from '../../routes/modals/gift-catalog-modal/gift-catalog-modal.component';

@Component({
  selector: 'app-donor-gifts-list',
  templateUrl: './donor-gifts-list.component.html',
  styleUrls: ['./donor-gifts-list.component.scss']
})
export class DonorGiftsListComponent implements OnInit, OnDestroy {

  donorGifts: DonorGift[] = [];
  selectedDonor?: Donor;
  gifts: Gift[] = [];
  reminderMap = new Map<string, string>(); // donorGiftId -> reminderId

  donorGiftRepo = remult.repo(DonorGift);
  donorRepo = remult.repo(Donor);
  giftRepo = remult.repo(Gift);

  loading = false;
  private subscriptions = new Subscription();
  private filterTimeout: any;

  // Local filters
  selectedDonorId = '';
  selectedGiftId = '';
  selectedYear = '';
  searchDonorName = '';

  years: number[] = [];
  hebrewYearLabels: { [key: number]: string } = {};

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;
  Math = Math;

  // Sorting
  sortColumns: Array<{ field: string; direction: 'asc' | 'desc' }> = [];

  // Stats
  deliveredCount = 0;
  pendingCount = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private globalFilterService: GlobalFilterService,
    private busy: BusyService,
    private hebrewDateService: HebrewDateService
  ) {}

  async ngOnInit() {
    await this.loadBase();

    // Subscribe to global filter changes
    this.subscriptions.add(
      this.globalFilterService.filters$.subscribe(() => {
        this.refreshData();
      })
    );

    await this.refreshData();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
  }

  /**
   * Load base data once - called only on component initialization
   */
  private async loadBase() {
    await this.loadGifts();
    this.generateYearsList();
  }

  /**
   * Refresh data based on current filters and sorting
   * Called whenever filters or sorting changes
   */
  private async refreshData() {
    this.loading = true;
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Build local filters
        const localFilters: DonorGiftFilters = {
          searchDonorName: this.searchDonorName?.trim() || undefined,
          selectedDonorId: this.selectedDonorId?.trim() || undefined,
          selectedGiftId: this.selectedGiftId?.trim() || undefined,
          selectedYear: this.selectedYear?.trim() || undefined
        };

        // console.log('refreshData: Fetching donor gifts with localFilters:', localFilters, 'page:', this.currentPage, 'sorting:', this.sortColumns);

        // Get total count, stats, and donor gifts from server
        // Global filters are fetched from user.settings in the backend
        const [count, stats, gifts] = await Promise.all([
          DonorGiftController.countFilteredDonorGifts(localFilters),
          DonorGiftController.getStats(localFilters),
          DonorGiftController.findFilteredDonorGifts(localFilters, this.currentPage, this.pageSize, this.sortColumns)
        ]);

        this.totalCount = count;
        this.deliveredCount = stats.deliveredCount;
        this.pendingCount = stats.pendingCount;
        this.donorGifts = gifts;

        this.totalPages = Math.ceil(this.totalCount / this.pageSize);

        // Load reminders for current page
        await this.loadReminders();

        console.log('refreshData 2: Loaded', this.donorGifts.length, 'donor gifts, total:', this.totalCount);

      } catch (error) {
        console.error('Error refreshing donor gifts:', error);
        this.donorGifts = [];
        this.totalCount = 0;
        this.totalPages = 0;
        this.deliveredCount = 0;
        this.pendingCount = 0;
      } finally {
        this.loading = false;
      }
    });
  }

  async openDonorSelectionModal() {
    try {
      const { openDialog } = await import('common-ui-elements');
      const { DonorSelectionModalComponent } = await import('../../routes/modals/donor-selection-modal/donor-selection-modal.component');

      const selectedDonor = await openDialog(
        DonorSelectionModalComponent,
        (modal: any) => {
          modal.args = {
            title: 'בחירת תורם לפילטר',
            multiSelect: false
          };
        }
      ) as Donor | null;

      if (selectedDonor) {
        this.selectedDonor = selectedDonor;
        this.selectedDonorId = selectedDonor.id;
        this.applyFilters();
      }
    } catch (error) {
      console.error('Error opening donor selection modal:', error);
      this.ui.error('שגיאה בפתיחת חלון בחירת תורם');
    }
  }

  clearDonorFilter() {
    this.selectedDonor = undefined;
    this.selectedDonorId = '';
    this.applyFilters();
  }

  async loadGifts() {
    this.gifts = await this.giftRepo.find({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async generateYearsList() {
    const currentHebrewYear = this.hebrewDateService.getCurrentHebrewYear();
    this.years = [];
    this.hebrewYearLabels = {};
    for (let i = currentHebrewYear; i >= currentHebrewYear - 10; i--) {
      this.years.push(i);
      // Get formatted Hebrew year label
      const label = await this.hebrewDateService.formatHebrewYear(i);
      this.hebrewYearLabels[i] = label;
    }
  }

  applyFilters() {
    // Clear any existing timeout
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }

    // Set a new timeout to reload data after user stops typing/changing filters
    this.filterTimeout = setTimeout(() => {
      console.log('Filter changed, reloading donor gifts');
      this.currentPage = 1; // Reset to first page when filters change
      this.refreshData();
    }, 300); // 300ms debounce
  }

  clearFilters() {
    this.selectedDonorId = '';
    this.selectedGiftId = '';
    this.selectedYear = '';
    this.searchDonorName = '';
    this.currentPage = 1;
    this.refreshData();
  }

  // Sorting methods
  toggleSort(field: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
      // CTRL/CMD pressed - multi-column sort
      const existingIndex = this.sortColumns.findIndex(s => s.field === field);
      if (existingIndex >= 0) {
        // Toggle direction or remove
        const current = this.sortColumns[existingIndex];
        if (current.direction === 'asc') {
          this.sortColumns[existingIndex].direction = 'desc';
        } else {
          // Remove from sort
          this.sortColumns.splice(existingIndex, 1);
        }
      } else {
        // Add new sort column
        this.sortColumns.push({ field, direction: 'asc' });
      }
    } else {
      // Single column sort
      const existingSort = this.sortColumns.find(s => s.field === field);
      if (existingSort && this.sortColumns.length === 1) {
        // Toggle direction
        existingSort.direction = existingSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        // Set as only sort column
        this.sortColumns = [{ field, direction: 'asc' }];
      }
    }

    this.refreshData();
  }

  isSorted(field: string): boolean {
    return this.sortColumns.some(s => s.field === field);
  }

  getSortIcon(field: string): string {
    const sortIndex = this.sortColumns.findIndex(s => s.field === field);
    if (sortIndex === -1) return '';

    const sort = this.sortColumns[sortIndex];
    const arrow = sort.direction === 'asc' ? '↑' : '↓';

    // Show number if multiple sorts
    if (this.sortColumns.length > 1) {
      return `${arrow}${sortIndex + 1}`;
    }
    return arrow;
  }

  // Pagination methods
  async firstPage() {
    if (this.currentPage !== 1) {
      this.currentPage = 1;
      await this.refreshData();
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.refreshData();
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.refreshData();
    }
  }

  async lastPage() {
    if (this.currentPage !== this.totalPages) {
      this.currentPage = this.totalPages;
      await this.refreshData();
    }
  }

  async goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      await this.refreshData();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 7;
    const halfWindow = Math.floor(maxPagesToShow / 2);

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, this.currentPage - halfWindow);
      let endPage = Math.min(this.totalPages, this.currentPage + halfWindow);

      if (this.currentPage - halfWindow < 1) {
        endPage = Math.min(this.totalPages, endPage + (halfWindow - this.currentPage + 1));
      }

      if (this.currentPage + halfWindow > this.totalPages) {
        startPage = Math.max(1, startPage - (this.currentPage + halfWindow - this.totalPages));
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push(-1);
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) {
          pages.push(-1);
        }
        pages.push(this.totalPages);
      }
    }

    return pages;
  }

  async manageGiftCatalog() {
    await openDialog(GiftCatalogModalComponent, () => {});
    // Reload gifts in case any were added/edited/deleted
    await this.loadGifts();
  }

  async createDonorGift() {
    const result = await openDialog(DonorGiftDetailsModalComponent, (it) => {
      it.args = { donorGiftId: 'new' };
    });

    if (result) {
      await this.refreshData();
    }
  }

  async editDonorGift(donorGift: DonorGift) {
    const result = await openDialog(DonorGiftDetailsModalComponent, (it) => {
      it.args = { donorGiftId: donorGift.id };
    });

    if (result) {
      await this.refreshData();
    }
  }

  async deleteDonorGift(donorGift: DonorGift) {
    const confirmed = await this.ui.yesNoQuestion(
      `האם למחוק את המתנה "${donorGift.gift?.name}" לתורם "${donorGift.donor?.firstName} ${donorGift.donor?.lastName}"?`
    );

    if (confirmed) {
      try {
        await this.donorGiftRepo.delete(donorGift);
        await this.refreshData();
        this.ui.info('המתנה נמחקה בהצלחה');
      } catch (error) {
        console.error('Error deleting donor gift:', error);
        this.ui.error('שגיאה במחיקת המתנה');
      }
    }
  }

  getDonorName(donorGift: DonorGift): string {
    if (!donorGift.donor) return '-';
    return donorGift.donor.lastAndFirstName
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('he-IL');
  }

  formatHebrewDate(date: Date | undefined): string {
    if (!date) return '-';
    try {
      const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(date));
      return hebrewDate.formatted;
    } catch (error) {
      console.error('Error formatting Hebrew date:', error);
      return '-';
    }
  }

  async addReminder(donorGift: DonorGift) {
    if (!donorGift) return;

    try {
      const donorName = donorGift.donor ?
        `${donorGift.donor.firstName || ''} ${donorGift.donor.lastName || ''}`.trim() :
        'תורם';

      const reminderId = await this.ui.reminderDetailsDialog('new', {
        donorId: donorGift.donorId,
        reminderDate: donorGift.deliveryDate,
        sourceEntity: 'donor_gift',
        donorName: donorName,
        sourceEntityType: 'donor_gift',
        sourceEntityId: donorGift.id
      });

      if (reminderId && typeof reminderId === 'string') {
        // Reminder is now linked via sourceEntityType/sourceEntityId - no need to save gift
        await this.refreshData();
        console.log('Reminder created and linked to gift:', donorGift.id);
      }
    } catch (error) {
      console.error('Error opening reminder modal:', error);
      this.ui.error('שגיאה בפתיחת מודל התזכורת');
    }
  }

  async openReminder(donorGift: DonorGift) {
    if (!donorGift?.id) return;

    try {
      // Find reminder by sourceEntityType and sourceEntityId
      const reminder = await remult.repo(Reminder).findFirst({
        sourceEntityType: 'donor_gift',
        sourceEntityId: donorGift.id
      });

      if (reminder) {
        await this.ui.reminderDetailsDialog(reminder.id);
      } else {
        this.ui.error('לא נמצאה תזכורת למתנה זו');
      }
      // Refresh data in case reminder was updated or deleted
      await this.refreshData();
    } catch (error) {
      console.error('Error opening reminder modal:', error);
      this.ui.error('שגיאה בפתיחת מודל התזכורת');
    }
  }

  private async loadReminders() {
    if (this.donorGifts.length === 0) return;

    const donorGiftIds = this.donorGifts.map(g => g.id).filter(id => id);
    if (donorGiftIds.length === 0) return;

    try {
      const reminders = await remult.repo(Reminder).find({
        where: {
          sourceEntityType: 'donor_gift',
          sourceEntityId: { $in: donorGiftIds }
        }
      });

      this.reminderMap.clear();
      for (const reminder of reminders) {
        if (reminder.sourceEntityId) {
          this.reminderMap.set(reminder.sourceEntityId, reminder.id);
        }
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      this.reminderMap.clear();
    }
  }

  hasReminder(donorGift: DonorGift): boolean {
    return !!donorGift.id && this.reminderMap.has(donorGift.id);
  }

  async toggleDeliveryStatus(donorGift: DonorGift) {
    if (!donorGift) return;

    try {
      const wasDelivered = donorGift.isDelivered;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // If marking as delivered
      if (!wasDelivered) {
        // Check if deliveryDate already exists and is different from today
        if (donorGift.deliveryDate) {
          const existingDate = new Date(donorGift.deliveryDate);
          existingDate.setHours(0, 0, 0, 0);

          // If date is different from today, ask user
          if (existingDate.getTime() !== today.getTime()) {
            const hebrewExistingDate = this.formatHebrewDate(donorGift.deliveryDate);

            const confirmed = await this.ui.yesNoQuestion(
              `המתנה סומנה כנמסרה! לגבי התאריך שרשום כרגע בשדה "תאריך מסירה" רשום שם: ${hebrewExistingDate}. האם לשנות את תאריך המסירה להיום?`,
            true);

            if (!confirmed) {
              // User wants to keep existing date, just mark as delivered
              donorGift.isDelivered = true;
              await this.donorGiftRepo.save(donorGift);
              await this.refreshData();
              this.ui.info('המתנה סומנה כנמסרה (התאריך הקיים נשמר)');
              return;
            }
          }
        }

        // Set today as delivery date and mark as delivered
        donorGift.deliveryDate = today;
        donorGift.isDelivered = true;
        await this.donorGiftRepo.save(donorGift);
        await this.refreshData();
        this.ui.info('המתנה סומנה כנמסרה עם תאריך של היום');
      } else {
        // Unmarking as delivered
        donorGift.isDelivered = false;
        await this.donorGiftRepo.save(donorGift);
        await this.refreshData();
        this.ui.info('הסימון כנמסר בוטל');
      }
    } catch (error) {
      console.error('Error toggling delivery status:', error);
      this.ui.error('שגיאה בעדכון סטטוס המסירה');
    }
  }
}
