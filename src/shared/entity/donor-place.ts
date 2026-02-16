import {
  Allow,
  Entity,
  Fields,
  IdEntity,
  isBackend,
  Relations,
  remult,
} from 'remult'
import { Donor } from './donor'
import { Place } from './place'
import { DonorAddressType } from './donor-address-type'

const HOME_ADDRESS_TYPE = 'בית';

@Entity<DonorPlace>('donor_places', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Allow.authenticated,
  allowApiInsert: Allow.authenticated,
  saving: async (donorPlace) => {
    if (isBackend()) {
      if (donorPlace._.isNew()) {
        donorPlace.createdDate = new Date()
      }
      donorPlace.updatedDate = new Date()
    }
  },
})
export class DonorPlace extends IdEntity {
  @Fields.string({ caption: 'מזהה תורם' })
  donorId?: string;

  @Relations.toOne(() => Donor, {
    field: "donorId",
    caption: 'תורם',
    defaultIncluded: true
  })
  donor?: Donor;

  @Fields.string({ caption: 'מזהה מיקום' })
  placeId?: string;

  @Relations.toOne(() => Place, {
    field: "placeId",
    caption: 'מיקום',
    defaultIncluded: true
  })
  place?: Place;

  @Fields.string({ caption: 'מזהה סוג כתובת' })
  addressTypeId?: string;

  @Relations.toOne(() => DonorAddressType, {
    field: "addressTypeId",
    caption: 'סוג כתובת',
    defaultIncluded: true
  })
  addressType?: DonorAddressType;

  @Fields.string({
    caption: 'תיאור הכתובת',
    allowNull: true,
  })
  description = '' // e.g., "בית", "עבודה", "קיץ", "הורים" - kept for backwards compatibility

  @Fields.boolean({
    caption: 'כתובת ראשית',
  })
  isPrimary = false

  @Fields.boolean({
    caption: 'פעיל',
  })
  isActive = true

  @Fields.createdAt({
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.updatedAt({
    caption: 'תאריך עדכון',
  })
  updatedDate = new Date()

  /**
   * מחזיר את הכתובת הראשית של תורם מתוך רשימת כתובות
   * הלוגיקה:
   * 1. קודם מחפש כתובת שמסומנת כראשית (isPrimary)
   * 2. אם אין - מחפש כתובת מסוג "בית"
   * 3. אם אין - מחזיר את הכתובת הפעילה הראשונה
   */
  static getPrimaryFromList(donorPlaces: DonorPlace[]): DonorPlace | undefined {
    if (!donorPlaces || donorPlaces.length === 0) return undefined;

    // 1. חפש כתובת שמסומנת כראשית
    const primaryPlace = donorPlaces.find(dp => dp.isActive && dp.isPrimary);
    if (primaryPlace) return primaryPlace;

    // 2. חפש כתובת מסוג "בית"
    const homePlace = donorPlaces.find(dp =>
      dp.isActive && dp.addressType?.name === HOME_ADDRESS_TYPE
    );
    if (homePlace) return homePlace;

    // 3. אם אין - החזר את הכתובת הפעילה הראשונה
    return donorPlaces.find(dp => dp.isActive);
  }

  /**
   * מחזיר מפה של תורם -> כתובת ראשית מתוך רשימת כתובות
   */
  static getPrimaryPlacesMap(donorPlaces: DonorPlace[]): Map<string, DonorPlace> {
    const result = new Map<string, DonorPlace>();

    // קבץ לפי תורם
    const byDonor = new Map<string, DonorPlace[]>();
    for (const dp of donorPlaces) {
      if (!dp.donorId || !dp.isActive) continue;
      if (!byDonor.has(dp.donorId)) {
        byDonor.set(dp.donorId, []);
      }
      byDonor.get(dp.donorId)!.push(dp);
    }

    // לכל תורם, מצא את הכתובת הראשית
    for (const [donorId, places] of byDonor) {
      const primary = DonorPlace.getPrimaryFromList(places);
      if (primary) {
        result.set(donorId, primary);
      }
    }

    return result;
  }

  /**
   * טוען את הכתובת הראשית של תורם מה-DB
   */
  static async getPrimaryForDonor(donorId: string): Promise<DonorPlace | undefined> {
    const donorPlaces = await remult.repo(DonorPlace).find({
      where: { donorId, isActive: true },
      include: { place: { include: { country: true } }, addressType: true }
    });

    return DonorPlace.getPrimaryFromList(donorPlaces);
  }

  /**
   * טוען את הכתובות הראשיות של מספר תורמים מה-DB
   */
  static async getPrimaryForDonors(donorIds: string[]): Promise<Map<string, DonorPlace>> {
    if (!donorIds || donorIds.length === 0) return new Map();

    const donorPlaces = await remult.repo(DonorPlace).find({
      where: { donorId: { $in: donorIds }, isActive: true },
      include: { place: { include: { country: true } }, addressType: true }
    });

    return DonorPlace.getPrimaryPlacesMap(donorPlaces);
  }
}
