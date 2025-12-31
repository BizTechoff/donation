import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Gift } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { PayerService } from '../../../services/payer.service';

export interface GiftDetailsModalArgs {
  giftId: string; // Can be 'new' for new gift or gift ID
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '600px',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-gift-details-modal',
  templateUrl: './gift-details-modal.component.html',
  styleUrls: ['./gift-details-modal.component.scss']
})
export class GiftDetailsModalComponent implements OnInit {
  args!: GiftDetailsModalArgs;
  changed = false;

  gift!: Gift;
  giftRepo = remult.repo(Gift);

  loading = false;
  isNew = false;

  // Currency types from service
  currencyTypes = this.payerService.getCurrencyTypesRecord();

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private payerService: PayerService,
    public dialogRef: MatDialogRef<GiftDetailsModalComponent>
  ) {}

  async ngOnInit() {
    this.loading = true;
    try {
      if (this.args.giftId === 'new') {
        this.isNew = true;
        this.gift = this.giftRepo.create();
        this.gift.isActive = true;
      } else {
        this.isNew = false;
        const loaded = await this.giftRepo.findId(this.args.giftId);

        if (loaded) {
          this.gift = loaded;
        } else {
          throw new Error('Gift not found');
        }
      }
    } catch (error) {
      console.error('Error loading gift details:', error);
      this.ui.error('שגיאה בטעינת פרטי המתנה');
      this.dialogRef.close(false);
    } finally {
      this.loading = false;
    }
  }

  async save() {
    try {
      // Validation
      if (!this.gift.name) {
        this.ui.error('נא להזין שם מתנה');
        return;
      }

      this.loading = true;

      if (this.isNew) {
        await this.giftRepo.insert(this.gift);
      } else {
        await this.giftRepo.save(this.gift);
      }

      this.changed = true;
      this.ui.info(this.isNew ? 'המתנה נוספה בהצלחה' : 'המתנה עודכנה בהצלחה');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving gift:', error);
      this.ui.error('שגיאה בשמירת המתנה');
    } finally {
      this.loading = false;
    }
  }

  close() {
    this.dialogRef.close(this.changed);
  }
}
