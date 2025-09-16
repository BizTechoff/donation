import { Injectable } from '@angular/core';

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName?: string;
}

interface AddressSuggestion {
  display_name: string;
  place_id: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    // Additional OpenStreetMap fields
    footway?: string;
    pedestrian?: string;
    cycleway?: string;
    residential?: string;
    town?: string;
    village?: string;
    municipality?: string;
    region?: string;
    [key: string]: any; // For any other fields from OSM
  };
}

interface ParsedAddress {
  fullAddress: string;
  street?: string;
  houseNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
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

  // פונקציה להשלמה אוטומטית של כתובות באמצעות Nominatim
  async searchAddresses(query: string, countryCode: string = 'il'): Promise<AddressSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return [];
    }

    try {
      const results: AddressSuggestion[] = [];

      // חיפוש 1: חיפוש רגיל עם פרטי כתובת
      const normalizedQuery = this.normalizeAddressQuery(query);
      const encodedQuery = encodeURIComponent(normalizedQuery);

      const searches = [
        // חיפוש ראשון - כתובת מפורטת עם העדפה לכתובות
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&addressdetails=1&limit=10&countrycodes=${countryCode}&layer=address`,
        // חיפוש שני - חיפוש מובנה לכתובות
        `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(query)}&country=israel&addressdetails=1&limit=10`,
        // חיפוש שלישי - חיפוש רחב יותר אבל עדיין מוגבל לישראל
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&addressdetails=1&limit=15&countrycodes=${countryCode}&extratags=1`,
        // חיפוש רביעי - ללא normalization, החיפוש המקורי
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=10&countrycodes=${countryCode}&layer=address,poi`
      ];

      for (let i = 0; i < searches.length; i++) {
        try {
          console.log(`Address search ${i + 1}:`, searches[i]);
          const response = await fetch(searches[i]);
          const data = await response.json();

          console.log(`Search ${i + 1} results:`, data?.length || 0, data);

          if (data && data.length > 0) {
            const mappedResults = data.map((item: any) => ({
              display_name: item.display_name,
              place_id: item.place_id,
              lat: item.lat,
              lon: item.lon,
              address: item.address || {}
            }));

            // הוספת תוצאות ייחודיות בלבד
            mappedResults.forEach((result: AddressSuggestion) => {
              if (!results.some(existing => existing.place_id === result.place_id)) {
                results.push(result);
                console.log('Added unique result:', result.display_name);
              }
            });
          }
        } catch (searchError) {
          console.warn(`Search ${i + 1} failed:`, searchError);
        }
      }

      // מיון תוצאות לפי רלוונטיות
      return this.sortAddressByRelevance(results, query).slice(0, 8);
    } catch (error) {
      console.error('Address search error:', error);
      return [];
    }
  }

  // פונקציה לנרמול שאילתת כתובת
  private normalizeAddressQuery(query: string): string {
    // הסרת תווים מיוחדים וניקוי
    let normalized = query.trim();

    // זיהוי תבנית של מספר + שם רחוב + עיר (למשל: "אשכול 1 הוד השרון")
    const addressPattern = /^([א-ת\s]+)\s+(\d+[א-ת]?)\s+([א-ת\s]+)$/;
    const match = normalized.match(addressPattern);

    if (match) {
      // מקרה של: שם-רחוב מספר עיר
      const street = match[1].trim();
      const number = match[2].trim();
      const city = match[3].trim();
      normalized = `${street} ${number}, ${city}`;
    } else {
      // הוספת "רחוב" אם לא קיים ואין תבנית מוכרת
      if (!normalized.includes('רחוב') && !normalized.includes('שדרות') && !normalized.includes('כביש')) {
        // אם יש מספר בתחילת המחרוזת, ננסה להוסיף "רחוב"
        if (/^\d+/.test(normalized)) {
          const parts = normalized.split(' ');
          if (parts.length >= 2) {
            normalized = `רחוב ${parts.slice(1).join(' ')} ${parts[0]}`;
          }
        }
        // אל תוסיף "רחוב" לפני שמות עירוניים מוכרים
        else if (!this.isCityName(normalized)) {
          normalized = `רחוב ${normalized}`;
        }
      }
    }

    console.log('Normalized address query:', query, '->', normalized);
    return normalized;
  }

  // פונקציה לזיהוי שמות ערים
  private isCityName(query: string): boolean {
    const cities = [
      'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'נתניה', 'פתח תקוה',
      'אשדוד', 'ראשון לציון', 'רעננה', 'הוד השרון', 'רחובות', 'בני ברק',
      'גבעתיים', 'הרצליה', 'כפר סבא', 'רמת גן', 'מודיעין', 'לוד', 'רמלה',
      'אילת', 'עכו', 'נהריה', 'צפת', 'טבריה', 'קרית שמונה', 'אופקים',
      'דימונה', 'בית שאן', 'מגדל העמק', 'נצרת', 'שפרעם', 'סחנין'
    ];

    const queryLower = query.toLowerCase();
    return cities.some(city => queryLower.includes(city.toLowerCase()));
  }

  // מיון תוצאות לפי רלוונטיות
  private sortAddressByRelevance(results: AddressSuggestion[], query: string): AddressSuggestion[] {
    const queryLower = query.toLowerCase();

    return results.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // עדיפות לכתובות עם מספר בית
      if (a.address.house_number) scoreA += 10;
      if (b.address.house_number) scoreB += 10;

      // עדיפות לכתובות עם שם רחוב
      if (a.address.road) scoreA += 8;
      if (b.address.road) scoreB += 8;

      // עדיפות לכתובות שמכילות את המונחים שחיפשנו
      if (a.display_name.toLowerCase().includes(queryLower)) scoreA += 5;
      if (b.display_name.toLowerCase().includes(queryLower)) scoreB += 5;

      // עדיפות לכתובות בישראל
      if (a.address.country_code === 'il') scoreA += 3;
      if (b.address.country_code === 'il') scoreB += 3;

      return scoreB - scoreA;
    });
  }

  // פונקציה לפירוק כתובת לשדות נפרדים
  parseAddressFromSuggestion(suggestion: AddressSuggestion): ParsedAddress {
    const address = suggestion.address;

    // ניסיון לחלץ מספר בית מכתובת מלאה אם לא נמצא בשדה המיועד
    let houseNumber = address.house_number;
    let street = address.road;

    // אם אין מספר בית בשדה הייעודי, ננסה לחלץ מהכתובת המלאה
    if (!houseNumber && suggestion.display_name) {
      // חיפוש מספר בית - מספרים עם אותיות אופציונליות
      const houseNumberPatterns = [
        /\b(\d+[א-ת]?)\s*(?:,|$)/,  // מספר עם אות בסוף השורה או לפני פסיק
        /(?:^|,\s*)(\d+[א-ת]?)\s+/,  // מספר בתחילת הכתובת או אחרי פסיק
        /\b(\d+[א-ת]?)\b/           // כל מספר עם אות אופציונלית
      ];

      for (const pattern of houseNumberPatterns) {
        const match = suggestion.display_name.match(pattern);
        if (match) {
          houseNumber = match[1];
          break;
        }
      }
    }

    // ניסיון לחלץ שם רחוב טוב יותר
    if (!street) {
      // חיפוש חלופי לרחוב
      street = address.footway || address.pedestrian || address.cycleway;
    }

    return {
      fullAddress: suggestion.display_name,
      street: street || '',
      houseNumber: houseNumber || '',
      neighborhood: address.suburb || address.neighbourhood || address.residential || '',
      city: address.city || address.town || address.village || address.municipality || '',
      state: address.state || address.region || '',
      postcode: address.postcode || '',
      country: address.country || '',
      countryCode: address.country_code?.toUpperCase() || '',
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon)
    };
  }

  // פונקציה לחיפוש כתובת מפורטת עם פירוק שדות
  async searchDetailedAddress(query: string, countryCode: string = 'il'): Promise<ParsedAddress | null> {
    const suggestions = await this.searchAddresses(query, countryCode);

    if (suggestions.length > 0) {
      return this.parseAddressFromSuggestion(suggestions[0]);
    }

    return null;
  }
}
