
export interface placeDto {
    valid: boolean,
    placeId?: string,   // Google Place ID
    x: number,         // Longitude
    y: number,         // Latitude
    streetname: string, // Street Name
    homenumber: number, // Home Number
    cityname: string,   // City Name
    area: string,
    neighborhood: string,
    postcode: string,   // Postal Code
    state: string,      // State/Province Name
    country: string,    // Country Name
    countryName: string, // Country Name (for mapping to Country entity)
    countryCode: string, // Country Code
    name: string        // Place Name
}