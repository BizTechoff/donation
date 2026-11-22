import { Injectable } from '@angular/core'
import { Place } from '../../shared/entity/place'
import { savePlaceFromGeo } from '../../shared/utils/place-from-geo'
import { UIToolsService } from '../common/UIToolsService'
import { I18nService } from '../i18n/i18n.service'
import { GeoService } from './geo.service'

/**
 * "נקודה במפה -> תורם חדש" - השלב המשותף למפת התורמים במחשב ולמתכנן המסלול
 * במובייל: מזהה את הכתובת, שואל "האם לפתוח תורם חדש במיקום...?" ושומר את
 * המקום. כל מסך ממשיך משם בדרכו (במחשב - כרטיס התורם, במובייל - הטופס הקצר).
 */
@Injectable({ providedIn: 'root' })
export class MapNewDonorService {
  constructor(
    private geoService: GeoService,
    private ui: UIToolsService,
    private i18n: I18nService
  ) { }

  /** המקום השמור, או null כשהמשתמש ענה לא / הכתובת לא נמצאה (ההודעה כבר הוצגה). */
  /** onAddressLookedUp - נקרא כשזיהוי הכתובת הסתיים, לפני השאלה (לכיבוי אינדיקטור טעינה) */
  async askNewDonorPlace(lat: number, lng: number, onAddressLookedUp?: () => void): Promise<Place | null> {
    let result: any
    try {
      result = await this.geoService.reverseGeocode(lat, lng)
    } catch (error) {
      console.error('reverseGeocode failed:', error)
      onAddressLookedUp?.()
      this.ui.error(this.i18n.terms.errorGettingAddress)
      return null
    }
    onAddressLookedUp?.()
    if (!result?.success) {
      this.ui.error(this.i18n.terms.addressNotFoundForLocation)
      return null
    }

    const question = this.i18n.terms.createNewDonorAtLocationQuestion
      .replace('{address}', result.formattedAddress)
    if (!(await this.ui.yesNoQuestion(question, true))) return null

    const placeDto = result.placeDto
    if (!placeDto?.valid) {
      this.ui.error(this.i18n.terms.errorGettingAddress)
      return null
    }
    try {
      return await savePlaceFromGeo(placeDto, {
        placeId: result.placeId,
        fullAddress: result.formattedAddress || ''
      })
    } catch (error) {
      console.error('Error saving place for new donor:', error)
      this.ui.error(this.i18n.terms.errorCreatingDonor)
      return null
    }
  }
}
