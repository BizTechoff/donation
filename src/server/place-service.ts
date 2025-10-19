import { remult } from 'remult';
import { Place } from '../shared/entity/place';
import { Country } from '../shared/entity/country';

export class PlaceService {

  /**
   * Find or create a Country based on the country name and code from Google Places
   * Automatically creates new countries if not found (trusting Google)
   * Search is done purely based on the Country entity fields: name, nameEn, code
   */
  static async findOrCreateCountry(
    countryName: string | undefined,
    countryCode: string | undefined
  ): Promise<Country | undefined> {
    if (!countryName && !countryCode) return undefined;

    const countryRepo = remult.repo(Country);

    // Try to find by country code first (most reliable)
    if (countryCode) {
      const country = await countryRepo.findFirst({ code: countryCode.toUpperCase() });
      if (country) return country;
    }

    // Search by country name (Hebrew or English)
    if (countryName) {
      // Try Hebrew name
      let country = await countryRepo.findFirst({ name: countryName });
      if (country) return country;

      // Try English name
      country = await countryRepo.findFirst({ nameEn: countryName });
      if (country) return country;
    }

    // Country not found - create new country automatically with minimal data (trusting Google)
    // Note: Currency and symbol should be added manually to seed-countries.ts for complete data
    if (countryCode) {
      const newCountry = await countryRepo.insert({
        name: countryName || countryCode,
        nameEn: countryName || countryCode,
        code: countryCode.toUpperCase(),
        phonePrefix: '', // Should be filled manually in seed-countries.ts
        currency: 'USD', // Default, should be filled manually in seed-countries.ts
        currencySymbol: '$', // Default, should be filled manually in seed-countries.ts
        isActive: true
      });

      console.log(`⚠ New country created automatically with minimal data: ${newCountry.name} (${newCountry.nameEn}) - Code: ${newCountry.code}`);
      console.log(`   Please add full country details to seed/seed-countries.ts`);
      return newCountry;
    }

    // If we only have a name without code, create with minimal data
    if (countryName) {
      const newCountry = await countryRepo.insert({
        name: countryName,
        nameEn: countryName,
        code: '',
        phonePrefix: '',
        currency: 'USD',
        currencySymbol: '$',
        isActive: true
      });

      console.log(`⚠ New country created with minimal data: ${newCountry.name}`);
      console.log(`   Please add full country details to seed/seed-countries.ts`);
      return newCountry;
    }

    return undefined;
  }

  /**
   * Process place data from Google and set the country relationship
   * Automatically creates new countries if not found (trusting Google)
   */
  static async processPlaceWithCountry(placeData: Partial<Place>): Promise<Partial<Place>> {
    // If there's a country name or code in the place data, find or create the country
    if (placeData.countryName || placeData.countryCode) {
      const country = await this.findOrCreateCountry(placeData.countryName, placeData.countryCode);

      if (country) {
        // Found or created country - set the relationship
        placeData.countryId = country.id;
        placeData.countryEntity = country;
        // Also set country string for backward compatibility
        placeData.country = country.name || country.nameEn;
        // Update countryCode if it wasn't set but we have it from the country entity
        if (!placeData.countryCode && country.code) {
          placeData.countryCode = country.code;
        }
      }
    }

    return placeData;
  }
}