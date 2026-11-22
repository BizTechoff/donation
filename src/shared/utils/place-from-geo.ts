import { remult } from 'remult'
import { Country } from '../entity/country'
import { Place } from '../entity/place'

/**
 * מקום (Place) מתשובת שירות הכתובות (GeoService) - מקום אחד לשלושה מסכים
 * שהחזיקו עד היום עותק משלהם: שדה הכתובת (app-osm-address-input), מפת
 * התורמים במחשב (Ctrl+לחיצה) ומתכנן המסלול במובייל (לחיצה ארוכה).
 */

/** פרטי הכתובת כפי שהשרת מחזיר אותם (placeDto / placeDetails) */
export interface GeoPlaceDetails {
  name?: string
  streetname?: string
  homenumber?: string | number
  neighborhood?: string
  cityname?: string
  state?: string
  postcode?: string
  countryCode?: string
  countryName?: string
  country?: string
  x?: number
  y?: number
  /** הכתובת המלאה מגוגל באנגלית - עדיפה על שורת ההצעה (מדיניות: כתובות באנגלית) */
  formattedAddress?: string
}

/** המדינה לפי קוד; מדינה שעוד לא קיימת נוצרת (קידומת ומטבע - למילוי ידני). */
export async function findOrCreateCountry(code: string, name?: string): Promise<Country | undefined> {
  const countryCode = (code || 'IL').toUpperCase()
  try {
    const existing = await remult.repo(Country).findFirst({ code: countryCode })
    if (existing) return existing
    const countryName = name || countryCode
    console.warn(`Country ${countryCode} not found - creating it (phone prefix and currency to fill manually)`)
    return await remult.repo(Country).insert({
      name: countryName,
      nameEn: countryName,
      code: countryCode,
      phonePrefix: '',
      currencyId: 'USD',
      isActive: true
    })
  } catch (error) {
    console.error('Error loading/creating country:', error)
    return undefined
  }
}

/**
 * שומר (או מוצא) את המקום במסד מפרטי הכתובת. placeId ו-fullAddress מגיעים
 * מהמקור - הצעה שנבחרה בשדה הכתובת, או תשובת reverse geocode מהמפה.
 */
export async function savePlaceFromGeo(
  details: GeoPlaceDetails,
  source: { placeId: string, fullAddress: string }
): Promise<Place> {
  const country = await findOrCreateCountry(
    details.countryCode || 'IL',
    details.countryName || details.country
  )
  const placeData: Partial<Place> = {
    placeId: String(source.placeId || ''),
    // הכתובת באנגלית מגוגל; שורת ההצעה רק כשאין (בחיפוש בעברית היא מתחילה
    // בשם העסק בעברית - "מרקו קאירי, Nahalat Binyamin Street...")
    fullAddress: String(details.formattedAddress || source.fullAddress || ''),
    placeName: details.name || '',
    street: details.streetname || '',
    houseNumber: details.homenumber ? String(details.homenumber) : '',
    neighborhood: details.neighborhood || '',
    city: String(details.cityname || ''),
    state: details.state || '',
    postcode: details.postcode || '',
    countryId: country?.id,
    latitude: details.y,
    longitude: details.x
  }
  return await Place.findOrCreate(placeData, remult.repo(Place))
}
