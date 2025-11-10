import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { openDialog } from 'common-ui-elements';
import { Campaign } from '../../../../shared/entity';
import { CampaignSelectionModalComponent } from '../../../routes/modals/campaign-selection-modal/campaign-selection-modal.component';

@Component({
  selector: 'app-campaign-selectable-field',
  templateUrl: './campaign-selectable-field.component.html',
  styleUrls: ['./campaign-selectable-field.component.scss']
})
export class CampaignSelectableFieldComponent implements OnInit {
  @Input() selectedIds: string[] = [];
  @Input() multiSelect: boolean = true;
  @Input() title: string = 'בחר קמפיינים';
  @Input() placeholder: string = 'לחץ לבחירת קמפיינים';
  @Input() excludeIds: string[] = [];
  @Input() label: string = '';

  @Output() selectionChange = new EventEmitter<Campaign[]>();

  displayText: string = '';

  ngOnInit() {
    this.updateDisplayText();
  }

  ngOnChanges() {
    this.updateDisplayText();
  }

  updateDisplayText() {
    if (!this.selectedIds || this.selectedIds.length === 0) {
      this.displayText = this.multiSelect ? 'כל הקמפיינים' : 'לא נבחר';
    } else if (this.selectedIds.length === 1) {
      this.displayText = this.multiSelect ? 'קמפיין אחד נבחר' : 'קמפיין אחד נבחר';
    } else {
      this.displayText = `${this.selectedIds.length} קמפיינים נבחרו`;
    }
  }

  async openSelectionModal() {
    try {
      const result = await openDialog(
        CampaignSelectionModalComponent,
        (modal: CampaignSelectionModalComponent) => {
          modal.args = {
            title: this.title,
            multiSelect: this.multiSelect,
            selectedIds: this.selectedIds,
            excludeIds: this.excludeIds
          };
        }
      );

      if (result) {
        const selectedCampaigns = Array.isArray(result) ? result : [result];
        this.selectedIds = selectedCampaigns.map((c: Campaign) => c.id);
        this.updateDisplayText();
        this.selectionChange.emit(selectedCampaigns);
      }
    } catch (error) {
      console.error('Error opening campaign selection modal:', error);
    }
  }

  clearSelection() {
    this.selectedIds = [];
    this.updateDisplayText();
    this.selectionChange.emit([]);
  }
}
