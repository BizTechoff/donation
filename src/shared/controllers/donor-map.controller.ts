import { BackendMethod, remult, Allow } from 'remult';
import { Donor } from '../entity/donor';
import { Donation } from '../entity/donation';
import { DonorPlace } from '../entity/donor-place';
import { DonorContact } from '../entity/donor-contact';

export interface DonorMapStats {
  donorId: string;
  donationCount: number;
  totalDonations: number;
  averageDonation: number;
  lastDonationDate: Date | null;
  status: 'active' | 'inactive' | 'high-donor' | 'recent-donor';
}

export interface DonorMapData {
  donor: Donor;
  donorPlace: DonorPlace | null;
  email: string | null;
  phone: string | null;
  fullAddress: string | null;
  stats: DonorMapStats;
}

export class DonorMapController {
  /**
   * טוען את כל הנתונים הדרושים למפת תורמים כולל סטטיסטיקות
   * @param donorIds מערך של IDs של תורמים לטעון (אם ריק, יטען את כולם)
   * @returns מערך של נתוני תורמים מעובדים עם סטטיסטיקות
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async loadDonorsMapData(donorIds?: string[]): Promise<DonorMapData[]> {
    const donorRepo = remult.repo(Donor);
    const donationRepo = remult.repo(Donation);
    const donorPlaceRepo = remult.repo(DonorPlace);
    const donorContactRepo = remult.repo(DonorContact);

    // טען תורמים לפי IDs או את כולם
    const donors = donorIds && donorIds.length > 0
      ? await donorRepo.find({ where: { id: donorIds } })
      : await donorRepo.find();

    if (donors.length === 0) {
      return [];
    }

    const donorIdsList = donors.map(d => d.id);

    // טען את כל הנתונים הקשורים במקביל
    const [donations, donorPlaces, contacts] = await Promise.all([
      // טען תרומות רק של התורמים הרלוונטיים
      donationRepo.find({
        where: { donorId: donorIdsList }
      }),
      // טען מקומות עם פרטי המקום
      donorPlaceRepo.find({
        where: {
          donorId: donorIdsList,
          isPrimary: true,
          isActive: true
        },
        include: { place: { include: { country: true } } }
      }),
      // טען אנשי קשר
      donorContactRepo.find({
        where: {
          donorId: donorIdsList,
          isPrimary: true,
          isActive: true
        }
      })
    ]);

    // צור מפות לגישה מהירה
    const donorPlaceMap = new Map(donorPlaces.map(dp => [dp.donorId, dp]));
    const emailMap = new Map<string, string>();
    const phoneMap = new Map<string, string>();

    // מלא מפות אימייל וטלפון
    contacts.forEach(contact => {
      if (contact.donorId) {
        if (contact.type === 'email' && contact.email && !emailMap.has(contact.donorId)) {
          emailMap.set(contact.donorId, contact.email);
        }
        if (contact.type === 'phone' && contact.phoneNumber && !phoneMap.has(contact.donorId)) {
          phoneMap.set(contact.donorId, contact.phoneNumber);
        }
      }
    });

    // קבץ תרומות לפי תורם
    const donationsByDonor = new Map<string, Donation[]>();
    donations.forEach(donation => {
      const existing = donationsByDonor.get(donation.donorId) || [];
      existing.push(donation);
      donationsByDonor.set(donation.donorId, existing);
    });

    // בנה את התוצאה עם כל הנתונים והסטטיסטיקות
    const result: DonorMapData[] = donors.map(donor => {
      const donorDonations = donationsByDonor.get(donor.id) || [];
      const donorPlace = donorPlaceMap.get(donor.id) || null;

      // חשב סטטיסטיקות
      const donationCount = donorDonations.length;
      const totalDonations = donorDonations.reduce((sum, d) => sum + d.amount, 0);
      const averageDonation = donationCount > 0 ? totalDonations / donationCount : 0;

      // מצא תאריך תרומה אחרונה
      const sortedDonations = donorDonations.sort((a, b) =>
        new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime()
      );
      const lastDonationDate = sortedDonations.length > 0 ? sortedDonations[0].donationDate : null;

      // קבע סטטוס
      let status: 'active' | 'inactive' | 'high-donor' | 'recent-donor' = 'inactive';
      if (donor.isActive) {
        if (totalDonations > 10000) {
          status = 'high-donor';
        } else if (lastDonationDate) {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          if (new Date(lastDonationDate) > threeMonthsAgo) {
            status = 'recent-donor';
          } else {
            status = 'active';
          }
        } else {
          status = 'active';
        }
      }

      // בנה כתובת מלאה
      let fullAddress = '';
      if (donorPlace?.place) {
        const place = donorPlace.place;
        fullAddress = place.fullAddress || '';
        if (!fullAddress) {
          // If no full address, build from components
          if (place.street) fullAddress = place.street;
          if (place.houseNumber) fullAddress += (fullAddress ? ' ' : '') + place.houseNumber;
          if (place.city) fullAddress += (fullAddress ? ', ' : '') + place.city;
          if (place.state) fullAddress += (fullAddress ? ', ' : '') + place.state;
          if (place.country) fullAddress += (fullAddress ? ', ' : '') + place.country.name;
        }
      }

      return {
        donor,
        donorPlace,
        email: emailMap.get(donor.id) || null,
        phone: phoneMap.get(donor.id) || null,
        fullAddress: fullAddress || null,
        stats: {
          donorId: donor.id,
          donationCount,
          totalDonations,
          averageDonation,
          lastDonationDate,
          status
        }
      };
    });

    return result;
  }
}
