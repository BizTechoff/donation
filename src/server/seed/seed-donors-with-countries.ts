import { remult } from 'remult';
import { Donor } from '../../shared/entity/donor';
import { Place } from '../../shared/entity/place';
import { faker } from '@faker-js/faker';

export async function seedDonorsWithCountries() {
  const donorRepo = remult.repo(Donor);
  const placeRepo = remult.repo(Place);

  // Clear existing demo donors
  const existingDonors = await donorRepo.find({ where: { email: { $contains: '@demo.com' } } });
  for (const donor of existingDonors) {
    await donor.delete();
  }

  // Country data with coordinates for major cities
  const countryData = [
    {
      country: 'ישראל',
      countryEn: 'Israel',
      countryCode: 'IL',
      cities: [
        { city: 'תל אביב', lat: 32.0853, lng: 34.7818 },
        { city: 'ירושלים', lat: 31.7683, lng: 35.2137 },
        { city: 'חיפה', lat: 32.7940, lng: 34.9896 },
        { city: 'באר שבע', lat: 31.2530, lng: 34.7915 },
        { city: 'נתניה', lat: 32.3215, lng: 34.8532 }
      ]
    },
    {
      country: 'אוסטרליה',
      countryEn: 'Australia',
      countryCode: 'AU',
      cities: [
        { city: 'Sydney', lat: -33.8688, lng: 151.2093 },
        { city: 'Melbourne', lat: -37.8136, lng: 144.9631 },
        { city: 'Brisbane', lat: -27.4698, lng: 153.0251 },
        { city: 'Perth', lat: -31.9505, lng: 115.8605 },
        { city: 'Adelaide', lat: -34.9285, lng: 138.6007 }
      ]
    },
    {
      country: 'ארצות הברית',
      countryEn: 'United States',
      countryCode: 'US',
      cities: [
        { city: 'New York', lat: 40.7128, lng: -74.0060 },
        { city: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
        { city: 'Chicago', lat: 41.8781, lng: -87.6298 },
        { city: 'Houston', lat: 29.7604, lng: -95.3698 },
        { city: 'Miami', lat: 25.7617, lng: -80.1918 }
      ]
    },
    {
      country: 'קנדה',
      countryEn: 'Canada',
      countryCode: 'CA',
      cities: [
        { city: 'Toronto', lat: 43.6532, lng: -79.3832 },
        { city: 'Montreal', lat: 45.5017, lng: -73.5673 },
        { city: 'Vancouver', lat: 49.2827, lng: -123.1207 },
        { city: 'Calgary', lat: 51.0447, lng: -114.0719 },
        { city: 'Ottawa', lat: 45.4215, lng: -75.6972 }
      ]
    },
    {
      country: 'בריטניה',
      countryEn: 'United Kingdom',
      countryCode: 'GB',
      cities: [
        { city: 'London', lat: 51.5074, lng: -0.1278 },
        { city: 'Manchester', lat: 53.4808, lng: -2.2426 },
        { city: 'Birmingham', lat: 52.4862, lng: -1.8904 },
        { city: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
        { city: 'Liverpool', lat: 53.4084, lng: -2.9916 }
      ]
    },
    {
      country: 'צרפת',
      countryEn: 'France',
      countryCode: 'FR',
      cities: [
        { city: 'Paris', lat: 48.8566, lng: 2.3522 },
        { city: 'Lyon', lat: 45.7640, lng: 4.8357 },
        { city: 'Marseille', lat: 43.2965, lng: 5.3698 },
        { city: 'Nice', lat: 43.7102, lng: 7.2620 },
        { city: 'Toulouse', lat: 43.6047, lng: 1.4442 }
      ]
    }
  ];

  const donorsCreated = [];
  let donorIndex = 1;

  for (const countryInfo of countryData) {
    // Create 10 donors per country
    for (let i = 0; i < 10; i++) {
      const cityInfo = countryInfo.cities[i % countryInfo.cities.length];

      // Create place first
      const place = await placeRepo.insert({
        placeId: `demo_place_${donorIndex}`,
        fullAddress: `${faker.location.streetAddress()}, ${cityInfo.city}, ${countryInfo.country}`,
        placeName: `Demo Location ${donorIndex}`,
        street: faker.location.street(),
        houseNumber: faker.location.buildingNumber(),
        city: cityInfo.city,
        country: i % 2 === 0 ? countryInfo.country : countryInfo.countryEn, // Mix Hebrew and English
        countryCode: countryInfo.countryCode,
        latitude: cityInfo.lat + (Math.random() - 0.5) * 0.1, // Add some variation
        longitude: cityInfo.lng + (Math.random() - 0.5) * 0.1,
        postcode: faker.location.zipCode()
      });

      // Create donor
      const donor = await donorRepo.insert({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: `donor${donorIndex}@demo.com`,
        phone: faker.phone.number(),
        homePlaceId: place.id,
        isActive: true,
        donorType: faker.helpers.arrayElement(['individual', 'company', 'foundation']),
        notes: `Demo donor from ${countryInfo.country}/${countryInfo.countryEn}`
      });

      donorsCreated.push({
        donor: donor,
        country: countryInfo.country,
        countryEn: countryInfo.countryEn,
        city: cityInfo.city
      });

      donorIndex++;
    }
  }

  console.log(`Created ${donorsCreated.length} demo donors across ${countryData.length} countries`);

  // Log summary
  const summary = countryData.map(c => {
    const count = donorsCreated.filter(d => d.country === c.country).length;
    return `${c.country}/${c.countryEn}: ${count} donors`;
  });

  console.log('Donor distribution by country:');
  summary.forEach(s => console.log(`  - ${s}`));

  return donorsCreated;
}