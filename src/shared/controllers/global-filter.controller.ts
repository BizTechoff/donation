import { Allow, BackendMethod, remult } from 'remult';
import { GlobalFilters } from '../../app/services/global-filter.service';
import { Donor } from '../entity/donor';
import { Place } from '../entity/place';
import { DonorPlace } from '../entity/donor-place';
import { TargetAudience } from '../entity/target-audience';
import { Donation } from '../entity/donation';
import { Campaign } from '../entity/campaign';

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
    // שלוף globalFilters מ-user.settings
    const currentUserId = remult.user?.id;
    let globalFilters: GlobalFilters = {};
    if (currentUserId) {
      const { User } = await import('../entity/user');
      const user = await remult.repo(User).findId(currentUserId);
      globalFilters = user?.settings?.globalFilters || {};
    }

    // קרא למתודה המקורית עם הפילטרים
    return await GlobalFilterController.getDonorIds(globalFilters);
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

    // סינון לפי מיקום (מדינה, עיר, שכונה)
    const placeFiltered = await GlobalFilterController.getDonorIdsFromPlaces(filters);
    if (placeFiltered !== undefined) {
      if (placeFiltered.length === 0) return []; // אין התאמות
      donorIds = placeFiltered;
    }

    // סינון לפי קהל יעד
    const audienceFiltered = await GlobalFilterController.getDonorIdsFromTargetAudience(filters);
    if (audienceFiltered !== undefined) {
      if (donorIds) {
        // חיתוך - רק תורמים שבשני הקטגוריות
        donorIds = donorIds.filter(id => audienceFiltered.includes(id));
      } else {
        donorIds = audienceFiltered;
      }
      if (donorIds.length === 0) return []; // אין התאמות
    }

    // סינון לפי קמפיינים
    const campaignFiltered = await GlobalFilterController.getDonorIdsFromCampaigns(filters);
    if (campaignFiltered !== undefined) {
      if (donorIds) {
        // חיתוך - רק תורמים שבשני הקטגוריות
        donorIds = donorIds.filter(id => campaignFiltered.includes(id));
      } else {
        donorIds = campaignFiltered;
      }
      if (donorIds.length === 0) return []; // אין התאמות
    }

    // סינון לפי טווח סכום תרומה
    const amountFiltered = await GlobalFilterController.getDonorIdsFromAmountRange(filters);
    if (amountFiltered !== undefined) {
      if (donorIds) {
        // חיתוך - רק תורמים שבשני הקטגוריות
        donorIds = donorIds.filter(id => amountFiltered.includes(id));
      } else {
        donorIds = amountFiltered;
      }
      if (donorIds.length === 0) return []; // אין התאמות
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

  // /**
  //  * בונה whereClause לקמפיינים
  //  * כולל סינון לפי מיקום (location) ורשימת מוזמנים (invitedDonorIds)
  //  */
  // @BackendMethod({ allowed: Allow.authenticated })
  // static async buildWhereForCampaigns(
  //   filters: GlobalFilters,
  //   existingWhere: any = {}
  // ): Promise<any> {
  //   const whereClause = { ...existingWhere };

  //   // סינון לפי תאריכים (קיים כבר)
  //   if (filters.dateFrom || filters.dateTo) {
  //     whereClause.startDate = {};
  //     if (filters.dateFrom) {
  //       whereClause.startDate.$gte = filters.dateFrom;
  //     }
  //     if (filters.dateTo) {
  //       whereClause.startDate.$lte = filters.dateTo;
  //     }
  //   }

  //   // סינון לפי רשימת מוזמנים - צריך donorIds
  //   const donorIds = await GlobalFilterController.getDonorIds(filters);
  //   if (donorIds !== undefined) {
  //     if (donorIds.length === 0) {
  //       // אין תורמים תואמים - נחזיר תנאי שלא יחזיר תוצאות
  //       whereClause.id = { $in: [] };
  //     } else {
  //       // סינון קמפיינים שיש בהם לפחות אחד מהתורמים המסוננים ברשימת המוזמנים
  //       whereClause.$or = [
  //         { invitedDonorIds: { $contains: donorIds } }
  //       ];
  //     }
  //   }

  //   return whereClause;
  // }

  // /**
  //  * בונה whereClause לתזכורות
  //  * תזכורת יכולה להיות מקושרת לתורם או לתרומה
  //  */
  // @BackendMethod({ allowed: Allow.authenticated })
  // static async buildWhereForReminders(
  //   filters: GlobalFilters,
  //   existingWhere: any = {}
  // ): Promise<any> {
  //   const whereClause = { ...existingWhere };

  //   // סינון לפי donorIds
  //   const donorIds = await GlobalFilterController.getDonorIds(filters);
  //   if (donorIds !== undefined) {
  //     if (donorIds.length === 0) {
  //       // אין תורמים תואמים
  //       whereClause.id = { $in: [] };
  //     } else {
  //       // תזכורת יכולה להיות קשורה ישירות לתורם, או דרך תרומה
  //       whereClause.$or = [
  //         { donorId: { $in: donorIds } },
  //         // TODO: אם יש donationId, צריך לבדוק את donation.donorId
  //         // זה ידרוש join או שאילתה נפרדת
  //       ];
  //     }
  //   }

  //   return whereClause;
  // }
}
