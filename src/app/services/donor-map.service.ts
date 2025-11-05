import { Injectable } from '@angular/core';
import { TargetAudienceController } from '../../shared/controllers/target-audience.controller';
import { TargetAudience } from '../../shared/entity/target-audience';
import { UIToolsService } from '../common/UIToolsService';

@Injectable({
  providedIn: 'root'
})
export class DonorMapService {

  constructor(private ui: UIToolsService) {}

  /**
   * רענון קהל יעד לפי הפוליגון השמור
   * זה שימושי כאשר נוספו תורמים חדשים באותו אזור
   */
  async refreshTargetAudienceByPolygon(targetAudienceId: string): Promise<TargetAudience | null> {
    try {
      this.ui.busy.donotWait(async () => {
        const updatedTargetAudience = await TargetAudienceController.refreshTargetAudienceByPolygon(targetAudienceId);

        const addedCount = updatedTargetAudience.donorIds.length;
        this.ui.info(`קהל היעד עודכן בהצלחה! נמצאו ${addedCount} תורמים באזור הפוליגון`);

        return updatedTargetAudience;
      });

      return await TargetAudienceController.refreshTargetAudienceByPolygon(targetAudienceId);
    } catch (error: any) {
      console.error('Error refreshing target audience:', error);
      this.ui.error(error.message || 'שגיאה ברענון קהל היעד');
      return null;
    }
  }

  /**
   * רענון כל קהלי היעד שמבוססים על פוליגון
   */
  async refreshAllPolygonBasedTargetAudiences(): Promise<void> {
    try {
      // Get all target audiences
      const allTargetAudiences = await TargetAudienceController.getTargetAudiences();

      // Filter only those with polygon points
      const polygonBased = allTargetAudiences.filter(ta =>
        ta.polygonPoints && ta.polygonPoints.length >= 3
      );

      if (polygonBased.length === 0) {
        this.ui.info('לא נמצאו קהלי יעד מבוססי פוליגון');
        return;
      }

      this.ui.busy.donotWait(async () => {
        let successCount = 0;
        let errorCount = 0;

        for (const targetAudience of polygonBased) {
          try {
            await TargetAudienceController.refreshTargetAudienceByPolygon(targetAudience.id);
            successCount++;
          } catch (error) {
            console.error(`Error refreshing target audience ${targetAudience.name}:`, error);
            errorCount++;
          }
        }

        if (errorCount === 0) {
          this.ui.info(`${successCount} קהלי יעד עודכנו בהצלחה`);
        } else {
          this.ui.info(`עודכנו ${successCount} קהלי יעד, ${errorCount} נכשלו`);
        }
      });
    } catch (error: any) {
      console.error('Error refreshing all target audiences:', error);
      this.ui.error('שגיאה ברענון קהלי היעד');
    }
  }

  /**
   * בדיקה אם נקודה נמצאת בתוך פוליגון (Ray Casting Algorithm)
   * פונקציה עזר שיכולה לשמש גם בצד הקליינט
   */
  isPointInPolygon(
    point: { lat: number; lng: number },
    polygon: { lat: number; lng: number }[]
  ): boolean {
    let inside = false;
    const x = point.lng;
    const y = point.lat;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * חישוב שטח הפוליגון (Shoelace formula)
   * שימושי להצגת מידע על גודל האזור
   */
  calculatePolygonArea(polygon: { lat: number; lng: number }[]): number {
    if (polygon.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i].lng * polygon[j].lat;
      area -= polygon[j].lng * polygon[i].lat;
    }
    return Math.abs(area / 2);
  }

  /**
   * חישוב מרכז הפוליגון (Centroid)
   */
  calculatePolygonCenter(polygon: { lat: number; lng: number }[]): { lat: number; lng: number } | null {
    if (polygon.length === 0) return null;

    let centerLat = 0;
    let centerLng = 0;

    polygon.forEach(point => {
      centerLat += point.lat;
      centerLng += point.lng;
    });

    return {
      lat: centerLat / polygon.length,
      lng: centerLng / polygon.length
    };
  }
}
