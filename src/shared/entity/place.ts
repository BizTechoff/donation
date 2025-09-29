import { Entity, Field, Fields, Relations, isBackend } from 'remult';
import { Country } from './country';

@Entity('places', {
  caption: 'מקומות',
  allowApiCrud: true
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
    caption: 'שכונה'
  })
  neighborhood?: string;

  @Fields.string({
    caption: 'עיר',
    required: true
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

  // Country as string for backward compatibility
  @Fields.string({
    caption: 'מדינה'
  })
  country?: string;

  // Country name field for storing original country name from Google
  @Fields.string({
    caption: 'שם מדינה מקורי',
    includeInApi: false
  })
  countryName?: string;

  // Country relationship
  @Fields.string({
    caption: 'מזהה מדינה'
  })
  countryId?: string;

  @Relations.toOne(() => Country, {
    field: 'countryId',
    caption: 'מדינה (קשר)'
  })
  countryEntity?: Country;

  @Fields.string({
    caption: 'קוד מדינה'
  })
  countryCode?: string;

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

    // Process country information if we're on the backend
    if (isBackend()) {
      // Import PlaceService only on backend to avoid circular dependencies
      const { PlaceService } = await import('../../server/place-service');

      // If countryName exists but countryId doesn't, try to find the country
      if (placeData.countryName && !placeData.countryId) {
        const processedData = await PlaceService.processPlaceWithCountry(placeData);
        placeData = processedData;
      }
    }

    console.log('Searching for existing place with placeId:', placeData.placeId);
    // Try to find existing place by placeId
    let place = await repo.findFirst({ placeId: placeData.placeId });

    if (!place) {
      console.log('Place not found, creating new place');
      try {
        // Create new place
        place = await repo.insert(placeData);
        console.log('New place created successfully:', place);
      } catch (error) {
        console.error('Error creating new place:', error);
        throw error;
      }
    } else {
      console.log('Existing place found, updating:', place);
      // Update existing place with new data
      Object.assign(place, placeData);
      await repo.save(place);
      console.log('Place updated successfully');
    }

    return place;
  }

  // Helper to get display address
  getDisplayAddress(): string {
    const parts = [];

    if (this.street) parts.push(this.street);
    if (this.houseNumber) parts.push(this.houseNumber);
    if (this.neighborhood) parts.push(this.neighborhood);
    if (this.city) parts.push(this.city);

    // Use country entity name if exists, otherwise use country string
    const countryDisplay = this.countryEntity?.name || this.countryEntity?.nameEn || this.country || this.countryName;
    if (countryDisplay) parts.push(countryDisplay);

    return parts.filter(p => p).join(', ');
  }
}