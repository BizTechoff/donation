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
    caption: 'מדינה'
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

  // Helper to get display address
  getDisplayAddress(): string {
    const parts = [];

    if (this.street) parts.push(this.street);
    if (this.houseNumber) parts.push(this.houseNumber);
    if (this.building) parts.push(this.building);
    if (this.apartment) parts.push(this.apartment);
    if (this.neighborhood) parts.push(this.neighborhood);
    if (this.city) parts.push(this.city);

    // Use country entity name if exists, otherwise use country string
    const countryDisplay = this.country?.name //|| this.country?.nameEn || this.country || this.countryName;
    if (countryDisplay) parts.push(countryDisplay);

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