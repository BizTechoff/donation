import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { openDialog } from 'common-ui-elements';
import { Donation } from '../../../../shared/entity';
import { DonationSelectionModalComponent } from '../../../routes/modals/donation-selection-modal/donation-selection-modal.component';

@Component({
  selector: 'app-donation-selectable-field',
  templateUrl: './donation-selectable-field.component.html',
  styleUrls: ['./donation-selectable-field.component.scss']
})
export class DonationSelectableFieldComponent implements OnInit {
  @Input() selectedIds: string[] = [];
  @Input() multiSelect: boolean = true;
  @Input() title: string = 'בחר תרומות';
  @Input() placeholder: string = 'לחץ לבחירת תרומות';
  @Input() excludeIds: string[] = [];
  @Input() label: string = '';

  @Output() selectionChange = new EventEmitter<Donation[]>();

  displayText: string = '';

  ngOnInit() {
    this.updateDisplayText();
  }

  ngOnChanges() {
    this.updateDisplayText();
  }

  updateDisplayText() {
    if (!this.selectedIds || this.selectedIds.length === 0) {
      this.displayText = this.multiSelect ? 'כל התרומות' : 'לא נבחר';
    } else if (this.selectedIds.length === 1) {
      this.displayText = this.multiSelect ? 'תרומה אחת נבחרה' : 'תרומה אחת נבחרה';
    } else {
      this.displayText = `${this.selectedIds.length} תרומות נבחרו`;
    }
  }

  async openSelectionModal() {
    try {
      const result = await openDialog(
        DonationSelectionModalComponent,
        (modal: DonationSelectionModalComponent) => {
          modal.args = {
            title: this.title,
            multiSelect: this.multiSelect,
            selectedIds: this.selectedIds,
            excludeIds: this.excludeIds
          };
        }
      );

      if (result) {
        const selectedDonations = Array.isArray(result) ? result : [result];
        this.selectedIds = selectedDonations.map((d: Donation) => d.id);
        this.updateDisplayText();
        this.selectionChange.emit(selectedDonations);
      }
    } catch (error) {
      console.error('Error opening donation selection modal:', error);
    }
  }

  clearSelection() {
    this.selectedIds = [];
    this.updateDisplayText();
    this.selectionChange.emit([]);
  }
}
