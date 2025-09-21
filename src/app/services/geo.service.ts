import { Injectable } from '@angular/core';

interface GooglePlacePrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  terms: Array<{
    offset: number;
    value: string;
  }>;
  types: string[];
}

interface GooglePlacesResponse {
  predictions: GooglePlacePrediction[];
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeoService {
  private key = 'bto-donation-wapp-api-key'
  private debounceTimer?: number;
  public suggestions: GooglePlacePrediction[] = [];

  constructor() { }

  /**
   * Get autocomplete suggestions for address input
   * @param input - The search input string
   * @param callback - Optional callback function to handle results
   * @returns Promise with the suggestions
   */
  getPlacesSuggestions(input: string, callback?: (suggestions: GooglePlacePrediction[]) => void): Promise<GooglePlacePrediction[]> {
    return new Promise((resolve, reject) => {
      // Clear previous timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Debounce the request
      this.debounceTimer = window.setTimeout(() => {
        const url = ''; // 'http://localhost:3007'

        fetch(`${url}/api/geo/places?key=${encodeURIComponent(this.key)}&input=${encodeURIComponent(input)}`)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data: GooglePlacesResponse) => {
            // console.log('Autocomplete Suggestions:', data);
            this.suggestions = data.predictions || []; // Update suggestions list

            // Execute callback if provided
            if (callback) {
              callback(this.suggestions);
            }

            resolve(this.suggestions);
          })
          .catch((error) => {
            console.error('Error fetching suggestions:', error);
            this.suggestions = [];

            if (callback) {
              callback([]);
            }

            reject(error);
          });
      }, 300); // Wait 300ms before making the request
    });
  }

  /**
   * Get place details by place ID
   * @param placeId - Google Place ID
   * @returns Promise with place details
   */
  getPlaceDetails(placeId: string): Promise<any> {
    const url = ''; // 'http://localhost:3007'

    return fetch(`${url}/api/geo/place-details?key=${encodeURIComponent(this.key)}&placeId=${encodeURIComponent(placeId)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Place Details:', data);
        return data;
      })
      .catch((error) => {
        console.error('Error fetching place details:', error);
        throw error;
      });
  }

  /**
   * Clear suggestions and debounce timer
   */
  clearSuggestions(): void {
    this.suggestions = [];

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  /**
   * Format suggestion for display
   * @param prediction - Google place prediction
   * @returns Formatted string for display
   */
  formatSuggestion(prediction: GooglePlacePrediction): string {
    return prediction.description;
  }

  /**
   * Get main text from prediction (street name, business name, etc.)
   * @param prediction - Google place prediction
   * @returns Main text
   */
  getMainText(prediction: GooglePlacePrediction): string {
    return prediction.structured_formatting?.main_text || prediction.description;
  }

  /**
   * Get secondary text from prediction (city, country, etc.)
   * @param prediction - Google place prediction
   * @returns Secondary text
   */
  getSecondaryText(prediction: GooglePlacePrediction): string {
    return prediction.structured_formatting?.secondary_text || '';
  }
}