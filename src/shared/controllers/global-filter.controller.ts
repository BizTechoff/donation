import { Allow, BackendMethod, remult } from 'remult';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { Campaign } from '../entity/campaign';
import { Donation } from '../entity/donation';
import { Donor } from '../entity/donor';
import { DonorPlace } from '../entity/donor-place';
import { Place } from '../entity/place';
import { TargetAudience } from '../entity/target-audience';
import { TriStateFilter } from '../enum/tri-state-filter';

/**
 * GlobalFilterController - מרכז שליטה לפילטרים גלובליים
 *
 * מטרה: לרכז את כל הלוגיקה של פילטרים גלובליים במקום אחד.
 * כל Controller אחר יכול לקרוא למתודות אלו במקום לחשב בעצמו.
 */
export class GlobalFilterController {

  /**
   * מחזיר רשימת donorIds מסוננת לפי הפילטרים הגלובליים מ-user.settings
   * זוהי המתודה שנקראת כשלא מעבירים פילטרים במפורש
   *
   * @returns undefined אם אין פילטרים, [] אם אין התאמות, או מערך של donorIds
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonorIdsFromUserSettings(): Promise<string[] | undefined> {
    console.time('[GlobalFilter] getDonorIdsFromUserSettings TOTAL');
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters = {};
    if (currentUserId) {
      console.time('[GlobalFilter] User.findId (useCache:false)');
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId, {useCache: false});
      console.timeEnd('[GlobalFilter] User.findId (useCache:false)');
      globalFilters = user?.settings?.globalFilters || {};
      console.log(`[GlobalFilter]   filters keys: [${Object.keys(globalFilters).join(',')}]`);
    }

    console.time('[GlobalFilter] getDonorIds(filters)');
    const result = await GlobalFilterController.getDonorIds(globalFilters);
    console.timeEnd('[GlobalFilter] getDonorIds(filters)');
    console.log(`[GlobalFilter]   result: ${result === undefined ? 'undefined (no filter)' : result.length + ' donors'}`);
    console.timeEnd('[GlobalFilter] getDonorIdsFromUserSettings TOTAL');
    return result;
  }

  /**
   * מחזיר רשימת donorIds מסוננת לפי הפילטרים הגלובליים
   * זוהי המתודה המרכזית שכל Controllers אחרים משתמשים בה
   *
   * @param filters - הפילטרים הגלובליים
   * @returns undefined אם אין פילטרים, [] אם אין התאמות, או מערך של donorIds
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonorIds(filters: GlobalFilters): Promise<string[] | undefined> {
    if (!filters || Object.keys(filters).length === 0) {
      return undefined; // אין פילטרים - לא לסנן כלום
    }

    let donorIds: string[] | undefined = undefined;

    console.time('[GlobalFilter.getDonorIds] places');
    const placeFiltered = await GlobalFilterController.getDonorIdsFromPlaces(filters);
    console.timeEnd('[GlobalFilter.getDonorIds] places');
    if (placeFiltered !== undefined) {
      if (placeFiltered.length === 0) return [];
      donorIds = placeFiltered;
    }

    const intersectWithSet = (current: string[] | undefined, next: string[]): string[] => {
      if (current === undefined) return next;
      const nextSet = new Set(next);
      return current.filter(id => nextSet.has(id));
    };

    console.time('[GlobalFilter.getDonorIds] targetAudience');
    const audienceFiltered = await GlobalFilterController.getDonorIdsFromTargetAudience(filters);
    console.timeEnd('[GlobalFilter.getDonorIds] targetAudience');
    if (audienceFiltered !== undefined) {
      donorIds = intersectWithSet(donorIds, audienceFiltered);
      if (donorIds.length === 0) return [];
    }

    console.time('[GlobalFilter.getDonorIds] campaigns');
    const campaignFiltered = await GlobalFilterController.getDonorIdsFromCampaigns(filters);
    console.timeEnd('[GlobalFilter.getDonorIds] campaigns');
    if (campaignFiltered !== undefined) {
      donorIds = intersectWithSet(donorIds, campaignFiltered);
      if (donorIds.length === 0) return [];
    }

    console.time('[GlobalFilter.getDonorIds] amountRange');
    const amountFiltered = await GlobalFilterController.getDonorIdsFromAmountRange(filters);
    console.timeEnd('[GlobalFilter.getDonorIds] amountRange');
    if (amountFiltered !== undefined) {
      donorIds = intersectWithSet(donorIds, amountFiltered);
      if (donorIds.length === 0) return [];
    }

    console.time('[GlobalFilter.getDonorIds] anashAlumni');
    const anashAlumniFiltered = await GlobalFilterController.getDonorIdsFromAnashAlumni(filters);
    console.timeEnd('[GlobalFilter.getDonorIds] anashAlumni');
    if (anashAlumniFiltered !== undefined) {
      donorIds = intersectWithSet(donorIds, anashAlumniFiltered);
      if (donorIds.length === 0) return [];
    }

    return donorIds;
  }

  /**
   * מחזיר donorIds מסוננים לפי מיקום (מדינה/עיר/שכונה)
   */
  private static async getDonorIdsFromPlaces(filters: GlobalFilters): Promise<string[] | undefined> {
    if (!filters.countryIds?.length && !filters.cityIds?.length && !filters.neighborhoodIds?.length) {
      return undefined; // אין פילטרי מיקום
    }

    const placeWhere: any = {};

    if (filters.countryIds && filters.countryIds.length > 0) {
      placeWhere.countryId = { $in: filters.countryIds };
    }

    if (filters.cityIds && filters.cityIds.length > 0) {
      placeWhere.city = { $in: filters.cityIds };
    }

    if (filters.neighborhoodIds && filters.neighborhoodIds.length > 0) {
      placeWhere.neighborhood = { $in: filters.neighborhoodIds };
    }

    // שליפת מיקומים תואמים
    const matchingPlaces = await remult.repo(Place).find({ where: placeWhere });
    const matchingPlaceIds = matchingPlaces.map(p => p.id);

    if (matchingPlaceIds.length === 0) {
      return []; // אין מיקומים תואמים
    }

    // שליפת קשרי תורם-מיקום
    const donorPlaces = await remult.repo(DonorPlace).find({
      where: {
        placeId: { $in: matchingPlaceIds },
        isActive: true
      }
    });

    const donorIds = [...new Set(donorPlaces.map(dp => dp.donorId).filter((id): id is string => !!id))];
    return donorIds;
  }

  /**
   * מחזיר donorIds מסוננים לפי קהל יעד
   */
  private static async getDonorIdsFromTargetAudience(filters: GlobalFilters): Promise<string[] | undefined> {
    if (!filters.targetAudienceIds || filters.targetAudienceIds.length === 0) {
      return undefined; // אין פילטר קהל יעד
    }

    const targetAudiences = await remult.repo(TargetAudience).find({
      where: { id: { $in: filters.targetAudienceIds } }
    });

    const donorIds = [
      ...new Set(
        targetAudiences.flatMap(ta => ta.donorIds || [])
      )
    ];

    return donorIds;
  }

  /**
   * מחזיר donorIds מסוננים לפי טווח סכום תרומה
   * מחזיר תורמים שיש להם לפחות תרומה אחת בטווח הסכומים
   */
  private static async getDonorIdsFromAmountRange(filters: GlobalFilters): Promise<string[] | undefined> {
    if (filters.amountMin === undefined && filters.amountMax === undefined) {
      return undefined; // אין פילטר סכום
    }

    // בנה תנאי סינון לפי סכום
    const amountWhere: any = {};
    if (filters.amountMin !== undefined) {
      amountWhere.$gte = filters.amountMin;
    }
    if (filters.amountMax !== undefined) {
      amountWhere.$lte = filters.amountMax;
    }

    // מצא תרומות בטווח הסכומים
    const donations = await remult.repo(Donation).find({
      where: { amount: amountWhere }
    });

    // החזר רשימת תורמים ייחודיים
    const donorIds = [...new Set(donations.map(d => d.donorId).filter((id): id is string => !!id))];
    return donorIds;
  }

  /**
   * מחזיר donorIds מסוננים לפי אנ"ש / תלמידנו
   */
  private static async getDonorIdsFromAnashAlumni(filters: GlobalFilters): Promise<string[] | undefined> {
    // console.log('getDonorIdsFromAnashAlumni')
    // אם שני הפילטרים הם All (או undefined לתאימות אחורה), אין צורך לסנן
    const isAnashAll = !filters.isAnash || filters.isAnash === TriStateFilter.All;
    const isAlumniAll = !filters.isAlumni || filters.isAlumni === TriStateFilter.All;
    if (isAnashAll && isAlumniAll) {
      // console.log('getDonorIdsFromAnashAlumni 1')
      return undefined; // אין פילטר אנ"ש/תלמידנו
    }
    // console.log('getDonorIdsFromAnashAlumni anash', filters.isAnash, filters.isAnash === TriStateFilter.Yes, filters.isAnash === TriStateFilter.No)
    // console.log('getDonorIdsFromAnashAlumni alumni', filters.isAlumni, filters.isAlumni === TriStateFilter.Yes, filters.isAlumni === TriStateFilter.No)

    // ── גרסה מקורית (שמורה): טעינה של 3K+ תורמים מלאים ל-memory, פילטור ב-JS. ~15MB.
    // const allDonors = await remult.repo(Donor).find();
    // const donorIds = allDonors
    //   .filter(donor => { var result = true; if (filters.isAnash === TriStateFilter.Yes) result &&= (donor.isAnash === true); ... })
    //   .map(donor => donor.id);

    // ── אופטימיזציה: פילטרי WHERE ב-SQL, מחזיר רק IDs.
    const where: any = {};
    if (filters.isAnash === TriStateFilter.Yes) where.isAnash = true;
    else if (filters.isAnash === TriStateFilter.No) where.isAnash = false;
    if (filters.isAlumni === TriStateFilter.Yes) where.isAlumni = true;
    else if (filters.isAlumni === TriStateFilter.No) where.isAlumni = false;

    const matchedDonors = await remult.repo(Donor).find({ where });
    const donorIds = matchedDonors.map(d => d.id);
    return donorIds;
  }

  /**
   * מחזיר donorIds מסוננים לפי קמפיינים
   * מחזיר תורמים שתרמו או הוזמנו לקמפיינים שנבחרו
   */
  private static async getDonorIdsFromCampaigns(filters: GlobalFilters): Promise<string[] | undefined> {
    if (!filters.campaignIds || filters.campaignIds.length === 0) {
      return undefined; // אין פילטר קמפיינים
    }

    // נקבל את התורמים מתוך donations
    const donations = await remult.repo(Donation).find({
      where: { campaignId: { $in: filters.campaignIds } }
    });

    // נוסיף גם תורמים שהוזמנו לקמפיינים (מתוך invitedDonorIds)
    const campaigns = await remult.repo(Campaign).find({
      where: { id: { $in: filters.campaignIds } }
    });

    const donorIdsFromDonations = donations.map(d => d.donorId).filter((id): id is string => !!id);
    const donorIdsFromInvites = campaigns.flatMap(c => c.invitedDonorIds || []);

    const donorIds = [...new Set([...donorIdsFromDonations, ...donorIdsFromInvites])];

    return donorIds;
  }

}
