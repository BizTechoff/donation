import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { DonorGift, Donor, Gift } from '../../../shared/entity';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';
import { openDialog } from 'common-ui-elements';
import { DonorGiftDetailsModalComponent } from '../../routes/modals/donor-gift-details-modal/donor-gift-details-modal.component';
import { GiftCatalogModalComponent } from '../../routes/modals/gift-catalog-modal/gift-catalog-modal.component';

@Component({
  selector: 'app-donor-gifts-list',
  templateUrl: './donor-gifts-list.component.html',
  styleUrls: ['./donor-gifts-list.component.scss']
})
export class DonorGiftsListComponent implements OnInit {

  donorGifts: DonorGift[] = [];
  donors: Donor[] = [];
  gifts: Gift[] = [];

  donorGiftRepo = remult.repo(DonorGift);
  donorRepo = remult.repo(Donor);
  giftRepo = remult.repo(Gift);

  loading = false;

  // Filters
  selectedDonorId = '';
  selectedGiftId = '';
  selectedYear = '';
  searchDonorName = '';

  years: number[] = [];

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
    private ui: UIToolsService
  ) {}

  async ngOnInit() {
    await this.loadGifts();
    await this.loadDonors();
    this.generateYearsList();
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      await this.loadDonorGifts();
    } catch (error) {
      console.error('Error loading data:', error);
      this.ui.error('שגיאה בטעינת נתונים');
    } finally {
      this.loading = false;
    }
  }

  async loadDonorGifts() {
    // Build where clause (simple filters only)
    const where: any = {};

    if (this.selectedDonorId) {
      where.donorId = this.selectedDonorId;
    }

    if (this.selectedGiftId) {
      where.giftId = this.selectedGiftId;
    }

    if (this.selectedYear) {
      // Filter by year - we'll need to do this on client side
    }

    // Build orderBy
    const orderBy: any = {};
    if (this.sortColumns.length > 0) {
      this.sortColumns.forEach(sort => {
        if (sort.field === 'donor') {
          orderBy['donor.lastName'] = sort.direction;
        } else if (sort.field === 'gift') {
          orderBy['gift.name'] = sort.direction;
        } else {
          orderBy[sort.field] = sort.direction;
        }
      });
    } else {
      orderBy.deliveryDate = 'desc';
    }

    // Get all data with filters
    let allData = await this.donorGiftRepo.find({
      where,
      orderBy,
      include: {
        donor: true,
        gift: true
      }
    });

    // Apply client-side filters
    if (this.searchDonorName) {
      const searchLower = this.searchDonorName.toLowerCase();
      allData = allData.filter(dg => {
        const donorName = `${dg.donor?.firstName || ''} ${dg.donor?.lastName || ''}`.toLowerCase();
        return donorName.includes(searchLower);
      });
    }

    if (this.selectedYear) {
      const yearNum = parseInt(this.selectedYear);
      allData = allData.filter(dg => {
        return new Date(dg.deliveryDate).getFullYear() === yearNum;
      });
    }

    // Update stats
    this.totalCount = allData.length;
    this.deliveredCount = allData.filter(dg => dg.isDelivered).length;
    this.pendingCount = allData.filter(dg => !dg.isDelivered).length;

    // Calculate pagination
    this.totalPages = Math.ceil(this.totalCount / this.pageSize);

    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.donorGifts = allData.slice(startIndex, endIndex);
  }

  async loadDonors() {
    this.donors = await this.donorRepo.find({
      where: { isActive: true },
      orderBy: { lastName: 'asc' }
    });
  }

  async loadGifts() {
    this.gifts = await this.giftRepo.find({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  generateYearsList() {
    const currentYear = new Date().getFullYear();
    this.years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      this.years.push(i);
    }
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadData();
  }

  clearFilters() {
    this.selectedDonorId = '';
    this.selectedGiftId = '';
    this.selectedYear = '';
    this.searchDonorName = '';
    this.currentPage = 1;
    this.loadData();
  }

  // Sorting methods
  toggleSort(field: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const existingSort = this.sortColumns.find(s => s.field === field);

    if (existingSort) {
      if (existingSort.direction === 'asc') {
        existingSort.direction = 'desc';
      } else {
        this.sortColumns = this.sortColumns.filter(s => s.field !== field);
      }
    } else {
      this.sortColumns.push({ field, direction: 'asc' });
    }

    this.loadData();
  }

  isSorted(field: string): boolean {
    return this.sortColumns.some(s => s.field === field);
  }

  getSortIcon(field: string): string {
    const sort = this.sortColumns.find(s => s.field === field);
    if (!sort) return '';
    return sort.direction === 'asc' ? '↑' : '↓';
  }

  // Pagination methods
  firstPage() {
    if (this.currentPage !== 1) {
      this.currentPage = 1;
      this.loadData();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadData();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadData();
    }
  }

  lastPage() {
    if (this.currentPage !== this.totalPages) {
      this.currentPage = this.totalPages;
      this.loadData();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadData();
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
      await this.loadData();
    }
  }

  async editDonorGift(donorGift: DonorGift) {
    const result = await openDialog(DonorGiftDetailsModalComponent, (it) => {
      it.args = { donorGiftId: donorGift.id };
    });

    if (result) {
      await this.loadData();
    }
  }

  async deleteDonorGift(donorGift: DonorGift) {
    const confirmed = await this.ui.yesNoQuestion(
      `האם למחוק את המתנה "${donorGift.gift?.name}" לתורם "${donorGift.donor?.firstName} ${donorGift.donor?.lastName}"?`
    );

    if (confirmed) {
      try {
        await this.donorGiftRepo.delete(donorGift);
        await this.loadData();
        this.ui.info('המתנה נמחקה בהצלחה');
      } catch (error) {
        console.error('Error deleting donor gift:', error);
        this.ui.error('שגיאה במחיקת המתנה');
      }
    }
  }

  getDonorName(donorGift: DonorGift): string {
    if (!donorGift.donor) return '';
    return `${donorGift.donor.firstName || ''} ${donorGift.donor.lastName || ''}`.trim();
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('he-IL');
  }
}
