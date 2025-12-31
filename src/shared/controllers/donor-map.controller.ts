import { Allow, BackendMethod, remult } from 'remult';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { Donation } from '../entity/donation';
import { Donor } from '../entity/donor';
import { DonorContact } from '../entity/donor-contact';
import { DonorPlace } from '../entity/donor-place';

// ממשק לפילטרים מקומיים של המפה
export interface MapFilters {
  searchTerm?: string;
  minDonationCount?: number;
  statusFilter?: Array<'active' | 'inactive' | 'high-donor' | 'recent-donor'>;
  hasCoordinates?: boolean | null;
  minTotalDonations?: number;
  maxTotalDonations?: number;
  hasRecentDonation?: boolean | null;
}

// ממשק למרקר קל על המפה
export interface MarkerData {
  donorId: string;
  lat: number;
  lng: number;
  donorName: string;
  status: 'active' | 'inactive' | 'high-donor' | 'recent-donor';
}

/**
 * סטטיסטיקות כלליות של המפה
 * כל הסכומים הם בשקלים (₪)
 */
export interface MapStatistics {
  totalDonors: number;
  activeDonors: number;
  donorsOnMap: number;
  /** ממוצע תרומה בשקלים */
  averageDonation: number;
}

/**
 * סטטיסטיקות תרומות של תורם עבור המפה
 * לא כולל התחייבויות, כולל שותפויות
 */
export interface DonorMapStats {
  donorId: string;

  // סה"כ תרומות (לא כולל התחייבויות, כולל שותפויות)
  totalDonations: number;
  totalDonationsPartnerCount: number;
  totalDonationsCurrencySymbol: string;

  // מספר תרומות (לא כולל התחייבויות, כולל שותפויות)
  donationCount: number;
  donationCountPartnerCount: number;

  // ממוצע 12 חודשים אחרונים (לא כולל חריגות, לא כולל התחייבויות, כולל שותפויות)
  averageDonation: number;
  averageDonationPartnerCount: number;
  averageDonationCurrencySymbol: string;

  // תרומה אחרונה
  lastDonationDate: Date | null;
  lastDonationAmount: number;
  lastDonationCurrencySymbol: string;
  lastDonationIsPartner: boolean;

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

  static HIGH_DONOR_AMOUNT = 1500
  static RECENT_DONOR_MONTHS = 3

  /**
   * מתודה פנימית - מחזירה IDs של תורמים לפי פילטרים מקומיים של המפה
   * @param mapFilters פילטרים מקומיים (searchTerm, minDonationCount)
   * @returns מערך של donorIds
   */
  private static async getDonorIds(mapFilters: MapFilters): Promise<string[]> {
    const donorRepo = remult.repo(Donor);
    const donationRepo = remult.repo(Donation);

    let donorIds: string[] | undefined = undefined;

    // searchTerm - חיפוש בשם
    if (mapFilters.searchTerm?.trim()) {
      const term = mapFilters.searchTerm.trim();
      const donors = await donorRepo.find({
        where: {
          isActive: true,
          $or: [
            { firstName: { $contains: term } },
            { lastName: { $contains: term } }
          ]
        }
      });
      donorIds = donors.map(d => d.id);
    }

    // Donation-based filters (minDonationCount, minTotalDonations, maxTotalDonations)
    const needsDonationData = (mapFilters.minDonationCount && mapFilters.minDonationCount > 0) ||
      (mapFilters.minTotalDonations && mapFilters.minTotalDonations > 0) ||
      (mapFilters.maxTotalDonations && mapFilters.maxTotalDonations < 999999999);

    if (needsDonationData) {
      // טען תרומות
      const donations = await donationRepo.find({
        where: donorIds ? { donorId: { $in: donorIds } } : {}
      });

      // חשב סטטיסטיקות תרומות
      const donationStats = new Map<string, { count: number; total: number }>();
      donations.forEach(d => {
        const stats = donationStats.get(d.donorId) || { count: 0, total: 0 };
        stats.count++;
        stats.total += d.amount;
        donationStats.set(d.donorId, stats);
      });

      // סנן לפי הקריטריונים
      let filteredIds = Array.from(donationStats.keys());

      if (mapFilters.minDonationCount && mapFilters.minDonationCount > 0) {
        filteredIds = filteredIds.filter(id => {
          const stats = donationStats.get(id);
          return stats && stats.count >= mapFilters.minDonationCount!;
        });
      }

      if (mapFilters.minTotalDonations && mapFilters.minTotalDonations > 0) {
        filteredIds = filteredIds.filter(id => {
          const stats = donationStats.get(id);
          return stats && stats.total >= mapFilters.minTotalDonations!;
        });
      }

      if (mapFilters.maxTotalDonations && mapFilters.maxTotalDonations < 999999999) {
        filteredIds = filteredIds.filter(id => {
          const stats = donationStats.get(id);
          return stats && stats.total <= mapFilters.maxTotalDonations!;
        });
      }

      donorIds = donorIds
        ? donorIds.filter(id => filteredIds.includes(id))  // חיתוך עם searchTerm
        : filteredIds;
    }

    // אם אין פילטרים מקומיים - החזר את כולם
    if (!donorIds) {
      const donors = await donorRepo.find({ where: { isActive: true } });
      donorIds = donors.map(d => d.id);
    }

    return donorIds;
  }

  /**
   * מחזיר מרקרים קלים למפה (רק lat, lng, name)
   * מבצע פילטור דו-שלבי: גלובלי + מקומי
   * @param mapFilters פילטרים מקומיים של המפה
   * @returns מערך של MarkerData
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getMapMarkers(mapFilters: MapFilters): Promise<MarkerData[]> {
    console.time('DonorMapController.getMapMarkers - Total');

    // שלב 1: קבל IDs מהפילטרים הגלובליים (מ-user.settings)
    console.time('Get global donor IDs');
    const { GlobalFilterController } = await import('./global-filter.controller');
    const globalDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();
    console.timeEnd('Get global donor IDs');
    console.log(`Global filters: ${globalDonorIds?.length ?? 'all'} donors`);

    // שלב 2: קבל IDs מהפילטרים המקומיים של המפה
    console.time('Get local map donor IDs');
    const localDonorIds = await DonorMapController.getDonorIds(mapFilters);
    console.timeEnd('Get local map donor IDs');
    console.log(`Map filters: ${localDonorIds.length} donors`);

    // שלב 3: חיתוך - רק IDs שנמצאים בשני הקבוצות
    console.time('Intersection');
    let intersectedIds: string[];
    if (globalDonorIds === undefined) {
      // אין פילטרים גלובליים - קח רק את המקומיים
      intersectedIds = localDonorIds;
    } else {
      const globalSet = new Set(globalDonorIds);
      intersectedIds = localDonorIds.filter(id => globalSet.has(id));
    }
    console.timeEnd('Intersection');
    console.log(`After intersection: ${intersectedIds.length} donors`);

    // שלב 4: שלוף רק lat, lng, name עבור התורמים הממוסננים
    console.time('Load marker data');
    const donorPlaceRepo = remult.repo(DonorPlace);
    const donorRepo = remult.repo(Donor);

    if (intersectedIds.length === 0) {
      console.timeEnd('Load marker data');
      console.timeEnd('DonorMapController.getMapMarkers - Total');
      return [];
    }

    // טען DonorPlaces עם Place מלא (כולל קואורדינטות)
    const donorPlaces = await donorPlaceRepo.find({
      where: {
        donorId: { $in: intersectedIds },
        isActive: true
      },
      include: {
        place: true
      }
    });

    // צור מפה של donorId -> מיקום (רק אלו עם קואורדינטות תקינות)
    const locationMap = new Map<string, { lat: number; lng: number }>();
    donorPlaces.forEach(dp => {
      if (dp.donorId && dp.place?.latitude && dp.place?.longitude && !locationMap.has(dp.donorId)) {
        locationMap.set(dp.donorId, {
          lat: dp.place.latitude,
          lng: dp.place.longitude
        });
      }
    });

    // טען שמות של התורמים
    const donorIdsWithLocation = Array.from(locationMap.keys());
    const donors = await donorRepo.find({
      where: { id: { $in: donorIdsWithLocation } }
    });

    // טען סטטיסטיקות תרומות לחישוב סטטוס
    const donationRepo = remult.repo(Donation);
    const donations = await donationRepo.find({
      where: { donorId: { $in: donorIdsWithLocation } }
    });

    // טען שערי המרה של מטבעות
    const { PayerService } = await import('../../app/services/payer.service');
    const payerService = new PayerService();
    const currencyTypes = payerService.getCurrencyTypesRecord();

    // חשב סטטיסטיקות תרומות לכל תורם (המר הכל לשקלים)
    const donationStatsByDonor = new Map<string, { total: number; lastDate: Date | null }>();
    donations.forEach(donation => {
      // המר סכום לשקלים
      const rate = currencyTypes[donation.currencyId]?.rateInShekel || 1;
      const amountInShekel = donation.amount * rate;

      const existing = donationStatsByDonor.get(donation.donorId);
      if (!existing) {
        donationStatsByDonor.set(donation.donorId, {
          total: amountInShekel,
          lastDate: donation.donationDate
        });
      } else {
        existing.total += amountInShekel;
        if (!existing.lastDate || (donation.donationDate && new Date(donation.donationDate) > new Date(existing.lastDate))) {
          existing.lastDate = donation.donationDate;
        }
      }
    });

    // בנה מערך מרקרים עם סטטוס
    const markers: MarkerData[] = donors
      .filter(d => locationMap.has(d.id))
      .map(d => {
        const stats = donationStatsByDonor.get(d.id);
        const totalDonations = stats?.total || 0;
        const lastDonationDate = stats?.lastDate || null;

        // קבע סטטוס (אותה לוגיקה כמו ב-loadDonorsMapData)
        let status: 'active' | 'inactive' | 'high-donor' | 'recent-donor' = 'recent-donor';
        if (d.isActive) {
          if (totalDonations > DonorMapController.HIGH_DONOR_AMOUNT) {
            status = 'high-donor';
          } else if (lastDonationDate) {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - DonorMapController.RECENT_DONOR_MONTHS);
            if (new Date(lastDonationDate) > threeMonthsAgo) {
              status = 'recent-donor';
            } else {
              status = 'active';
            }
          } else {
            status = 'active';
          }
        }

        return {
          donorId: d.id,
          lat: locationMap.get(d.id)!.lat,
          lng: locationMap.get(d.id)!.lng,
          donorName: d.lastAndFirstName,
          status
        };
      });

    // Apply client-side filters (filters that work on already calculated data)
    let filteredMarkers = markers;

    // Status filter
    if (mapFilters.statusFilter && mapFilters.statusFilter.length > 0) {
      filteredMarkers = filteredMarkers.filter(m => mapFilters.statusFilter!.includes(m.status));
    }

    // Has coordinates - all markers already have coordinates, so this filter doesn't apply here
    // (markers without coordinates were already filtered out)

    // Has recent donation filter
    if (mapFilters.hasRecentDonation !== null && mapFilters.hasRecentDonation !== undefined) {
      if (mapFilters.hasRecentDonation) {
        filteredMarkers = filteredMarkers.filter(m => m.status === 'recent-donor');
      } else {
        filteredMarkers = filteredMarkers.filter(m => m.status !== 'recent-donor');
      }
    }

    console.timeEnd('Load marker data');
    console.timeEnd('DonorMapController.getMapMarkers - Total');

    return filteredMarkers;
  }

  /**
   * מחזיר סטטיסטיקות כלליות למפה (בלי לטעון את כל הנתונים)
   * @param mapFilters פילטרים מקומיים של המפה
   * @returns סטטיסטיקות כלליות
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getMapStatistics(mapFilters: MapFilters): Promise<MapStatistics> {
    console.time('DonorMapController.getMapStatistics');

    const { GlobalFilterController } = await import('./global-filter.controller');

    // שלב 1: קבל IDs מהפילטרים הגלובליים
    const globalDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();

    // שלב 2: קבל IDs מהפילטרים המקומיים
    const localDonorIds = await DonorMapController.getDonorIds(mapFilters);

    // שלב 3: חיתוך
    let intersectedIds: string[];
    if (globalDonorIds === undefined) {
      intersectedIds = localDonorIds;
    } else {
      const globalSet = new Set(globalDonorIds);
      intersectedIds = localDonorIds.filter(id => globalSet.has(id));
    }

    const donorRepo = remult.repo(Donor);
    const donorPlaceRepo = remult.repo(DonorPlace);
    const donationRepo = remult.repo(Donation);

    // ספירת תורמים כללית
    const donors = await donorRepo.find({
      where: { id: { $in: intersectedIds } }
    });

    const totalDonors = donors.length;
    const activeDonors = donors.filter(d => d.isActive).length;

    // ספירת תורמים עם קואורדינטות
    const donorPlaces = await donorPlaceRepo.find({
      where: {
        donorId: { $in: intersectedIds },
        isActive: true
      },
      include: {
        place: true
      }
    });

    const donorsWithCoordinates = new Set<string>();
    donorPlaces.forEach(dp => {
      if (dp.donorId && dp.place?.latitude && dp.place?.longitude) {
        donorsWithCoordinates.add(dp.donorId);
      }
    });

    const donorsOnMap = donorsWithCoordinates.size;

    // חישוב ממוצע תרומות (בשקלים)
    const donations = await donationRepo.find({
      where: { donorId: { $in: intersectedIds } }
    });

    // טען שערי המרה של מטבעות
    const { PayerService } = await import('../../app/services/payer.service');
    const payerService = new PayerService();
    const currencyTypes = await payerService.getCurrencyTypesRecord();

    // חשב סכום כולל בשקלים
    const totalAmount = donations.reduce((sum, d) => {
      const rate = currencyTypes[d.currencyId]?.rateInShekel || 1;
      return sum + (d.amount * rate);
    }, 0);
    const totalCount = donations.length;
    const averageDonation = totalCount > 0 ? totalAmount / totalCount : 0;

    console.timeEnd('DonorMapController.getMapStatistics');

    return {
      totalDonors,
      activeDonors,
      donorsOnMap,
      averageDonation
    };
  }

  /**
   * מחזיר פרטים מלאים של תורם ספציפי (לפופאפ)
   * @param donorId מזהה התורם
   * @returns DonorMapData עם כל הפרטים
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonorMapDetails(donorId: string): Promise<DonorMapData> {
    const results = await DonorMapController.loadDonorsMapDataByIds([donorId]);
    if (results.length === 0) {
      throw new Error(`Donor not found: ${donorId}`);
    }
    return results[0];
  }

  /**
   * טוען את כל הנתונים הדרושים למפת תורמים כולל סטטיסטיקות
   * מושך גלובל פילטרים מ-user.settings, ממזג עם פילטרים נוספים ומחיל אותם על השאילתא
   * @param additionalFilters פילטרים נוספים מהקליינט (searchTerm, minTotalDonations וכו')
   * @returns מערך של נתוני תורמים מעובדים עם סטטיסטיקות
   * @deprecated השתמש ב-getMapMarkers במקום
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async loadDonorsMapData(additionalFilters?: Partial<GlobalFilters>): Promise<DonorMapData[]> {
    const { DonorController } = await import('./donor.controller');
    const { User } = await import('../entity/user');

    console.time('DonorMapController.loadDonorsMapData - Total');

    // 🎯 Fetch global filters from user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters = {};
    if (currentUserId) {
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters || {};
    }

    // Merge global filters with additional filters (from client)
    const mergedFilters: GlobalFilters = { ...globalFilters, ...additionalFilters };

    console.log('DonorMapController: Global filters:', globalFilters);
    console.log('DonorMapController: Additional filters:', additionalFilters);
    console.log('DonorMapController: Merged filters:', mergedFilters);

    // קבל IDs ממוסננים (משתמש בפילטרים הממוזגים)
    console.time('Get filtered donor IDs');
    const donorIds = await DonorController.findFilteredIds(mergedFilters);
    console.timeEnd('Get filtered donor IDs');
    console.log(`DonorMapController: Got ${donorIds.length} filtered donor IDs`);

    // טען את הנתונים המלאים
    const result = await DonorMapController.loadDonorsMapDataByIds(donorIds);

    console.timeEnd('DonorMapController.loadDonorsMapData - Total');
    return result;
  }

  /**
   * טוען נתוני מפה עבור רשימת IDs ספציפית
   * @param donorIds מערך של IDs של תורמים לטעון
   * @returns מערך של נתוני תורמים מעובדים עם סטטיסטיקות
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async loadDonorsMapDataByIds(donorIds?: string[]): Promise<DonorMapData[]> {
    const donorRepo = remult.repo(Donor);
    const donationRepo = remult.repo(Donation);
    const donorPlaceRepo = remult.repo(DonorPlace);
    const donorContactRepo = remult.repo(DonorContact);

    console.time('DonorMapController.loadDonorsMapData');

    // If donorIds is explicitly provided as empty array, return empty result
    if (donorIds && donorIds.length === 0) {
      console.log('DonorMapController: No donor IDs provided, returning empty result');
      return [];
    }

    // טען תורמים לפי IDs או את כולם
    const MAX_DONORS = 1000; // הגבלה רק כשטוענים הכל (בלי פילטור)
    const donors = donorIds && donorIds.length > 0
      ? await donorRepo.find({
        where: { id: donorIds }
        // אין limit כאן - אם כבר סיננו, נציג את כל התוצאות
      })
      : await donorRepo.find({ limit: MAX_DONORS }); // הגבלה רק כשטוענים הכל

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
    // טען תרומות - גם כתורם ראשי וגם כשותף
    // לא כולל התחייבויות (donationType !== 'commitment')
    const [donationsAsPrimary, donationsAsPartner] = await Promise.all([
      // תרומות שהתורם הוא הראשי
      donationRepo.find({
        where: {
          donorId: { $in: donorIdsList },
          donationType: { $ne: 'commitment' }
        }
      }),
      // תרומות שהתורם הוא שותף
      donationRepo.find({
        where: {
          donationType: { $ne: 'commitment' }
        }
      }).then(donations => donations.filter(d =>
        d.partnerIds && d.partnerIds.some(pid => donorIdsList.includes(pid))
      ))
    ]);
    console.timeEnd('Load donations');
    console.log(`Loaded ${donationsAsPrimary.length} primary donations and ${donationsAsPartner.length} partner donations`);

    console.time('Calculate donation stats');
    // טען שערי המרה של מטבעות
    const { PayerService } = await import('../../app/services/payer.service');
    const payerService = new PayerService();
    const currencyTypes = await payerService.getCurrencyTypesRecord();

    // חישוב 12 חודשים אחרונים לממוצע
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // מבנה נתונים לסטטיסטיקות מפורטות
    interface DonorStatsData {
      // סה"כ תרומות - לפי מטבע (ללא המרה)
      totalAmountByCurrency: Map<string, number>;
      totalCount: number;
      totalPartnerCount: number;

      // ממוצע 12 חודשים (לא כולל חריגות) - לפי מטבע
      avg12MonthsByCurrency: Map<string, number>;
      avg12MonthsCount: number;
      avg12MonthsPartnerCount: number;

      // תרומה אחרונה
      lastDonation: {
        date: Date | null;
        amount: number;
        currencyId: string;
        isPartner: boolean;
      };
    }

    const donorStatsMap = new Map<string, DonorStatsData>();

    // פונקציה לאתחול סטטיסטיקות תורם
    const initDonorStats = (): DonorStatsData => ({
      totalAmountByCurrency: new Map(),
      totalCount: 0,
      totalPartnerCount: 0,
      avg12MonthsByCurrency: new Map(),
      avg12MonthsCount: 0,
      avg12MonthsPartnerCount: 0,
      lastDonation: { date: null, amount: 0, currencyId: '', isPartner: false }
    });

    // פונקציה לעדכון סטטיסטיקות
    const updateStats = (donorId: string, donation: Donation, isPartner: boolean) => {
      let stats = donorStatsMap.get(donorId);
      if (!stats) {
        stats = initDonorStats();
        donorStatsMap.set(donorId, stats);
      }

      // עדכון סה"כ - שמור לפי מטבע (ללא המרה)
      const currentTotal = stats.totalAmountByCurrency.get(donation.currencyId) || 0;
      stats.totalAmountByCurrency.set(donation.currencyId, currentTotal + donation.amount);
      stats.totalCount++;
      if (isPartner) stats.totalPartnerCount++;

      // עדכון ממוצע 12 חודשים (לא כולל חריגות) - לפי מטבע
      if (donation.donationDate && new Date(donation.donationDate) >= twelveMonthsAgo && !donation.isExceptional) {
        const currentAvg = stats.avg12MonthsByCurrency.get(donation.currencyId) || 0;
        stats.avg12MonthsByCurrency.set(donation.currencyId, currentAvg + donation.amount);
        stats.avg12MonthsCount++;
        if (isPartner) stats.avg12MonthsPartnerCount++;
      }

      // עדכון תרומה אחרונה
      if (!stats.lastDonation.date || (donation.donationDate && new Date(donation.donationDate) > new Date(stats.lastDonation.date))) {
        stats.lastDonation = {
          date: donation.donationDate,
          amount: donation.amount,
          currencyId: donation.currencyId,
          isPartner
        };
      }
    };

    // עבור על תרומות ראשיות
    donationsAsPrimary.forEach(donation => {
      updateStats(donation.donorId, donation, false);
    });

    // עבור על תרומות כשותף
    // חשוב: דלג על התורם הראשי אם הוא גם ברשימת השותפים כדי לא לספור פעמיים
    donationsAsPartner.forEach(donation => {
      donation.partnerIds?.forEach(partnerId => {
        if (donorIdsList.includes(partnerId) && partnerId !== donation.donorId) {
          updateStats(partnerId, donation, true);
        }
      });
    });

    /**
     * פונקציה לחישוב סכום כולל ומטבע תצוגה
     * אם יש מטבע אחד בלבד - מחזיר את הסכום המקורי במטבע המקורי (ללא המרה)
     * אם יש כמה מטבעות - ממיר הכל למטבע של כתובת הבית של התורם
     */
    const calculateTotalAndCurrency = (
      amountByCurrency: Map<string, number>,
      donorId: string
    ): { total: number; currencyId: string } => {
      if (amountByCurrency.size === 0) {
        return { total: 0, currencyId: 'ILS' };
      }

      // אם יש מטבע אחד בלבד - החזר את הסכום המקורי במטבע המקורי
      if (amountByCurrency.size === 1) {
        const currencyId = amountByCurrency.keys().next().value || 'ILS';
        const total = amountByCurrency.get(currencyId) || 0;
        return { total, currencyId };
      }

      // אם יש כמה מטבעות - המר הכל למטבע של כתובת הבית
      const donorPlace = donorPlaceMap.get(donorId);
      const targetCurrencyId = donorPlace?.place?.country?.currencyId || 'ILS';
      const targetRate = currencyTypes[targetCurrencyId]?.rateInShekel || 1;

      let totalInTarget = 0;
      amountByCurrency.forEach((amount, currencyId) => {
        const sourceRate = currencyTypes[currencyId]?.rateInShekel || 1;
        // המר לשקלים ואז למטבע היעד
        const amountInShekel = amount * sourceRate;
        const amountInTarget = amountInShekel / targetRate;
        totalInTarget += amountInTarget;
      });

      return { total: totalInTarget, currencyId: targetCurrencyId };
    };

    console.timeEnd('Calculate donation stats');

    console.time('Build result objects');
    // בנה את התוצאה עם כל הנתונים והסטטיסטיקות
    const result: DonorMapData[] = donors.map(donor => {
      const stats = donorStatsMap.get(donor.id);
      const donorPlace = donorPlaceMap.get(donor.id) || null;

      // חשב סטטיסטיקות - עם לוגיקת מטבע חכמה
      const donationCount = stats?.totalCount || 0;
      const lastDonationDate = stats?.lastDonation.date || null;

      // חשב סה"כ תרומות עם מטבע מתאים
      const totalResult = calculateTotalAndCurrency(
        stats?.totalAmountByCurrency || new Map(),
        donor.id
      );

      // חשב ממוצע 12 חודשים עם מטבע מתאים
      const avgResult = calculateTotalAndCurrency(
        stats?.avg12MonthsByCurrency || new Map(),
        donor.id
      );
      const averageDonation = stats?.avg12MonthsCount ? avgResult.total / stats.avg12MonthsCount : 0;

      // מטבע תרומה אחרונה - תמיד המטבע המקורי
      const lastCurrency = stats?.lastDonation.currencyId || 'ILS';

      // קבע סטטוס - לצורך סטטוס צריך להמיר לשקלים לצורך השוואה
      let totalInShekelForStatus = 0;
      stats?.totalAmountByCurrency.forEach((amount, currencyId) => {
        const rate = currencyTypes[currencyId]?.rateInShekel || 1;
        totalInShekelForStatus += amount * rate;
      });

      let status: 'active' | 'inactive' | 'high-donor' | 'recent-donor' = 'inactive';
      if (donor.isActive) {
        if (totalInShekelForStatus > DonorMapController.HIGH_DONOR_AMOUNT) {
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
          // סה"כ תרומות
          totalDonations: totalResult.total,
          totalDonationsPartnerCount: stats?.totalPartnerCount || 0,
          totalDonationsCurrencySymbol: currencyTypes[totalResult.currencyId]?.symbol || '₪',
          // מספר תרומות
          donationCount,
          donationCountPartnerCount: stats?.totalPartnerCount || 0,
          // ממוצע 12 חודשים
          averageDonation,
          averageDonationPartnerCount: stats?.avg12MonthsPartnerCount || 0,
          averageDonationCurrencySymbol: currencyTypes[avgResult.currencyId]?.symbol || '₪',
          // תרומה אחרונה
          lastDonationDate,
          lastDonationAmount: stats?.lastDonation.amount || 0,
          lastDonationCurrencySymbol: currencyTypes[lastCurrency]?.symbol || '₪',
          lastDonationIsPartner: stats?.lastDonation.isPartner || false,
          // סטטוס
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
