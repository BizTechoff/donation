import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Gift } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { GiftDetailsModalComponent } from '../gift-details-modal/gift-details-modal.component';
import { PayerService } from '../../../services/payer.service';

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '90vw',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-gift-catalog-modal',
  templateUrl: './gift-catalog-modal.component.html',
  styleUrls: ['./gift-catalog-modal.component.scss']
})
export class GiftCatalogModalComponent implements OnInit {
  gifts: Gift[] = [];
  filteredGifts: Gift[] = [];
  giftRepo = remult.repo(Gift);

  loading = false;
  searchText = '';

  // Currency types from service
  currencyTypes = this.payerService.getCurrencyTypesRecord();

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private payerService: PayerService,
    public dialogRef: MatDialogRef<GiftCatalogModalComponent>
  ) {}

  async ngOnInit() {
    await this.loadGifts();
  }

  async loadGifts() {
    this.loading = true;
    try {
      this.gifts = await this.giftRepo.find({
        orderBy: { name: 'asc' }
      });
      this.applyFilters();
    } catch (error) {
      console.error('Error loading gifts:', error);
      this.ui.error('שגיאה בטעינת רשימת המתנות');
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    this.filteredGifts = this.gifts.filter(gift => {
      if (!this.searchText) return true;

      const searchLower = this.searchText.toLowerCase();
      return (
        gift.name?.toLowerCase().includes(searchLower) ||
        gift.category?.toLowerCase().includes(searchLower) ||
        gift.description?.toLowerCase().includes(searchLower)
      );
    });
  }

  async addNewGift() {
    const result = await openDialog(GiftDetailsModalComponent, (it) => {
      it.args = { giftId: 'new' };
    });

    if (result) {
      await this.loadGifts();
    }
  }

  async editGift(gift: Gift) {
    const result = await openDialog(GiftDetailsModalComponent, (it) => {
      it.args = { giftId: gift.id };
    });

    if (result) {
      await this.loadGifts();
    }
  }

  async deleteGift(gift: Gift) {
    const confirmed = await this.ui.yesNoQuestion(
      `האם למחוק את המתנה "${gift.name}"?`
    );

    if (confirmed) {
      try {
        await this.giftRepo.delete(gift);
        await this.loadGifts();
        this.ui.info('המתנה נמחקה בהצלחה');
      } catch (error) {
        console.error('Error deleting gift:', error);
        this.ui.error('שגיאה במחיקת המתנה');
      }
    }
  }

  async toggleActive(gift: Gift) {
    try {
      gift.isActive = !gift.isActive;
      await this.giftRepo.save(gift);
      this.ui.info(gift.isActive ? 'המתנה הופעלה' : 'המתנה הושבתה');
    } catch (error) {
      console.error('Error toggling gift status:', error);
      this.ui.error('שגיאה בעדכון סטטוס המתנה');
      gift.isActive = !gift.isActive; // Revert on error
    }
  }

  get activeGiftsCount(): number {
    return this.filteredGifts.filter(g => g.isActive).length;
  }

  get inactiveGiftsCount(): number {
    return this.filteredGifts.filter(g => !g.isActive).length;
  }

  close() {
    this.dialogRef.close();
  }
}
