import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { TargetAudienceController } from '../../../../shared/controllers/target-audience.controller';

export interface SaveTargetAudienceModalArgs {
  donorIds: string[];
  polygonPoints?: { lat: number; lng: number }[];
  metadata?: any;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '600px'
})
@Component({
  selector: 'app-save-target-audience-modal',
  templateUrl: './save-target-audience-modal.component.html',
  styleUrls: ['./save-target-audience-modal.component.scss']
})
export class SaveTargetAudienceModalComponent implements OnInit {
  args!: SaveTargetAudienceModalArgs;

  name = '';
  description = '';
  loading = false;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<any>
  ) {}

  async ngOnInit() {
    // Set default name based on current date
    const now = new Date();
    this.name = `קהל יעד ${now.toLocaleDateString('he-IL')} ${now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  }

  async save() {
    if (!this.name.trim()) {
      this.ui.error('נא להזין שם לקהל היעד');
      return;
    }

    this.loading = true;
    try {
      const targetAudience = await TargetAudienceController.createTargetAudience(
        this.name.trim(),
        this.description.trim(),
        this.args.donorIds,
        this.args.polygonPoints,
        this.args.metadata
      );

      let message = `קהל היעד "${this.name}" נשמר בהצלחה עם ${this.args.donorIds.length} תורמים`;
      if (this.args.polygonPoints && this.args.polygonPoints.length > 0) {
        message += '. הפוליגון נשמר ויאפשר רענון אוטומטי בעתיד.';
      }

      this.ui.info(message);
      this.dialogRef.close(targetAudience);
    } catch (error) {
      console.error('Error saving target audience:', error);
      this.ui.error('שגיאה בשמירת קהל היעד');
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
