import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService, DialogConfig } from 'common-ui-elements';
import { TargetAudience } from '../../../../shared/entity/target-audience';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { TargetAudienceController } from '../../../../shared/controllers/target-audience.controller';
import { UIToolsService } from '../../../common/UIToolsService';

export interface AudienceSelectionModalArgs {
  title?: string;
  multiSelect?: boolean;
  selectedIds?: string[];
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '900px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-audience-selection-modal',
  templateUrl: './audience-selection-modal.component.html',
  styleUrls: ['./audience-selection-modal.component.scss']
})
export class AudienceSelectionModalComponent implements OnInit {
  args!: AudienceSelectionModalArgs;

  availableAudiences: TargetAudience[] = [];
  selectedAudience: TargetAudience | null = null;
  selectedAudiences: TargetAudience[] = [];

  searchTerm = '';

  audienceRepo = remult.repo(TargetAudience);

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private busy: BusyService,
    private ui: UIToolsService
  ) {}

  async ngOnInit() {
    await this.loadAudiences();
  }

  async loadAudiences() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        this.availableAudiences = await TargetAudienceController.getTargetAudiences();

        // Pre-select audiences if selectedIds provided
        if (this.args?.multiSelect && this.args?.selectedIds && this.args.selectedIds.length > 0) {
          this.selectedAudiences = this.availableAudiences.filter(audience =>
            this.args.selectedIds!.includes(audience.id)
          );
        }
      } catch (error) {
        console.error('Error loading target audiences:', error);
      }
    });
  }

  // Filter audiences based on search term, with selected items first in multi-select mode
  getFilteredAudiences(): TargetAudience[] {
    let audiences = this.availableAudiences;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      audiences = audiences.filter(audience =>
        audience.name?.toLowerCase().includes(term) ||
        audience.description?.toLowerCase().includes(term)
      );
    }

    // In multi-select mode, show selected items first
    if (this.args?.multiSelect) {
      const selected = audiences.filter(a => this.isAudienceSelected(a));
      const unselected = audiences.filter(a => !this.isAudienceSelected(a));
      return [...selected, ...unselected];
    }

    return audiences;
  }

  selectAudience(audience: TargetAudience) {
    if (this.args.multiSelect) {
      this.toggleAudienceSelection(audience);
    } else {
      this.selectedAudience = audience;
      setTimeout(() => {
        this.dialogRef.close(audience);
      }, 100);
    }
  }

  toggleAudienceSelection(audience: TargetAudience) {
    const index = this.selectedAudiences.findIndex(a => a.id === audience.id);
    if (index === -1) {
      this.selectedAudiences.push(audience);
    } else {
      this.selectedAudiences.splice(index, 1);
    }
  }

  isAudienceSelected(audience: TargetAudience): boolean {
    return this.selectedAudiences.some(a => a.id === audience.id);
  }

  finishMultiSelect() {
    this.dialogRef.close(this.selectedAudiences);
  }

  // CRUD Operations
  async createNewAudience() {
    // Open TargetAudienceDetailsModal to create new target audience
    const result = await this.ui.targetAudienceDetailsDialog('new');

    // Reload the audiences list after creating new one
    if (result) {
      await this.loadAudiences();
    }
  }

  async editAudience(audience: TargetAudience, event: Event) {
    event.stopPropagation();

    // Open TargetAudienceDetailsModal to edit existing target audience
    const result = await this.ui.targetAudienceDetailsDialog(audience.id);

    // Reload the audiences list after editing
    if (result) {
      await this.loadAudiences();
    }
  }

  async deleteAudience(audience: TargetAudience, event: Event) {
    event.stopPropagation();

    const confirmMessage = `${this.i18n.terms.confirmDeleteTargetAudience} "${audience.name}"?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    await this.busy.doWhileShowingBusy(async () => {
      try {
        await TargetAudienceController.deleteTargetAudience(audience.id);
        await this.loadAudiences();
        this.ui.info(this.i18n.terms.targetAudienceDeletedSuccessfully);
      } catch (error) {
        console.error('Error deleting target audience:', error);
        this.ui.error(this.i18n.terms.errorDeletingTargetAudience);
      }
    });
  }

  clearSearch() {
    this.searchTerm = '';
  }

  closeDialog() {
    this.dialogRef.close(null);
  }
}
