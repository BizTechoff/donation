import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService, DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { CountryController } from '../../../../shared/controllers/country.controller';
import { Country } from '../../../../shared/entity/country';
import { I18nService } from '../../../i18n/i18n.service';
import { PayerService } from '../../../services/payer.service';
import { CountryDetailsModalComponent } from '../country-details-modal/country-details-modal.component';

export interface CountrySelectionModalArgs {
  title?: string;
  excludeIds?: string[];
  multiSelect?: boolean;
  selectedIds?: string[];
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '800px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-country-selection-modal',
  templateUrl: './country-selection-modal.component.html',
  styleUrls: ['./country-selection-modal.component.scss']
})
export class CountrySelectionModalComponent implements OnInit {
  args!: CountrySelectionModalArgs;
  selectedCountry: Country | null = null;
  selectedCountries: Country[] = [];

  // Countries system
  availableCountries: Country[] = [];
  countryRepo = remult.repo(Country);

  currencyTypes = this.payer. getCurrencyTypesRecord()
  // Search
  searchTerm = '';

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private busy: BusyService,
    private payer: PayerService
  ) {}

  async ngOnInit() {
    await this.loadCountries();
  }

  async loadCountries() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const data = await CountryController.getCountriesForSelection(this.args?.excludeIds);
        this.availableCountries = data.countries;

        // Pre-select countries if selectedIds provided (in multi-select mode)
        if (this.args?.multiSelect && this.args?.selectedIds && this.args.selectedIds.length > 0) {
          this.selectedCountries = this.availableCountries.filter(country =>
            this.args.selectedIds!.includes(country.id)
          );
        }
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    });
  }

  // Filter countries based on search term, with selected items first in multi-select mode
  getFilteredCountries(): Country[] {
    let countries = this.availableCountries;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      countries = countries.filter(country =>
        country.name?.toLowerCase().includes(term) ||
        country.nameEn?.toLowerCase().includes(term) ||
        country.code?.toLowerCase().includes(term) ||
        country.phonePrefix?.toLowerCase().includes(term)
      );
    }

    // In multi-select mode, show selected items first
    if (this.args?.multiSelect) {
      const selected = countries.filter(c => this.isCountrySelected(c));
      const unselected = countries.filter(c => !this.isCountrySelected(c));
      return [...selected, ...unselected];
    }

    return countries;
  }

  // Select country and close dialog immediately (single select mode)
  // Or toggle country selection in multi-select mode
  selectCountry(country: Country) {
    if (this.args.multiSelect) {
      this.toggleCountrySelection(country);
    } else {
      this.selectedCountry = country;
      setTimeout(() => {
        this.dialogRef.close(country);
      }, 100);
    }
  }

  // Toggle country selection in multi-select mode
  toggleCountrySelection(country: Country) {
    const index = this.selectedCountries.findIndex(c => c.id === country.id);
    if (index === -1) {
      this.selectedCountries.push(country);
    } else {
      this.selectedCountries.splice(index, 1);
    }
  }

  // Check if country is selected (for multi-select mode)
  isCountrySelected(country: Country): boolean {
    return this.selectedCountries.some(c => c.id === country.id);
  }

  // Finish multi-select and close dialog with selected countries
  finishMultiSelect() {
    this.dialogRef.close(this.selectedCountries);
  }

  // Open create new country modal
  async createNewCountry() {
    try {
      const dialogResult = await openDialog(
        CountryDetailsModalComponent,
        (modal: CountryDetailsModalComponent) => {
          modal.args = { countryId: 'new' };
        }
      );

      if (dialogResult) {
        await this.loadCountries();

        if (this.availableCountries.length > 0) {
          const newestCountry = this.availableCountries.reduce((prev, current) =>
            (current.createdDate > prev.createdDate) ? current : prev
          );
          this.selectCountry(newestCountry);
        }
      }
    } catch (error) {
      console.error('Error creating new country:', error);
    }
  }

  // Open edit country modal
  async editCountry(country: Country, event: Event) {
    event.stopPropagation();

    try {
      const dialogResult = await openDialog(
        CountryDetailsModalComponent,
        (modal: CountryDetailsModalComponent) => {
          modal.args = { countryId: country.id };
        }
      );

      if (dialogResult) {
        await this.loadCountries();
      }
    } catch (error) {
      console.error('Error editing country:', error);
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

  // Get country display name
  getCountryDisplayName(country: Country): string {
    return country.displayName || country.name || 'מדינה';
  }

  // Toggle includeCountryInLetter and save to DB
  async toggleIncludeCountryInLetter(country: Country, event: any) {
    try {
      await this.countryRepo.save(country);
    } catch (error) {
      console.error('Error saving country setting:', error);
      // Revert the change on error
      country.includeCountryInLetter = !country.includeCountryInLetter;
    }
  }
}
