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
  allDonorGifts: DonorGift[] = [];
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

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService
  ) {}

  async ngOnInit() {
    await this.loadData();
    this.generateYearsList();
  }

  async loadData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadDonorGifts(),
        this.loadDonors(),
        this.loadGifts()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      this.ui.error('שגיאה בטעינת נתונים');
    } finally {
      this.loading = false;
    }
  }

  async loadDonorGifts() {
    this.allDonorGifts = await this.donorGiftRepo.find({
      orderBy: { deliveryDate: 'desc' },
      include: {
        donor: true,
        gift: true
      }
    });
    this.donorGifts = [...this.allDonorGifts];
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
    this.donorGifts = this.allDonorGifts.filter(dg => {
      // Filter by donor
      if (this.selectedDonorId && dg.donorId !== this.selectedDonorId) {
        return false;
      }

      // Filter by donor name search
      if (this.searchDonorName) {
        const searchLower = this.searchDonorName.toLowerCase();
        const donorName = `${dg.donor?.firstName || ''} ${dg.donor?.lastName || ''}`.toLowerCase();
        if (!donorName.includes(searchLower)) {
          return false;
        }
      }

      // Filter by gift
      if (this.selectedGiftId && dg.giftId !== this.selectedGiftId) {
        return false;
      }

      // Filter by year
      if (this.selectedYear) {
        const giftYear = new Date(dg.deliveryDate).getFullYear();
        if (giftYear !== parseInt(this.selectedYear)) {
          return false;
        }
      }

      return true;
    });
  }

  clearFilters() {
    this.selectedDonorId = '';
    this.selectedGiftId = '';
    this.selectedYear = '';
    this.searchDonorName = '';
    this.applyFilters();
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
      await this.loadDonorGifts();
      this.applyFilters();
    }
  }

  async editDonorGift(donorGift: DonorGift) {
    const result = await openDialog(DonorGiftDetailsModalComponent, (it) => {
      it.args = { donorGiftId: donorGift.id };
    });

    if (result) {
      await this.loadDonorGifts();
      this.applyFilters();
    }
  }

  async deleteDonorGift(donorGift: DonorGift) {
    const confirmed = await this.ui.yesNoQuestion(
      `האם למחוק את המתנה "${donorGift.gift?.name}" לתורם "${donorGift.donor?.firstName} ${donorGift.donor?.lastName}"?`
    );

    if (confirmed) {
      try {
        await this.donorGiftRepo.delete(donorGift);
        await this.loadDonorGifts();
        this.applyFilters();
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

  get deliveredCount(): number {
    return this.donorGifts.filter(dg => dg.isDelivered).length;
  }

  get pendingCount(): number {
    return this.donorGifts.filter(dg => !dg.isDelivered).length;
  }
}
