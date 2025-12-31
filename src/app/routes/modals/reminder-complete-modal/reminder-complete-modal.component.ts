import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { I18nService } from '../../../i18n/i18n.service';

export interface ReminderCompleteModalArgs {
  isRecurring: boolean;
  reminderTitle?: string;
}

export type CompleteOption = 'completeAndRemindNext' | 'completeFinal';

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '500px',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-reminder-complete-modal',
  templateUrl: './reminder-complete-modal.component.html',
  styleUrls: ['./reminder-complete-modal.component.scss']
})
export class ReminderCompleteModalComponent {
  args!: ReminderCompleteModalArgs;

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<ReminderCompleteModalComponent>
  ) { }

  selectOption(option: CompleteOption) {
    this.dialogRef.close(option);
  }

  cancel() {
    this.dialogRef.close(null);
  }

  static async open(isRecurring: boolean, reminderTitle?: string): Promise<CompleteOption | null> {
    return await openDialog(
      ReminderCompleteModalComponent,
      (dlg) => {
        dlg.args = { isRecurring, reminderTitle };
      }
    );
  }
}
