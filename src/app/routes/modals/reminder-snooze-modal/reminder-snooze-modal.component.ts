import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { I18nService } from '../../../i18n/i18n.service';

export interface ReminderSnoozeModalArgs {
  reminderId: string;
}

export type SnoozePeriod = 'tomorrow' | 'dayAfterTomorrow' | 'nextWeek' | 'nextMonth';

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '500px',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-reminder-snooze-modal',
  templateUrl: './reminder-snooze-modal.component.html',
  styleUrls: ['./reminder-snooze-modal.component.scss']
})
export class ReminderSnoozeModalComponent {
  args!: ReminderSnoozeModalArgs;

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<ReminderSnoozeModalComponent>
  ) { }

  selectPeriod(period: SnoozePeriod) {
    this.dialogRef.close(period);
  }

  cancel() {
    this.dialogRef.close(null);
  }

  static async open(reminderId: string): Promise<SnoozePeriod | null> {
    return await openDialog(
      ReminderSnoozeModalComponent,
      (dlg) => {
        dlg.args = { reminderId };
      }
    );
  }
}
