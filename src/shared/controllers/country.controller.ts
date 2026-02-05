import { BackendMethod, Allow } from 'remult';
import { remult } from 'remult';
import { Country } from '../entity/country';
import { PlaceController } from './place.controller';

export interface CountrySelectionData {
  countries: Country[];
}

export class CountryController {
  @BackendMethod({ allowed: Allow.authenticated })
  static async getCountriesForSelection(excludeIds?: string[]): Promise<CountrySelectionData> {
    // Get only country IDs that have donors linked
    const placeData = await PlaceController.loadBaseForDonors();
    const donorCountryIds = placeData.countryIds;

    let countries: Country[];
    if (donorCountryIds.length > 0) {
      countries = await remult.repo(Country).find({
        where: { id: donorCountryIds },
        orderBy: { name: 'asc' }
      });
    } else {
      countries = [];
    }

    // Filter out excluded countries
    if (excludeIds && excludeIds.length > 0) {
      countries = countries.filter(country => !excludeIds.includes(country.id));
    }

    return { countries };
  }
}
