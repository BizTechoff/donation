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

    console.time('DonorMapController.loadDonorsMapData');

    // טען תורמים לפי IDs או את כולם
    // הגבל למקסימום 1000 תורמים למפה
    const MAX_DONORS = 1000;
    const donors = donorIds && donorIds.length > 0
      ? await donorRepo.find({
          where: { id: donorIds },
          limit: MAX_DONORS
        })
      : await donorRepo.find({ limit: MAX_DONORS });

    console.log(`DonorMapController: Loading ${donors.length} donors for map`);

    if (donors.length === 0) {
      return [];
    }

    const donorIdsList = donors.map(d => d.id);

    console.time('Load related data (places & contacts)');
    // טען את כל הנתונים הקשורים במקביל
    const [donorPlaces, contacts] = await Promise.all([
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

    console.timeEnd('Load related data (places & contacts)');
    console.log(`Loaded ${donorPlaces.length} places and ${contacts.length} contacts`);

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

    console.time('Load donations');
    // טען סטטיסטיקות תרומות
    const donationsByDonor = new Map<string, { count: number; total: number; lastDate: Date | null }>();

    const donationStats = await donationRepo.find({
      where: { donorId: donorIdsList }
    });
    console.timeEnd('Load donations');
    console.log(`Loaded ${donationStats.length} donations for ${donorIdsList.length} donors`);

    console.time('Calculate donation stats');
    // Calculate stats efficiently using a single pass
    donationStats.forEach(donation => {
      const existing = donationsByDonor.get(donation.donorId);
      if (!existing) {
        donationsByDonor.set(donation.donorId, {
          count: 1,
          total: donation.amount,
          lastDate: donation.donationDate
        });
      } else {
        existing.count++;
        existing.total += donation.amount;
        if (!existing.lastDate || (donation.donationDate && new Date(donation.donationDate) > new Date(existing.lastDate))) {
          existing.lastDate = donation.donationDate;
        }
      }
    });
    console.timeEnd('Calculate donation stats');

    console.time('Build result objects');
    // בנה את התוצאה עם כל הנתונים והסטטיסטיקות
    const result: DonorMapData[] = donors.map(donor => {
      const stats = donationsByDonor.get(donor.id);
      const donorPlace = donorPlaceMap.get(donor.id) || null;

      // חשב סטטיסטיקות
      const donationCount = stats?.count || 0;
      const totalDonations = stats?.total || 0;
      const averageDonation = donationCount > 0 ? totalDonations / donationCount : 0;
      const lastDonationDate = stats?.lastDate || null;

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
    console.timeEnd('Build result objects');

    console.timeEnd('DonorMapController.loadDonorsMapData');
    console.log(`DonorMapController: Returning ${result.length} donors with complete data`);

    return result;
  }
}
