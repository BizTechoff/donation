import { remult } from 'remult';
import { Place } from '../shared/entity/place';
import { Country } from '../shared/entity/country';

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

    // Find all places where latitude is 0 or undefined
    const allPlaces = await placeRepo.find();
    const placesNeedingGeocode = allPlaces.filter(place =>
      !place.latitude || place.latitude === 0
    );

    console.log(`[Geocode Places] Found ${placesNeedingGeocode.length} places without coordinates`);

    if (placesNeedingGeocode.length === 0) {
      console.log('[Geocode Places] No places need geocoding. All done!');
      return { success: true, processed: 0, updated: 0, failed: 0 };
    }

    let updatedCount = 0;
    let failedCount = 0;
    const failedPlaces: { placeId: string; fullAddress: string; error: string }[] = [];

    // Process each place
    for (const place of placesNeedingGeocode) {
      try {
        console.log(`\n[Geocode Places] Processing: ${place.fullAddress}`);

        // Call Google Geocoding API
        // If we have placeId, use doGetPlace, otherwise use geocodeAddress with fullAddress
        let geocodeResult;
        if (place.placeId && place.placeId.trim().length > 0) {
          console.log(`  -> Using placeId: ${place.placeId}`);
          geocodeResult = await doGetPlace(place.placeId);
        } else {
          console.log(`  -> Using fullAddress for geocoding`);
          geocodeResult = await geocodeAddress(place.fullAddress);

          // Update placeId if we got one from geocoding
          if (geocodeResult?.valid && geocodeResult.placeId) {
            place.placeId = geocodeResult.placeId;
            console.log(`  -> Got new placeId: ${geocodeResult.placeId}`);
          }
        }

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
