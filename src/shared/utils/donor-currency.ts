import { remult } from 'remult'
import { DonorPlace } from '../entity/donor-place'

/**
 * המטבע של מדינת התורם - לפי הכתובת הראשית הפעילה שלו (place.country.currencyId).
 * מקום אחד למחשב (כרטיס התרומה) ולמובייל (תרומה חדשה). מחזיר null כשאין
 * כתובת, מדינה או מטבע - ברירת המחדל נשארת אצל כל מסך כמו שהייתה.
 */
export async function donorCountryCurrencyId(donorId: string): Promise<string | null> {
  if (!donorId) return null
  const [donorPlace] = await remult.repo(DonorPlace).find({
    where: { donorId, isActive: true, isPrimary: true },
    include: { place: { include: { country: true } } },
    limit: 1
  })
  return donorPlace?.place?.country?.currencyId || null
}
