import { remult } from 'remult'
import { Donor } from '../entity/donor'
import { DonorPlace } from '../entity/donor-place'
import { DonorContact } from '../entity/donor-contact'

/** שם המשפחה של תורם שעוד לא יודעים איך קוראים לו (יעקב, 22.11.2026) */
export const ANONYMOUS_LAST_NAME = 'אלמוני'

/** ברירות המחדל של תורם חדש - מקום אחד לכרטיס התורם במחשב ולמובייל. */
export function applyNewDonorDefaults(donor: Donor) {
  donor.isActive = true
  donor.wantsUpdates = true
  donor.companyIds = []
  donor.circleIds = []
  donor.wantsTaxReceipts = true
  donor.preferredLanguage = 'he'
}

export interface NewDonorBasic {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  /** סוג הקו שזוהה (נייד/קווי) - נכתב לתיאור, כמו בכרטיס התורם במחשב */
  phoneDescription?: string
  /** כתובת שכבר נשמרה (למשל מנקודה במפה) - נשמרת ככתובת "בית" ראשית */
  placeId?: string
}

/**
 * תורם חדש בסיסי - שם, טלפון וכתובת בית ראשית, כמו שכרטיס התורם במחשב שומר
 * תורם חדש. שם משפחה ריק נשמר כ"אלמוני". מחזיר את התורם שנשמר.
 */
export async function createDonorBasic(data: NewDonorBasic): Promise<Donor> {
  const donor = remult.repo(Donor).create()
  applyNewDonorDefaults(donor)
  donor.firstName = (data.firstName || '').trim()
  donor.lastName = (data.lastName || '').trim() || ANONYMOUS_LAST_NAME
  const saved = await remult.repo(Donor).save(donor)

  if (data.placeId) {
    await remult.repo(DonorPlace).insert({
      donorId: saved.id,
      placeId: data.placeId,
      description: 'בית',
      isPrimary: true,
      isActive: true
    })
  }
  const phone = (data.phoneNumber || '').trim()
  if (phone) {
    await remult.repo(DonorContact).insert({
      donorId: saved.id,
      type: 'phone',
      phoneNumber: phone,
      description: data.phoneDescription || '',
      isPrimary: true,
      isActive: true
    })
  }
  return saved
}
