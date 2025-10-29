import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { BlessingBookType } from '../../../../shared/entity/blessing-book-type';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-blessing-type-selection-modal',
  templateUrl: './blessing-type-selection-modal.component.html',
  styleUrls: ['./blessing-type-selection-modal.component.scss']
})
export class BlessingTypeSelectionModalComponent implements OnInit {
  blessingTypes: BlessingBookType[] = [];
  selectedType?: BlessingBookType;
  loading = false;

  blessingTypeRepo = remult.repo(BlessingBookType);

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<BlessingTypeSelectionModalComponent>
  ) {}

  async ngOnInit() {
    await this.loadBlessingTypes();
  }

  async loadBlessingTypes() {
    this.loading = true;
    try {
      this.blessingTypes = await this.blessingTypeRepo.find({
        where: { isActive: true },
        orderBy: { price: 'asc' }
      });
    } catch (error) {
      console.error('Error loading blessing types:', error);
    } finally {
      this.loading = false;
    }
  }

  selectType(type: BlessingBookType) {
    this.selectedType = type;
    this.dialogRef.close(type);
  }

  onClose() {
    this.dialogRef.close();
  }
}
