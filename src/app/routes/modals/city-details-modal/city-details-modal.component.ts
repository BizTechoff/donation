import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Place } from '../../../../shared/entity/place';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';

export interface CityDetailsModalArgs {
  cityName?: string; // undefined or 'new' for new city, or city name for edit
  countryId?: string; // Optional country ID for filtering
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '600px',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-city-details-modal',
  templateUrl: './city-details-modal.component.html',
  styleUrls: ['./city-details-modal.component.scss']
})
export class CityDetailsModalComponent implements OnInit {
  args!: CityDetailsModalArgs;

  oldCityName?: string; // Original city name for editing
  newCityName: string = '';
  selectedCountryId?: string;

  placeRepo = remult.repo(Place);

  loading = false;
  isNew = false;
  placesWithThisCity: Place[] = [];

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<CityDetailsModalComponent>
  ) {}

  async ngOnInit() {
    await this.initializeCity();
  }

  private async initializeCity() {
    this.loading = true;
    try {
      if (!this.args?.cityName || this.args.cityName === 'new') {
        // New city
        this.isNew = true;
        this.newCityName = '';
        this.selectedCountryId = this.args?.countryId;
      } else {
        // Edit existing city
        this.isNew = false;
        this.oldCityName = this.args.cityName;
        this.newCityName = this.args.cityName;
        this.selectedCountryId = this.args?.countryId;

        // Load all places with this city name
        this.placesWithThisCity = await this.placeRepo.find({
          where: { city: this.args.cityName }
        });
      }
    } catch (error) {
      console.error('Error initializing city:', error);
      this.ui.error('שגיאה בטעינת נתוני העיר');
    } finally {
      this.loading = false;
    }
  }

  async save() {
    // Validation
    if (!this.newCityName || this.newCityName.trim() === '') {
      this.ui.error('נא להזין שם עיר');
      return;
    }

    const trimmedCityName = this.newCityName.trim();

    try {
      if (this.isNew) {
        // For new city, we just return the city name
        // The actual Place record will be created when assigned to a donor
        this.ui.info('העיר נוספה בהצלחה');
        this.dialogRef.close(trimmedCityName);
      } else {
        // For edit, update all places with the old city name to the new city name
        if (this.oldCityName && this.oldCityName !== trimmedCityName) {
          for (const place of this.placesWithThisCity) {
            place.city = trimmedCityName;
            await this.placeRepo.save(place);
          }
          this.ui.info(`העיר עודכנה בהצלחה (${this.placesWithThisCity.length} מקומות)`);
          this.dialogRef.close(trimmedCityName);
        } else {
          this.ui.info('לא בוצעו שינויים');
          this.dialogRef.close();
        }
      }
    } catch (error) {
      console.error('Error saving city:', error);
      this.ui.error('שגיאה בשמירת העיר');
    }
  }

  async delete() {
    if (this.isNew || !this.oldCityName) return;

    const confirmed = await this.ui.yesNoQuestion(
      `האם אתה בטוח שברצונך למחוק את העיר "${this.oldCityName}"? פעולה זו תסיר את שם העיר מ-${this.placesWithThisCity.length} מקומות.`
    );
    if (!confirmed) return;

    try {
      // Remove city name from all places (set to empty string)
      for (const place of this.placesWithThisCity) {
        place.city = '';
        await this.placeRepo.save(place);
      }
      this.ui.info('העיר נמחקה בהצלחה');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error deleting city:', error);
      this.ui.error('שגיאה במחיקת העיר');
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
