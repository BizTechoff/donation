import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { remult } from 'remult';
import { LetterTitle } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';

export interface LetterTitleSelectionModalArgs {
  type: 'prefix' | 'suffix';
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '70vw',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-letter-title-selection-modal',
  templateUrl: './letter-title-selection-modal.component.html',
  styleUrls: ['./letter-title-selection-modal.component.scss']
})
export class LetterTitleSelectionModalComponent implements OnInit {
  args!: LetterTitleSelectionModalArgs;

  letterTitles: LetterTitle[] = [];
  letterTitleRepo = remult.repo(LetterTitle);

  editingTitle?: LetterTitle;
  isCreating = false;
  loading = false;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<LetterTitleSelectionModalComponent>
  ) { }

  async ngOnInit() {
    await this.loadLetterTitles();
  }

  async loadLetterTitles() {
    try {
      this.loading = true;
      this.letterTitles = await this.letterTitleRepo.find({
        where: { type: this.args.type },
        orderBy: { sortOrder: 'asc' }
      });
    } catch (error) {
      console.error('Error loading letter titles:', error);
      this.ui.error('שגיאה בטעינת כותרות המכתב');
    } finally {
      this.loading = false;
    }
  }

  get titleType() {
    return this.args.type === 'prefix' ? 'כותרת עליונה' : 'כותרת תחתונה';
  }

  startCreate() {
    this.editingTitle = this.letterTitleRepo.create({
      type: this.args.type,
      active: true,
      sortOrder: this.letterTitles.length + 1
    });
    this.isCreating = true;
  }

  startEdit(title: LetterTitle) {
    this.editingTitle = { ...title } as LetterTitle;
    this.isCreating = false;
  }

  cancelEdit() {
    this.editingTitle = undefined;
    this.isCreating = false;
  }

  async saveTitle() {
    if (!this.editingTitle || !this.editingTitle.text?.trim()) {
      this.ui.error('נא להזין טקסט לכותרת');
      return;
    }

    try {
      this.loading = true;

      if (this.isCreating) {
        await this.letterTitleRepo.insert(this.editingTitle);
        this.ui.info('הכותרת נוספה בהצלחה');
      } else {
        const existing = await this.letterTitleRepo.findId(this.editingTitle.id);
        if (existing) {
          existing.text = this.editingTitle.text;
          existing.category = this.editingTitle.category;
          existing.sortOrder = this.editingTitle.sortOrder;
          existing.active = this.editingTitle.active;
          await this.letterTitleRepo.save(existing);
          this.ui.info('הכותרת עודכנה בהצלחה');
        }
      }

      this.editingTitle = undefined;
      this.isCreating = false;
      await this.loadLetterTitles();
    } catch (error) {
      console.error('Error saving letter title:', error);
      this.ui.error('שגיאה בשמירת הכותרת');
    } finally {
      this.loading = false;
    }
  }

  async deleteTitle(title: LetterTitle) {
    const confirmed = await this.ui.confirmDelete(`האם למחוק את הכותרת: "${title.text}"?`);
    if (!confirmed) return;

    try {
      this.loading = true;
      await this.letterTitleRepo.delete(title);
      this.ui.info('הכותרת נמחקה בהצלחה');
      await this.loadLetterTitles();
    } catch (error) {
      console.error('Error deleting letter title:', error);
      this.ui.error('שגיאה במחיקת הכותרת');
    } finally {
      this.loading = false;
    }
  }

  async toggleActive(title: LetterTitle) {
    try {
      const existing = await this.letterTitleRepo.findId(title.id);
      if (existing) {
        existing.active = !existing.active;
        await this.letterTitleRepo.save(existing);
        await this.loadLetterTitles();
      }
    } catch (error) {
      console.error('Error toggling active:', error);
      this.ui.error('שגיאה בעדכון סטטוס הכותרת');
    }
  }

  async onDrop(event: CdkDragDrop<LetterTitle[]>) {
    moveItemInArray(this.letterTitles, event.previousIndex, event.currentIndex);
    await this.updateSortOrders();
  }

  async updateSortOrders() {
    try {
      for (let i = 0; i < this.letterTitles.length; i++) {
        const title = await this.letterTitleRepo.findId(this.letterTitles[i].id);
        if (title) {
          title.sortOrder = i + 1;
          await this.letterTitleRepo.save(title);
        }
      }
      await this.loadLetterTitles();
    } catch (error) {
      console.error('Error updating sort orders:', error);
      this.ui.error('שגיאה בעדכון סדר הכותרות');
    }
  }

  selectTitle(title: LetterTitle) {
    if (!title.active) {
      this.ui.info('כותרת זו אינה פעילה');
      return;
    }
    this.dialogRef.close(title);
  }

  closeModal() {
    this.dialogRef.close(null);
  }
}
