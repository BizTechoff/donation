import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService, DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { NeighborhoodDetailsModalComponent } from '../neighborhood-details-modal/neighborhood-details-modal.component';
import { PlaceController, NeighborhoodData } from '../../../../shared/controllers/place.controller';

export interface NeighborhoodSelectionModalArgs {
  title?: string;
  multiSelect?: boolean;
  selectedNeighborhoods?: string[]; // Array of neighborhood names
  city?: string; // Filter neighborhoods by city
  countryId?: string; // Filter neighborhoods by country
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '800px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-neighborhood-selection-modal',
  templateUrl: './neighborhood-selection-modal.component.html',
  styleUrls: ['./neighborhood-selection-modal.component.scss']
})
export class NeighborhoodSelectionModalComponent implements OnInit {
  args!: NeighborhoodSelectionModalArgs;
  selectedNeighborhood: string | null = null;
  selectedNeighborhoods: string[] = [];

  // Neighborhoods system
  availableNeighborhoods: NeighborhoodData[] = [];

  // Search
  searchTerm = '';

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private busy: BusyService
  ) {}

  async ngOnInit() {
    await this.loadNeighborhoods();
  }

  async loadNeighborhoods() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const data = await PlaceController.getNeighborhoodsForSelection(
          this.args?.city,
          this.args?.countryId
        );
        this.availableNeighborhoods = data.neighborhoods;

        // Pre-select neighborhoods if selectedNeighborhoods provided (in multi-select mode)
        if (this.args?.multiSelect && this.args?.selectedNeighborhoods && this.args.selectedNeighborhoods.length > 0) {
          this.selectedNeighborhoods = [...this.args.selectedNeighborhoods];
        }
      } catch (error) {
        console.error('Error loading neighborhoods:', error);
      }
    });
  }

  // Filter neighborhoods based on search term
  getFilteredNeighborhoods(): NeighborhoodData[] {
    if (!this.searchTerm.trim()) {
      return this.availableNeighborhoods;
    }

    const term = this.searchTerm.toLowerCase();
    return this.availableNeighborhoods.filter(neighborhoodData =>
      neighborhoodData.neighborhood?.toLowerCase().includes(term)
    );
  }

  // Select neighborhood and close dialog immediately (single select mode)
  // Or toggle neighborhood selection in multi-select mode
  selectNeighborhood(neighborhoodData: NeighborhoodData) {
    if (this.args.multiSelect) {
      this.toggleNeighborhoodSelection(neighborhoodData.neighborhood);
    } else {
      this.selectedNeighborhood = neighborhoodData.neighborhood;
      setTimeout(() => {
        this.dialogRef.close(neighborhoodData.neighborhood);
      }, 100);
    }
  }

  // Toggle neighborhood selection in multi-select mode
  toggleNeighborhoodSelection(neighborhood: string) {
    const index = this.selectedNeighborhoods.indexOf(neighborhood);
    if (index === -1) {
      this.selectedNeighborhoods.push(neighborhood);
    } else {
      this.selectedNeighborhoods.splice(index, 1);
    }
  }

  // Check if neighborhood is selected (for multi-select mode)
  isNeighborhoodSelected(neighborhood: string): boolean {
    return this.selectedNeighborhoods.includes(neighborhood);
  }

  // Finish multi-select and close dialog with selected neighborhoods
  finishMultiSelect() {
    this.dialogRef.close(this.selectedNeighborhoods);
  }

  // Open create new neighborhood modal
  async createNewNeighborhood() {
    try {
      const dialogResult = await openDialog(
        NeighborhoodDetailsModalComponent,
        (modal: NeighborhoodDetailsModalComponent) => {
          modal.args = {
            neighborhoodName: 'new',
            city: this.args?.city,
            countryId: this.args?.countryId
          };
        }
      );

      if (dialogResult) {
        await this.loadNeighborhoods();

        // Auto-select the newly created neighborhood
        if (typeof dialogResult === 'string') {
          if (this.args.multiSelect) {
            if (!this.selectedNeighborhoods.includes(dialogResult)) {
              this.selectedNeighborhoods.push(dialogResult);
            }
          } else {
            this.selectedNeighborhood = dialogResult;
            setTimeout(() => {
              this.dialogRef.close(dialogResult);
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('Error creating new neighborhood:', error);
    }
  }

  // Open edit neighborhood modal
  async editNeighborhood(neighborhoodData: NeighborhoodData, event: Event) {
    event.stopPropagation();

    try {
      const dialogResult = await openDialog(
        NeighborhoodDetailsModalComponent,
        (modal: NeighborhoodDetailsModalComponent) => {
          modal.args = {
            neighborhoodName: neighborhoodData.neighborhood,
            city: neighborhoodData.city,
            countryId: neighborhoodData.countryId
          };
        }
      );

      if (dialogResult) {
        await this.loadNeighborhoods();
      }
    } catch (error) {
      console.error('Error editing neighborhood:', error);
    }
  }

  // Clear search
  clearSearch() {
    this.searchTerm = '';
  }

  // Close dialog without selection
  closeDialog() {
    this.dialogRef.close(null);
  }
}
