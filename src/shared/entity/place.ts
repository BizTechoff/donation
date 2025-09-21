import { Entity, Field, Fields } from 'remult';

@Entity('places', {
  caption: 'מקומות',
  allowApiCrud: true
})
export class Place {
  @Fields.uuid()
  id!: string;

  @Fields.string({
    caption: 'Google Place ID',
    required: true,
    validate: (value:string) => {
      if (!value || value.trim().length === 0) {
        throw new Error('Place ID חובה');
      }
    }
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

  @Fields.string({
    caption: 'מדינה',
    required: true
  })
  country!: string;

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
    if (!placeData.placeId) {
      throw new Error('Place ID is required');
    }

    // Try to find existing place by placeId
    let place = await repo.findFirst({ placeId: placeData.placeId });

    if (!place) {
      // Create new place
      place = await repo.insert(placeData);
    } else {
      // Update existing place with new data
      Object.assign(place, placeData);
      await repo.save(place);
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
    if (this.country) parts.push(this.country);

    return parts.filter(p => p).join(', ');
  }
}