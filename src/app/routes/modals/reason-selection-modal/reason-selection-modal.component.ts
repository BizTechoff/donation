import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { I18nService } from '../../../i18n/i18n.service';

export interface ReasonOption {
  key: string;
  label: string;
  hasSubOptions: boolean;
}

export interface SubOption {
  key: string;
  label: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-reason-selection-modal',
  templateUrl: './reason-selection-modal.component.html',
  styleUrls: ['./reason-selection-modal.component.scss']
})
export class ReasonSelectionModalComponent {
  mainOptions: ReasonOption[] = [
    { key: 'birth', label: 'הולדת', hasSubOptions: true },
    { key: 'engagement', label: 'אירוסי', hasSubOptions: true },
    { key: 'wedding', label: 'נישואי', hasSubOptions: true },
    { key: 'other', label: 'אחר', hasSubOptions: false }
  ];

  subOptions: SubOption[] = [
    { key: 'son', label: 'הבן' },
    { key: 'daughter', label: 'הבת' },
    { key: 'grandson', label: 'הנכד' },
    { key: 'granddaughter', label: 'הנכדה' }
  ];

  selectedMain: ReasonOption | null = null;
  showSubOptions = false;

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<ReasonSelectionModalComponent>
  ) {}

  selectMain(option: ReasonOption) {
    if (option.key === 'other') {
      // "אחר" - return empty string so user can type manually
      this.dialogRef.close('');
      return;
    }

    this.selectedMain = option;
    this.showSubOptions = true;
  }

  selectSub(subOption: SubOption) {
    if (this.selectedMain) {
      const result = `${this.selectedMain.label} ${subOption.label}`;
      this.dialogRef.close(result);
    }
  }

  goBack() {
    this.selectedMain = null;
    this.showSubOptions = false;
  }

  onClose() {
    this.dialogRef.close();
  }
}
