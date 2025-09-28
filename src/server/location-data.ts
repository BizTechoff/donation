export interface LocationData {
  neighborhood?: string;
  city?: string;
  state?: string;
  country: string;
}

export const locationData: LocationData[] = [
  // Australia
  { city: "Victoria", country: "Australia" },

  // Austria
  { city: "Vienna", country: "Austria" },

  // Canada
  { neighborhood: "Outremont", city: "Montreal", state: "Quebec", country: "Canada" },
  { city: "Montreal", state: "Quebec", country: "Canada" },
  { city: "Toronto", state: "Ontario", country: "Canada" },

  // France
  { city: "Paris", country: "France" },

  // Scotland
  { city: "Giffnock Glasgow", country: "Scotland" },

  // Switzerland
  { city: "Basel", country: "Switzerland" },
  { city: "Zurich", country: "Switzerland" },

  // UK
  { city: "Canvey Island", country: "UK" },
  { city: "Gateshead", country: "UK" },
  { neighborhood: "Enfield", city: "London", country: "UK" },
  { neighborhood: "Finchley", city: "London", country: "UK" },
  { neighborhood: "Golders Green", city: "London", country: "UK" },
  { neighborhood: "Hendon", city: "London", country: "UK" },
  { neighborhood: "Stamford Hill", city: "London", country: "UK" },
  { neighborhood: "Prestwich", city: "Manchester", country: "UK" },
  { city: "Salford", country: "UK" },

  // US - New York
  { city: "Airmont", state: "NY", country: "US" },
  { neighborhood: "Borough Park", city: "Brooklyn", state: "NY", country: "US" },
  { neighborhood: "Canarsie", city: "Brooklyn", state: "NY", country: "US" },
  { neighborhood: "Crown Heights", city: "Brooklyn", state: "NY", country: "US" },
  { neighborhood: "East New York", city: "Brooklyn", state: "NY", country: "US" },
  { neighborhood: "Flatbush", city: "Brooklyn", state: "NY", country: "US" },
  { neighborhood: "Mill Basin", city: "Brooklyn", state: "NY", country: "US" },
  { neighborhood: "Williamsburg", city: "Brooklyn", state: "NY", country: "US" },
  { city: "Cedarhurst", state: "NY", country: "US" },
  { city: "Fallsburg", state: "NY", country: "US" },
  { city: "Great Neck", state: "NY", country: "US" },
  { city: "Hempstead", state: "NY", country: "US" },
  { city: "Highland Mills", state: "NY", country: "US" },
  { city: "Kaser", state: "NY", country: "US" },
  { city: "Kiryas Joel", state: "NY", country: "US" },
  { city: "Lawrence", state: "NY", country: "US" },
  { neighborhood: "Manhattan", city: "New York", state: "NY", country: "US" },
  { city: "Monroe", state: "NY", country: "US" },
  { city: "Monsey", state: "NY", country: "US" },
  { city: "Montebello", state: "NY", country: "US" },
  { city: "New Rochelle", state: "NY", country: "US" },
  { city: "New Square", state: "NY", country: "US" },
  { city: "Plainview", state: "NY", country: "US" },
  { city: "Pomona", state: "NY", country: "US" },
  { neighborhood: "Far Rockaway", city: "Queens", state: "NY", country: "US" },
  { neighborhood: "Forest Hills", city: "Queens", state: "NY", country: "US" },
  { neighborhood: "Flushing", city: "Queens", state: "NY", country: "US" },
  { neighborhood: "Jamaica", city: "Queens", state: "NY", country: "US" },
  { neighborhood: "Kew Gardens", city: "Queens", state: "NY", country: "US" },
  { city: "Spring Valley", state: "NY", country: "US" },
  { neighborhood: "Emerson Hill", city: "Staten Island", state: "NY", country: "US" },
  { neighborhood: "Manor Heights", city: "Staten Island", state: "NY", country: "US" },
  { neighborhood: "Westerleigh", city: "Staten Island", state: "NY", country: "US" },
  { city: "Suffern", state: "NY", country: "US" },
  { city: "Valley Stream", state: "NY", country: "US" },
  { city: "Viola", state: "NY", country: "US" },
  { city: "Woodmere", state: "NY", country: "US" },

  // US - New Jersey
  { city: "Bergenfield", state: "NJ", country: "US" },
  { city: "Clifton", state: "NJ", country: "US" },
  { city: "Deal", state: "NJ", country: "US" },
  { city: "Englewood", state: "NJ", country: "US" },
  { city: "Fair Lawn", state: "NJ", country: "US" },
  { city: "Fort Lee", state: "NJ", country: "US" },
  { city: "Hackensack", state: "NJ", country: "US" },
  { city: "Howell Township", state: "NJ", country: "US" },
  { city: "Jackson Township", state: "NJ", country: "US" },
  { city: "Lakewood", state: "NJ", country: "US" },
  { city: "Manchester Township", state: "NJ", country: "US" },
  { city: "New Milford", state: "NJ", country: "US" },
  { city: "Passaic", state: "NJ", country: "US" },
  { city: "Teaneck", state: "NJ", country: "US" },
  { city: "Toms River", state: "NJ", country: "US" },
  { city: "Union City", state: "NJ", country: "US" },

  // US - California
  { city: "Irvine", state: "CA", country: "US" },
  { neighborhood: "La Brea", city: "Los Angeles", state: "CA", country: "US" },
  { neighborhood: "Pico", city: "Los Angeles", state: "CA", country: "US" },
  { city: "Tarzana", state: "CA", country: "US" },
  { city: "Valley Village", state: "CA", country: "US" },

  // US - Ohio
  { city: "Beachwood", state: "OH", country: "US" },
  { city: "Cleveland", state: "OH", country: "US" },
  { city: "Cleveland Heights", state: "OH", country: "US" },
  { city: "Highland Hills", state: "OH", country: "US" },
  { city: "Lyndhurst", state: "OH", country: "US" },
  { city: "University Heights", state: "OH", country: "US" },
  { city: "Wickliffe", state: "OH", country: "US" },
  { city: "Willoughby Hills", state: "OH", country: "US" },

  // US - Illinois
  { city: "Chicago", state: "IL", country: "US" },
  { city: "Lincolnwood", state: "IL", country: "US" },

  // Mexico
  { city: "Mexico City", country: "Mexico" }
];

// ישראל - ערים ושכונות
export const israelLocationData: LocationData[] = [
  // תל אביב
  { neighborhood: "רמת אביב", city: "תל אביב", country: "Israel" },
  { neighborhood: "פלורנטין", city: "תל אביב", country: "Israel" },
  { neighborhood: "נווה צדק", city: "תל אביב", country: "Israel" },
  { neighborhood: "יפו", city: "תל אביב", country: "Israel" },

  // ירושלים
  { neighborhood: "גאולה", city: "ירושלים", country: "Israel" },
  { neighborhood: "מאה שערים", city: "ירושלים", country: "Israel" },
  { neighborhood: "רחביה", city: "ירושלים", country: "Israel" },
  { neighborhood: "קטמון", city: "ירושלים", country: "Israel" },
  { neighborhood: "בית וגן", city: "ירושלים", country: "Israel" },
  { neighborhood: "הר נוף", city: "ירושלים", country: "Israel" },
  { neighborhood: "רמות", city: "ירושלים", country: "Israel" },
  { neighborhood: "גילה", city: "ירושלים", country: "Israel" },

  // בני ברק
  { neighborhood: "רמת אלחנן", city: "בני ברק", country: "Israel" },
  { neighborhood: "פרדס כץ", city: "בני ברק", country: "Israel" },
  { neighborhood: "קריית הרצוג", city: "בני ברק", country: "Israel" },
  { neighborhood: "ויז'ניץ", city: "בני ברק", country: "Israel" },

  // חיפה
  { neighborhood: "הדר", city: "חיפה", country: "Israel" },
  { neighborhood: "כרמל", city: "חיפה", country: "Israel" },
  { neighborhood: "נווה שאנן", city: "חיפה", country: "Israel" },

  // ערים נוספות
  { city: "אשדוד", country: "Israel" },
  { city: "אשקלון", country: "Israel" },
  { city: "באר שבע", country: "Israel" },
  { city: "בית שמש", country: "Israel" },
  { city: "ביתר עילית", country: "Israel" },
  { city: "מודיעין עילית", country: "Israel" },
  { city: "אלעד", country: "Israel" },
  { city: "פתח תקווה", country: "Israel" },
  { city: "ראשון לציון", country: "Israel" },
  { city: "רחובות", country: "Israel" },
  { city: "נתניה", country: "Israel" },
  { city: "רמת גן", country: "Israel" },
  { city: "הוד השרון", country: "Israel" },
  { city: "רעננה", country: "Israel" },
  { city: "כפר סבא", country: "Israel" },
  { city: "הרצליה", country: "Israel" },
  { city: "צפת", country: "Israel" },
  { city: "טבריה", country: "Israel" },
  { city: "קרית שמונה", country: "Israel" },
  { city: "עפולה", country: "Israel" },
  { city: "קרית גת", country: "Israel" },
  { city: "דימונה", country: "Israel" },
  { city: "אילת", country: "Israel" },
  { city: "יבנה", country: "Israel" },
  { city: "לוד", country: "Israel" },
  { city: "רמלה", country: "Israel" },
  { city: "אור יהודה", country: "Israel" },
  { city: "גבעתיים", country: "Israel" },
  { city: "קרית אתא", country: "Israel" },
  { city: "קרית ביאליק", country: "Israel" },
  { city: "קרית חיים", country: "Israel" },
  { city: "קרית ים", country: "Israel" },
  { city: "קרית מוצקין", country: "Israel" },
  { city: "קרית מלאכי", country: "Israel" },
  { city: "נהריה", country: "Israel" },
  { city: "עכו", country: "Israel" }
];