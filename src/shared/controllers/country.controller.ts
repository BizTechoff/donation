import { BackendMethod, Allow } from 'remult';
import { remult } from 'remult';
import { Country } from '../entity/country';

export interface CountrySelectionData {
  countries: Country[];
}

export class CountryController {
  @BackendMethod({ allowed: Allow.authenticated })
  static async getCountriesForSelection(excludeIds?: string[]): Promise<CountrySelectionData> {
    let countries = await remult.repo(Country).find({
      orderBy: { name: 'asc' }
    });

    // Filter out excluded countries
    if (excludeIds && excludeIds.length > 0) {
      countries = countries.filter(country => !excludeIds.includes(country.id));
    }

    return { countries };
  }
}
