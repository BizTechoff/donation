import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { openDialog } from 'common-ui-elements';
import { Donor } from '../../../../shared/entity';
import { DonorSelectionModalComponent } from '../../../routes/modals/donor-selection-modal/donor-selection-modal.component';

@Component({
  selector: 'app-donor-selectable-field',
  templateUrl: './donor-selectable-field.component.html',
  styleUrls: ['./donor-selectable-field.component.scss']
})
export class DonorSelectableFieldComponent implements OnInit {
  @Input() selectedIds: string[] = [];
  @Input() multiSelect: boolean = true;
  @Input() title: string = 'בחר תורמים';
  @Input() placeholder: string = 'לחץ לבחירת תורמים';
  @Input() excludeIds: string[] = [];
  @Input() label: string = '';

  @Output() selectionChange = new EventEmitter<Donor[]>();

  displayText: string = '';

  ngOnInit() {
    this.updateDisplayText();
  }

  ngOnChanges() {
    this.updateDisplayText();
  }

  updateDisplayText() {
    if (!this.selectedIds || this.selectedIds.length === 0) {
      this.displayText = this.multiSelect ? 'כל התורמים' : 'לא נבחר';
    } else if (this.selectedIds.length === 1) {
      this.displayText = this.multiSelect ? 'תורם אחד נבחר' : 'תורם אחד נבחר';
    } else {
      this.displayText = `${this.selectedIds.length} תורמים נבחרו`;
    }
  }

  async openSelectionModal() {
    try {
      const result = await openDialog(
        DonorSelectionModalComponent,
        (modal: DonorSelectionModalComponent) => {
          modal.args = {
            title: this.title,
            multiSelect: this.multiSelect,
            selectedIds: this.selectedIds,
            excludeIds: this.excludeIds
          };
        }
      );

      if (result) {
        const selectedDonors = Array.isArray(result) ? result : [result];
        this.selectedIds = selectedDonors.map((d: Donor) => d.id);
        this.updateDisplayText();
        this.selectionChange.emit(selectedDonors);
      }
    } catch (error) {
      console.error('Error opening donor selection modal:', error);
    }
  }

  clearSelection() {
    this.selectedIds = [];
    this.updateDisplayText();
    this.selectionChange.emit([]);
  }
}
