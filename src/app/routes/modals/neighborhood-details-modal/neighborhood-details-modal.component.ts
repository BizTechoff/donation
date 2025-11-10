import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Place } from '../../../../shared/entity/place';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';

export interface NeighborhoodDetailsModalArgs {
  neighborhoodName?: string; // undefined or 'new' for new neighborhood, or neighborhood name for edit
  city?: string; // Optional city for filtering
  countryId?: string; // Optional country ID for filtering
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '600px',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-neighborhood-details-modal',
  templateUrl: './neighborhood-details-modal.component.html',
  styleUrls: ['./neighborhood-details-modal.component.scss']
})
export class NeighborhoodDetailsModalComponent implements OnInit {
  args!: NeighborhoodDetailsModalArgs;

  oldNeighborhoodName?: string; // Original neighborhood name for editing
  newNeighborhoodName: string = '';
  selectedCity?: string;
  selectedCountryId?: string;

  placeRepo = remult.repo(Place);

  loading = false;
  isNew = false;
  placesWithThisNeighborhood: Place[] = [];

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<NeighborhoodDetailsModalComponent>
  ) {}

  async ngOnInit() {
    await this.initializeNeighborhood();
  }

  private async initializeNeighborhood() {
    this.loading = true;
    try {
      if (!this.args?.neighborhoodName || this.args.neighborhoodName === 'new') {
        // New neighborhood
        this.isNew = true;
        this.newNeighborhoodName = '';
        this.selectedCity = this.args?.city;
        this.selectedCountryId = this.args?.countryId;
      } else {
        // Edit existing neighborhood
        this.isNew = false;
        this.oldNeighborhoodName = this.args.neighborhoodName;
        this.newNeighborhoodName = this.args.neighborhoodName;
        this.selectedCity = this.args?.city;
        this.selectedCountryId = this.args?.countryId;

        // Load all places with this neighborhood name
        this.placesWithThisNeighborhood = await this.placeRepo.find({
          where: { neighborhood: this.args.neighborhoodName }
        });
      }
    } catch (error) {
      console.error('Error initializing neighborhood:', error);
      this.ui.error('שגיאה בטעינת נתוני השכונה');
    } finally {
      this.loading = false;
    }
  }

  async save() {
    // Validation
    if (!this.newNeighborhoodName || this.newNeighborhoodName.trim() === '') {
      this.ui.error('נא להזין שם שכונה');
      return;
    }

    const trimmedNeighborhoodName = this.newNeighborhoodName.trim();

    try {
      if (this.isNew) {
        // For new neighborhood, we just return the neighborhood name
        // The actual Place record will be created when assigned to a donor
        this.ui.info('השכונה נוספה בהצלחה');
        this.dialogRef.close(trimmedNeighborhoodName);
      } else {
        // For edit, update all places with the old neighborhood name to the new neighborhood name
        if (this.oldNeighborhoodName && this.oldNeighborhoodName !== trimmedNeighborhoodName) {
          for (const place of this.placesWithThisNeighborhood) {
            place.neighborhood = trimmedNeighborhoodName;
            await this.placeRepo.save(place);
          }
          this.ui.info(`השכונה עודכנה בהצלחה (${this.placesWithThisNeighborhood.length} מקומות)`);
          this.dialogRef.close(trimmedNeighborhoodName);
        } else {
          this.ui.info('לא בוצעו שינויים');
          this.dialogRef.close();
        }
      }
    } catch (error) {
      console.error('Error saving neighborhood:', error);
      this.ui.error('שגיאה בשמירת השכונה');
    }
  }

  async delete() {
    if (this.isNew || !this.oldNeighborhoodName) return;

    const confirmed = await this.ui.yesNoQuestion(
      `האם אתה בטוח שברצונך למחוק את השכונה "${this.oldNeighborhoodName}"? פעולה זו תסיר את שם השכונה מ-${this.placesWithThisNeighborhood.length} מקומות.`
    );
    if (!confirmed) return;

    try {
      // Remove neighborhood name from all places (set to empty string)
      for (const place of this.placesWithThisNeighborhood) {
        place.neighborhood = '';
        await this.placeRepo.save(place);
      }
      this.ui.info('השכונה נמחקה בהצלחה');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error deleting neighborhood:', error);
      this.ui.error('שגיאה במחיקת השכונה');
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
