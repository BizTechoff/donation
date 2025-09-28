import { config } from "dotenv";
import { NextFunction, Request, Response } from "express";
import { placeDto } from "../shared/type/place.type";

config()
const fetch = require('node-fetch')

// Helper function to get language parameter based on user preference
const getLanguageParam = (lang?: string): string => {
    // Default to Hebrew if not specified
    const language = lang === 'en' ? 'en' : 'he';
    return `&language=${language}`;
}

export const getPlace = async (req: Request, res: Response, next: NextFunction) => {
    let result: placeDto = {} as placeDto
    //     valid: false,
    //     x: 0,         // Longitude
    //     y: 0,         // Latitude
    //     streetname: '', // Street Name
    //     homenumber: '', // Home Number
    //     cityname: '',   // City Name
    //     area: AreaType.none,
    //     name: ''        // Place Name
    // };
    console.debug('getPlace called at ' + new Date().toString());

    const { key, lang } = req.query;
    if (key === process.env['SERVER_API_KEY']!) {
        const { placeId } = req.query;
        // console.log('getPlace: placeId: ', placeId);

        if (placeId && placeId.length) {
            const langParam = getLanguageParam(lang as string);
            const url = `${process.env['GOOGLE_GEO_API_URL_PLACE']}?place_id=${placeId}&key=${process.env['GOOGLE_GEO_API_KEY']}${langParam}`;

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json; charset=UTF-8',
                        'Cache-Control': 'no-store'
                    }
                });

                if (response.ok) {
                    const json = await response.json();
                    if (json?.status === 'OK' && json?.result) {
                        const { geometry, address_components, name } = json.result;

                        // Extract place name
                        if (name) {
                            result.name = name;
                        }

                        // Extract latitude and longitude
                        if (geometry?.location) {
                            result.x = geometry.location.lng; // Longitude
                            result.y = geometry.location.lat; // Latitude
                        }

                        // Extract address components
                        if (address_components && Array.isArray(address_components)) {
                            console.log('Processing address_components from Google:');

                            address_components.forEach(component => {
                                console.log(`  Component: ${component.long_name} (${component.short_name}), Types: ${component.types.join(', ')}`);

                                if (component.types.includes('route')) {
                                    result.streetname = component.long_name; // Street Name
                                }
                                if (component.types.includes('street_number')) {
                                    result.homenumber = component.long_name; // Home Number
                                }
                                if (component.types.includes('locality')) {
                                    result.cityname = component.long_name; // City Name
                                }
                                // מיקוד - חיפוש מורחב
                                if (component.types.includes('postal_code') ||
                                    component.types.includes('postal_code_prefix') ||
                                    component.types.includes('postal_code_suffix')) {
                                    result.postcode = component.long_name; // Postal Code
                                    console.log(`    -> Found postal code: ${component.long_name}`);
                                }
                                // שכונה - חיפוש מורחב
                                if (component.types.includes('neighborhood') ||
                                    component.types.includes('sublocality') ||
                                    component.types.includes('sublocality_level_1') ||
                                    component.types.includes('sublocality_level_2') ||
                                    component.types.includes('sublocality_level_3') ||
                                    component.types.includes('sublocality_level_4') ||
                                    component.types.includes('sublocality_level_5')) {
                                    // אם אין שכונה עדיין, או אם זה neighborhood ספציפי
                                    if (!result.neighborhood || component.types.includes('neighborhood')) {
                                        result.neighborhood = component.long_name; // Neighborhood
                                        console.log(`    -> Found neighborhood: ${component.long_name}`);
                                    }
                                }
                                // שמירת administrative_area_level_2 כשכונה אם עדיין אין
                                if (!result.neighborhood && component.types.includes('administrative_area_level_2')) {
                                    result.neighborhood = component.long_name;
                                    console.log(`    -> Using admin_area_2 as neighborhood: ${component.long_name}`);
                                }
                                // מחוז/מדינה
                                if (component.types.includes('administrative_area_level_1')) {
                                    result.state = component.long_name; // State/Province name
                                    console.log(`    -> Found state: ${component.long_name}`);
                                }
                                // מדינה וקוד מדינה
                                if (component.types.includes('country')) {
                                    result.country = component.long_name; // Country name
                                    result.countryCode = component.short_name; // Country code
                                    console.log(`    -> Found country: ${component.long_name} (${component.short_name})`);
                                }
                            });

                            console.log('Final extracted data:', JSON.stringify(result));
                        }

                        // result.area = AreaType.getAreaContains({ x: result.x, y: result.y });

                        result.valid = true;
                        // console.log('place.json: ' + JSON.stringify(json));
                    } else {
                        console.warn('Invalid API response status or missing details');
                    }
                } else {
                    console.error(`Error fetching place details: ${response.status} ${response.statusText}`);
                }
            } catch (error) {
                console.error('Error during fetch:', error);
            }
        } else {
            console.warn('Missing or invalid placeId');
        }
    } else {
        console.warn('Invalid API key');
    }

    // console.log('getPlace-result', result);
    return res.status(200).json(result);
};

export const getPlaces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // console.log(`getPlaces: { called: ${new Date().toLocaleString()} }`);
    const { key, lang } = req.query;
    if (key === process.env['SERVER_API_KEY']!) {
        try {
            // Extract input from query parameters
            // const input = (req.query.input ?? '').toString().trim(); // Ensure input is a non-empty string
            var { input } = req.query; // קבלת מחרוזת החיפוש מהלקוח
            input = (input ?? '') + ''
            // console.log(`getPlaces: { input: ${input} }`);

            if (!input) {
                // Handle empty or missing input
                console.warn('getPlaces: Missing input query parameter');
                res.status(400).json({ error: 'Input query parameter is required' });
                return; // Terminate function
            }

            // Validate environment variables
            const apiUrl = process.env['GOOGLE_GEO_API_URL_AUTOCOMPLETE'];
            const apiKey = process.env['GOOGLE_GEO_API_KEY'];

            if (!apiUrl || !apiKey) {
                console.error('getPlaces: Missing environment variables');
                res.status(500).json({ error: 'Server configuration error' });
                return; // Terminate function
            }

            // const url = `${apiUrl}?key=${apiKey}&language=he&components=country:il&types=geocode&input=${encodeURIComponent(input)}`;
            // language=he&components=country:il&
            const langParam = getLanguageParam(lang as string);
            const url = `${apiUrl}?key=${apiKey}&types=geocode|establishment&input=${encodeURIComponent(input)}${langParam}`;
            // console.log(`getPlaces: { url: ${url} }`);

            // Fetch data from Google API
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Cache-Control': 'no-store',
                },
            });

            if (!response.ok) {
                console.error(`getPlaces: Failed with status ${response.status}`);
                res.status(response.status).json({ error: 'Failed to fetch autocomplete results' });
                return; // Terminate function
            }

            const responseData = await response.json(); // Parse JSON response
            // console.log(`getPlaces: { responseData: ${JSON.stringify(responseData, null, 2)} }`);

            res.status(200).json(responseData); // Send parsed response to the client
        } catch (error) {
            console.error('getPlaces: Error occurred:', error);
            res.status(500).json({ error: 'Internal server error' });
            return; // Ensure the function terminates
        }
    }
};

// export const optimizeRoute = async (req: Request, res: Response, next: NextFunction) => {
//     const result: ApiResponse = { success: false, message: '' }

//     const { key } = req.query;
//     if (key === process.env['SERVER_API_KEY']! || true) {
//         const { routeId } = req.body
//         if (!routeId) {
//             result.message = 'paymentId missing'
//             return res.status(403).json(result)
//         }

//         const deliveries = new Map<number /*seq*/, Delivery>()
//         const jobs = [] as Job[]
//         for await (const dlv of remult.repo(Delivery).query({
//             where: { route: { $id: routeId } },
//             load: d => [d.place, d.place]
//         })) {
//             const jobId = deliveries.size + 1
//             deliveries.set(jobId, dlv)

//             const j: Job = {
//                 id: jobId, // שימוש ב-ID של המשלוח
//                 description: 'שם הלקוח',// dlv.place.order.customer.name, // שם הלקוח או תיאור אחר
//                 location: [dlv.place.x, dlv.place.y] // חשוב: הסדר הוא [קו אורך, קו רוחב]ת
//             };

//             if (dlv.placeType.id === PlaceType.from.id) {
//                 j.pickup = [jobId]
//                 j.amount = [1]
//             }

//             else if (dlv.placeType.id === PlaceType.to.id) {
//                 j.delivery = [jobId]
//                 j.amount = [-1]
//             }

//             // הוספת חלון זמן רק אם הוא קיים במשלוח
//             if (dlv.place.minTime && dlv.place.maxTime) {
//                 const start = timeStringToDate(dlv.place.minTime)
//                 const end = timeStringToDate(dlv.place.maxTime)
//                 j.time_windows = [[
//                     toUnixTimestamp(start),
//                     toUnixTimestamp(end)
//                 ]];
//             }
//             jobs.push(j)
//         }

//         const office = Place.office()
//         // 3. הגדרת ה"רכב" (vehicle) שיבצע את המסלול
//         const vehicles: Vehicle[] = [{
//             id: 1,
//             profile: "driving-car",
//             start: [office.y, office.x], // נקודת התחלה (לדוגמה, המחסן)
//             end: [office.y, office.x],
//             capacity: [100]    // נקודת סיום
//         }];

//         // 4. הרכבת גוף הבקשה המלא (payload)
//         const payload = { jobs, vehicles };

//         // 5. שליחת הבקשה ל-openrouteservice
//         const ORS_API_KEY = process.env['OPTIMAL_ROUTE_API_KEY']; // **חשוב** לנהל את המפתח בסודות/משתני סביבה
//         if (!ORS_API_KEY) {
//             throw new Error("Openrouteservice API key is not configured.");
//         }

//         console.log("Sending payload to openrouteservice:", JSON.stringify(payload, null, 2));

//         try {
//             const url = process.env['OPTIMAL_ROUTE_API_URL']
//             const response = await fetch(url, {
//                 method: 'POST',
//                 headers: {
//                     'Authorization': ORS_API_KEY,
//                     'Content-Type': 'application/json',
//                     'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-t'
//                 },
//                 body: JSON.stringify(payload, null, 2)
//             });

//             const json = await response.json();

//             if (!response.ok) {
//                 console.error("Error from openrouteservice:", result);
//                 throw new Error(json.error || `HTTP error! status: ${response.status}`);
//             }

//             result.success = true
//             result.message = json

//             // console.log("Received payload from openrouteservice:", json);

//             // const optimizedJobs = json.routes?.steps
//             // console.log('optimizedJobs.json.routes', json.routes)
//             // console.log('optimizedJobs.json.routes.steps', json.routes[0].steps)
//             const optimizedIds = [] as number[]
//             for (const step of json.routes[0].steps) {
//                 if (step.type === 'job') {
//                     optimizedIds.push(step.id)
//                 }
//             }

//             for (const jobId of optimizedIds) {
//                 const dlv = deliveries.get(jobId)
//                 if (dlv) {
//                     if (dlv.seq !== jobId) {
//                         dlv.seq = jobId
//                         await dlv.save()
//                     }
//                 }
//             }
//             console.log("Optimization successful!", optimizedIds.join(', '));

//         } catch (error) {
//             console.error("Failed to fetch optimized route:", error);
//             throw error; // זריקת השגיאה הלאה לטיפול
//         }


//         // toUnixTimestamp()
//     }

//     // console.log('getPlace-result', result);
//     return res.status(200).json(result);
// }
