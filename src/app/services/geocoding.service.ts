import { Injectable } from '@angular/core';

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {

  constructor() { }

  // פונקציה להמרת כתובת לקואורדינטות באמצעות Nominatim (OpenStreetMap)
  async geocodeAddress(address: string, city?: string, country: string = 'Israel'): Promise<GeocodingResult | null> {
    if (!address || address.trim() === '') {
      return null;
    }

    try {
      // בניית כתובת מלאה
      let fullAddress = address;
      if (city) {
        fullAddress += `, ${city}`;
      }
      fullAddress += `, ${country}`;

      const encodedAddress = encodeURIComponent(fullAddress);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;

      const response = await fetch(url);
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          displayName: result.display_name
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // פונקציה להמרת קואורדינטות לכתובת (Reverse Geocoding)
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

      const response = await fetch(url);
      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      }
      
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  // פונקציה לבדיקה מהירה אם כתובת היא בישראל
  isIsraeliAddress(address: string): boolean {
    const israeliKeywords = ['ישראל', 'israel', 'תל אביב', 'tel aviv', 'ירושלים', 'jerusalem', 
                           'חיפה', 'haifa', 'באר שבע', 'beer sheva', 'נתניה', 'netanya'];
    const lowerAddress = address.toLowerCase();
    return israeliKeywords.some(keyword => lowerAddress.includes(keyword));
  }
}
