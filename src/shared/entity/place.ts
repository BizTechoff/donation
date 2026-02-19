import { Allow, BackendMethod, Entity, Fields, Relations, isBackend, remult } from 'remult';
import { Country } from './country';

@Entity('places', {
  caption: 'מקומות',
  allowApiCrud: Allow.authenticated
})
export class Place {
  @Fields.uuid()
  id!: string;

  @Fields.string({
    caption: 'Google Place ID',
    required: true//,
    // validate: (value: string | null | undefined) => {
    //   console.log('Place validation - value:', value, 'type:', typeof value);
    //   if (!value || typeof value !== 'string' || value.trim().length === 0) {
    //     console.log('Place validation failed:', { value, type: typeof value, trimLength: value ? (typeof value === 'string' ? value.trim().length : 'not string') : 'no value' });
    //     throw new Error('Place ID חובה');
    //   }
    //   console.log('Place validation passed');
    // }
  })
  placeId!: string;

  @Fields.string({
    caption: 'כתובת מלאה',
    required: true
  })
  fullAddress!: string;

  @Fields.string({
    caption: 'שם המקום'
  })
  placeName?: string;

  @Fields.string({
    caption: 'רחוב'
  })
  street?: string;

  @Fields.string({
    caption: 'מספר בית'
  })
  houseNumber?: string;

  @Fields.string({
    caption: 'בניין'
  })
  building?: string;

  @Fields.string({
    caption: 'דירה'
  })
  apartment?: string;

  @Fields.string({
    caption: 'שכונה'
  })
  neighborhood?: string;

  @Fields.string({
    caption: 'עיר',
    // required: true
  })
  city!: string;

  @Fields.string({
    caption: 'מחוז/מדינה'
  })
  state?: string;

  @Fields.string({
    caption: 'מיקוד'
  })
  postcode?: string;

  // Country relationship
  @Fields.string({
    caption: 'מזהה מדינה'
  })
  countryId?: string;

  @Relations.toOne(() => Country, {
    field: 'countryId',
    caption: 'מדינה',
    defaultIncluded: true
  })
  country?: Country;

  @Fields.number({
    caption: 'קו רוחב'
  })
  latitude?: number;

  @Fields.number({
    caption: 'קו אורך'
  })
  longitude?: number;

  @Fields.createdAt()
  createdAt?: Date;

  @Fields.updatedAt()
  updatedAt?: Date;

  // Helper method to create or update a place
  static async findOrCreate(placeData: Partial<Place>, repo: any): Promise<Place> {
    console.log('Place.findOrCreate called with data:', placeData);

    if (!placeData.placeId) {
      console.error('Place ID is missing from placeData');
      throw new Error('Place ID is required');
    }

    console.log('Searching for existing place with placeId:', placeData.placeId);
    // Try to find existing place by placeId (with country relation)
    let place = await repo.findFirst(
      { placeId: placeData.placeId },
      { include: { country: true } }
    );

    if (!place) {
      console.log('Place not found, creating new place');
      try {
        // Create new place
        place = await repo.insert(placeData);
        console.log('New place created successfully:', place);

        // Reload with country relation
        if (place.id) {
          place = await repo.findId(place.id, { include: { country: true } }) || place;
          console.log('Place reloaded with country relation:', place.country);
        }
      } catch (error) {
        console.error('Error creating new place:', error);
        throw error;
      }
    } else {
      console.log('Existing place found, updating:', place);
      // Update existing place with new data
      Object.assign(place, placeData);
      await repo.save(place);

      // Reload with country relation to ensure it's fresh
      if (place.id) {
        place = await repo.findId(place.id, { include: { country: true } }) || place;
        console.log('Place reloaded after update with country relation:', place.country);
      }
      console.log('Place updated successfully');
    }

    return place;
  }

  // ========== Address Helper Functions ==========

  // Country code checks
  private isGBAddress(): boolean {
    const code = this.country?.code?.toUpperCase();
    return code === 'GB' || code === 'UK';
  }

  private isUSAddress(): boolean {
    const code = this.country?.code?.toUpperCase();
    return code === 'US' || code === 'USA';
  }

  private isCAAddress(): boolean {
    return this.country?.code?.toUpperCase() === 'CA';
  }

  private isAUAddress(): boolean {
    return this.country?.code?.toUpperCase() === 'AU';
  }

  // House number before street: UK/GB, CA, US
  private isHouseNumberFirst(): boolean {
    return this.isGBAddress() || this.isCAAddress() || this.isUSAddress();
  }

  // Include state in address: AU, CA, US
  private includeState(): boolean {
    return this.isAUAddress() || this.isCAAddress() || this.isUSAddress();
  }

  /**
   * שורת דירה ובניין - UK/GB בלבד
   * Returns: "Apt 5, Building A" or null
   */
  getApartmentLine(): string | null {
    if (!this.isGBAddress()) return null;

    const parts = [];
    if (this.apartment) parts.push(this.apartment);
    if (this.building) parts.push(this.building);

    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * שורת רחוב ומספר בית
   * UK/GB/CA/US: "10 Downing Street"
   * Others: "רחוב הרצל 10"
   */
  getStreetLine(): string {
    const parts = [];

    if (this.isHouseNumberFirst()) {
      if (this.houseNumber) parts.push(this.houseNumber);
      if (this.street) parts.push(this.street);
    } else {
      if (this.street) parts.push(this.street);
      if (this.houseNumber) parts.push(this.houseNumber);
    }

    return parts.join(' ').trim();
  }

  /**
   * שורת עיר, מחוז ומיקוד
   * AU/CA/US: "New York, NY 10001"
   * Others: "London SW1A 2AA"
   */
  getCityLine(): string {
    const parts = [];

    if (this.city) parts.push(this.city);
    if (this.includeState() && this.state) parts.push(this.state);
    if (this.postcode) parts.push(this.postcode);

    return parts.join(', ').trim();
  }

  /**
   * שורת מדינה - לפי הגדרת includeCountryInLetter
   * UK/GB/US: קוד מדינה
   * Others: שם מדינה
   */
  getCountryLine(): string | null {
    if (!this.country?.includeCountryInLetter) return null;

    // UK/GB/US show country code, others show name
    if (this.isGBAddress() || this.isUSAddress()) {
      return this.country.code?.toUpperCase() || null;
    }

    return this.country.nameEn || this.country.name || null;
  }

  /**
   * כתובת מלאה למכתב - מערך שורות
   */
  getAddressForLetter(): string[] {
    const lines = [
      this.getApartmentLine(),
      this.getStreetLine(),
      this.getCityLine(),
      this.getCountryLine()
    ];

    return lines.filter(line => line && line.trim().length > 0) as string[];
  }

  /**
   * כתובת מלאה לתצוגה - שורה אחת
   */
  getDisplayAddress(): string {
    const parts = [];

    // Apartment & Building - שימוש בפונקציה המרכזית (UK/GB בלבד)
    const apartmentLine = this.getApartmentLine();
    if (apartmentLine) parts.push(apartmentLine);

    // Street line
    const streetLine = this.getStreetLine();
    if (streetLine) parts.push(streetLine);

    // Neighborhood
    if (this.neighborhood) parts.push(this.neighborhood);

    // City line (includes state for AU/CA/US)
    const cityLine = this.getCityLine();
    if (cityLine) parts.push(cityLine);

    // Country - שימוש בפונקציה המרכזית (לפי includeCountryInLetter)
    const countryLine = this.getCountryLine();
    if (countryLine) parts.push(countryLine);

    return parts.filter(p => p).join(', ');
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async geocodeMissingPlaces() {
    if (isBackend()) {
      const { geocodeMissingPlaces } = await import('../../server/geocode-places');
      return await geocodeMissingPlaces();
    }
    return { success: false, message: 'Backend only method' };
  }
}