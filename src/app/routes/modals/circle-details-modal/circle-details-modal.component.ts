import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Circle } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';

export interface CircleDetailsModalArgs {
  circleId?: string; // undefined for new circle, or circle ID for edit
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-circle-details-modal',
  templateUrl: './circle-details-modal.component.html',
  styleUrls: ['./circle-details-modal.component.scss']
})
export class CircleDetailsModalComponent implements OnInit {
  args!: CircleDetailsModalArgs;
  changed = false;

  circle?: Circle;
  originalCircleData?: string;

  circleRepo = remult.repo(Circle);

  loading = false;
  isNew = false;

  // Color picker options
  colorOptions = [
    { name: 'כחול', value: '#667eea' },
    { name: 'ירוק', value: '#10b981' },
    { name: 'אדום', value: '#ef4444' },
    { name: 'סגול', value: '#8b5cf6' },
    { name: 'ורוד', value: '#ec4899' },
    { name: 'כתום', value: '#f59e0b' },
    { name: 'צהוב', value: '#fbbf24' },
    { name: 'תכלת', value: '#06b6d4' },
    { name: 'אפור', value: '#6b7280' },
  ];

  // Icon options
  iconOptions = [
    'star',
    'favorite',
    'group',
    'workspace_premium',
    'emoji_events',
    'verified',
    'loyalty',
    'diamond',
    'celebration',
    'military_tech',
  ];

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CircleDetailsModalComponent>
  ) { }

  async ngOnInit() {
    await this.initializeCircle();
  }

  private async initializeCircle() {
    this.loading = true;
    try {
      if (!this.args?.circleId) {
        // New circle
        this.isNew = true;
        this.circle = this.circleRepo.create();
        this.circle.isActive = true;
        this.circle.color = '#667eea'; // Default color
        this.circle.icon = 'star'; // Default icon
        this.originalCircleData = JSON.stringify(this.circle);
      } else {
        // Edit existing circle
        this.isNew = false;
        this.circle = await this.circleRepo.findId(this.args.circleId, {
          useCache: false,
        }) || undefined;

        if (this.circle) {
          this.originalCircleData = JSON.stringify(this.circle);
          this.cdr.detectChanges();
        } else {
          console.error('Failed to load circle with ID:', this.args.circleId);
          this.ui.error('שגיאה בטעינת נתוני החוג');
        }
      }
    } catch (error) {
      console.error('Error initializing circle:', error);
      this.ui.error('שגיאה בטעינת נתוני החוג');
    } finally {
      this.loading = false;
    }
  }

  private hasChanges(): boolean {
    if (!this.circle || !this.originalCircleData) return false;
    return JSON.stringify(this.circle) !== this.originalCircleData;
  }

  async save() {
    if (!this.circle) return;

    // Validate required fields
    if (!this.circle.name?.trim()) {
      this.ui.error('שם החוג הוא שדה חובה');
      return;
    }

    try {
      this.loading = true;
      await this.circle.save();

      this.ui.info(this.isNew ? 'החוג נוסף בהצלחה' : 'החוג עודכן בהצלחה');

      this.changed = true;
      this.dialogRef.close({ circleId: this.circle.id });
    } catch (error) {
      console.error('Error saving circle:', error);
      this.ui.error('שגיאה בשמירת החוג');
    } finally {
      this.loading = false;
    }
  }

  async cancel() {
    if (this.hasChanges()) {
      const confirmClose = await this.ui.yesNoQuestion('יש שינויים שלא נשמרו. האם לצאת בכל זאת?');
      if (!confirmClose) return;
    }
    this.dialogRef.close(false);
  }

  async deleteCircle() {
    if (!this.circle || this.isNew) return;

    const confirmDelete = await this.ui.yesNoQuestion(`האם למחוק את החוג "${this.circle.name}"?`);
    if (!confirmDelete) return;

    try {
      this.loading = true;
      await this.circleRepo.delete(this.circle);
      this.ui.info('החוג נמחק בהצלחה');
      this.changed = true;
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error deleting circle:', error);
      this.ui.error('שגיאה במחיקת החוג');
    } finally {
      this.loading = false;
    }
  }
}
