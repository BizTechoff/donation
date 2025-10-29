import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { I18nService } from '../../../i18n/i18n.service';

export interface BlessingTextEditModalArgs {
  initialText: string;
  donorName: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-blessing-text-edit-modal',
  templateUrl: './blessing-text-edit-modal.component.html',
  styleUrls: ['./blessing-text-edit-modal.component.scss']
})
export class BlessingTextEditModalComponent implements OnInit {
  args!: BlessingTextEditModalArgs;
  blessingText = '';
  characterCount = 0;

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<BlessingTextEditModalComponent>
  ) {}

  ngOnInit() {
    this.blessingText = this.args.initialText || '';
    this.updateCharacterCount();
  }

  updateCharacterCount() {
    this.characterCount = this.blessingText.length;
  }

  onTextChange() {
    this.updateCharacterCount();
  }

  save() {
    this.dialogRef.close(this.blessingText);
  }

  onClose() {
    this.dialogRef.close();
  }
}
