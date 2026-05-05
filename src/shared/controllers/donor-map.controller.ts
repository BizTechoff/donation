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

export interface MapData {
  markers: MarkerData[];
  statistics: MapStatistics;
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

export interface DonorExportData {
  id: string;
  fullAddress: string;
  phone: string;
  email: string;
  place: {
    city: string;
    state: string;
    neighborhood: string;
    street: string;
    houseNumber: string;
    building: string;
    apartment: string;
    postcode: string;
    placeName: string;
    country: { name: string };
  } | null;
  lastDonationDate: Date | null;
  lastDonationAmount: number;
  lastDonationCurrencySymbol: string;
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
      // groupBy: שורה אחת לכל תורם, ללא טעינת אובייקטים מלאים
      const statsRows = await donationRepo.groupBy({
        group: ['donorId'],
        sum: ['amount'],
        where: donorIds ? { donorId: { $in: donorIds } } : {}
      });

      const filteredIds = statsRows
        .filter(row => {
          if (mapFilters.minDonationCount && mapFilters.minDonationCount > 0 && row.$count < mapFilters.minDonationCount) return false;
          const total = row.amount?.sum || 0;
          if (mapFilters.minTotalDonations && mapFilters.minTotalDonations > 0 && total < mapFilters.minTotalDonations) return false;
          if (mapFilters.maxTotalDonations && mapFilters.maxTotalDonations < 999999999 && total > mapFilters.maxTotalDonations) return false;
          return true;
        })
        .map(row => row.donorId);

      donorIds = donorIds
        ? donorIds.filter(id => filteredIds.includes(id))
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

  private static async getIntersectedIds(mapFilters: MapFilters): Promise<string[]> {
    console.time('[intersect] TOTAL');
    const { GlobalFilterController } = await import('./global-filter.controller');
    console.time('[intersect] global filter');
    const globalDonorIds = await GlobalFilterController.getDonorIdsFromUserSettings();
    console.timeEnd('[intersect] global filter');
    console.log(`[intersect]   global=${globalDonorIds === undefined ? 'no-restriction' : globalDonorIds.length}`);
    console.time('[intersect] local filter');
    const localDonorIds = await DonorMapController.getDonorIds(mapFilters);
    console.timeEnd('[intersect] local filter');
    console.log(`[intersect]   local=${localDonorIds.length}`);
    if (globalDonorIds === undefined) {
      console.timeEnd('[intersect] TOTAL');
      return localDonorIds;
    }
    const globalSet = new Set(globalDonorIds);
    const result = localDonorIds.filter(id => globalSet.has(id));
    console.log(`[intersect]   intersected=${result.length}`);
    console.timeEnd('[intersect] TOTAL');
    return result;
  }

  private static async buildMarkersFromIds(intersectedIds: string[], mapFilters: MapFilters): Promise<MarkerData[]> {
    if (intersectedIds.length === 0) return [];
    console.log(`[buildMarkers] start - intersectedIds=${intersectedIds.length}`);
    console.time('[buildMarkers] TOTAL');

    const sqlDb = remult.dataProvider as SqlDatabase;
    const idsLit = intersectedIds.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');

    console.time('[buildMarkers] 1.SELECT places+locations');
    const { rows: placeRows } = await sqlDb.execute(
      `SELECT DISTINCT ON (dp."donorId") dp."donorId", p."latitude", p."longitude"
       FROM "donor_places" dp
       JOIN "places" p ON p."id" = dp."placeId"
       WHERE dp."donorId" IN (${idsLit})
         AND dp."isActive" = true
         AND p."latitude" IS NOT NULL
         AND p."longitude" IS NOT NULL`
    );
    console.timeEnd('[buildMarkers] 1.SELECT places+locations');
    console.log(`[buildMarkers]   placeRows=${(placeRows as any[]).length}`);

    const locationMap = new Map<string, { lat: number; lng: number }>();
    for (const r of placeRows as any[]) {
      const lat = typeof r.latitude === 'number' ? r.latitude : parseFloat(r.latitude);
      const lng = typeof r.longitude === 'number' ? r.longitude : parseFloat(r.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        locationMap.set(r.donorId, { lat, lng });
      }
    }

    const donorIdsWithLocation = Array.from(locationMap.keys());
    console.log(`[buildMarkers]   donorIdsWithLocation=${donorIdsWithLocation.length}`);
    if (donorIdsWithLocation.length === 0) {
      console.timeEnd('[buildMarkers] TOTAL');
      return [];
    }

    const locIdsLit = donorIdsWithLocation.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
    console.time('[buildMarkers] 2.SELECT donors');
    const { rows: donorRows } = await sqlDb.execute(
      `SELECT "id", "isActive", "lastName", "firstName"
       FROM "donors" WHERE "id" IN (${locIdsLit})`
    );
    console.timeEnd('[buildMarkers] 2.SELECT donors');
    const donors = (donorRows as any[]).map(r => ({
      id: r.id,
      isActive: r.isActive,
      lastAndFirstName: `${r.lastName || ''} ${r.firstName || ''}`.trim()
    }));

    console.time('[buildMarkers] 3.groupBy donations (sum amount + max date)');
    const donationRepo = remult.repo(Donation);
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
    console.timeEnd('[buildMarkers] 3.groupBy donations (sum amount + max date)');
    console.log(`[buildMarkers]   stats rows=${statsRows.length}`);

    console.time('[buildMarkers] 4.getThresholds');
    const thresholds = await DonorMapController.getThresholds();
    console.timeEnd('[buildMarkers] 4.getThresholds');
    console.log(`[buildMarkers]   thresholds: highDonor>${thresholds.highDonorAmount}, recent<${thresholds.recentDonorMonths}mo`);

    console.time('[buildMarkers] 5.build markers + status calc');
    const markers: MarkerData[] = donors
      .filter(d => locationMap.has(d.id))
      .map(d => {
        const stats = donationStatsByDonor.get(d.id);
        const totalDonations = stats?.total || 0;
        const lastDonationDate = stats?.lastDate || null;

        const statuses: ('active' | 'inactive' | 'high-donor' | 'recent-donor')[] = [];
        if (d.isActive) {
          statuses.push('active');
          if (totalDonations > thresholds.highDonorAmount) statuses.push('high-donor');
          if (lastDonationDate) {
            const recentCutoff = new Date();
            recentCutoff.setMonth(recentCutoff.getMonth() - thresholds.recentDonorMonths);
            if (new Date(lastDonationDate) > recentCutoff) statuses.push('recent-donor');
          }
        } else {
          statuses.push('inactive');
        }

        return {
          donorId: d.id,
          lat: locationMap.get(d.id)!.lat,
          lng: locationMap.get(d.id)!.lng,
          donorName: d.lastAndFirstName,
          statuses
        };
      });
    console.timeEnd('[buildMarkers] 5.build markers + status calc');
    const highDonorCount = markers.filter(m => m.statuses.includes('high-donor')).length;
    console.log(`[buildMarkers]   total markers=${markers.length}, high-donor=${highDonorCount}`);

    console.time('[buildMarkers] 6.apply statusFilter + hasRecentDonation');
    let filteredMarkers = markers;
    if (mapFilters.statusFilter && mapFilters.statusFilter.length > 0) {
      filteredMarkers = filteredMarkers.filter(m =>
        mapFilters.statusFilter!.every(s => m.statuses.includes(s))
      );
      console.log(`[buildMarkers]   after statusFilter [${mapFilters.statusFilter.join(',')}]: ${filteredMarkers.length} markers`);
    }
    if (mapFilters.hasRecentDonation !== null && mapFilters.hasRecentDonation !== undefined) {
      filteredMarkers = mapFilters.hasRecentDonation
        ? filteredMarkers.filter(m => m.statuses.includes('recent-donor'))
        : filteredMarkers.filter(m => !m.statuses.includes('recent-donor'));
    }
    console.timeEnd('[buildMarkers] 6.apply statusFilter + hasRecentDonation');

    console.timeEnd('[buildMarkers] TOTAL');
    return filteredMarkers;
  }

  private static async buildStatisticsFromIds(intersectedIds: string[]): Promise<MapStatistics> {
    if (intersectedIds.length === 0) {
      return { totalDonors: 0, activeDonors: 0, donorsOnMap: 0, averageDonation: 0 };
    }
    console.time('[buildStats] TOTAL');

    const sqlDb = remult.dataProvider as SqlDatabase;
    const idsLit = intersectedIds.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');

    console.time('[buildStats] 1.count donors (total+active)');
    const { rows: countRows } = await sqlDb.execute(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "isActive") ::int AS active
       FROM "donors" WHERE "id" IN (${idsLit})`
    );
    console.timeEnd('[buildStats] 1.count donors (total+active)');
    const totalDonors = (countRows[0] as any)?.total || 0;
    const activeDonors = (countRows[0] as any)?.active || 0;

    console.time('[buildStats] 2.donors with coords');
    const { rows: coordRows } = await sqlDb.execute(
      `SELECT DISTINCT dp."donorId"
       FROM "donor_places" dp
       JOIN "places" p ON p."id" = dp."placeId"
       WHERE dp."donorId" IN (${idsLit})
         AND dp."isActive" = true
         AND p."latitude" IS NOT NULL
         AND p."longitude" IS NOT NULL`
    );
    console.timeEnd('[buildStats] 2.donors with coords');
    const donorsOnMap = (coordRows as any[]).length;

    const donationRepo = remult.repo(Donation);
    console.time('[buildStats] 3.PayerService + currencyTypes');
    const { PayerService } = await import('../../app/services/payer.service');
    const payerService = new PayerService();
    const currencyTypes = await payerService.getCurrencyTypesRecord();
    console.timeEnd('[buildStats] 3.PayerService + currencyTypes');

    console.time('[buildStats] 4.groupBy donations sum/currency');
    const sumsByCurrency = await donationRepo.groupBy({
      group: ['currencyId'],
      sum: ['amount'],
      where: { donorId: { $in: intersectedIds } }
    });
    console.timeEnd('[buildStats] 4.groupBy donations sum/currency');
    const totalAmount = sumsByCurrency.reduce((sum, row) => {
      const rate = currencyTypes[row.currencyId]?.rateInShekel || 1;
      return sum + ((row.amount?.sum || 0) * rate);
    }, 0);
    console.time('[buildStats] 5.count donations');
    const totalCount = await donationRepo.count({ donorId: { $in: intersectedIds } });
    console.timeEnd('[buildStats] 5.count donations');
    const averageDonation = totalCount > 0 ? totalAmount / totalCount : 0;

    console.timeEnd('[buildStats] TOTAL');
    return { totalDonors, activeDonors, donorsOnMap, averageDonation };
  }

  /**
   * מחזיר מרקרים + סטטיסטיקות בקריאה אחת (חיתוך גלובלי+מקומי נעשה פעם אחת בלבד)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getMapData(mapFilters: MapFilters): Promise<MapData> {
    console.time('DonorMapController.getMapData - Total');
    const intersectedIds = await DonorMapController.getIntersectedIds(mapFilters);
    console.log(`getMapData: ${intersectedIds.length} donors after intersection`);
    const [markers, statistics] = await Promise.all([
      DonorMapController.buildMarkersFromIds(intersectedIds, mapFilters),
      DonorMapController.buildStatisticsFromIds(intersectedIds)
    ]);
    console.timeEnd('DonorMapController.getMapData - Total');
    return { markers, statistics };
  }

  /**
   * מחזיר מרקרים קלים למפה (רק lat, lng, name)
   * @deprecated השתמש ב-getMapData ב-donors-map. נשמר לתאימות אחורה עם route-planner.
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getMapMarkers(mapFilters: MapFilters): Promise<MarkerData[]> {
    const intersectedIds = await DonorMapController.getIntersectedIds(mapFilters);
    return DonorMapController.buildMarkersFromIds(intersectedIds, mapFilters);
  }

  /**
   * מחזיר סטטיסטיקות כלליות למפה
   * @deprecated השתמש ב-getMapData ב-donors-map. נשמר לתאימות אחורה.
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getMapStatistics(mapFilters: MapFilters): Promise<MapStatistics> {
    const intersectedIds = await DonorMapController.getIntersectedIds(mapFilters);
    return DonorMapController.buildStatisticsFromIds(intersectedIds);
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

  @BackendMethod({ allowed: Allow.authenticated })
  static async loadDonorsForExport(donorIds: string[]): Promise<DonorExportData[]> {
    if (!donorIds || donorIds.length === 0) return [];
    const sqlDb = remult.dataProvider as SqlDatabase;
    const inLiteral = DonorMapController.buildInLiteral(donorIds);

    const [contactRows, placeRows, donationRows] = await Promise.all([
      sqlDb.execute(
        `SELECT "donorId", "type", "phoneNumber", "email"
         FROM "donor_contacts"
         WHERE "isActive" = true AND "isPrimary" = true
           AND "donorId" IN (${inLiteral})`
      ),
      sqlDb.execute(
        `SELECT DISTINCT ON (dp."donorId")
           dp."donorId",
           p."fullAddress", p."city", p."state", p."neighborhood",
           p."street", p."houseNumber", p."building", p."apartment",
           p."postcode", p."placeName",
           c."name" AS "countryName"
         FROM "donor_places" dp
         JOIN "places" p ON dp."placeId" = p."id"
         LEFT JOIN "countries" c ON p."countryId" = c."id"
         LEFT JOIN "donor_address_types" dat ON dp."addressTypeId" = dat."id"
         WHERE dp."isActive" = true AND dp."donorId" IN (${inLiteral})
         ORDER BY dp."donorId",
           CASE WHEN dp."isPrimary" = true THEN 0 ELSE 1 END,
           CASE WHEN dat."name" = 'בית' THEN 0 ELSE 1 END`
      ),
      sqlDb.execute(
        `SELECT DISTINCT ON ("donorId") "donorId", "donationDate", "amount", "currencyId"
         FROM "donations"
         WHERE "donorId" IN (${inLiteral}) AND "donationDate" IS NOT NULL
         ORDER BY "donorId", "donationDate" DESC`
      )
    ]);

    const phoneMap = new Map<string, string>();
    const emailMap = new Map<string, string>();
    for (const r of contactRows.rows as any[]) {
      if (r.type === 'phone' && r.phoneNumber && !phoneMap.has(r.donorId))
        phoneMap.set(r.donorId, r.phoneNumber);
      if (r.type === 'email' && r.email && !emailMap.has(r.donorId))
        emailMap.set(r.donorId, r.email);
    }

    const placeMap = new Map<string, any>();
    for (const r of placeRows.rows as any[])
      placeMap.set(r.donorId, r);

    const CURRENCY_SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };
    const donationMap = new Map<string, any>();
    for (const r of donationRows.rows as any[])
      donationMap.set(r.donorId, r);

    return donorIds.map(id => {
      const p = placeMap.get(id);
      const d = donationMap.get(id);
      return {
        id,
        fullAddress: p?.fullAddress || '',
        phone: phoneMap.get(id) || '',
        email: emailMap.get(id) || '',
        place: p ? {
          city: p.city || '',
          state: p.state || '',
          neighborhood: p.neighborhood || '',
          street: p.street || '',
          houseNumber: p.houseNumber || '',
          building: p.building || '',
          apartment: p.apartment || '',
          postcode: p.postcode || '',
          placeName: p.placeName || '',
          country: { name: p.countryName || '' }
        } : null,
        lastDonationDate: d?.donationDate ? new Date(d.donationDate) : null,
        lastDonationAmount: d?.amount ? Number(d.amount) : 0,
        lastDonationCurrencySymbol: CURRENCY_SYMBOLS[d?.currencyId] || '₪'
      };
    });
  }

  private static buildInLiteral(ids: string[]): string {
    return ids.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
  }
}
