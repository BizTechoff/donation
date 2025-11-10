import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService, DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { CityDetailsModalComponent } from '../city-details-modal/city-details-modal.component';
import { PlaceController, CityData } from '../../../../shared/controllers/place.controller';

export interface CitySelectionModalArgs {
  title?: string;
  multiSelect?: boolean;
  selectedCities?: string[]; // Array of city names
  countryId?: string; // Filter cities by country
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '800px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-city-selection-modal',
  templateUrl: './city-selection-modal.component.html',
  styleUrls: ['./city-selection-modal.component.scss']
})
export class CitySelectionModalComponent implements OnInit {
  args!: CitySelectionModalArgs;
  selectedCity: string | null = null;
  selectedCities: string[] = [];

  // Cities system
  availableCities: CityData[] = [];

  // Search
  searchTerm = '';

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private busy: BusyService
  ) {}

  async ngOnInit() {
    await this.loadCities();
  }

  async loadCities() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const data = await PlaceController.getCitiesForSelection(this.args?.countryId);
        this.availableCities = data.cities;

        // Pre-select cities if selectedCities provided (in multi-select mode)
        if (this.args?.multiSelect && this.args?.selectedCities && this.args.selectedCities.length > 0) {
          this.selectedCities = [...this.args.selectedCities];
        }
      } catch (error) {
        console.error('Error loading cities:', error);
      }
    });
  }

  // Filter cities based on search term
  getFilteredCities(): CityData[] {
    if (!this.searchTerm.trim()) {
      return this.availableCities;
    }

    const term = this.searchTerm.toLowerCase();
    return this.availableCities.filter(cityData =>
      cityData.city?.toLowerCase().includes(term)
    );
  }

  // Select city and close dialog immediately (single select mode)
  // Or toggle city selection in multi-select mode
  selectCity(cityData: CityData) {
    if (this.args.multiSelect) {
      this.toggleCitySelection(cityData.city);
    } else {
      this.selectedCity = cityData.city;
      setTimeout(() => {
        this.dialogRef.close(cityData.city);
      }, 100);
    }
  }

  // Toggle city selection in multi-select mode
  toggleCitySelection(city: string) {
    const index = this.selectedCities.indexOf(city);
    if (index === -1) {
      this.selectedCities.push(city);
    } else {
      this.selectedCities.splice(index, 1);
    }
  }

  // Check if city is selected (for multi-select mode)
  isCitySelected(city: string): boolean {
    return this.selectedCities.includes(city);
  }

  // Finish multi-select and close dialog with selected cities
  finishMultiSelect() {
    this.dialogRef.close(this.selectedCities);
  }

  // Open create new city modal
  async createNewCity() {
    try {
      const dialogResult = await openDialog(
        CityDetailsModalComponent,
        (modal: CityDetailsModalComponent) => {
          modal.args = {
            cityName: 'new',
            countryId: this.args?.countryId
          };
        }
      );

      if (dialogResult) {
        await this.loadCities();

        // Auto-select the newly created city
        if (typeof dialogResult === 'string') {
          if (this.args.multiSelect) {
            if (!this.selectedCities.includes(dialogResult)) {
              this.selectedCities.push(dialogResult);
            }
          } else {
            this.selectedCity = dialogResult;
            setTimeout(() => {
              this.dialogRef.close(dialogResult);
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('Error creating new city:', error);
    }
  }

  // Open edit city modal
  async editCity(cityData: CityData, event: Event) {
    event.stopPropagation();

    try {
      const dialogResult = await openDialog(
        CityDetailsModalComponent,
        (modal: CityDetailsModalComponent) => {
          modal.args = {
            cityName: cityData.city,
            countryId: cityData.countryId
          };
        }
      );

      if (dialogResult) {
        await this.loadCities();
      }
    } catch (error) {
      console.error('Error editing city:', error);
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
