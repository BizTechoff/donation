import { Allow, BackendMethod, remult, SqlDatabase } from 'remult';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { Donation } from '../entity/donation';
import { Donor } from '../entity/donor';
import { DonorContact } from '../entity/donor-contact';
import { DonorPlace } from '../entity/donor-place';
import { calculateEffectiveAmount, calculatePaymentTotals, calculatePeriodsElapsed, isPaymentBased, isStandingOrder } from '../utils/donation-utils';

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
  statuses: ('active' | 'inactive' | 'high-donor' | 'recent-donor')[];
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

  // סה"כ תרומות (לא כולל התחייבויות, לא כולל שותפויות) - לפי מטבע
  totalDonations: number; // סכום מומר (לתאימות אחורה)
  totalDonationsCurrencySymbol: string;
  totalDonationsByCurrency: Array<{ currencyId: string; symbol: string; total: number }>;

  // מספר תרומות (לא כולל התחייבויות, לא כולל שותפויות)
  donationCount: number;

  // שותפויות - תרומות שהתורם שותף בהן (לא ראשי)
  partnerDonationsCount: number;
  partnerDonationsTotal: number;
  partnerDonationsCurrencySymbol: string;

  // התחייבויות - בפועל / נקוב
  commitmentCount: number;
  commitmentPaidTotal: number; // מה ששולם בפועל
  commitmentPledgedTotal: number; // סכום ההתחייבות הכולל
  commitmentCurrencySymbol: string;

  // ממוצע 12 חודשים אחרונים (לא כולל חריגות, לא כולל התחייבויות)
  averageDonation: number;
  averageDonationCurrencySymbol: string;

  // תרומה אחרונה
  lastDonationDate: Date | null;
  lastDonationAmount: number; // סכום מקורי
  lastDonationEffectiveAmount: number; // מה ששולם בפועל (להו"ק)
  lastDonationExpectedAmount: number; // צפי (להו"ק ללא הגבלה)
  lastDonationCurrencySymbol: string;
  lastDonationIsPartner: boolean;
  lastDonationIsStandingOrder: boolean;
  lastDonationIsUnlimitedStandingOrder: boolean;
  lastDonationReason: string;

  statuses: ('active' | 'inactive' | 'high-donor' | 'recent-donor')[];
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

  static DEFAULT_HIGH_DONOR_AMOUNT = 1500
  static DEFAULT_RECENT_DONOR_MONTHS = 11

  /**
   * קורא ספים מ-AppSettings, אם אין - משתמש בברירת מחדל
   */
  private static async getThresholds(): Promise<{ highDonorAmount: number; recentDonorMonths: number }> {
    try {
      const { AppSettings } = await import('../entity/app-settings');
      const settings = await remult.repo(AppSettings).findId('singleton', { createIfNotFound: true });
      return {
        highDonorAmount: settings?.highDonorAmount || DonorMapController.DEFAULT_HIGH_DONOR_AMOUNT,
        recentDonorMonths: settings?.recentDonorMonths || DonorMapController.DEFAULT_RECENT_DONOR_MONTHS
      };
    } catch {
      return {
        highDonorAmount: DonorMapController.DEFAULT_HIGH_DONOR_AMOUNT,
        recentDonorMonths: DonorMapController.DEFAULT_RECENT_DONOR_MONTHS
      };
    }
  }

  /**
   * מתודה פנימית - מחזירה IDs של תורמים לפי פילטרים מקומיים של המפה
   * @param mapFilters פילטרים מקומיים (searchTerm, minDonationCount)
   * @returns מערך של donorIds
   */
  private static async getDonorIds(mapFilters: MapFilters): Promise<string[]> {
    const donationRepo = remult.repo(Donation);

    let donorIds: string[] | undefined = undefined;

    // searchTerm - חיפוש משופר בשם/ת.ז./כתובת
    // כל מילה צריכה להופיע או בשם או בכתובת (לא חייבים באותו שדה)
    // ── גרסה מקורית (שמורה להשוואה/חזרה) - טוענת את *כל* הטבלאות (donors+donor_places+places)
    //    ובונה maps ב-JS. ~35MB memory + O(n*m) עבור התאמה. OOM.
    // if (mapFilters.searchTerm?.trim()) {
    //   const words = mapFilters.searchTerm.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
    //   const donorRepo = remult.repo(Donor);
    //   const allDonors = await donorRepo.find({ where: { isActive: true } });
    //   const { Place } = await import('../entity/place');
    //   const allDonorPlaces = await remult.repo(DonorPlace).find({ where: { isActive: true } });
    //   const placeIds = [...new Set(allDonorPlaces.map(dp => dp.placeId).filter(Boolean))];
    //   const allPlaces = placeIds.length > 0
    //     ? await remult.repo(Place).find({ where: { id: { $in: placeIds } } }) : [];
    //   const placeMap = new Map(allPlaces.map(p => [p.id, p]));
    //   const donorAddressMap = new Map<string, string[]>();
    //   for (const dp of allDonorPlaces) {
    //     if (!dp.donorId || !dp.placeId) continue;
    //     const place = placeMap.get(dp.placeId);
    //     if (place) {
    //       const addresses = donorAddressMap.get(dp.donorId) || [];
    //       const addressText = [place.city, place.street, place.neighborhood, place.houseNumber]
    //         .filter(Boolean).join(' ').toLowerCase();
    //       addresses.push(addressText);
    //       donorAddressMap.set(dp.donorId, addresses);
    //     }
    //   }
    //   const matchingDonorIds = allDonors.filter(donor => {
    //     const nameText = [donor.firstName, donor.lastName, donor.firstNameEnglish, donor.lastNameEnglish, donor.idNumber]
    //       .filter(Boolean).join(' ').toLowerCase();
    //     const addresses = donorAddressMap.get(donor.id) || [];
    //     const combinedText = `${nameText} ${addresses.join(' ')}`;
    //     return words.every(word => combinedText.includes(word));
    //   }).map(d => d.id);
    //   donorIds = matchingDonorIds;
    // }

    // ── אופטימיזציה: SQL JOIN + LOWER(concat_ws(...)) LIKE בעבור כל מילה.
    //    שאילתה אחת, מחזירה רק donorId. ~0MB memory overhead.
    if (mapFilters.searchTerm?.trim()) {
      const words = mapFilters.searchTerm.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
      if (words.length > 0) {
        const sqlDb = remult.dataProvider as SqlDatabase;
        const escapeWord = (s: string) => s.replace(/'/g, "''").replace(/%/g, '\\%').replace(/_/g, '\\_');
        const likeClauses = words.map(w =>
          `LOWER(CONCAT_WS(' ', d."firstName", d."lastName", d."firstNameEnglish", d."lastNameEnglish", d."idNumber", p."city", p."street", p."neighborhood", p."houseNumber")) LIKE '%${escapeWord(w)}%'`
        ).join(' AND ');
        const { rows } = await sqlDb.execute(
          `SELECT DISTINCT d."id"
           FROM "donors" d
           LEFT JOIN "donor_places" dp ON dp."donorId" = d."id" AND dp."isActive" = true
           LEFT JOIN "places" p ON p."id" = dp."placeId"
           WHERE d."isActive" = true AND (${likeClauses})`
        );
        donorIds = (rows as any[]).map(r => r.id);
      } else {
        donorIds = [];
      }
    }

    // Donation-based filters (minDonationCount, minTotalDonations, maxTotalDonations)
    const needsDonationData = (mapFilters.minDonationCount && mapFilters.minDonationCount > 0) ||
      (mapFilters.minTotalDonations && mapFilters.minTotalDonations > 0) ||
      (mapFilters.maxTotalDonations && mapFilters.maxTotalDonations < 999999999);

    if (needsDonationData) {
      // טען תרומות
      const donations = await donationRepo.find({
        where: donorIds ? { donorId: { $in: donorIds } } : {},
        include: { donationMethod: true }
      });

      // טען סכומי תשלומים בפועל עבור התחייבויות והו"ק עם סינון לפי סוג
      const paymentBasedDonations = donations.filter(d => isPaymentBased(d));
      const paymentBasedIds = paymentBasedDonations.map(d => d.id).filter(Boolean);
      let paymentTotals: Record<string, number> = {};
      if (paymentBasedIds.length > 0) {
        const { Payment } = await import('../entity/payment');
        const payments = await remult.repo(Payment).find({
          where: { donationId: { $in: paymentBasedIds }, isActive: true }
        });
        paymentTotals = calculatePaymentTotals(paymentBasedDonations, payments);
      }

      // חשב סטטיסטיקות תרומות
      const donationStats = new Map<string, { count: number; total: number }>();
      donations.forEach(d => {
        const stats = donationStats.get(d.donorId) || { count: 0, total: 0 };
        stats.count++;
        stats.total += calculateEffectiveAmount(d, paymentTotals[d.id]);
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
    // ── גרסה מקורית (שמורה): טעינה של 3K+ donor entities מלאות רק לקחת id. ~15MB.
    // if (!donorIds) {
    //   const donors = await donorRepo.find({ where: { isActive: true } });
    //   donorIds = donors.map(d => d.id);
    // }
    // ── אופטימיזציה: SELECT id בלבד.
    if (!donorIds) {
      const sqlDb = remult.dataProvider as SqlDatabase;
      const { rows } = await sqlDb.execute(`SELECT "id" FROM "donors" WHERE "isActive" = true`);
      donorIds = (rows as any[]).map(r => r.id);
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

    if (intersectedIds.length === 0) {
      console.timeEnd('Load marker data');
      console.timeEnd('DonorMapController.getMapMarkers - Total');
      return [];
    }

    // טען DonorPlaces עם Place מלא (כולל קואורדינטות)
    const donorPlaceRepo = remult.repo(DonorPlace);
    const donorRepo = remult.repo(Donor);
    const donorPlaces = await donorPlaceRepo.find({
      where: { donorId: { $in: intersectedIds }, isActive: true },
      include: { place: true }
    });
    const locationMap = new Map<string, { lat: number; lng: number }>();
    donorPlaces.forEach(dp => {
      if (dp.donorId && dp.place?.latitude && dp.place?.longitude && !locationMap.has(dp.donorId)) {
        // Postgres מחזיר DECIMAL כמחרוזות; מבטיחים number ל-Google Maps.
        const lat = typeof dp.place.latitude === 'number' ? dp.place.latitude : parseFloat(dp.place.latitude as any);
        const lng = typeof dp.place.longitude === 'number' ? dp.place.longitude : parseFloat(dp.place.longitude as any);
        if (!isNaN(lat) && !isNaN(lng)) {
          locationMap.set(dp.donorId, { lat, lng });
        }
      }
    });
    const donorIdsWithLocation = Array.from(locationMap.keys());
    if (donorIdsWithLocation.length === 0) {
      console.timeEnd('Load marker data');
      console.timeEnd('DonorMapController.getMapMarkers - Total');
      return [];
    }
    const donors = await donorRepo.find({ where: { id: { $in: donorIdsWithLocation } } });

    // טען סטטיסטיקות תרומות לחישוב סטטוס
    const donationRepo = remult.repo(Donation);

    // ── גרסה מקורית (שמורה להשוואה/חזרה) - טעינת כל התרומות עם joins ל-memory.
    //    בעייתית עבור 3000+ תורמים: 10K+ תרומות × join = ~30MB → R14 OOM.
    // const donations = await donationRepo.find({
    //   where: { donorId: { $in: donorIdsWithLocation } },
    //   include: { donationMethod: true }
    // });
    //
    // const paymentBasedDonationsForMarkers = donations.filter(d => isPaymentBased(d));
    // const paymentBasedIdsForMarkers = paymentBasedDonationsForMarkers.map(d => d.id).filter(Boolean);
    // let paymentTotalsForMarkers: Record<string, number> = {};
    // if (paymentBasedIdsForMarkers.length > 0) {
    //   const { Payment } = await import('../entity/payment');
    //   const payments = await remult.repo(Payment).find({
    //     where: { donationId: { $in: paymentBasedIdsForMarkers }, isActive: true }
    //   });
    //   paymentTotalsForMarkers = calculatePaymentTotals(paymentBasedDonationsForMarkers, payments);
    // }
    //
    // const donationStatsByDonor = new Map<string, { total: number; lastDate: Date | null }>();
    // donations.forEach(donation => {
    //   const rawAmount = calculateEffectiveAmount(donation, paymentTotalsForMarkers[donation.id]);
    //   const existing = donationStatsByDonor.get(donation.donorId);
    //   if (!existing) {
    //     donationStatsByDonor.set(donation.donorId, { total: rawAmount, lastDate: donation.donationDate });
    //   } else {
    //     existing.total += rawAmount;
    //     if (!existing.lastDate || (donation.donationDate && new Date(donation.donationDate) > new Date(existing.lastDate))) {
    //       existing.lastDate = donation.donationDate;
    //     }
    //   }
    // });

    // ── אופטימיזציה פעילה: groupBy ב-SQL מחזיר שורה אחת לכל תורם.
    // הערה: לא מתחשב בלוגיקת calculateEffectiveAmount להו"קים (sum of payments)
    // כי זה רק לצורך סיווג high-donor על המפה - קירוב מספיק.
    const donationStatsByDonor = new Map<string, { total: number; lastDate: Date | null }>();
    const statsRows = await donationRepo.groupBy({
      group: ['donorId'],
      sum: ['amount'],
      max: ['donationDate'],
      where: { donorId: { $in: donorIdsWithLocation } }
    });
    for (const row of statsRows) {
      const maxDate = row.donationDate?.max;
      donationStatsByDonor.set(row.donorId, {
        total: row.amount?.sum || 0,
        lastDate: maxDate ? new Date(maxDate) : null
      });
    }

    // קרא ספים מ-AppSettings
    const thresholds = await DonorMapController.getThresholds();

    // בנה מערך מרקרים עם סטטוס
    const markers: MarkerData[] = donors
      .filter(d => locationMap.has(d.id))
      .map(d => {
        const stats = donationStatsByDonor.get(d.id);
        const totalDonations = stats?.total || 0;
        const lastDonationDate = stats?.lastDate || null;

        // קבע סטטוסים (תורם יכול לקבל כמה סטטוסים במקביל)
        const statuses: ('active' | 'inactive' | 'high-donor' | 'recent-donor')[] = [];
        if (d.isActive) {
          statuses.push('active');
          if (totalDonations > thresholds.highDonorAmount) {
            statuses.push('high-donor');
          }
          if (lastDonationDate) {
            const recentCutoff = new Date();
            recentCutoff.setMonth(recentCutoff.getMonth() - thresholds.recentDonorMonths);
            if (new Date(lastDonationDate) > recentCutoff) {
              statuses.push('recent-donor');
            }
          }
        } else {
          statuses.push('inactive');
        }

        return {
          donorId: d.id,
          lat: locationMap.get(d.id)!.lat,
          lng: locationMap.get(d.id)!.lng,
          donorName: `${d.lastName || ''} ${d.firstName || ''}`.trim(),
          statuses
        };
      });

    // Apply client-side filters (filters that work on already calculated data)
    let filteredMarkers = markers;

    // Status filter (AND - תורם חייב לעמוד בכל הסטטוסים שנבחרו)
    if (mapFilters.statusFilter && mapFilters.statusFilter.length > 0) {
      filteredMarkers = filteredMarkers.filter(m =>
        mapFilters.statusFilter!.every(s => m.statuses.includes(s))
      );
    }

    // Has coordinates - all markers already have coordinates, so this filter doesn't apply here
    // (markers without coordinates were already filtered out)

    // Has recent donation filter
    if (mapFilters.hasRecentDonation !== null && mapFilters.hasRecentDonation !== undefined) {
      if (mapFilters.hasRecentDonation) {
        filteredMarkers = filteredMarkers.filter(m => m.statuses.includes('recent-donor'));
      } else {
        filteredMarkers = filteredMarkers.filter(m => !m.statuses.includes('recent-donor'));
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

    const donationRepo = remult.repo(Donation);

    // ── גרסה מקורית (שמורה להשוואה/חזרה) - טעינת Donor+DonorPlace+Place מלאים = ~25MB.
    // const donorRepo = remult.repo(Donor);
    // const donorPlaceRepo = remult.repo(DonorPlace);
    // const donors = await donorRepo.find({ where: { id: { $in: intersectedIds } } });
    // const totalDonors = donors.length;
    // const activeDonors = donors.filter(d => d.isActive).length;
    // const donorPlaces = await donorPlaceRepo.find({
    //   where: { donorId: { $in: intersectedIds }, isActive: true },
    //   include: { place: true }
    // });
    // const donorsWithCoordinates = new Set<string>();
    // donorPlaces.forEach(dp => {
    //   if (dp.donorId && dp.place?.latitude && dp.place?.longitude) {
    //     donorsWithCoordinates.add(dp.donorId);
    //   }
    // });

    // ── אופטימיזציה: SELECT מינימלי + COUNT ב-SQL.
    if (intersectedIds.length === 0) {
      console.timeEnd('DonorMapController.getMapStatistics');
      return { totalDonors: 0, activeDonors: 0, donorsOnMap: 0, averageDonation: 0 };
    }
    const sqlDb = remult.dataProvider as SqlDatabase;
    const idsLit = intersectedIds.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');

    // total + active donors (שתי ספירות בשאילתה אחת)
    const { rows: countRows } = await sqlDb.execute(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "isActive") ::int AS active
       FROM "donors" WHERE "id" IN (${idsLit})`
    );
    const totalDonors = (countRows[0] as any)?.total || 0;
    const activeDonors = (countRows[0] as any)?.active || 0;

    // donors with coordinates (DISTINCT donorId)
    const { rows: coordRows } = await sqlDb.execute(
      `SELECT DISTINCT dp."donorId"
       FROM "donor_places" dp
       JOIN "places" p ON p."id" = dp."placeId"
       WHERE dp."donorId" IN (${idsLit})
         AND dp."isActive" = true
         AND p."latitude" IS NOT NULL
         AND p."longitude" IS NOT NULL`
    );
    const donorsWithCoordinates = new Set<string>((coordRows as any[]).map(r => r.donorId));

    const donorsOnMap = donorsWithCoordinates.size;

    // חישוב ממוצע תרומות (בשקלים)
    // ── גרסה מקורית (שמורה להשוואה/חזרה) - טעינת 10K+ תרומות + joins. OOM.
    // const donations = await donationRepo.find({
    //   where: { donorId: { $in: intersectedIds } },
    //   include: { donationMethod: true }
    // });
    //
    // const paymentBasedDonationsForStats = donations.filter(d => isPaymentBased(d));
    // const paymentBasedIdsForStats = paymentBasedDonationsForStats.map(d => d.id).filter(Boolean);
    // let paymentTotalsForStats: Record<string, number> = {};
    // if (paymentBasedIdsForStats.length > 0) {
    //   const { Payment } = await import('../entity/payment');
    //   const payments = await remult.repo(Payment).find({
    //     where: { donationId: { $in: paymentBasedIdsForStats }, isActive: true }
    //   });
    //   paymentTotalsForStats = calculatePaymentTotals(paymentBasedDonationsForStats, payments);
    // }
    //
    // const totalAmount = donations.reduce((sum, d) => {
    //   const rate = currencyTypes[d.currencyId]?.rateInShekel || 1;
    //   return sum + (calculateEffectiveAmount(d, paymentTotalsForStats[d.id]) * rate);
    // }, 0);
    // const totalCount = donations.length;

    // ── אופטימיזציה פעילה: groupBy ב-SQL (לפי מטבע) + count נפרד.
    // לא מתחשב בלוגיקת calculateEffectiveAmount להו"קים (sum of payments) -
    // קירוב מספיק לצורך חישוב ממוצע סטטיסטי במפה.
    const { PayerService } = await import('../../app/services/payer.service');
    const payerService = new PayerService();
    const currencyTypes = await payerService.getCurrencyTypesRecord();

    const sumsByCurrency = await donationRepo.groupBy({
      group: ['currencyId'],
      sum: ['amount'],
      where: { donorId: { $in: intersectedIds } }
    });
    const totalAmount = sumsByCurrency.reduce((sum, row) => {
      const rate = currencyTypes[row.currencyId]?.rateInShekel || 1;
      return sum + ((row.amount?.sum || 0) * rate);
    }, 0);
    const totalCount = await donationRepo.count({ donorId: { $in: intersectedIds } });
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

    // console.log('DonorMapController: Global filters:', globalFilters);
    // console.log('DonorMapController: Additional filters:', additionalFilters);
    // console.log('DonorMapController: Merged filters:', mergedFilters);

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

    // קרא ספים מ-AppSettings
    const settingsThresholds = await DonorMapController.getThresholds();

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
    const [donorPlaceMap, contacts] = await Promise.all([
      // טען מקומות ראשיים (בית קודם, אחרת הראשון שנמצא)
      DonorPlace.getPrimaryForDonors(donorIdsList),
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
    // בנפרד: תרומות רגילות והתחייבויות
    const [donationsAsPrimary, donationsAsPartner, commitments] = await Promise.all([
      // תרומות שהתורם הוא הראשי (לא כולל התחייבויות)
      donationRepo.find({
        where: {
          donorId: { $in: donorIdsList },
          donationType: { $ne: 'commitment' }
        },
        include: { donationMethod: true }
      }),
      // תרומות שהתורם הוא שותף (לא כולל התחייבויות)
      // ── גרסה מקורית (שמורה להשוואה/חזרה) - טוענת את *כל* התרומות ב-DB ומסננת ב-JS.
      //    בעייתית בגלל memory: ~30MB על 10K+ תרומות, גורמת ל-R14 ב-Heroku.
      // donationRepo.find({
      //   where: {
      //     donationType: { $ne: 'commitment' }
      //   },
      //   include: { donationMethod: true }
      // }).then(donations => donations.filter(d =>
      //   d.partnerIds && d.partnerIds.some(pid => donorIdsList.includes(pid) && pid !== d.donorId)
      // )),
      //
      // ── אופטימיזציה פעילה: JSONB operator ?| למצוא IDs רלוונטיים ב-SQL,
      // ואז טעינה מוגבלת של תרומות השותף בלבד.
      (async () => {
        if (donorIdsList.length === 0) return [];
        const sqlDb = remult.dataProvider as SqlDatabase;
        // מפצים UUIDs כדי לשרת כמחרוזות SQL (UUIDs מה-DB, בטוח מבחינת injection)
        const idsLiteral = donorIdsList.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
        const { rows } = await sqlDb.execute(
          `SELECT "id", "donorId" FROM donations
           WHERE "donationType" != 'commitment'
             AND "partnerIds"::jsonb ?| ARRAY[${idsLiteral}]::text[]`
        );
        // מסננים החוצה את אלה שבהן donorId הוא אחד מה-donors שלנו (תורם ראשי, לא שותף)
        const partnerIds = rows
          .filter((r: any) => !donorIdsList.includes(r.donorId))
          .map((r: any) => r.id);
        if (partnerIds.length === 0) return [];
        return donationRepo.find({
          where: { id: { $in: partnerIds } },
          include: { donationMethod: true }
        });
      })(),
      // התחייבויות
      donationRepo.find({
        where: {
          donorId: { $in: donorIdsList },
          donationType: 'commitment'
        }
      })
    ]);
    console.timeEnd('Load donations');
    console.log(`Loaded ${donationsAsPrimary.length} primary donations, ${donationsAsPartner.length} partner donations, ${commitments.length} commitments`);

    // טען סכומי תשלומים בפועל עבור התחייבויות והו"ק עם סינון לפי סוג
    const allDonations = [...donationsAsPrimary, ...donationsAsPartner, ...commitments];
    const paymentBasedDonationsForMap = allDonations.filter(d => isPaymentBased(d));
    const paymentBasedIdsForMap = paymentBasedDonationsForMap.map(d => d.id).filter(Boolean);
    let paymentTotalsForMap: Record<string, number> = {};
    if (paymentBasedIdsForMap.length > 0) {
      const { Payment } = await import('../entity/payment');
      const payments = await remult.repo(Payment).find({
        where: { donationId: { $in: paymentBasedIdsForMap }, isActive: true }
      });
      paymentTotalsForMap = calculatePaymentTotals(paymentBasedDonationsForMap, payments);
    }

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
      // סה"כ תרומות (כתורם ראשי) - לפי מטבע (ללא המרה)
      totalAmountByCurrency: Map<string, number>;
      totalCount: number;

      // שותפויות - תרומות שהתורם שותף בהן (לא ראשי)
      partnerAmountByCurrency: Map<string, number>;
      partnerCount: number;

      // התחייבויות - בפועל ונקוב
      commitmentPaidByCurrency: Map<string, number>;
      commitmentPledgedByCurrency: Map<string, number>;
      commitmentCount: number;

      // ממוצע 12 חודשים (לא כולל חריגות) - לפי מטבע
      avg12MonthsByCurrency: Map<string, number>;
      avg12MonthsCount: number;

      // תרומה אחרונה
      lastDonation: {
        date: Date | null;
        amount: number; // סכום מקורי
        effectiveAmount: number; // מה ששולם בפועל
        expectedAmount: number; // צפי (להו"ק ללא הגבלה)
        currencyId: string;
        isPartner: boolean;
        isStandingOrder: boolean;
        isUnlimitedStandingOrder: boolean;
        reason: string;
      };
    }

    const donorStatsMap = new Map<string, DonorStatsData>();

    // פונקציה לאתחול סטטיסטיקות תורם
    const initDonorStats = (): DonorStatsData => ({
      totalAmountByCurrency: new Map(),
      totalCount: 0,
      partnerAmountByCurrency: new Map(),
      partnerCount: 0,
      commitmentPaidByCurrency: new Map(),
      commitmentPledgedByCurrency: new Map(),
      commitmentCount: 0,
      avg12MonthsByCurrency: new Map(),
      avg12MonthsCount: 0,
      lastDonation: {
        date: null,
        amount: 0,
        effectiveAmount: 0,
        expectedAmount: 0,
        currencyId: '',
        isPartner: false,
        isStandingOrder: false,
        isUnlimitedStandingOrder: false,
        reason: ''
      }
    });

    // פונקציה לעדכון סטטיסטיקות לתרומות ראשיות
    const updatePrimaryStats = (donorId: string, donation: Donation, paymentTotals: Record<string, number>) => {
      let stats = donorStatsMap.get(donorId);
      if (!stats) {
        stats = initDonorStats();
        donorStatsMap.set(donorId, stats);
      }

      // עדכון סה"כ תרומות ראשיות - שמור לפי מטבע (ללא המרה)
      // לתרומות מבוססות תשלום (הו"ק) - השתמש בסכום שבפועל שולם
      const effectiveAmount = calculateEffectiveAmount(donation, paymentTotals[donation.id]);
      const currentTotal = stats.totalAmountByCurrency.get(donation.currencyId) || 0;
      stats.totalAmountByCurrency.set(donation.currencyId, currentTotal + effectiveAmount);
      stats.totalCount++;

      // עדכון ממוצע 12 חודשים (לא כולל חריגות) - לפי מטבע
      if (donation.donationDate && new Date(donation.donationDate) >= twelveMonthsAgo && !donation.isExceptional) {
        const currentAvg = stats.avg12MonthsByCurrency.get(donation.currencyId) || 0;
        stats.avg12MonthsByCurrency.set(donation.currencyId, currentAvg + effectiveAmount);
        stats.avg12MonthsCount++;
      }

      // עדכון תרומה אחרונה
      if (!stats.lastDonation.date || (donation.donationDate && new Date(donation.donationDate) > new Date(stats.lastDonation.date))) {
        const donationIsStandingOrder = isStandingOrder(donation);
        const donationIsUnlimitedStandingOrder = donationIsStandingOrder && donation.unlimitedPayments;

        // חשב צפי להו"ק ללא הגבלה
        let expectedAmount = donation.amount;
        if (donationIsUnlimitedStandingOrder) {
          const periodsElapsed = calculatePeriodsElapsed(donation);
          expectedAmount = periodsElapsed * donation.amount;
        }

        stats.lastDonation = {
          date: donation.donationDate,
          amount: donation.amount,
          effectiveAmount: effectiveAmount,
          expectedAmount: expectedAmount,
          currencyId: donation.currencyId,
          isPartner: false,
          isStandingOrder: donationIsStandingOrder,
          isUnlimitedStandingOrder: donationIsUnlimitedStandingOrder,
          reason: donation.reason || ''
        };
      }
    };

    // פונקציה לעדכון סטטיסטיקות לשותפויות
    const updatePartnerStats = (donorId: string, donation: Donation, paymentTotals: Record<string, number>) => {
      let stats = donorStatsMap.get(donorId);
      if (!stats) {
        stats = initDonorStats();
        donorStatsMap.set(donorId, stats);
      }

      // עדכון סה"כ שותפויות - שמור לפי מטבע (ללא המרה)
      // לתרומות מבוססות תשלום (הו"ק) - השתמש בסכום שבפועל שולם
      const effectiveAmount = calculateEffectiveAmount(donation, paymentTotals[donation.id]);
      const currentTotal = stats.partnerAmountByCurrency.get(donation.currencyId) || 0;
      stats.partnerAmountByCurrency.set(donation.currencyId, currentTotal + effectiveAmount);
      stats.partnerCount++;

      // עדכון תרומה אחרונה (אם השותפות יותר חדשה)
      if (!stats.lastDonation.date || (donation.donationDate && new Date(donation.donationDate) > new Date(stats.lastDonation.date))) {
        const donationIsStandingOrder = isStandingOrder(donation);
        const donationIsUnlimitedStandingOrder = donationIsStandingOrder && donation.unlimitedPayments;

        // חשב צפי להו"ק ללא הגבלה
        let expectedAmount = donation.amount;
        if (donationIsUnlimitedStandingOrder) {
          const periodsElapsed = calculatePeriodsElapsed(donation);
          expectedAmount = periodsElapsed * donation.amount;
        }

        stats.lastDonation = {
          date: donation.donationDate,
          amount: donation.amount,
          effectiveAmount: effectiveAmount,
          expectedAmount: expectedAmount,
          currencyId: donation.currencyId,
          isPartner: true,
          isStandingOrder: donationIsStandingOrder,
          isUnlimitedStandingOrder: donationIsUnlimitedStandingOrder,
          reason: donation.reason || ''
        };
      }
    };

    // פונקציה לעדכון סטטיסטיקות להתחייבויות
    const updateCommitmentStats = (donorId: string, donation: Donation) => {
      let stats = donorStatsMap.get(donorId);
      if (!stats) {
        stats = initDonorStats();
        donorStatsMap.set(donorId, stats);
      }

      // עדכון סה"כ התחייבויות - שמור לפי מטבע (ללא המרה)
      // בפועל (מה ששולם)
      const paidAmount = calculateEffectiveAmount(donation, paymentTotalsForMap[donation.id]);
      const currentPaid = stats.commitmentPaidByCurrency.get(donation.currencyId) || 0;
      stats.commitmentPaidByCurrency.set(donation.currencyId, currentPaid + paidAmount);

      // נקוב (סכום ההתחייבות)
      const currentPledged = stats.commitmentPledgedByCurrency.get(donation.currencyId) || 0;
      stats.commitmentPledgedByCurrency.set(donation.currencyId, currentPledged + donation.amount);

      stats.commitmentCount++;
    };

    // עבור על תרומות ראשיות
    donationsAsPrimary.forEach(donation => {
      updatePrimaryStats(donation.donorId, donation, paymentTotalsForMap);
    });

    // עבור על תרומות כשותף
    // חשוב: דלג על התורם הראשי אם הוא גם ברשימת השותפים כדי לא לספור פעמיים
    donationsAsPartner.forEach(donation => {
      donation.partnerIds?.forEach(partnerId => {
        if (donorIdsList.includes(partnerId) && partnerId !== donation.donorId) {
          updatePartnerStats(partnerId, donation, paymentTotalsForMap);
        }
      });
    });

    // עבור על התחייבויות
    commitments.forEach(commitment => {
      updateCommitmentStats(commitment.donorId, commitment);
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

      // בנה מערך תרומות לפי מטבע
      const totalDonationsByCurrency: Array<{ currencyId: string; symbol: string; total: number }> = [];
      stats?.totalAmountByCurrency.forEach((total, currencyId) => {
        totalDonationsByCurrency.push({
          currencyId,
          symbol: currencyTypes[currencyId]?.symbol || '₪',
          total
        });
      });

      // חשב סה"כ שותפויות עם מטבע מתאים
      const partnerResult = calculateTotalAndCurrency(
        stats?.partnerAmountByCurrency || new Map(),
        donor.id
      );
      const partnerCount = stats?.partnerCount || 0;

      // חשב סה"כ התחייבויות - בפועל ונקוב
      const commitmentPaidResult = calculateTotalAndCurrency(
        stats?.commitmentPaidByCurrency || new Map(),
        donor.id
      );
      const commitmentPledgedResult = calculateTotalAndCurrency(
        stats?.commitmentPledgedByCurrency || new Map(),
        donor.id
      );
      const commitmentCount = stats?.commitmentCount || 0;

      // מטבע תרומה אחרונה - תמיד המטבע המקורי
      const lastCurrency = stats?.lastDonation.currencyId || 'ILS';

      // קבע סטטוס - סכום יבש ללא המרת מטבע (הסף הוא ללא מטבע)
      let totalRawForStatus = 0;
      stats?.totalAmountByCurrency.forEach((amount) => {
        totalRawForStatus += amount;
      });

      const statuses: ('active' | 'inactive' | 'high-donor' | 'recent-donor')[] = [];
      if (donor.isActive) {
        statuses.push('active');
        if (totalRawForStatus > settingsThresholds.highDonorAmount) {
          statuses.push('high-donor');
        }
        if (lastDonationDate) {
          const recentCutoff = new Date();
          recentCutoff.setMonth(recentCutoff.getMonth() - settingsThresholds.recentDonorMonths);
          if (new Date(lastDonationDate) > recentCutoff) {
            statuses.push('recent-donor');
          }
        }
      } else {
        statuses.push('inactive');
      }

      // בנה כתובת מלאה
      let fullAddress = '';
      if (donorPlace?.place) {
        const place = donorPlace.place;
        fullAddress = place.getDisplayAddress() || place.fullAddress || '';
      }

      return {
        donor,
        donorPlace,
        email: emailMap.get(donor.id) || null,
        phone: phoneMap.get(donor.id) || null,
        fullAddress: fullAddress || null,
        stats: {
          donorId: donor.id,
          // סה"כ תרומות (כתורם ראשי) - לפי מטבע
          totalDonations: totalResult.total,
          totalDonationsCurrencySymbol: currencyTypes[totalResult.currencyId]?.symbol || '₪',
          totalDonationsByCurrency,
          // מספר תרומות (כתורם ראשי)
          donationCount,
          // שותפויות
          partnerDonationsCount: partnerCount,
          partnerDonationsTotal: partnerResult.total,
          partnerDonationsCurrencySymbol: currencyTypes[partnerResult.currencyId]?.symbol || '₪',
          // התחייבויות - בפועל / נקוב
          commitmentCount,
          commitmentPaidTotal: commitmentPaidResult.total,
          commitmentPledgedTotal: commitmentPledgedResult.total,
          commitmentCurrencySymbol: currencyTypes[commitmentPaidResult.currencyId]?.symbol || '₪',
          // ממוצע 12 חודשים
          averageDonation,
          averageDonationCurrencySymbol: currencyTypes[avgResult.currencyId]?.symbol || '₪',
          // תרומה אחרונה
          lastDonationDate,
          lastDonationAmount: stats?.lastDonation.amount || 0,
          lastDonationEffectiveAmount: stats?.lastDonation.effectiveAmount || 0,
          lastDonationExpectedAmount: stats?.lastDonation.expectedAmount || 0,
          lastDonationCurrencySymbol: currencyTypes[lastCurrency]?.symbol || '₪',
          lastDonationIsPartner: stats?.lastDonation.isPartner || false,
          lastDonationIsStandingOrder: stats?.lastDonation.isStandingOrder || false,
          lastDonationIsUnlimitedStandingOrder: stats?.lastDonation.isUnlimitedStandingOrder || false,
          lastDonationReason: stats?.lastDonation.reason || '',
          // סטטוסים
          statuses
        }
      };
    });
    console.timeEnd('Build result objects');

    console.timeEnd('DonorMapController.loadDonorsMapData');
    console.log(`DonorMapController: Returning ${result.length} donors with complete data`);

    return result;
  }
}
