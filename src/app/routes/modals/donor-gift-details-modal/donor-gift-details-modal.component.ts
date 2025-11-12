import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { DonorGift, Donor, Gift, Reminder } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { HebrewDateService } from '../../../services/hebrew-date.service';
import { DonorSelectionModalComponent } from '../donor-selection-modal/donor-selection-modal.component';

export interface DonorGiftDetailsModalArgs {
  donorGiftId: string; // Can be 'new' for new donor gift or donor gift ID
  donorId?: string; // Optional donor ID for pre-selecting donor in new gifts
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '600px',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-donor-gift-details-modal',
  templateUrl: './donor-gift-details-modal.component.html',
  styleUrls: ['./donor-gift-details-modal.component.scss']
})
export class DonorGiftDetailsModalComponent implements OnInit {
  args!: DonorGiftDetailsModalArgs;
  changed = false;

  donorGift!: DonorGift;
  gifts: Gift[] = [];
  hasReminderFlag = false;

  donorGiftRepo = remult.repo(DonorGift);
  donorRepo = remult.repo(Donor);
  giftRepo = remult.repo(Gift);

  loading = false;
  isNew = false;
  selectedDonor?: Donor;
  selectedGift?: Gift;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private hebrewDateService: HebrewDateService,
    public dialogRef: MatDialogRef<DonorGiftDetailsModalComponent>
  ) {}

  async ngOnInit() {
    this.loading = true;
    try {
      await this.loadGifts();

      if (this.args.donorGiftId === 'new') {
        this.isNew = true;
        this.donorGift = this.donorGiftRepo.create();
        this.donorGift.deliveryDate = new Date();

        // Pre-select donor if provided
        if (this.args.donorId) {
          this.donorGift.donorId = this.args.donorId;
          const donor = await this.donorRepo.findId(this.args.donorId);
          if (donor) {
            this.selectedDonor = donor;
            this.donorGift.donor = donor;
          }
        }
      } else {
        this.isNew = false;
        const loaded = await this.donorGiftRepo.findId(this.args.donorGiftId, {
          include: {
            donor: true,
            gift: true
          }
        });

        if (loaded) {
          this.donorGift = loaded;
          this.selectedDonor = loaded.donor;
          this.selectedGift = loaded.gift;
        } else {
          throw new Error('Donor gift not found');
        }
      }

      // Check if reminder exists
      if (!this.isNew && this.donorGift.id) {
        await this.checkReminder();
      }
    } catch (error) {
      console.error('Error loading donor gift details:', error);
      this.ui.error('שגיאה בטעינת פרטי המתנה');
      this.dialogRef.close(false);
    } finally {
      this.loading = false;
    }
  }

  private async checkReminder() {
    if (!this.donorGift?.id) {
      this.hasReminderFlag = false;
      return;
    }
    try {
      const reminder = await remult.repo(Reminder).findFirst({
        sourceEntityType: 'donor_gift',
        sourceEntityId: this.donorGift.id
      });
      this.hasReminderFlag = !!reminder;
    } catch (error) {
      this.hasReminderFlag = false;
    }
  }

  async loadGifts() {
    this.gifts = await this.giftRepo.find({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async openDonorSelectionModal() {
    try {
      const result = await openDialog(DonorSelectionModalComponent, (it) => {
        it.args = {
          title: 'בחירת תורם',
          multiSelect: false
        };
      }) as Donor | null;

      if (result) {
        this.selectedDonor = result;
        this.donorGift.donorId = result.id;
        this.donorGift.donor = result;
      }
    } catch (error) {
      console.error('Error opening donor selection modal:', error);
      this.ui.error('שגיאה בפתיחת חלון בחירת תורם');
    }
  }

  onGiftChange(giftId: string) {
    this.selectedGift = this.gifts.find(g => g.id === giftId);
    if (this.selectedGift) {
      this.donorGift.gift = this.selectedGift;
    }
  }

  getDonorName(donor?: Donor): string {
    if (!donor) return '';
    return `${donor.firstName || ''} ${donor.lastName || ''}`.trim();
  }

  getHebrewDate(date: Date | undefined): string {
    if (!date) return '';
    try {
      const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(date));
      return hebrewDate.formatted;
    } catch (error) {
      console.error('Error formatting Hebrew date:', error);
      return '';
    }
  }

  async save() {
    try {
      // Validation
      if (!this.donorGift.donorId) {
        this.ui.error('נא לבחור תורם');
        return;
      }

      if (!this.donorGift.giftId) {
        this.ui.error('נא לבחור מתנה');
        return;
      }

      if (!this.donorGift.deliveryDate) {
        this.ui.error('נא להזין תאריך מסירה');
        return;
      }

      this.loading = true;

      if (this.isNew) {
        await this.donorGiftRepo.insert(this.donorGift);
      } else {
        await this.donorGiftRepo.save(this.donorGift);
      }

      this.changed = true;
      this.ui.info(this.isNew ? 'המתנה נוספה בהצלחה' : 'המתנה עודכנה בהצלחה');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving donor gift:', error);
      this.ui.error('שגיאה בשמירת המתנה');
    } finally {
      this.loading = false;
    }
  }

  close() {
    this.dialogRef.close(this.changed);
  }

  async addReminder() {
    if (!this.donorGift) return;

    try {
      const donorName = this.selectedDonor ?
        `${this.selectedDonor.firstName || ''} ${this.selectedDonor.lastName || ''}`.trim() :
        'תורם';

      const reminderId = await this.ui.reminderDetailsDialog('new', {
        donorId: this.donorGift.donorId,
        reminderDate: this.donorGift.deliveryDate,
        sourceEntity: 'donor_gift',
        donorName: donorName,
        sourceEntityType: 'donor_gift',
        sourceEntityId: this.donorGift.id
      });

      if (reminderId && typeof reminderId === 'string') {
        // Reminder is now linked via sourceEntityType/sourceEntityId - no need to save gift
        console.log('Reminder created and linked to gift:', this.donorGift.id);
        await this.checkReminder(); // Update flag
      }
    } catch (error) {
      console.error('Error opening reminder modal:', error);
      this.ui.error('שגיאה בפתיחת מודל התזכורת');
    }
  }

  async openReminder() {
    if (!this.donorGift?.id) return;

    try {
      // Find reminder by sourceEntityType and sourceEntityId
      const reminder = await remult.repo(Reminder).findFirst({
        sourceEntityType: 'donor_gift',
        sourceEntityId: this.donorGift.id
      });

      if (reminder) {
        await this.ui.reminderDetailsDialog(reminder.id);
        await this.checkReminder(); // Update flag in case reminder was deleted
      } else {
        this.ui.error('לא נמצאה תזכורת למתנה זו');
      }
    } catch (error) {
      console.error('Error opening reminder modal:', error);
      this.ui.error('שגיאה בפתיחת מודל התזכורת');
    }
  }
}
