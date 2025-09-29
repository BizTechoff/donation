import { remult } from 'remult';
import { Place } from '../shared/entity/place';
import { Country } from '../shared/entity/country';

export class PlaceService {
  /**
   * Find or create a Country based on the country name from Google Places
   * Returns the Country entity if found, or undefined if not found
   */
  static async findCountryByName(countryName: string | undefined): Promise<Country | undefined> {
    if (!countryName) return undefined;

    const countryRepo = remult.repo(Country);

    // Search for country by Hebrew name
    let country = await countryRepo.findFirst({ name: countryName });

    if (country) return country;

    // Search for country by English name
    country = await countryRepo.findFirst({ nameEn: countryName });

    if (country) return country;

    // Try common variations
    const countryMappings: { [key: string]: string[] } = {
      'Israel': ['ישראל'],
      'ישראל': ['Israel'],
      'United States': ['ארצות הברית', 'אמריקה', 'USA', 'US'],
      'USA': ['ארצות הברית', 'אמריקה', 'United States'],
      'US': ['ארצות הברית', 'אמריקה', 'United States'],
      'ארצות הברית': ['United States', 'USA', 'US'],
      'אמריקה': ['United States', 'USA', 'US'],
      'Australia': ['אוסטרליה'],
      'אוסטרליה': ['Australia'],
      'Canada': ['קנדה'],
      'קנדה': ['Canada'],
      'United Kingdom': ['בריטניה', 'אנגליה', 'UK', 'Britain', 'England'],
      'UK': ['בריטניה', 'אנגליה', 'United Kingdom'],
      'בריטניה': ['United Kingdom', 'UK', 'Britain', 'England'],
      'אנגליה': ['United Kingdom', 'UK', 'Britain', 'England'],
      'France': ['צרפת'],
      'צרפת': ['France'],
      'Germany': ['גרמניה'],
      'גרמניה': ['Germany'],
      'Italy': ['איטליה'],
      'איטליה': ['Italy'],
      'Spain': ['ספרד'],
      'ספרד': ['Spain']
    };

    // Check if we have a mapping for this country name
    if (countryMappings[countryName]) {
      for (const altName of countryMappings[countryName]) {
        // Try Hebrew name
        country = await countryRepo.findFirst({ name: altName });
        if (country) return country;

        // Try English name
        country = await countryRepo.findFirst({ nameEn: altName });
        if (country) return country;
      }
    }

    // Country not found - return undefined
    // We don't create a new country because we don't have all required data (currency, etc.)
    console.log(`Country not found in database: ${countryName}. Leaving country field empty.`);
    return undefined;
  }

  /**
   * Process place data from Google and set the country relationship
   */
  static async processPlaceWithCountry(placeData: Partial<Place>): Promise<Partial<Place>> {
    // If there's a country name in the place data, try to find it in the database
    if (placeData.countryName) {
      const country = await this.findCountryByName(placeData.countryName);

      if (country) {
        // Found country - set the relationship
        placeData.countryId = country.id;
        placeData.countryEntity = country;
        // Also set country string for backward compatibility
        placeData.country = country.name || country.nameEn;
      } else {
        // Country not found - leave countryId empty but keep countryName for reference
        placeData.countryId = undefined;
        placeData.countryEntity = undefined;
        // Keep country string as the original name for backward compatibility
        placeData.country = placeData.countryName;
        // Keep countryName for backward compatibility and reference
      }
    }

    return placeData;
  }
}