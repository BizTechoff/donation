import { remult } from 'remult';
import { Country } from '../shared/entity/country';
import { Place } from '../shared/entity/place';

/**
 * Process all Places that are missing coordinates (latitude = 0 or undefined)
 * and populate them using Google Geocoding API
 */
export async function geocodeMissingPlaces() {
  console.log('[Geocode Places] Starting geocoding process...');

  // Dynamic import to avoid bundling issues with dotenv
  const { doGetPlace, geocodeAddress } = await import('./geo');

  try {
    const placeRepo = remult.repo(Place);
    const countryRepo = remult.repo(Country);

    // ── גרסה מקורית (שמורה): טעינת כל ה-Places ל-memory + פילטור ב-JS.
    //    בעיה: רץ בכל startup, טוען 3K+ records רק כדי למצוא 0 חסרים.
    // const allPlaces = await placeRepo.find();
    // const placesNeedingGeocode = allPlaces.filter(place =>
    //   !place.latitude || place.latitude === 0
    // );

    // ── אופטימיזציה: בדיקת count מהירה קודם. רק אם יש places חסרים - לטעון אותם בלבד.
    const missingCount = await placeRepo.count({ latitude: 0 });
    if (missingCount === 0) {
      console.log('[Geocode Places] No places need geocoding. All done!');
      return { success: true, processed: 0, updated: 0, failed: 0 };
    }

    const placesNeedingGeocode = await placeRepo.find({ where: { latitude: 0 } });
    console.log(`[Geocode Places] Found ${placesNeedingGeocode.length} places without coordinates`);

    if (placesNeedingGeocode.length === 0) {
      console.log('[Geocode Places] No places need geocoding. All done!');
      return { success: true, processed: 0, updated: 0, failed: 0 };
    }

    // טען את כל המדינות פעם אחת כדי להחליף שם עברי בשם אנגלי בעת geocoding.
    const allCountries = await countryRepo.find();
    const countryMap = new Map(allCountries.map(c => [c.id, c]));

    // בונה כתובת לgeocoding עם שם מדינה באנגלית (ולא "אנגליה"/"ארצות הברית" וכו').
    const buildEnglishAddress = (place: Place): string => {
      const parts: string[] = [];
      if (place.street) parts.push(place.street);
      if (place.houseNumber) parts.push(String(place.houseNumber));
      if (place.apartment) parts.push(place.apartment);
      if (place.neighborhood) parts.push(place.neighborhood);
      if (place.city) parts.push(place.city);
      if (place.state) parts.push(place.state);
      if (place.postcode) parts.push(place.postcode);
      // שם המדינה באנגלית במקום בעברית (Google Geocoding עובד הרבה יותר טוב)
      if (place.countryId) {
        const country = countryMap.get(place.countryId);
        const countryLabel = country?.nameEn || country?.code || country?.name;
        if (countryLabel) parts.push(countryLabel);
      }
      return parts.filter(p => p && p.trim()).join(', ');
    };

    let updatedCount = 0;
    let failedCount = 0;
    const failedPlaces: { placeId: string; fullAddress: string; error: string }[] = [];

    let counter = 0
    // Process each place
    for (const place of placesNeedingGeocode) {
      ++counter
      // if(counter >= 10) break
      try {
        // בונים כתובת באנגלית (שם מדינה מתורגם) במקום fullAddress שעלול להכיל "אנגליה" וכד'
        const englishAddress = buildEnglishAddress(place) || place.fullAddress;
        console.log(`\n[Geocode Places] Processing: ${englishAddress}`);

        // Call Google Geocoding API
        let geocodeResult;
        // if (place.placeId && place.placeId.trim().length > 0) {
        //   console.log(`  -> Using placeId: ${place.placeId}`);
        //   geocodeResult = await doGetPlace(place.placeId);
        // } else {
        console.log(`  -> Using English address for geocoding`);
        geocodeResult = await geocodeAddress(englishAddress);

        // Update placeId if we got one from geocoding
        if (geocodeResult?.valid && geocodeResult.placeId) {
          place.placeId = geocodeResult.placeId;
          console.log(`  -> Got new placeId: ${geocodeResult.placeId}`);
        }
        // }

        if (geocodeResult && geocodeResult.valid && geocodeResult.x && geocodeResult.y) {
          // Update coordinates
          place.latitude = geocodeResult.y;
          place.longitude = geocodeResult.x;

          // Update other fields if they're empty
          if (!place.placeName && geocodeResult.name) {
            place.placeName = geocodeResult.name;
          }

          if (!place.street && geocodeResult.streetname) {
            place.street = geocodeResult.streetname;
          }

          if (!place.houseNumber && geocodeResult.homenumber) {
            place.houseNumber = geocodeResult.homenumber + '';
          }

          if (!place.neighborhood && geocodeResult.neighborhood) {
            place.neighborhood = geocodeResult.neighborhood;
          }

          if (!place.city && geocodeResult.cityname) {
            place.city = geocodeResult.cityname;
          }

          if (!place.state && geocodeResult.state) {
            place.state = geocodeResult.state;
          }

          if (!place.postcode && geocodeResult.postcode) {
            place.postcode = geocodeResult.postcode;
          }

          // Map country code to country ID if available
          if (geocodeResult.countryCode && !place.countryId) {
            const country = await countryRepo.findFirst(
              { code: geocodeResult.countryCode }
            ) || await countryRepo.findFirst(
              { name: geocodeResult.countryName }
            );

            if (country) {
              place.countryId = country.id;
              console.log(`  -> Mapped country: ${country.name} (${country.code})`);
            } else {
              console.log(`  -> Country not found in DB: ${geocodeResult.countryName} (${geocodeResult.countryCode})`);
            }
          }

          // Save the updated place
          await placeRepo.save(place);
          updatedCount++;

          console.log(`  ✓ Updated successfully: lat=${place.latitude}, lng=${place.longitude}`);

          // Add a small delay to avoid hitting rate limits
          await sleep(100);

        } else {
          failedCount++;
          const errorMsg = 'No valid geocoding result received';
          console.log(`  ✗ Failed: ${errorMsg}`);
          failedPlaces.push({
            placeId: place.placeId,
            fullAddress: place.fullAddress,
            error: errorMsg
          });
        }

      } catch (error) {
        failedCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ✗ Error processing place ${place.placeId}:`, errorMsg);
        failedPlaces.push({
          placeId: place.placeId,
          fullAddress: place.fullAddress,
          error: errorMsg
        });
      }
    }

    // Summary
    console.log('\n[Geocode Places] ========== SUMMARY ==========');
    console.log(`  Total places processed: ${placesNeedingGeocode.length}`);
    console.log(`  Successfully updated: ${updatedCount}`);
    console.log(`  Failed: ${failedCount}`);

    if (failedPlaces.length > 0) {
      console.log('\n[Geocode Places] Failed places:');
      failedPlaces.forEach(fp => {
        console.log(`  - ${fp.fullAddress} (${fp.placeId}): ${fp.error}`);
      });
    }

    console.log('[Geocode Places] ===============================\n');

    return {
      success: true,
      processed: placesNeedingGeocode.length,
      updated: updatedCount,
      failed: failedCount,
      failedPlaces
    };

  } catch (error) {
    console.error('[Geocode Places] Fatal error:', error);
    throw error;
  }
}

/**
 * Helper function to add delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
