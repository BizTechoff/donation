import { remult, withRemult } from 'remult'
import { createPostgresConnection } from 'remult/postgres'
import {
  Donor,
  Donation,
  Campaign,
  DonorPlace,
  DonorContact,
  Place,
  Country,
  DonationMethod,
  DonorAddressType,
  Company,
  User
} from '../shared/entity'
import { entities } from './api'

/**
 * Legacy data imported from Excel files
 * Generated on: 2025-11-03T16:58:57.830Z
 * Total donors: 754
 * Total donations: 684
 *
 * Field mappings:
 * Donors Excel -> Database:
 * - IdName -> legacyId (מזהה)
 * - ToarHeb -> title (תואר עברית)
 * - FirstNameHeb -> firstName (שם פרטי עברית)
 * - LastNameHeb -> lastName (שם משפחה עברית)
 * - Siomet -> suffix (סיומת)
 * - ToarEng -> titleEnglish (תואר אנגלית)
 * - FirstNameEng -> firstNameEnglish (שם פרטי אנגלית)
 * - LastNameEng -> lastNameEnglish (שם משפחה אנגלית)
 * - Pel -> mobile (נייד)
 * - TelNosaf -> additionalPhone (טלפון נוסף)
 * - Fax -> fax (פקס)
 * - Address -> address (כתובת)
 * - City -> city (עיר)
 * - Zip -> zip (מיקוד)
 * - Shchona -> neighborhood (שכונה)
 * - Home -> houseNumber (מספר בית)
 * - Country -> country (מדינה)
 * - TarichRishum -> registrationDate (תאריך רישום)
 * - Anash -> isAnash (אנ"ש)
 *
 * Donations Excel -> Database:
 * - Scom (or ScomChiyuv if empty) -> amount
 * - IdName -> donorLegacyId
 * - IdDiner -> campaignName
 * - Tarich -> donationDate
 * - matbea -> currency
 * - Kabala -> receiptNumber (אסמכתא)
 * - AccountNo -> accountNumber (מספר חשבון) -> אם יש ערך זה העברה בנקאית
 * - Voucher_Co -> voucherNumber (מספר שובר) -> אם יש ערך זה תשלום עמותה
 * - Payment method: Voucher_Co = תשלום עמותה, AccountNo = העברה בנקאית
 */

// Donors data
const DONORS_DATA = [
  {
    "legacyId": "52",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "ברוינר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Brauner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2014-06-11T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "1884",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "20th Avenue",
        "houseNumber": "5221",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1727",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186765859",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186765859",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186765859",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "583",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם מרדכי",
    "lastName": "שמידט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A M",
    "lastNameEnglish": "Schmidt",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2014-06-11T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1441",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "606",
    "title": "הרה\"ח ר'",
    "firstName": "פלטיאל",
    "lastName": "שווארטץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Schwartz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2014-06-11T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "ps8944@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "1037",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "גרינשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Greenstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-04-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "1060",
    "fatherInLawLegacyId": "459",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1971",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "mogreenuk@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "1060",
    "title": "הרה\"ח ר'",
    "firstName": "ידידיה",
    "lastName": "גרינשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Greenstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-20T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1971",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183773200",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183773200",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183773200",
        "label": "פקס",
        "isPrimary": false
      },
      {
        "type": "email",
        "value": "yg@ichud.org",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "1062",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "קויפמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Kaufman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "45th Street",
        "houseNumber": "1547",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188517818",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188517818",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188517818",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1063",
    "title": "הרה\"ח ר'",
    "firstName": "אפרים",
    "lastName": "בירנהאק",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Birnhack",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1843",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1526",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183314162",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183314162",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183314162",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1064",
    "title": "הרה\"ח ר'",
    "firstName": "חנוך שלמה",
    "lastName": "אסתרזאהן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Esterzohn",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "56th Street",
        "houseNumber": "1758",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182596722",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182596722",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182596722",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1067",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם מרדכי",
    "lastName": "סאפרין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A M",
    "lastNameEnglish": "Safrin",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lawrence Avenue",
        "houseNumber": "103",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184361953",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184361953",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184361953",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1069",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף נחום",
    "lastName": "ניימאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "J N",
    "lastNameEnglish": "Naiman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-21T21:00:00.000Z",
    "notes": "13238428776",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Mansfield Ave",
        "houseNumber": "253",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-3016",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 932-1991",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "323 842-4776",
        "label": "נייד",
        "isPrimary": false
      },
      {
        "type": "email",
        "value": "jrstours@yhhoo.com",
        "label": "אימייל",
        "isPrimary": true
      },
      {
        "type": "email",
        "value": "yninla@aol.com",
        "label": "אימייל בבית",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1071",
    "title": "הרה\"ח ר'",
    "firstName": "דוד ברוך",
    "lastName": "מונהייט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "D B",
    "lastNameEnglish": "Monheit",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1769",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184387195",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184387195",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184387195",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1072",
    "title": "הרה\"ח ר'",
    "firstName": "אלעזר אלימלך",
    "lastName": "גאלדבערג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "E M",
    "lastNameEnglish": "Goldberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1926",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183772464",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183772464",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183772464",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1080",
    "title": "הרה\"ח ר'",
    "firstName": "הרשל",
    "lastName": "טייטלבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "H",
    "lastNameEnglish": "Teitelbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-22T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "57th Street",
        "houseNumber": "1542",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184356356",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184356356",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184356356",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1081",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל יעקב",
    "lastName": "קריגר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S Y",
    "lastNameEnglish": "Kreiger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-22T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "15th Avenue",
        "houseNumber": "5802",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188518401",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188518401",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188518401",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1084",
    "title": "הרה\"ח ר'",
    "firstName": "אלכסנדר שלום",
    "lastName": "שעכטער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Schechter",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-06-22T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1652",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188511566",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188511566",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188511566",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1124",
    "title": "הרה\"ח ר'",
    "firstName": "אליעזר",
    "lastName": "גאלדוואסער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Goldwater",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2015-08-24T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "57th Street",
        "houseNumber": "1438",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1171",
    "title": "",
    "firstName": "",
    "lastName": "",
    "suffix": "",
    "titleEnglish": "",
    "firstNameEnglish": "Mostly Music",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "13th Avenue",
        "houseNumber": "4815",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1172",
    "title": "",
    "firstName": "",
    "lastName": "",
    "suffix": "",
    "titleEnglish": "",
    "firstNameEnglish": "Super 13",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "13th Avenue",
        "houseNumber": "5214",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1173",
    "title": "",
    "firstName": "",
    "lastName": "",
    "suffix": "",
    "titleEnglish": "",
    "firstNameEnglish": "Keter Judaica",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "14th Avenue",
        "houseNumber": "3720",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1174",
    "title": "",
    "firstName": "",
    "lastName": "",
    "suffix": "",
    "titleEnglish": "",
    "firstNameEnglish": "Shloimy's Judaica",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "15th Avenue",
        "houseNumber": "4405",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1175",
    "title": "",
    "firstName": "",
    "lastName": "",
    "suffix": "",
    "titleEnglish": "",
    "firstNameEnglish": "The Wine Socher",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "41st Street",
        "houseNumber": "1507",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1176",
    "title": "",
    "firstName": "",
    "lastName": "",
    "suffix": "",
    "titleEnglish": "",
    "firstNameEnglish": "Ez Car Rental",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1900 #1F",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1177",
    "title": "",
    "firstName": "",
    "lastName": "",
    "suffix": "",
    "titleEnglish": "",
    "firstNameEnglish": "Gutman's Insurance Brokerage",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 2nd Street",
        "houseNumber": "1066",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1184",
    "title": "הרה\"ח ר'",
    "firstName": "נח",
    "lastName": "אברמוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Abramowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1731",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188517360",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188517360",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188517360",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1193",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "אורבאך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Urbach",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "54th Street",
        "houseNumber": "1878",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1203",
    "title": "הרה\"ח ר'",
    "firstName": "מנחם מענדל",
    "lastName": "אייכנטל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M M",
    "lastNameEnglish": "Eichental",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Livingston Avenue",
        "houseNumber": "280",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-6932",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7185947289",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7185947289",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7185947289",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1205",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שמחה בונם",
    "lastName": "איילנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S B",
    "lastNameEnglish": "Eilenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "בן ר' יעקב, חתן ר' אבא ליברמן",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Foster Avenue",
        "houseNumber": "198",
        "apartment": "#6",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1206",
    "title": "הרה\"ח ר'",
    "firstName": "משה זלמן",
    "lastName": "אינגבער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Ingber",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Poinsettia Place",
        "houseNumber": "120",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2806",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1211",
    "title": "הרב",
    "firstName": "אהרן",
    "lastName": "אלבוים",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Elbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "43rd Street",
        "houseNumber": "1515",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1215",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה ארי'",
    "lastName": "אולבסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Olewski",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bay Parkway",
        "houseNumber": "4818",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1236",
    "title": "הרב",
    "firstName": "אליעזר",
    "lastName": "בוים",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Baum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1943",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "18338 3095",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "18338 3095",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "18338 3095",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1239",
    "title": "הרה\"ח ר'",
    "firstName": "נחמן",
    "lastName": "בורנשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Bornstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "19th Avenue",
        "houseNumber": "4802",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1358",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "18438 3449",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "18438 3449",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "18438 3449",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1247",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם אוריאל",
    "lastName": "בירנבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Birnbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E. County Lane Road",
        "houseNumber": "935",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1248",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "בירנהאק",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Birnhack",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1939",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1283",
    "title": "הרה\"ח ר'",
    "firstName": "יהושע",
    "lastName": "בראקער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Broker",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1648",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1296",
    "title": "הרה\"ח ר'",
    "firstName": "ברוך מאיר",
    "lastName": "בריעף",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Brief",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Citrus Avenue",
        "houseNumber": "506",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1300",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה ארי' לייב",
    "lastName": "גאטעסמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y A L",
    "lastNameEnglish": "Gottesman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "54th Street",
        "houseNumber": "1437",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-4215",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189721275",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189721275",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189721275",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1303",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "גאלדבערג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Goldberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "60th Street",
        "houseNumber": "1917",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-2380",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182344196",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182344196",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182344196",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1306",
    "title": "הרב",
    "firstName": "צבי פינחס",
    "lastName": "גאלדבערג",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi & Mrs",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Goldberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "49th Street",
        "houseNumber": "1237",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1309",
    "title": "הרה\"ח ר'",
    "firstName": "בערל",
    "lastName": "גאלדשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Goldstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Mccadden Place",
        "houseNumber": "461",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1311",
    "title": "הרה\"ח ר'",
    "firstName": "ארי' יהודה",
    "lastName": "גאנז",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Ganz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1313",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "גיבערשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Giberstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Orange Drive",
        "houseNumber": "120",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1323",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל דוד",
    "lastName": "גליק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y D",
    "lastNameEnglish": "Gluck",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "47th Street",
        "houseNumber": "1455",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1348",
    "title": "הרב",
    "firstName": "פסח משה",
    "lastName": "גראסמאן",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "P M",
    "lastNameEnglish": "Grossman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Monmouth Avenue",
        "houseNumber": "1310",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1931",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7323675630",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7323675630",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7323675630",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1349",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אפרים",
    "lastName": "גראסבערגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Grossberger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "1101",
    "fatherInLawLegacyId": "1788",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "56th Street",
        "houseNumber": "1635",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188519575",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188519575",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188519575",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1355",
    "title": "הרה\"ח ר'",
    "firstName": "שלום",
    "lastName": "גרינבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Grunbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "54th Street",
        "houseNumber": "1762",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182593715",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182593715",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182593715",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1370",
    "title": "הרה\"ח ר'",
    "firstName": "רפאל",
    "lastName": "דויטש",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Deutsch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "לברר כתובת",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Hudson Ave",
        "houseNumber": "175",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Rafael Deutch Trust",
        "street": "175 N Hudson Trust",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 424-7375",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "1406",
    "title": "הרב",
    "firstName": "מנשה",
    "lastName": "הורוויץ",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Horowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "48th Street",
        "houseNumber": "1641",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1421",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שלום פינחס",
    "lastName": "היילפרין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S P",
    "lastNameEnglish": "Halpern",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "232",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wythe Avenue",
        "houseNumber": "437",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11249",
        "zip2": "",
        "neighborhood": "Williamsburg",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1424",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אברהם מרדכי",
    "lastName": "הכט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A M",
    "lastNameEnglish": "Hecht",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "חתן ר' וואלף אברמוביץ",
    "fatherLegacyId": "236",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "President Street",
        "houseNumber": "67",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "110314",
        "zip2": "",
        "neighborhood": "staten island",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182341462",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182341462",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182341462",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1432",
    "title": "הרה\"ח ר'",
    "firstName": "אביעזרי",
    "lastName": "וואגשאל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Wagschal",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Avenue J",
        "houseNumber": "214",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1439",
    "title": "הרה\"ח ר'",
    "firstName": "אפרים",
    "lastName": "וואסערמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Wasserman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "17th Avenue",
        "houseNumber": "5004",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1454",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יצחק מנחם",
    "lastName": "וויינגארטען",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Winegarten",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "707",
    "fatherInLawLegacyId": "2823",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "44th Street",
        "houseNumber": "1734",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184386361",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184386361",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184386361",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1458",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "וויינדלינג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Weindling",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1727",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1463",
    "title": "הרה\"ח ר'",
    "firstName": "יונה ישכר דוב",
    "lastName": "ווייס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Weiss",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Mccadden Place",
        "houseNumber": "151",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1473",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יהודה ארי' לייב",
    "lastName": "ווייסבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "L",
    "lastNameEnglish": "Weissbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "48th Street",
        "houseNumber": "1418",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1486",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל ארי'",
    "lastName": "ווערדיגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y A",
    "lastNameEnglish": "Werdyger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "20th Avenue",
        "houseNumber": "5008",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1722",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184361603",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184361603",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184361603",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1487",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "ווערדיגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Werdyger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "45th Street",
        "houseNumber": "1348",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1488",
    "title": "הרה\"ח ר'",
    "firstName": "מענדל",
    "lastName": "ווערדיגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Werdyger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 2nd Street",
        "houseNumber": "1138",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1489",
    "title": "הרה\"ח ר'",
    "firstName": "משה בצלאל",
    "lastName": "ווערדיגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M B",
    "lastNameEnglish": "Verdiger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1618",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1494",
    "title": "הרה\"ח ר'",
    "firstName": "יקותיאל",
    "lastName": "זאלצבערג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Salzberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "58th Street",
        "houseNumber": "2123",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1500",
    "title": "ש\"ב הרה\"ח ר'",
    "firstName": "נפתלי צבי",
    "lastName": "זאפערן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Safern",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "43rd Street",
        "houseNumber": "1337",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1501",
    "title": "הרב",
    "firstName": "יצחק מאיר",
    "lastName": "זיידמאן",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Zeidman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Sycamore Avenue",
        "houseNumber": "#301  181",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1502",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם בנימין",
    "lastName": "זיידנפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A B",
    "lastNameEnglish": "Seidenfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Dahill Road",
        "houseNumber": "1043",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1741",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188595151",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188595151",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188595151",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1503",
    "title": "הרה\"ח ר'",
    "firstName": "ישעי'",
    "lastName": "זיידנפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Seidenfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "40th Street",
        "houseNumber": "1222",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1515",
    "title": "הרה\"ח ר'",
    "firstName": "זאב יעקב",
    "lastName": "זעלצער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Zelcer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Tanglewood",
        "houseNumber": "1476",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7323704602",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7323704602",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7323704602",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1531",
    "title": "הרה\"ח ר'",
    "firstName": "בצלאל משה",
    "lastName": "טייטלבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "B M",
    "lastNameEnglish": "Teitelbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "55th Street",
        "houseNumber": "1765",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1535",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "טעננבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Tenenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "טלפון בארץ 97254-253-2541",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "54th Street",
        "houseNumber": "1920",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1536",
    "title": "הרה\"ח ר'",
    "firstName": "מתתיהו מרדכי",
    "lastName": "טעננבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Tenenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1524",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-3956",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184351133",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184351133",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184351133",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1541",
    "title": "מרת",
    "firstName": "",
    "lastName": "טרויבע",
    "suffix": "תחי'",
    "titleEnglish": "Mrs",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Traube",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "45th Street",
        "houseNumber": "1627",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1542",
    "title": "הרה\"ח ר'",
    "firstName": "בנימין משה",
    "lastName": "טרויבע",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "B M",
    "lastNameEnglish": "Traube",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "45th Street",
        "houseNumber": "1561",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1547",
    "title": "הרה\"ח ר'",
    "firstName": "וועלוועל",
    "lastName": "יאלאס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "V",
    "lastNameEnglish": "Jalas",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1836",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1252",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189728467",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189728467",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189728467",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1548",
    "title": "הרה\"ח ר'",
    "firstName": "שמשון",
    "lastName": "יאלאס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Jalas",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "57th Street",
        "houseNumber": "1528",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1550",
    "title": "הרה\"ח ר'",
    "firstName": "העשי",
    "lastName": "ג'ייקובס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "H",
    "lastNameEnglish": "Jacobs",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "בביהכנ\"ס אחרי שחרית או מעריב",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S June St",
        "houseNumber": "170",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004-1044",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 864-38233239",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "1559",
    "title": "הרה\"ח ר'",
    "firstName": "פנחס",
    "lastName": "ירט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Yeret",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "17th Avenue",
        "houseNumber": "5906",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182349480",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182349480",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182349480",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1570",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם מרדכי",
    "lastName": "כהן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A M",
    "lastNameEnglish": "Cohen",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "20th Avenue",
        "houseNumber": "5109",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182538463",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182538463",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182538463",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1585",
    "title": "מרת",
    "firstName": "",
    "lastName": "לאנדא",
    "suffix": "תחי'",
    "titleEnglish": "Mrs",
    "firstNameEnglish": "",
    "lastNameEnglish": "Landau",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1400",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188511930",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188511930",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188511930",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1597",
    "title": "הרה\"ח ר'",
    "firstName": "יחיאל דוד",
    "lastName": "לב",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y D",
    "lastNameEnglish": "Lev",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "45th Street",
        "houseNumber": "1259",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1598",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב יוסף",
    "lastName": "לב",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Lev",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "47th Street",
        "houseNumber": "1329",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188543788",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188543788",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188543788",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1599",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק נחום",
    "lastName": "לב",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y N",
    "lastNameEnglish": "Lev",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "1225",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189724015",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189724015",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189724015",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1600",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "לב",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Lev",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 3rd Street",
        "houseNumber": "783",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182586662",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182586662",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182586662",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1611",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם אבא",
    "lastName": "ליבערמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Lieberman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lawrence Avenue",
        "houseNumber": "22",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1627",
    "title": "הרה\"ח ר'",
    "firstName": "נחמן שמעון",
    "lastName": "ליכטנשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "N S",
    "lastNameEnglish": "Lichtenstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Avenue I",
        "houseNumber": "324",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-2618",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183385637",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183385637",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183385637",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1652",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "לעווענטאהל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Leventhal",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bagley Avenue",
        "houseNumber": "1718",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1654",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "לפה",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Lappe",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "48th Street",
        "houseNumber": "1367",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186334743",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186334743",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186334743",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1655",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "לפה",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Lappe",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Macintosh Lane",
        "houseNumber": "9",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1659",
    "title": "הרה\"ח ר'",
    "firstName": "רני",
    "lastName": "מאיר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Mayer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Citrus Avenue",
        "houseNumber": "100",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "213 494-2487",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "1667",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם שמעון",
    "lastName": "מארגנשטערן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Morgenstern",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "52nd Street",
        "houseNumber": "1939",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1675",
    "title": "הרה\"ח ר'",
    "firstName": "בנימין",
    "lastName": "מארקס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Marks",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "54th Street",
        "houseNumber": "1856",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1678",
    "title": "הרה\"ח ר'",
    "firstName": "זאב",
    "lastName": "מאשקאוויטש",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "W",
    "lastNameEnglish": "Moskovits",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Martel Avenue",
        "houseNumber": "364",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2516",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1679",
    "title": "הרב",
    "firstName": "מנחם מענדל",
    "lastName": "מאשקאוויטש",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "MM",
    "lastNameEnglish": "Moskowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "19th Avenue",
        "houseNumber": "5120,#4B",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "18232 6630",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "18232 6630",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "18232 6630",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1701",
    "title": "הרב",
    "firstName": "יצחק לייב",
    "lastName": "מלאך",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "Y A",
    "lastNameEnglish": "Malach",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "54th Street",
        "houseNumber": "1925",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1746",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183380554",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183380554",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183380554",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1702",
    "title": "הרה\"ח ר'",
    "firstName": "משה צבי",
    "lastName": "מלאך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Malach",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Walsh Court",
        "houseNumber": "306",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188544408",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188544408",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188544408",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1706",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "מעלניק",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Melnicke",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1637",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1719",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "מרגליות",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Margules",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "46th Street",
        "houseNumber": "1554",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1721",
    "title": "הרה\"ח ר'",
    "firstName": "פינחס",
    "lastName": "מרגליות",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Margules",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "43rd Street",
        "houseNumber": "1237",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1724",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "נאטיס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Notis",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Las Palmas Avenue",
        "houseNumber": "423",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90020",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1735",
    "title": "הרה\"ח ר'",
    "firstName": "נתן",
    "lastName": "נוסבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Nussbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Forest Avenue",
        "houseNumber": "803",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7329059251",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7329059251",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7329059251",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1738",
    "title": "הרה\"ח ר'",
    "firstName": "אלימלך",
    "lastName": "ניימאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Naiman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "43rd Street",
        "houseNumber": "1525",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184384499",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184384499",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184384499",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1739",
    "title": "הרה\"ח ר'",
    "firstName": "בונם",
    "lastName": "ניימאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Naiman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Marisa Dr",
        "houseNumber": "1190",
        "apartment": "",
        "city": "Toms River, NJ",
        "state": "",
        "zip": "08755-1457",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188375137",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188375137",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188375137",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1742",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אליעזר גבריאל",
    "lastName": "סאמסאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "E G",
    "lastNameEnglish": "Samson",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "בן ר' חיים יוסף, חתן ר' עקיבא משה גוטמן",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 4th Street",
        "houseNumber": "549",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186337525",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186337525",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186337525",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1744",
    "title": "ד\"ר",
    "firstName": "דוד",
    "lastName": "סטאל",
    "suffix": "הי\"ו",
    "titleEnglish": "Dr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Stoll",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Las Palmas Avenue",
        "houseNumber": "422",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90020",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1756",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "עהרליכסטער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Ehrlichster",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Riverside Drive Apt #3f",
        "houseNumber": "110",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "10024",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1764",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב ארי'",
    "lastName": "ענדען",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "Y A",
    "lastNameEnglish": "Enden",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "52nd Street",
        "houseNumber": "1614",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1769",
    "title": "הרה\"ח ר'",
    "firstName": "משה זאב",
    "lastName": "עקשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Eckstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "משרד 0017188517772",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "1664",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182324303",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182324303",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182324303",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1788",
    "title": "מחותני הרה\"ח ר'",
    "firstName": "מנחם",
    "lastName": "פיעקארסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Piekarski",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "57th Street",
        "houseNumber": "1554",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1791",
    "title": "הרה\"ח ר'",
    "firstName": "יחיאל בן ציון",
    "lastName": "פישהאף",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Fishoff",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "69th Avenue",
        "houseNumber": "108-38",
        "apartment": "",
        "city": "Forest Hills, NY",
        "state": "",
        "zip": "11375",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1793",
    "title": "הרה\"ח ר'",
    "firstName": "אלימלך",
    "lastName": "פישער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Fisher",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Marc Drive",
        "houseNumber": "563",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1796",
    "title": "הרה\"ח ר'",
    "firstName": "צבי",
    "lastName": "פליישמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Fleishman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Highland Avenue",
        "houseNumber": "424",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2628",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "שטיבלך",
        "description": " (מס' שטיבלך: 11)",
        "street": "2351 W 3rd Street",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90057-1905",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1803",
    "title": "הרה\"ח ר'",
    "firstName": "ישכר בעריש",
    "lastName": "פעלדמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Feldman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ruzhin Road",
        "houseNumber": "#101, 6",
        "apartment": "",
        "city": "Monroe",
        "state": "",
        "zip": "10950",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1811",
    "title": "הרה\"ח ר'",
    "firstName": "שאול",
    "lastName": "פעניק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Penig",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Formosa Avenue",
        "houseNumber": "173",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1821",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יוסף משה",
    "lastName": "פראנד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Frand",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "בן ר' יצחק, חתן ר' זעליג אבוביץ",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "17th Avenue",
        "houseNumber": "4213",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188514812",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188514812",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188514812",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1823",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "לייבוש",
    "lastName": "פראנד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "L",
    "lastNameEnglish": "Frand",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "בן ר' יצחק",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "1531",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "61st Street",
        "houseNumber": "2141",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1837",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "פריי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Frei",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "2055",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1850",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי נתן",
    "lastName": "פריעזעל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M N",
    "lastNameEnglish": "Friesel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lincoln Avenue",
        "houseNumber": "38",
        "apartment": "",
        "city": "New Square",
        "state": "",
        "zip": "10977",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1851",
    "title": "הרב",
    "firstName": "שמואל יוסף",
    "lastName": "פריעזעל",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "S Y",
    "lastNameEnglish": "Friesel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Clinton Lane",
        "houseNumber": "142",
        "apartment": "",
        "city": "New Square",
        "state": "",
        "zip": "10977",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1859",
    "title": "הרב",
    "firstName": "יצחק מאיר",
    "lastName": "ציוויאק",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Cywiak",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "48th Street",
        "houseNumber": "1666",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1866",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "קאלאדני",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Kolodny",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Poinsettia Place",
        "houseNumber": "110",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1872",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "קארנוואסער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Kornwasser",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Stanley Avenue",
        "houseNumber": "535",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-1803",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 842-8840",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "1884",
    "title": "מרת",
    "firstName": "",
    "lastName": "קליין",
    "suffix": "תחי'",
    "titleEnglish": "Mrs",
    "firstNameEnglish": "",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Avenue J",
        "houseNumber": "614",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-3504",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1886",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה",
    "lastName": "קליין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "56th Street",
        "houseNumber": "1227",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1891",
    "title": "הרב",
    "firstName": "שמואל יעקב",
    "lastName": "קליין",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "S Y",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "20th Avenue",
        "houseNumber": "5105",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1908",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "ראזענבלאט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Rosenblatt",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "W 3rd Street",
        "houseNumber": "5967",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1911",
    "title": "הרה\"ח ר'",
    "firstName": "חיים לייב",
    "lastName": "רוזנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "C L",
    "lastNameEnglish": "Rosenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "17th Avenue",
        "houseNumber": "4321",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1913",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק צבי",
    "lastName": "רוזנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Rosenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "954",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1914",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל מנדל",
    "lastName": "רוזנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Rosenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "522",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Renee Court",
        "houseNumber": "2",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-2146",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Law Office of Maurice I. Rosenberg LLC",
        "street": "930 E County Line Rd, Building B, Ste 101",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7329018772",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7329018772",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7329018772",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1915",
    "title": "הרה\"ח ר'",
    "firstName": "נחמן",
    "lastName": "רוזנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Rosenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "49th Street",
        "houseNumber": "1323",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1937",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם מנחם",
    "lastName": "רובינפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A M",
    "lastNameEnglish": "Rubinfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1632",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1939",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי שמחה",
    "lastName": "רובינפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Rubinfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "16th Avenue",
        "houseNumber": "5418",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1944",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק ארי'",
    "lastName": "רוזנבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y A",
    "lastNameEnglish": "Rosenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "39th Street",
        "houseNumber": "1538",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1947",
    "title": "הרה\"ח ר'",
    "firstName": "רפאל",
    "lastName": "רוזנבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Rosenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1612",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1153",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188717964",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188717964",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188717964",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1955",
    "title": "הרה\"ח ר'",
    "firstName": "אלי'",
    "lastName": "רייזמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Ryzman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Alta Vista",
        "houseNumber": "201",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2821",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1956",
    "title": "הרה\"ח ר'",
    "firstName": "צבי",
    "lastName": "רייזמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Ryzman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Alta Vista",
        "houseNumber": "218",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "z-ryzman@aiibeauty.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "1960",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "רייך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Reich",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "חתן ר' נח ריינדעל",
    "fatherLegacyId": "511",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "44th Street",
        "houseNumber": "1733",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186981908",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186981908",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186981908",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "1971",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל זאב",
    "lastName": "רעכניץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y Z",
    "lastNameEnglish": "Rechnitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Alta Vista",
        "houseNumber": "155",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1975",
    "title": "הרב",
    "firstName": "אברהם חיים",
    "lastName": "רפאפורט",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "A C",
    "lastNameEnglish": "Rapaport",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "Fountayne House",
        "street": "Fountayne Road",
        "houseNumber": "",
        "apartment": "",
        "city": "London",
        "state": "",
        "zip": "N16 7EA",
        "zip2": "",
        "neighborhood": "Stamford Hill",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1980",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל עקיבא",
    "lastName": "שאלאמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S A",
    "lastNameEnglish": "Salamon",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "49th Street",
        "houseNumber": "1313",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1985",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אשר יעקב יודא",
    "lastName": "שווארטץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "O",
    "lastNameEnglish": "Schwartz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lee Avenue",
        "houseNumber": "77",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11211",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1994",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "שטויבער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Stauber",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "46th Street",
        "houseNumber": "1317",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "1998",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם מיכאל",
    "lastName": "שטיינבערג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A M",
    "lastNameEnglish": "Steinberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "41st Street",
        "houseNumber": "1560",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2058",
    "title": "הרב",
    "firstName": "חיים",
    "lastName": "שנור",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Schnur",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Las Palmas Avenue",
        "houseNumber": "440",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2063",
    "title": "מרת",
    "firstName": "",
    "lastName": "שנקמן",
    "suffix": "שיחי'",
    "titleEnglish": "Family",
    "firstNameEnglish": "",
    "lastNameEnglish": "Shenkman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 2nd Street",
        "houseNumber": "749",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2079",
    "title": "הרב",
    "firstName": "בן ציון דוד",
    "lastName": "שפירא",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "B D",
    "lastNameEnglish": "Spira",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "14th Street",
        "houseNumber": "422",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2083",
    "title": "מחותני הרה\"ח ר'",
    "firstName": "יצחק מיכל",
    "lastName": "שקופ",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Shkop",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "North Francisco Avenue",
        "houseNumber": "6850",
        "apartment": "",
        "city": "Chicago, IL",
        "state": "",
        "zip": "60645",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2091",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שמחה בונם",
    "lastName": "מרגליות",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S B",
    "lastNameEnglish": "Margolies",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "409",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lawrence Avenue",
        "houseNumber": "26",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2115",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי שלום ישראל",
    "lastName": "שפירא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M S",
    "lastNameEnglish": "Schapira",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-02-28T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "2134",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Park Slope Ter",
        "houseNumber": "6",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-2164",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2118",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "האמבורגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Hamburger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-03-01T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2124",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "מנחם דב",
    "lastName": "טויב",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M D",
    "lastNameEnglish": "Taub",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-03-03T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "667",
    "fatherInLawLegacyId": "1063",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bruce Street",
        "houseNumber": "255",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-3508",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7323676741",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7323676741",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7323676741",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2128",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אהרן שמואל",
    "lastName": "פעלדמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "A S",
    "lastNameEnglish": "Feldman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-03-05T22:00:00.000Z",
    "notes": "חתן ר' חיים רוזנבלט",
    "fatherLegacyId": "113",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Mountain Aveneu",
        "houseNumber": "36",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-2446",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "718 438-1983",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2198",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שמחה בונם",
    "lastName": "ריגל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "S B",
    "lastNameEnglish": "Regal",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2016-12-01T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "509",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Mountainview Avenue",
        "houseNumber": "477",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-4238",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184909946",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184909946",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184909946",
        "label": "פקס",
        "isPrimary": false
      },
      {
        "type": "email",
        "value": "regal.sb@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2240",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי זאב",
    "lastName": "שטרלינג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Sterling",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2017-02-07T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "2143",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2245",
    "title": "הרה\"ח ר'",
    "firstName": "אלימלך",
    "lastName": "פישער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Fisher",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2017-02-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Vine Street",
        "houseNumber": "564",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2273",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב דוב",
    "lastName": "רוזנבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y D",
    "lastNameEnglish": "Rosenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2017-05-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Blauvelt Road",
        "houseNumber": "21",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "8453567985",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "8453567985",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "8453567985",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2278",
    "title": "הרה\"ח ר'",
    "firstName": "אפרים מנחם",
    "lastName": "לאנדאו",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Landau",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2017-06-05T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1523",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189727390",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189727390",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189727390",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2306",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "טעננבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Tenenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2017-07-15T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "1536",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186194616",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2336",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב זאב",
    "lastName": "פריינד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Freund",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2017-09-02T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 4th Street",
        "houseNumber": "678",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2362",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה לייב אברהם",
    "lastName": "גוטמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "L",
    "lastNameEnglish": "Gutman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2017-10-26T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 2nd Street",
        "houseNumber": "1066",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183777777",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2366",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "מעלניק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Melnicke",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2017-11-11T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "1706",
    "fatherInLawLegacyId": "614",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1628",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188716471",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188716471",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188716471",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2421",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "שרייבער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Schreiber",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2018-12-25T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "44th Street",
        "houseNumber": "1715",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189726272",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189726272",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189726272",
        "label": "פקס",
        "isPrimary": false
      },
      {
        "type": "email",
        "value": "schreiber@thejnet.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2426",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "חסקלסון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Chaskelson",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2019-01-13T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "2",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Laura Dr",
        "houseNumber": "54",
        "apartment": "",
        "city": "Airmont, NY",
        "state": "",
        "zip": "10952-3820",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "347 760-4145",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "email",
        "value": "d0534189189@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2439",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "בורז'יקובסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Borzikovski",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2019-01-26T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "1069",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Mansfield Avenue",
        "houseNumber": "251",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "GA 90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2466",
    "title": "הרה\"חר'",
    "firstName": "מרדכי יהודה",
    "lastName": "קליין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr",
    "firstNameEnglish": "M Y",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2019-04-17T21:00:00.000Z",
    "notes": "מחותן של רש\"ז רייך",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "49th Street",
        "houseNumber": "1629",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183315854",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183315854",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183315854",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2491",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יצחק דוד",
    "lastName": "מושקוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y D",
    "lastNameEnglish": "Moskovits",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2019-11-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "3212",
    "fatherInLawLegacyId": "1531",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "2035",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-2413",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183312333",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183312333",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183312333",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2496",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "פינחס",
    "lastName": "ליבערמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Liberman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2019-12-14T22:00:00.000Z",
    "notes": "חתן ר' מ ענדען",
    "fatherLegacyId": "375",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "60th Street",
        "houseNumber": "1475",
        "apartment": "1st Floor",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-6545",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186335540",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186335540",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186335540",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2534",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן יצחק",
    "lastName": "קאהן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Aron Yitzchok",
    "lastNameEnglish": "Kohn",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2020-11-17T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "1431",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2554",
    "title": "הרה\"ח ר'",
    "firstName": "זאב",
    "lastName": "שפירא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Spira",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2021-02-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Malka Way",
        "houseNumber": "4",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7329018486",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7329018486",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7329018486",
        "label": "פקס",
        "isPrimary": false
      },
      {
        "type": "email",
        "value": "zspira@dmsus.net",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2556",
    "title": "הרה\"ח ר'",
    "firstName": "מנחם מענדל",
    "lastName": "אוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Menachem Mendel",
    "lastNameEnglish": "Ovitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2021-02-07T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "1915",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "47th Street",
        "houseNumber": "943",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2579",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "העלער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Max",
    "lastNameEnglish": "Heller",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2021-06-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Blauvelt Road",
        "houseNumber": "42",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2587",
    "title": "הרה\"ח ר'",
    "firstName": "שמעון צבי",
    "lastName": "קניגסברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Sh.z",
    "lastNameEnglish": "Kenigsberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2021-06-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "2816",
    "fatherInLawLegacyId": "511",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "16th Avenue apt.e3",
        "houseNumber": "4217",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2650",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל יצחק",
    "lastName": "טרויבע",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Traube",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2021-11-27T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "17th Avenue",
        "houseNumber": "4401",
        "apartment": "#B9",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1019",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188715217",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188715217",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188715217",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2672",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "אברמוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Abramowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-03-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "49th Street",
        "houseNumber": "1846",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188518962",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188518962",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188518962",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2681",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישכר",
    "lastName": "טויב",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Taub",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-04-30T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "2124",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Chevy Lane",
        "houseNumber": "126",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-5684",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "K L Cooling & Heating",
        "street": "1377 40th St,",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "suchytaub@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2682",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "פיללער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Piller",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-04-30T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "476",
    "fatherInLawLegacyId": "1236",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "45th Street",
        "houseNumber": "1745",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2683",
    "title": "הרה\"ח ר'",
    "firstName": "ברוך מאיר",
    "lastName": "רוזנבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B M",
    "lastNameEnglish": "Rosenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-05-01T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Irene Court",
        "houseNumber": "36",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2689",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל יצחק",
    "lastName": "רוזנבאום",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Rosenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-11T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "1942",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Dahill Road",
        "houseNumber": "957",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Stamford Hill",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2691",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה אריה",
    "lastName": "טעננבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A Y",
    "lastNameEnglish": "Tenenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-19T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "1536",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 2nd Street",
        "houseNumber": "1114",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-3302",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7158437075",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "6465124401",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2693",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "אברמוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Abramowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-27T21:00:00.000Z",
    "notes": "חתן ר' א ב שפירא",
    "fatherLegacyId": "1184",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Webster Avenue",
        "houseNumber": "97",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-1015",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186331826",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186331826",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186331826",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2694",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל חיים",
    "lastName": "אופנהיים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y C",
    "lastNameEnglish": "Openheim",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1817",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182323023",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182323023",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182323023",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2695",
    "title": "הרה\"ח ר'",
    "firstName": "נחום",
    "lastName": "איידלמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Eidelman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1947",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183384288",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183384288",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183384288",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2699",
    "title": "הרה\"ח ר'",
    "firstName": "בנימין זאב",
    "lastName": "בייטל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B Z",
    "lastNameEnglish": "Beitel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 2nd Street",
        "houseNumber": "1150",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-3302",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188515370",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188515370",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188515370",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2700",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "גאלדמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Goldman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "חתן ר' פנחס קריימן",
    "fatherLegacyId": "200",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1866",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1531",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182344134",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182344134",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182344134",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2701",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "גלברט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Gelbart",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1960",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1338",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183389448",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183389448",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183389448",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2702",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יהודה ארי'",
    "lastName": "גלוקשטט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y A",
    "lastNameEnglish": "Gluckstadt",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "181",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "15th Avenue",
        "houseNumber": "4219",
        "apartment": "Apt 2a",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-1797",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2703",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק מאיר",
    "lastName": "גרין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Green",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "1884",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1728",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1507",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182342381",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182342381",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182342381",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2705",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יעקב ארי' לייב",
    "lastName": "דזיאלובסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y A L",
    "lastNameEnglish": "Dzialovsky",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "חתן ר' מ גולדבלט",
    "fatherLegacyId": "89",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1914",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1338",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186771431",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186771431",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186771431",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2706",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "ווייס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Weiss",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "חתן ר' מ י ענדען",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 2nd Street",
        "houseNumber": "979",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188541719",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188541719",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188541719",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2707",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם מרדכי",
    "lastName": "ווייץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A M",
    "lastNameEnglish": "Weits",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "1884",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "17th Avenue",
        "houseNumber": "5710",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1839",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182323522",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182323522",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182323522",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2709",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "נפתלי",
    "lastName": "וסרצוג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Wassertzug",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "704",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Dahill Road",
        "houseNumber": "886",
        "apartment": "Apt 804",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1759",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2710",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה א",
    "lastName": "ווערדיגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Verdiger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Avenue J",
        "houseNumber": "2201",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210-3628",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "1783770887",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "1783770887",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "1783770887",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2712",
    "title": "הרה\"ח ר'",
    "firstName": "משה יוסף",
    "lastName": "לאנדאו",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M Y",
    "lastNameEnglish": "Landau",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1523",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-3746",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "718 851-6990",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "718 551-2064",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2714",
    "title": "הרה\"ח ר'",
    "firstName": "זלמן",
    "lastName": "טעננבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Tenenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "1536",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1832",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1252",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184379111",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184379111",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184379111",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2715",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אברהם דוב",
    "lastName": "יונג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A D",
    "lastNameEnglish": "Jung",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-29T21:00:00.000Z",
    "notes": "חתן ר' מ גולדבלט",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1962",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1338",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182520458",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182520458",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182520458",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2718",
    "title": "הרה\"ח ר'",
    "firstName": "חיים מענדל",
    "lastName": "לאנדאו",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "C M",
    "lastNameEnglish": "Landau",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-29T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1851",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-4701",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184358410",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184358410",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184358410",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2719",
    "title": "הרה\"ח ר'",
    "firstName": "מנשה יחזקאל",
    "lastName": "מלאך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Malach",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-29T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "1958",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-2388",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183310194",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183310194",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183310194",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2720",
    "title": "הרב",
    "firstName": "אפרים",
    "lastName": "ניימאן",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Naiman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-29T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "434",
    "fatherInLawLegacyId": "2838",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "45th Street",
        "houseNumber": "1113",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-2069",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186339390",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186339390",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186339390",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2721",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יוסף חיים",
    "lastName": "סופרין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y C",
    "lastNameEnglish": "Sufrin",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-29T21:00:00.000Z",
    "notes": "חתן ר' אשר יאלאס",
    "fatherLegacyId": "662",
    "fatherInLawLegacyId": "1546",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Parkville Avenue",
        "houseNumber": "34",
        "apartment": "Apt 2A",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-1017",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188534605",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188534605",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188534605",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2722",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שמעון",
    "lastName": "עקשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Eckstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-06-29T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "91",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "55th Street",
        "houseNumber": "1644",
        "apartment": "Apt B4",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1827",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2727",
    "title": "הרה\"ח ר'",
    "firstName": "בצלאל",
    "lastName": "פיללער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Piller",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-02T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "61st Street",
        "houseNumber": "2144",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-2569",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183313439",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183313439",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183313439",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2728",
    "title": "הרה\"ח ר'",
    "firstName": "אריה",
    "lastName": "פוזננסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Poznanski",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "62nd Street",
        "houseNumber": "1950",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-3027",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2730",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "פינטער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Pinter",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "480",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 3rd Street",
        "houseNumber": "735",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218-5717",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188710328",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188710328",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188710328",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2731",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "פירסטמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Firstman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Webster Avenue",
        "houseNumber": "44",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-1084",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188540036",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188540036",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188540036",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2732",
    "title": "הרה\"ח ר'",
    "firstName": "דב",
    "lastName": "פישהאף",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Fishoff",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Avenue J",
        "houseNumber": "242",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210-3614",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183386650",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183386650",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183386650",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2733",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "דוד משה",
    "lastName": "פעלדמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D M",
    "lastNameEnglish": "Feldman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "חתן ר' שמחה גלבנדורף",
    "fatherLegacyId": "124",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1774",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1220",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2734",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "פעלדמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Feldman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "חתן ר' יוסף פיעקארסקי",
    "fatherLegacyId": "112",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 2nd Street",
        "houseNumber": "1116",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-3302",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184355560",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184355560",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184355560",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2735",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל דוד",
    "lastName": "שפירא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S D",
    "lastNameEnglish": "Schapira",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "49th Street",
        "houseNumber": "1660",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1133",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188518832",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188518832",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188518832",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2736",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "פלוסברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Flusberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "חתן ר' משה פרידמאן",
    "fatherLegacyId": "131",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "60th Street",
        "houseNumber": "1948",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "3473569572",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "3473569572",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "3473569572",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2737",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1340",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-3822",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188511932",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188511932",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188511932",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2739",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "קאגאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Kagan",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "55th Street",
        "houseNumber": "1876",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1901",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182567758",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182567758",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182567758",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2740",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "קוזליק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Kozlik",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1258",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-4489",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184357393",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184357393",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184357393",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2741",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אביגדור",
    "lastName": "קופולוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Kopolovits",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "311",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "52nd Street",
        "houseNumber": "1976",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1213",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188541206",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188541206",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188541206",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2742",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אהרן דוד",
    "lastName": "קופולוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A D",
    "lastNameEnglish": "Kopolovits",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-03T21:00:00.000Z",
    "notes": "חתן ר' חיים שלום שכטר",
    "fatherLegacyId": "311",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 4th Street",
        "houseNumber": "735",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218-5703",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184360340",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184360340",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184360340",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2743",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "קלויזנער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Klausner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "299",
    "fatherInLawLegacyId": "1236",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1942",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1312",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182531484",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182531484",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182531484",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2744",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "קליין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "1536",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 2nd Street",
        "houseNumber": "1136",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "1123-3302",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184377343",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184377343",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184377343",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2745",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שמואל בנימין",
    "lastName": "קראוס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S B",
    "lastNameEnglish": "Kraus",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "335",
    "fatherInLawLegacyId": "2650",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Fort Hamilton Parkway",
        "houseNumber": "4201",
        "apartment": "Apt 6R",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-1237",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184351902",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184351902",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184351902",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2746",
    "title": "הרה\"ח ר'",
    "firstName": "ברוך",
    "lastName": "קראמינר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Kraminer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "41st Street",
        "houseNumber": "1249",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218-1910",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189728685",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189728685",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189728685",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2748",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם מרדכי",
    "lastName": "רוזנפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A M",
    "lastNameEnglish": "Rosenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "49th Street",
        "houseNumber": "1864",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1244",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186330956",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186330956",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186330956",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2749",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "רוט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Roth",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "חתן ר' חיים דב שטיינבערג",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "54th Street",
        "houseNumber": "1951",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1746",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184379827",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184379827",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184379827",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2750",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם מרדכי",
    "lastName": "רוסק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A M",
    "lastNameEnglish": "Rusak",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "57th Street",
        "houseNumber": "1573",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-4746",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188517757",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188517757",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188517757",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2751",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "שטיינהארט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Steinhart",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "645",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Webster Avenue",
        "houseNumber": "22",
        "apartment": "Apt 4d",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-1026",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2752",
    "title": "הרה\"ח ר'",
    "firstName": "יחיאל מיכל",
    "lastName": "שטיינמעץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Steinmets",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Carlton Avenue",
        "houseNumber": "166",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11205-3207",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189512380",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189512380",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189512380",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2753",
    "title": "הרה\"ח ר'",
    "firstName": "מיכל",
    "lastName": "שטערנבוך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Sternbuch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "57th Street",
        "houseNumber": "1666",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1868",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182345949",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182345949",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182345949",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2754",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "נחמיה",
    "lastName": "שיינשניידער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Sheinshneider",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "חתן ר' י א סגל",
    "fatherLegacyId": "569",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "19th Avenue",
        "houseNumber": "5120",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1717",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183313210",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183313210",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183313210",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2755",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "פנחס",
    "lastName": "שיראדזקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Sieradski",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "חתן ר' עקיבא אורזל",
    "fatherLegacyId": "625",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1400",
        "apartment": "Apt C1",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-3635",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184356794",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184356794",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184356794",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2756",
    "title": "הרה\"ח ר'",
    "firstName": "אלכסנדר",
    "lastName": "שעכטער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Schechter",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-04T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "54th Street",
        "houseNumber": "1544",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-4344",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188511566",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188511566",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188511566",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2757",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שלמה חנוך",
    "lastName": "שרייבער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S C",
    "lastNameEnglish": "Schreiber",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-05T21:00:00.000Z",
    "notes": "חתן ר' חיים יהודה סמיט",
    "fatherLegacyId": "592",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "58th Street",
        "houseNumber": "2146",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-2013",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184360430",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184360430",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184360430",
        "label": "פקס",
        "isPrimary": false
      },
      {
        "type": "email",
        "value": "admin@kupathrabbimeir.org",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2758",
    "title": "הרה\"ח ר'",
    "firstName": "רפאל",
    "lastName": "שפירא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Schapira",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-05T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "48th Street",
        "houseNumber": "1268",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219-3009",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184310596",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184310596",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184310596",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2759",
    "title": "הרה\"ח ר'",
    "firstName": "אלי'",
    "lastName": "בלימן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Bleeman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "גבאי השטיבל בלייקווד",
    "fatherLegacyId": "1257",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "14th Street",
        "houseNumber": "418",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1758",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7329010655",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7329010655",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7329010655",
        "label": "פקס",
        "isPrimary": false
      },
      {
        "type": "email",
        "value": "ebleeman@asdenproperties.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2760",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "געפילהויז",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Gefilhaus",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "158",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Harvard Street",
        "houseNumber": "101",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1954",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7327309699",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7327309699",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7327309699",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2762",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "וואלקין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Walkin",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Freedom Drive",
        "houseNumber": "25",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-4161",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7323701273",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7323701273",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7323701273",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2763",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "פעלדמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Feldman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "115",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Apolo Road",
        "houseNumber": "626",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1410",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "732 370-0374",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2764",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יהודה ארי' מאיר",
    "lastName": "קופולוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y A M",
    "lastNameEnglish": "Kopolovits",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "חתן ר' משה דרזנר",
    "fatherLegacyId": "311",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Havens Avenue",
        "houseNumber": "87",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-5977",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184354055",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184354055",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184354055",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2765",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "קסירר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Kasirer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Squankum Road",
        "houseNumber": "443",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1962",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7323638451",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7323638451",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7323638451",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2766",
    "title": "הרב",
    "firstName": "נפתלי צבי",
    "lastName": "קעס",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "N Z",
    "lastNameEnglish": "Kass",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "2806",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "W kennedy Blvd",
        "houseNumber": "617",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1244",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7323646301",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7323646301",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7323646301",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2767",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק יעקב",
    "lastName": "אסתרזאהן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Esterzohn",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Kell Avenue",
        "houseNumber": "315",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-4115",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182854156",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182854156",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182854156",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2768",
    "title": "הרה\"ח ר'",
    "firstName": "פנחס מרדכי",
    "lastName": "בוך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "P M",
    "lastNameEnglish": "Buch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Dewhurst Street",
        "houseNumber": "54",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-5006",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184770595",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184770595",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184770595",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2769",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אברהם אבא",
    "lastName": "בורנשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A A",
    "lastNameEnglish": "Bornstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "1239",
    "fatherInLawLegacyId": "1542",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Duke Place",
        "houseNumber": "19",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-5119",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "9293640154",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "9293640154",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "9293640154",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2770",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "ווייצבערג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Weitsberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wellbrook Avenue",
        "houseNumber": "144",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-5143",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184940143",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184940143",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184940143",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2771",
    "title": "הרה\"ח ר'",
    "firstName": "יואל",
    "lastName": "וקסלר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Waxler",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Joseph Avenue",
        "houseNumber": "105",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-5054",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186869042",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186869042",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186869042",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2772",
    "title": "הרה\"ח ר'",
    "firstName": "שמחה בונם",
    "lastName": "זייברט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S B",
    "lastNameEnglish": "Seibert",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Harold Street",
        "houseNumber": "38",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-5212",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188511043",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188511043",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188511043",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2773",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם מרדכי",
    "lastName": "זיידמן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A M",
    "lastNameEnglish": "Seidman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cherry Place",
        "houseNumber": "11",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-6911",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186982434",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186982434",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186982434",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2774",
    "title": "הרה\"ח ר'",
    "firstName": "ארי'",
    "lastName": "חרש",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Charash",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-06T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Rupert Avenue",
        "houseNumber": "34",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-5034",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188541284",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188541284",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188541284",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2775",
    "title": "הרה\"ח ר'",
    "firstName": "חיים זאב",
    "lastName": "ניימאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "C Z",
    "lastNameEnglish": "Naiman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "435",
    "fatherInLawLegacyId": "2672",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "McDonald Street",
        "houseNumber": "42",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-5055",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189721965",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189721965",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189721965",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2776",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "גדליה",
    "lastName": "פרוידענבערגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "G",
    "lastNameEnglish": "Freudenberger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-07T21:00:00.000Z",
    "notes": "חתן ר' י ח יכומוביץ",
    "fatherLegacyId": "145",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Grand Blvd",
        "houseNumber": "85",
        "apartment": "",
        "city": "Jackson, NJ",
        "state": "",
        "zip": "08527",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2777",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שמחה בונם",
    "lastName": "פרוידענבערגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S B",
    "lastNameEnglish": "Freudenberger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-07T21:00:00.000Z",
    "notes": "חתן ר' ישראל זלמן קראמינער",
    "fatherLegacyId": "145",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wellbrook Avenue",
        "houseNumber": "239",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-6926",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2779",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ardmore Avenue",
        "houseNumber": "166",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-4324",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184354614",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184354614",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184354614",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2780",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "קופולוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Kopolovits",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-07T21:00:00.000Z",
    "notes": "חתן ר' יוסף חיים ניימאן",
    "fatherLegacyId": "311",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Fillmore Avenue",
        "houseNumber": "90",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-4133",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186868147",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186868147",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186868147",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2781",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "קילשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Kilstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Willowbrook Road",
        "houseNumber": "945",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10302-2404",
        "zip2": "",
        "neighborhood": "Westerleigh",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184771255",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184771255",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184771255",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2783",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "פנחס דוד",
    "lastName": "קראוס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "P D",
    "lastNameEnglish": "Kraus",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-07T21:00:00.000Z",
    "notes": "חתן ר' מנדל בורנשטיין",
    "fatherLegacyId": "335",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Roanoke Street",
        "houseNumber": "38",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-5032",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7182591529",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7182591529",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7182591529",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2784",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "ראנד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Rand",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Joseph Avenue",
        "houseNumber": "46",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-5002",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184362370",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184362370",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184362370",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2785",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "שפירא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Schapira",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cherry Place",
        "houseNumber": "31",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-6911",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "3472321766",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "3472321766",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "3472321766",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2787",
    "title": "הרה\"ח ר'",
    "firstName": "הכט",
    "lastName": "ישראל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Hecht",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "236",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Fiddlers Run",
        "houseNumber": "1932",
        "apartment": "",
        "city": "Toms River, NJ",
        "state": "",
        "zip": "08755-1454",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184310744",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184310744",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184310744",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2789",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "הכט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Hecht",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "236",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Fiddlers Run",
        "houseNumber": "1932",
        "apartment": "",
        "city": "Toms River, NJ",
        "state": "",
        "zip": "08755-1454",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184310744",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184310744",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184310744",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2790",
    "title": "הרב",
    "firstName": "יוסף מאיר",
    "lastName": "פאלוך",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Palluch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 3rd Street",
        "houseNumber": "542",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218-4506",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7185811262",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7185811262",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7185811262",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2791",
    "title": "הרה\"ח ר'",
    "firstName": "מנחם",
    "lastName": "פסח",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi & Mrs.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Pesach",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Emes Lane",
        "houseNumber": "6",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-2911",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "8454257545",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "8454257545",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "8454257545",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2792",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "פעפער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Pfeffer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-17T21:00:00.000Z",
    "notes": "חתן ר' עקיבא שמחה",
    "fatherLegacyId": "470",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Witzel Court",
        "houseNumber": "5",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-7833",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "8454251650",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "8454251650",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "8454251650",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2794",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "ראדזיק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Radzik",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "2791",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Caville Drive",
        "houseNumber": "7",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-4012",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "845 425-4579",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "845 213-9574",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2795",
    "title": "הרה\"ח ר'",
    "firstName": "לייבוש",
    "lastName": "שטיינער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "L",
    "lastNameEnglish": "Steiner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Elaine Place",
        "houseNumber": "3",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10977-3805",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "8454263494",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "8454263494",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "8454263494",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2796",
    "title": "הרה\"ח ר'",
    "firstName": "יששכר",
    "lastName": "אלתר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Alter",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Melba Street",
        "houseNumber": "260",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-5337",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184381939",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184381939",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184381939",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2797",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "דרזנר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Drezner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ardmore Avenue",
        "houseNumber": "193",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-4323",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186335484",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186335484",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186335484",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2798",
    "title": "הרה\"ח ר'",
    "firstName": "אליעזר מנחם",
    "lastName": "רובינשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E M",
    "lastNameEnglish": "Rubinstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Sheraden Avenue",
        "houseNumber": "168",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-4332",
        "zip2": "",
        "neighborhood": "Emerson Hill",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2799",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "שיינשניידער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Sheinshneider",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-07-17T21:00:00.000Z",
    "notes": "חתן ר' אפרים לנדא",
    "fatherLegacyId": "569",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "17th Avenue",
        "houseNumber": "5622",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1834",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188531060",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188531060",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188531060",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2805",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "רוזנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Rosenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-08-13T21:00:00.000Z",
    "notes": "בן ר' אברהם שלמה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "1764",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1747",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1525",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186333607",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186333607",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186333607",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2807",
    "title": "הרב",
    "firstName": "עקיבא יואל",
    "lastName": "שרייבער",
    "suffix": "שליט\"א",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A Y",
    "lastNameEnglish": "Schreiber",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-08-18T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "2421",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "W kennedy Blvd",
        "houseNumber": "623",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7329421693",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7329421693",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7329421693",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2813",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר יצחק זונדל",
    "lastName": "פערנבאך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Fernbach",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-10-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "15th Street",
        "houseNumber": "424",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7329019155",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7329019155",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7329019155",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2814",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "ציטרין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Aron",
    "lastNameEnglish": "Cytryn",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-11-26T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Olean Street",
        "houseNumber": "2317",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2816",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "קניגסברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Kenigsberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-12-07T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "hudson Street",
        "houseNumber": "127",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "NJ08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2817",
    "title": "הרה\"ח ר'",
    "firstName": "זאב",
    "lastName": "חסקלסון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Chaskelson",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-12-07T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Foster Avenue",
        "houseNumber": "209",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2818",
    "title": "הרה\"ח ר'",
    "firstName": "אפרים מאיר",
    "lastName": "אדלר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E.m",
    "lastNameEnglish": "Adler",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-12-07T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wispering Pines Lane",
        "houseNumber": "40",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2819",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "יאלאס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Jalas",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-12-07T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "50th Street",
        "houseNumber": "1951",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2821",
    "title": "הרה\"ח ר'",
    "firstName": "הערשל",
    "lastName": "ווגמן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "H Wagman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-12-17T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "49th Street",
        "houseNumber": "1838",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188517131",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188517131",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188517131",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2823",
    "title": "הרה\"ח ר'",
    "firstName": "לייבל",
    "lastName": "פרידע",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Leib",
    "lastNameEnglish": "Fryde",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2022-12-31T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "43rd Street",
        "houseNumber": "1680",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2824",
    "title": "הרה\"ח ר'",
    "firstName": "שלום",
    "lastName": "אבראמטשיק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Abramcyk",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-01-10T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wispering Pines Lane",
        "houseNumber": "45",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2828",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם ישעי'",
    "lastName": "רוטנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A Y",
    "lastNameEnglish": "Rottenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-01-10T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lexington Avenue",
        "houseNumber": "1500",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2830",
    "title": "הרה\"ח ר'",
    "firstName": "פנחס",
    "lastName": "גאלדבערג",
    "suffix": "",
    "titleEnglish": "",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Goldberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-01-11T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "49th Street",
        "houseNumber": "1237",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2831",
    "title": "הרה\"ח ר'",
    "firstName": "נתנאל",
    "lastName": "מורדוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Mordowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-01-15T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "2849",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Tanglewood Lane",
        "houseNumber": "1435",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1576",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2832",
    "title": "הרה\"ח ר'",
    "firstName": "משה אהרן",
    "lastName": "קומפל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M A",
    "lastNameEnglish": "Kompel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-01-15T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "45th Street",
        "houseNumber": "1737",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2834",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "דוד חיים",
    "lastName": "פראנד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D C",
    "lastNameEnglish": "Frand",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-01-15T22:00:00.000Z",
    "notes": "בן ר' יצחק",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "1306",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "61st Street",
        "houseNumber": "2157",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189725166",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189725166",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189725166",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2835",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם בנימין",
    "lastName": "שפירא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A B",
    "lastNameEnglish": "Schapira",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-01-15T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1857",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2836",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יוסף אהרן",
    "lastName": "שיינשניידער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Sheinshneider",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-01-15T22:00:00.000Z",
    "notes": "חתן ר' בערל קריימאן",
    "fatherLegacyId": "569",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "19th Avenue",
        "houseNumber": "5120",
        "apartment": "#2g",
        "city": "New York, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189728764",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189728764",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189728764",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2838",
    "title": "הרה\"ח ר'",
    "firstName": "אליעזר מנחם",
    "lastName": "בורנשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E M",
    "lastNameEnglish": "Bornstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-01-15T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "56th Street",
        "houseNumber": "1411",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2839",
    "title": "הרה\"ח ר'",
    "firstName": "ישכר דוב",
    "lastName": "אלתר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y D",
    "lastNameEnglish": "Alter",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-01-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "15th Avenue Apt 404",
        "houseNumber": "3715",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2842",
    "title": "הרה\"ח ר'",
    "firstName": "צדוק",
    "lastName": "ורדיגר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Tzudik",
    "lastNameEnglish": "Werdyger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-04T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street apt 4",
        "houseNumber": "1901",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2843",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר יחיאל",
    "lastName": "וואלקין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M Y",
    "lastNameEnglish": "Walkin",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-04T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Fernwood Avenue",
        "houseNumber": "1475",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2844",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה",
    "lastName": "שפירא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Schapira",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-04T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Baila Blvd",
        "houseNumber": "6",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2846",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "אניספלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Anisfeid",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-04T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "12th Street",
        "houseNumber": "15",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1965",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2847",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "גוטליב",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Gottlieb",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-04T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Somerset Avenue",
        "houseNumber": "476",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2849",
    "title": "הרה\"ח ר'",
    "firstName": "אביגדור",
    "lastName": "מורדוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Mordowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-04T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lyncrest Drive",
        "houseNumber": "20",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "845 323-6120",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2850",
    "title": "הרה\"ח ר'",
    "firstName": "שאול משה",
    "lastName": "אלתר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Sh M",
    "lastNameEnglish": "Alter",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-04T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2851",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "אונגאר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Ungar",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-05T22:00:00.000Z",
    "notes": "משרד",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Coney Island Avenue",
        "houseNumber": "1372",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2852",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "טייטלבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Teitelbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2855",
    "title": "הרה\"ח ר'",
    "firstName": "הערשל",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "H",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Flatlands Avenue",
        "houseNumber": "3516",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11234",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2856",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "אטינגר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Ettinger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 26th Street",
        "houseNumber": "1127",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Zell & Ettinger",
        "street": "3001 Ave M",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210-4744",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2857",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל יעקב",
    "lastName": "גראס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Gros",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 36th Street",
        "houseNumber": "1528",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2858",
    "title": "הרה\"ח ר'",
    "firstName": "משה יואל",
    "lastName": "מולר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M Y",
    "lastNameEnglish": "Muller",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Flatlands Avenue",
        "houseNumber": "3839",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2859",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "פרוכטהנדלר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Fruithandler",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 17th Street",
        "houseNumber": "978",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2860",
    "title": "הרה\"ח ר'",
    "firstName": "גרשון",
    "lastName": "רוטשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "G",
    "lastNameEnglish": "Rothstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 18th Street",
        "houseNumber": "1529",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189985257",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189985257",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189985257",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2861",
    "title": "הרה\"ח ר'",
    "firstName": "משה שמואל",
    "lastName": "וואקס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M S",
    "lastNameEnglish": "Wachs",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 26th Street",
        "houseNumber": "853",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2862",
    "title": "הרה\"ח ר'",
    "firstName": "ג'פרי",
    "lastName": "גיימס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "James",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 23rd Street",
        "houseNumber": "1051",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2863",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "שונפלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Schoenfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 23rd Street",
        "houseNumber": "1282",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Zichron Chaim Charity Fund",
        "street": "1282 E 23rd Street",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2867",
    "title": "הרה\"ח ר'",
    "firstName": "פינחס",
    "lastName": "ראנד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Rand",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 22nd Street",
        "houseNumber": "937",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2868",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "קליין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 18th Street",
        "houseNumber": "1462",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-6707",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2869",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "שווארטץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Schwartz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 22nd Street",
        "houseNumber": "953",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2870",
    "title": "מרת",
    "firstName": "גיטה",
    "lastName": "טסלר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mrs.",
    "firstNameEnglish": "G",
    "lastNameEnglish": "Teslar",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ocean Park Way",
        "houseNumber": "1443",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2871",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "קופמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Kuafman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 22nd Street",
        "houseNumber": "1305",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2874",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק ישראל",
    "lastName": "גאלדשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Goldstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 24th Street",
        "houseNumber": "1138",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210-4507",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2876",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "גטנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Gutenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Kenridge Road",
        "houseNumber": "388",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-1816",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Lawrence Charitable Fdtn",
        "street": "388 Kenridge Road",
        "houseNumber": "",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-1816",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2878",
    "title": "הרה\"ח ר'",
    "firstName": "שמעון",
    "lastName": "פשרופער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Pashrofer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "1483",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2879",
    "title": "הרב",
    "firstName": "יונתן",
    "lastName": "קוטנר",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Kutner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Herborview W",
        "houseNumber": "9",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2880",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב אליהו",
    "lastName": "סעד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y E",
    "lastNameEnglish": "Sad",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Larch Hill",
        "houseNumber": "58",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-1926",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2881",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "סלומון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Soloman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lismore",
        "houseNumber": "37",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-1338",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2883",
    "title": "הרה\"ח ר'",
    "firstName": "יואל",
    "lastName": "אדלשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Edelstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lord Avenue",
        "houseNumber": "119",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-1340",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2886",
    "title": "הרה\"ח ר'",
    "firstName": "אלכס",
    "lastName": "גרינברגר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Greenberger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-11T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Five towns",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2887",
    "title": "הרה\"ח ר'",
    "firstName": "ישכר דוב",
    "lastName": "קארפונקל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Carfunkel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-11T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Broadway",
        "houseNumber": "235",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11519-1530",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2888",
    "title": "הרה\"ח ר'",
    "firstName": "מנשה פינחס",
    "lastName": "אורטס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "M P",
    "lastNameEnglish": "Orts",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-11T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Adelberg Lane",
        "houseNumber": "412",
        "apartment": "",
        "city": "Cedarhurst, NY",
        "state": "",
        "zip": "11516-1102",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2890",
    "title": "הרה\"ח ר'",
    "firstName": "אלי",
    "lastName": "רעטעק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Retek",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "61st Street",
        "houseNumber": "1865",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2891",
    "title": "הרה\"ח ר'",
    "firstName": "עקיבא",
    "lastName": "גלאטצער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Glatzer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Dumont Place",
        "houseNumber": "169",
        "apartment": "",
        "city": "Valley Stream, NY",
        "state": "",
        "zip": "11581-3121",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2892",
    "title": "הרה\"ח ר'",
    "firstName": "אלי",
    "lastName": "טנדלר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Tendler",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lawrence Ave",
        "houseNumber": "54",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-1436",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2893",
    "title": "הרה\"ח ר'",
    "firstName": "משה יוסף",
    "lastName": "עסטרייכער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Ostreicher",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wildacre Ave",
        "houseNumber": "184",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2894",
    "title": "הרה\"ח ר'",
    "firstName": "ג'פרי",
    "lastName": "שטערן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Stern",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Meehan Ave",
        "houseNumber": "334",
        "apartment": "",
        "city": "Far Rockaway, NY",
        "state": "",
        "zip": "11691-5431",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2895",
    "title": "הרה\"ח ר'",
    "firstName": "שלום",
    "lastName": "ווילהיים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Sh",
    "lastNameEnglish": "Willem",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Reads Lane",
        "houseNumber": "525",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Five Towns",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2896",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "פלוטשעניק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Pluczenik",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-12T22:00:00.000Z",
    "notes": "לבדוק אם קוראים לו שלום מרדכי",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Annapolis",
        "houseNumber": "636",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2897",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "עדס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Adas",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Park Cir",
        "houseNumber": "33",
        "apartment": "",
        "city": "Cedarhurst, NY",
        "state": "",
        "zip": "11516-1024",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2898",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "דובקר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Dubkar",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Alon",
        "houseNumber": "622",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Five towns",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2899",
    "title": "הרה\"ח ר'",
    "firstName": "משה  ניסן",
    "lastName": "אלפרט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M N",
    "lastNameEnglish": "Alpert",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Reads Lane",
        "houseNumber": "605",
        "apartment": "",
        "city": "Far Rockaway, NY",
        "state": "",
        "zip": "11691-5413",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2900",
    "title": "הרה\"ח ר'",
    "firstName": "אפרים",
    "lastName": "טעננבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Tenenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-13T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cedarhurst Avenue",
        "houseNumber": "475",
        "apartment": "",
        "city": "Cedarhurst, NY",
        "state": "",
        "zip": "11516-1216",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2901",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "רוטמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Rothman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-13T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Carlyle St",
        "houseNumber": "710",
        "apartment": "",
        "city": "Woodmere, NY",
        "state": "",
        "zip": "11598-2918",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2902",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "קרסנער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Krasner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-13T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Elvira Ave",
        "houseNumber": "6-20",
        "apartment": "",
        "city": "Far Rockaway, NY",
        "state": "",
        "zip": "11691",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2905",
    "title": "הרה\"ח ר'",
    "firstName": "בן ציון",
    "lastName": "אונגאר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Ungar",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-15T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Long Beach",
        "houseNumber": "1507",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2906",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "דץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Dats",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-15T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ocean Park Avenue",
        "houseNumber": "1486",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2907",
    "title": "הרה\"ח ר'",
    "firstName": "אלי",
    "lastName": "זינגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Singer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-15T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 8th Street",
        "houseNumber": "566",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2910",
    "title": "הרה\"ח ר'",
    "firstName": "ארי'",
    "lastName": "שטערן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Stern",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "EliWeiss@autumnhc.net",
        "label": "אימייל בבית",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2912",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Pine Circle Drive",
        "houseNumber": "160",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2914",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה לייב",
    "lastName": "אבראמטשיק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Abramcyk",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2915",
    "title": "הרה\"ח ר'",
    "firstName": "נחמיה",
    "lastName": "פנסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Penske",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2916",
    "title": "הרה\"ח ר'",
    "firstName": "חוני",
    "lastName": "הערצקא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Ch",
    "lastNameEnglish": "Herzke",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2919",
    "title": "הרה\"ח ר'",
    "firstName": "יהושע",
    "lastName": "געלבוואקס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Y",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2920",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "ריעדער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Sh",
    "lastNameEnglish": "Rieder",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-19T22:00:00.000Z",
    "notes": "קבלת קהל בימי ד' בשעה 7 בערב באולם ביהכנ\"ס",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Avenue J",
        "houseNumber": "2201",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2921",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "שארף",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Ch",
    "lastNameEnglish": "Scharf",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 22nd Street",
        "houseNumber": "953",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2923",
    "title": "הרה\"ח ר'",
    "firstName": "משה ניסן",
    "lastName": "גווירצמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Gewirtzman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-02-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 12th Street",
        "houseNumber": "1869",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11229-2701",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2935",
    "title": "הרה\"ח ר'",
    "firstName": "הערשל",
    "lastName": "טייטלבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "H",
    "lastNameEnglish": "Teitelbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "משרדbrookston manegment",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Oak Gen Road",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2936",
    "title": "הרה\"ח ר'",
    "firstName": "בנימין",
    "lastName": "היינמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Heinemann",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "bp printgroup",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "4th Street",
        "houseNumber": "315",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2937",
    "title": "הרה\"ח ר'",
    "firstName": "ישכר דוב",
    "lastName": "קארפונקעל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y D",
    "lastNameEnglish": "Carfenkil",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Avenue J",
        "houseNumber": "224",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2938",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "רוזנטל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Rosental",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "יודאיקה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2939",
    "title": "הרה\"ח ר'",
    "firstName": "שאול אליעזר",
    "lastName": "גולדבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Goldbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "בביהכ\"נ בוסטון אחרי שחרית או מעריב",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 17th Street",
        "houseNumber": "982",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2940",
    "title": "הרה\"ח ר'",
    "firstName": "יחיאל",
    "lastName": "אייזנשטאט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Eisenstadt",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 22nd St",
        "houseNumber": "1350",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Irontown Foundation",
        "street": "1350 E 22nd St.",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2942",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "צוקרמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Zuckerman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "1439",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2943",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב ישראל",
    "lastName": "לבקובסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Levkovsky",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Kenyon Drive",
        "houseNumber": "1",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2944",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "האשקעס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Hashkes",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "lexinqton tower 402 משרד",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lexington Avenue",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2945",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה",
    "lastName": "פייג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Faig",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "רוברטס / משרד כל יום בין5-6",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cross Street",
        "houseNumber": "204",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2946",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "זולטיי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "משרד כל יום ד' בין 11-12",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cross Street",
        "houseNumber": "201",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2948",
    "title": "הרה\"ח ר'",
    "firstName": "חכם",
    "lastName": "שאול",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Ch",
    "lastNameEnglish": "Saul",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "18 4853000",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "18 4853000",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "18 4853000",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2949",
    "title": "הרה\"ח ר'",
    "firstName": "מיכאל",
    "lastName": "שיק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Schick",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Beechwood Dr",
        "houseNumber": "7",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Catering By Michael Schick",
        "street": "9024 Foster Ave",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11236",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "5163716115",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2950",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "נוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Novitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "תורה ומסורה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Foster Avenue",
        "houseNumber": "620",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2951",
    "title": "הרה\"ח ר'",
    "firstName": "ברוך",
    "lastName": "גוטערער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Gutterer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "56th Street",
        "houseNumber": "1158",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2952",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב משה",
    "lastName": "קליין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "55th St",
        "houseNumber": "1136",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "11219-4116",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2953",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף הלל",
    "lastName": "בראכפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y H",
    "lastNameEnglish": "Brachfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2954",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "שטייגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Shteiger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "56th Street",
        "houseNumber": "1166",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2956",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "סילבערשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Silverstone",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "1630",
        "houseNumber": "1630",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2957",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה",
    "lastName": "גוטוויין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Gutwein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "42nd Street",
        "houseNumber": "1632",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2958",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה",
    "lastName": "מוסבכר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Mosbacher",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Carasatjo Drive",
        "houseNumber": "105",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "",
        "street": "902 E County Line Rd",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7329610775",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "2959",
    "title": "הרה\"ח ר'",
    "firstName": "סנדר",
    "lastName": "לערנער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Lerner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "כתובת המשרד 326 3rd St",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Roselle Ct",
        "houseNumber": "52",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2960",
    "title": "הרה\"ח ר'",
    "firstName": "דניאל",
    "lastName": "אולשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Olstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "15th Street",
        "houseNumber": "1421",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2961",
    "title": "הרה\"ח ר'",
    "firstName": "הלל",
    "lastName": "לודינסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "H",
    "lastNameEnglish": "Ludinsky",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "FLANHERG AVE/קשה להיכנס צריך להתעקש במזכירות",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Chase Avenue",
        "houseNumber": "101",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2962",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "פאשקעס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Pasckesz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "2nd St",
        "houseNumber": "422",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Kanarek & Co",
        "street": "20 4th St, Ste 215",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2963",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "שרון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Schron",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Aredenwood Ave",
        "houseNumber": "1430",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2964",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "ניימאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Naiman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ave H corner Q",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2966",
    "title": "הרה\"ח ר'",
    "firstName": "יחיאל",
    "lastName": "הירט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Herit",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Shoshana Drive",
        "houseNumber": "6",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2967",
    "title": "הרה\"ח ר'",
    "firstName": "שאול",
    "lastName": "הופמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Sh",
    "lastNameEnglish": "Hoffman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Rockaway Road",
        "houseNumber": "1538",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2968",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "רוברט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Robert",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2969",
    "title": "הרה\"ח ר'",
    "firstName": "שמעון",
    "lastName": "קטנר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 8th Street",
        "houseNumber": "782",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2970",
    "title": "הרה\"ח ר'",
    "firstName": "שלום",
    "lastName": "אילאוויטש",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Ilowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "TCV",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Park Slope Ter",
        "houseNumber": "1",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2971",
    "title": "הרה\"ח ר'",
    "firstName": "אליעזר דוד",
    "lastName": "איצקוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E D",
    "lastNameEnglish": "Itzkowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "62nd Street",
        "houseNumber": "1862",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2972",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "לווינטל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Lowenthal",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 3rd Street",
        "houseNumber": "1346",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183751667",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183751667",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183751667",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2974",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "גוירצמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Guertzman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 12th Street",
        "houseNumber": "1864",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2975",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "שווארטץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Schwartz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2976",
    "title": "הרה\"ח ר'",
    "firstName": "נפתלי",
    "lastName": "לשקביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Lashkovitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 19th Street",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2977",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף יצחק",
    "lastName": "סימפסון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Simpson",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Muriel Avenue",
        "houseNumber": "38",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-1811",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2978",
    "title": "הרה\"ח ר'",
    "firstName": "ירוחם",
    "lastName": "ברטרם",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Bertram",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Lake Drive",
        "houseNumber": "1415",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-7143",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2979",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה",
    "lastName": "מערמלשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Marmelstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ilan Court",
        "houseNumber": "9",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-2374",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Park Lane Investments LLC",
        "street": "9 Ilan Ct",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-2374",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2980",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "גאלדנבערג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Ch",
    "lastNameEnglish": "Goldenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2981",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "גוידן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Goiden",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "15th Street",
        "houseNumber": "423",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2982",
    "title": "הרה\"ח ר'",
    "firstName": "משה ארי'",
    "lastName": "מולט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M A",
    "lastNameEnglish": "Molt",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Freedom Drive",
        "houseNumber": "33",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2983",
    "title": "הרה\"ח ר'",
    "firstName": "ראובן",
    "lastName": "בראון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Brown",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Shady Lane Drive",
        "houseNumber": "85",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2984",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "פרנקל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Frankel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "בן של אליעזר מג'ג",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "14th Street",
        "houseNumber": "1302",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2985",
    "title": "הרה\"ח ר'",
    "firstName": "ירוחם",
    "lastName": "ברטרם",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Bertram",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Adelaide Drive",
        "houseNumber": "136",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2986",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "שרמן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Sh",
    "lastNameEnglish": "Sherman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Somerset Avenue",
        "houseNumber": "1089",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2987",
    "title": "הרה\"ח ר'",
    "firstName": "משה דוד",
    "lastName": "ברוין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M D",
    "lastNameEnglish": "Braun",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "324",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Carey St",
        "houseNumber": "210",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Congregation Ohel Avrohom Yosef",
        "street": "210 Chary St",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7328862150",
        "label": "טלפון נוסף",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "2988",
    "title": "הרה\"ח ר'",
    "firstName": "משה זאב",
    "lastName": "צענזער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M Z",
    "lastNameEnglish": "Zenzer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Scarlton",
        "houseNumber": "183",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2990",
    "title": "הרה\"ח ר'",
    "firstName": "אליעזר יצחק",
    "lastName": "קנר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E Y",
    "lastNameEnglish": "Kenner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Netofa",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Five towns",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2992",
    "title": "הרה\"ח ר'",
    "firstName": "יהושע",
    "lastName": "גרף",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Graf",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Holyhood",
        "houseNumber": "229",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-2700",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2993",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "זנדר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Zander",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cedar Lawn Avenue",
        "houseNumber": "740",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Five towns",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2994",
    "title": "הרה\"ח ר'",
    "firstName": "דוב",
    "lastName": "דובקר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Dubkar",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "622 Alonzo",
        "houseNumber": "",
        "apartment": "",
        "city": "Netofa",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Five towns",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2995",
    "title": "הרה\"ח ר'",
    "firstName": "צבי",
    "lastName": "רובין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Rubin",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Empire Avenue",
        "houseNumber": "7-31",
        "apartment": "",
        "city": "Far Rockaway, NY",
        "state": "",
        "zip": "11691",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2996",
    "title": "הרה\"ח ר'",
    "firstName": "שלום",
    "lastName": "הברפלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Dr",
    "lastNameEnglish": "Haberfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Briarwood Lane",
        "houseNumber": "24",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-2106",
        "zip2": "",
        "neighborhood": "Five towns",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "2998",
    "title": "הרה\"ח ר'",
    "firstName": "אבי",
    "lastName": "ויינשטאק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Wienstock",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Herrick",
        "houseNumber": "5",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-1437",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3000",
    "title": "הרה\"ח ר'",
    "firstName": "רובי",
    "lastName": "שרון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Sharon\r\r\nsharon",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3001",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "זונטאג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Zuntag",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3002",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "שונבלום",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Schoenblum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "48th Street",
        "houseNumber": "1253",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3003",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "בלוי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Blau",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3004",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה לייב",
    "lastName": "לינץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y L",
    "lastNameEnglish": "Lynch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Laguna Lane",
        "houseNumber": "1552",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3006",
    "title": "הרה\"ח ר'",
    "firstName": "נחמיה",
    "lastName": "ליימאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi & Mrs.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Leiman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Engleberg Ter",
        "houseNumber": "8",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3008",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "שפילמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Spielman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3009",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "שפירא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Schapira",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3010",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "רייכמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Reichman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Somerset Avenue",
        "houseNumber": "155",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3011",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל נחום",
    "lastName": "",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y N",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Pamela Drive",
        "houseNumber": "47",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3012",
    "title": "הרה\"ח ר'",
    "firstName": "מנדל",
    "lastName": "ברנט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Bernat",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cedar Steet",
        "houseNumber": "18",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3013",
    "title": "הרה\"ח ר'",
    "firstName": "שמעון אלעזר",
    "lastName": "לעפקאוויטש",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Sh E",
    "lastNameEnglish": "Lefkavitch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3014",
    "title": "הרה\"ח ר'",
    "firstName": "חנינא צבי",
    "lastName": "ווייס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "H",
    "lastNameEnglish": "Weiss",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "NARS 73 12 TH STREET",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "11th St",
        "houseNumber": "150",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11215-3816",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3015",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "גאלדנבערג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Goldenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "Goldmont Reality E14th Street משרד",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3016",
    "title": "הרה\"ח ר'",
    "firstName": "הערשל",
    "lastName": "גורעם",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "H",
    "lastNameEnglish": "Guram",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3017",
    "title": "הרה\"ח ר'",
    "firstName": "שמעי'",
    "lastName": "פלאטשיק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Platchek",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3018",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "גלדטון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Gladton",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "2115",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3019",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "הערצאג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Herzog",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "1755",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3020",
    "title": "הרה\"ח ר'",
    "firstName": "יואל",
    "lastName": "גרובער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Gruber",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "1752",
        "houseNumber": "1752",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3021",
    "title": "הרה\"ח ר'",
    "firstName": "אנשיל",
    "lastName": "איצקוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Itzkowitz\r\r\nitzkowitz\r\r\nitzkowitz\r\r\nitzkowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3022",
    "title": "הרה\"ח ר'",
    "firstName": "יחיאל",
    "lastName": "וויינשטאק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Wajnsztok",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "1423",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3024",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "שטינברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Steinberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 24th treet",
        "houseNumber": "1459",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3026",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "חייטובסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Chaitovsky",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "yung Israel plainview",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Phipps Ln",
        "houseNumber": "42",
        "apartment": "",
        "city": "Plainview, NY",
        "state": "",
        "zip": "11803",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3027",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "הערצאג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Herzog",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "Herzog winery",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3028",
    "title": "הרה\"ח ר'",
    "firstName": "רני",
    "lastName": "שטרן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Stern",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "משרדBaltic wood",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3029",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "קלוגמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Klugman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3030",
    "title": "הרה\"ח ר'",
    "firstName": "מנשה",
    "lastName": "פרנקל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Frankel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Seton Cir",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3032",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "מרדר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Merder",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ceder Bridge Avenue 2B",
        "houseNumber": "1999",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3034",
    "title": "הרה\"ח ר'",
    "firstName": "אלכסנדר אשר",
    "lastName": "הייטנער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A U",
    "lastNameEnglish": "Heitner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Carasatjo Drive",
        "houseNumber": "50",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "alexheitner@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3036",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "פרומער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Frommer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "W Kennedy Blvd",
        "houseNumber": "929",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1262",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3037",
    "title": "הרה\"ח ר'",
    "firstName": "מיכאל",
    "lastName": "גראס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Gros",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "kerry Court",
        "houseNumber": "1489",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3038",
    "title": "הרה\"ח ר'",
    "firstName": "מוטי",
    "lastName": "מילר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Miller",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3040",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "שווארטץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Schwartz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Malkd way",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3041",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק יהודה",
    "lastName": "פעלדמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "L",
    "lastNameEnglish": "Feldman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th street",
        "houseNumber": "1822",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "11230-6401",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3042",
    "title": "הרה\"ח ר'",
    "firstName": "אולג",
    "lastName": "סייטצקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Saitski",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 22nd Street",
        "houseNumber": "1824",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "11229-1525",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3043",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "גנוט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 22 Street",
        "houseNumber": "1792",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3044",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "רוזנר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Netofa",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3045",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "טווערסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Twersky",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Waldorf Ct",
        "houseNumber": "31",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3046",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "לשקביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Lashkovitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3047",
    "title": "הרה\"ח ר'",
    "firstName": "נפתלי",
    "lastName": "הורוויץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Horovitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 9th Street",
        "houseNumber": "11",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3048",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן זאב",
    "lastName": "פלומון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A Z",
    "lastNameEnglish": "Floman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Rugby Road",
        "houseNumber": "370",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Five towns",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3049",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "לוי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Levy",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wildwood Road",
        "houseNumber": "572",
        "apartment": "",
        "city": "West Hempstead, NY",
        "state": "",
        "zip": "11552-3119",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3050",
    "title": "הרה\"ח ר'",
    "firstName": "יחיאל",
    "lastName": "זופניק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "H M",
    "lastNameEnglish": "Zupnick",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Sealy Ct",
        "houseNumber": "9",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-2411",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3051",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "אורנבך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Orenbuch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wildwood Drive",
        "houseNumber": "693",
        "apartment": "",
        "city": "West Hempstead, NY",
        "state": "",
        "zip": "11552",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3052",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "שטראוס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Strauss",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Maplr Street",
        "houseNumber": "256",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Five towns",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3053",
    "title": "הרה\"ח ר'",
    "firstName": "אשר",
    "lastName": "מנדל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Mandel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-20T22:00:00.000Z",
    "notes": "(מעטפה)",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Five towns",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3055",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "קנורל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Konerl",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "14th",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3057",
    "title": "הרה\"ח ר'",
    "firstName": "קופר",
    "lastName": "שמידט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "K",
    "lastNameEnglish": "Schmidt",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Sherie Court",
        "houseNumber": "39",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3058",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "פרנס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Parnes",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Emerald",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3059",
    "title": "הרה\"ח ר'",
    "firstName": "מנחם",
    "lastName": "טסלר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Teslar",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "J Scott Court",
        "houseNumber": "1225",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3060",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "גרין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Green",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Somerset Avenue",
        "houseNumber": "136",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3062",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "ברקוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Berkowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "White Dove Ct",
        "houseNumber": "14",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-5167",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "",
        "street": "235 River Ave",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-4808",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "ari@thevoiceoflakewood.com",
        "label": "אימייל בבית",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3063",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "ויינשטאק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Wienstock",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-03-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Powderhorn Drive",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3103",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "שמידט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Schmidt",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-05-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "15 Grove Street",
        "houseNumber": "",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3104",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "שרייבער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Schreiber",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-05-09T21:00:00.000Z",
    "notes": "חתן ר' שמואל הורביץ",
    "fatherLegacyId": "592",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bates Drive",
        "houseNumber": "71",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "8453521507",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "8453521507",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "8453521507",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3105",
    "title": "הרה\"ח ר'",
    "firstName": "יואל",
    "lastName": "לעבאוויטש",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Lebovics",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-05-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3106",
    "title": "הרה\"ח ר'",
    "firstName": "אלי",
    "lastName": "סולומון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Salmon",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-05-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Citrus Avenue",
        "houseNumber": "417",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2631",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 857-0870",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "323 578-8051",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3107",
    "title": "הרה\"ח ר'",
    "firstName": "פנחס",
    "lastName": "שדרוביצקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Shadrovitsky",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-05-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3110",
    "title": "הרה\"ח ר'",
    "firstName": "אלי",
    "lastName": "זמל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Zemal",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-05-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Formosa Avenue",
        "houseNumber": "327",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2526",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3112",
    "title": "הרה\"ח ר'",
    "firstName": "שמעיה",
    "lastName": "מנדלבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Mandelbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-05-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Formosa Avenue",
        "houseNumber": "156",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2818",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 939-1716",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "213 494-2491",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3118",
    "title": "הרב",
    "firstName": "אשר",
    "lastName": "בראנדער",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Brander",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-19T21:00:00.000Z",
    "notes": "לברר בהודעת טקסט את זמני הקבלה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "W Pico Blvd",
        "houseNumber": "8666",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3119",
    "title": "מרת",
    "firstName": "",
    "lastName": "איינשטיין",
    "suffix": "תחי'",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Einstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-19T21:00:00.000Z",
    "notes": "לדבר דרך האינטרקום והיא מוציאה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Livonia Ave",
        "houseNumber": "1461",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-3317",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3120",
    "title": "הר\"ר",
    "firstName": "",
    "lastName": "הורוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Horowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-19T21:00:00.000Z",
    "notes": "כתובת משרד, קומה 7 חדר 740, מזכירה ליאה ווטרסון",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S beverly Drive",
        "houseNumber": "1180",
        "apartment": "Ste 740",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-1153",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Horowitz Management Brokers",
        "street": "1180 S beverly Drive, Ste 740",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-1153",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "310 278-5943",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3121",
    "title": "הר\"ר",
    "firstName": "",
    "lastName": "מילמן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Millman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-19T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Beverwil drive",
        "houseNumber": "1159",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-1105",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "310 277-3509",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3122",
    "title": "הרב",
    "firstName": "בנימין",
    "lastName": "ליסבון",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Lisbon",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "Office: 1801 La Cienega Pl, Ste 200, Los Angeles, CA 90035-4659",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "P.O.B 35721",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-0721",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "KSA",
        "street": "P.O.B. 35721",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-0721",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "310 282-0444",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3123",
    "title": "הר\"ר",
    "firstName": "מהדי",
    "lastName": "מוסזדה",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Mossazadeh",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "Office: 2664 La Cienega Blvd, 90034-2604",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Rodeo Dr",
        "houseNumber": "344",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90212-4207",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Mr. & Mrs. M Mossazadeh",
        "street": "344 S Rodeo Dr",
        "houseNumber": "",
        "apartment": "",
        "city": "Beverly Hills, CA",
        "state": "",
        "zip": "90212-4207",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3124",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "גורדון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Gordon",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cardiff Avenue",
        "houseNumber": "1560",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-3207",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3125",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "קאמינקא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Kaminke",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Guthrie Drive",
        "houseNumber": "2262",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90034-1027",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "310 836-3535",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3126",
    "title": "מר",
    "firstName": "שמשון",
    "lastName": "בינשטוק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Bienstock",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Poinsettia Pl",
        "houseNumber": "170",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2804",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Ek Charitable Foundation Inc",
        "street": "106 S Poinsettia Pl",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2804",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3127",
    "title": "מרת",
    "firstName": "",
    "lastName": "גראס",
    "suffix": "תחי'",
    "titleEnglish": "Mrs.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Gros",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "160",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-281",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3128",
    "title": "מר",
    "firstName": "",
    "lastName": "נורפרבר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Nurfarver",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3129",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "גוטסמן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Gottesman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Mansfield",
        "houseNumber": "423",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2621",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3130",
    "title": "הרה\"ח ר'",
    "firstName": "רפאל",
    "lastName": "כץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Katz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "W 3rd Street",
        "houseNumber": "2351",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90057-1905",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3131",
    "title": "הרה\"ח ר'",
    "firstName": "חיים יצחק",
    "lastName": "ברבר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "H",
    "lastNameEnglish": "Barber",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Mccadden Pl",
        "houseNumber": "259",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "",
        "street": "259 S McCadden Pl",
        "houseNumber": "",
        "apartment": "",
        "city": "",
        "state": "",
        "zip": "",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 937-7982",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3132",
    "title": "הרה\"ח ר'",
    "firstName": "אליהו",
    "lastName": "קיהן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Kihn",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Poinsettia Place",
        "houseNumber": "448",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2505",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3133",
    "title": "הרה\"ח ר'",
    "firstName": "צבי",
    "lastName": "אילת",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Eilat",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N June St",
        "houseNumber": "430",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "שטיבלך",
        "description": "Eilat Charitable Foundation (מס' שטיבלך: 12)",
        "street": "4659 W Pico Blvd",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90019",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3134",
    "title": "הרב",
    "firstName": "אלעזר",
    "lastName": "מסקין",
    "suffix": "שליט\"א",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Muskin",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "W Oakmore Drive",
        "houseNumber": "9500",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-4020",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Young Israel of Century City",
        "street": "9317 W Pico Blvd",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-4020",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3135",
    "title": "הרה\"ח ר'",
    "firstName": "פלוני",
    "lastName": "",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "חנות KC",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3136",
    "title": "מר",
    "firstName": "דניאל",
    "lastName": "רביבו",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Rbibo",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Sylvan street",
        "houseNumber": "12355",
        "apartment": "",
        "city": "North Hollywood",
        "state": "",
        "zip": "91606-3108",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3137",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "ריגל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Regal",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-07-29T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "509",
    "fatherInLawLegacyId": "1769",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "55th Street",
        "houseNumber": "1831",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-4640",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188710750",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188710750",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188710750",
        "label": "פקס",
        "isPrimary": false
      },
      {
        "type": "email",
        "value": "yregal@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3138",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "לברר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "הכתובת שמופיעה היא של החנות",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Hill Street",
        "houseNumber": "550",
        "apartment": "#640",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90013-2409",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3139",
    "title": "הרה\"ח ר'",
    "firstName": "מייקל",
    "lastName": "קעסט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Kest",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S June St",
        "houseNumber": "346",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90020-4810",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3140",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "טשאפ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Chap",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Formosa Avenue",
        "houseNumber": "439",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2524",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3142",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "הערשבערג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Hershberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Formosa Avenue",
        "houseNumber": "455",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2524",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3143",
    "title": "הרה\"ח ר'",
    "firstName": "חיים יוסף",
    "lastName": "מאנדעל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Mendell",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Orange Drive",
        "houseNumber": "247",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-3010",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "שטיבלך",
        "description": "The Mendell Family Trust (מס' שטיבלך: 1)",
        "street": "247 S Orange Dr",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-3010",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3144",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "הערץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Hertz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Las Palmas Avenue",
        "houseNumber": "401",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90020-4815",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 934-3348",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "424 302-9905",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3146",
    "title": "הרה\"ח ר'",
    "firstName": "שאול",
    "lastName": "שאול",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Saul",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "הכתובת שמופיעה היא של העבודה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 38th St",
        "houseNumber": "2101",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90058-1616",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Complete Garment Inc",
        "street": "2101 E 38th St",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90058-1616",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3147",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "לברר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "הכתובת שמופיעה היא של העבודה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Boyd street",
        "houseNumber": "1319",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90033-3712",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3148",
    "title": "הרב",
    "firstName": "אברהם",
    "lastName": "טרעס",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Tress",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Alta Vista Blvd",
        "houseNumber": "365",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2542",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 852-3005",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "323 823-3306",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3150",
    "title": "הרה\"ח ר'",
    "firstName": "בן ציון",
    "lastName": "וועסטריך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Westreich",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "בשבת מתפלל ביונג ישראל",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Mccadden Place",
        "houseNumber": "345",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90020-4817",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3151",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "מנלה",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Manela",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "כתובת המשרד",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Santa Monica Blvd",
        "houseNumber": "7832",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90046-5303",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Cong. Agudas Achim charity Petty",
        "street": "7832 Santa Monica Blvd",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90046-5303",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 654-8415",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3153",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "וולמארק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Wolmark",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "מקבל במשרד",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Detroit St",
        "houseNumber": "110",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Mr. & Mrs. C Wolmark",
        "street": "7250 Beverly Blvd, Ste 102",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2560",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "347 496-1987",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3154",
    "title": "הרה\"ח ר'",
    "firstName": "נתן",
    "lastName": "אלישמרני",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Elyishmereny",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Formosa Avenue",
        "houseNumber": "172",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2818",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3155",
    "title": "הרב",
    "firstName": "צבי",
    "lastName": "בויארסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Boyarsky",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Formosa Avenue",
        "houseNumber": "430",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2525",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3156",
    "title": "הרה\"ח ר'",
    "firstName": "נחי",
    "lastName": "סילברמן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Silverman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 931-7499",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "213 706-1722",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3157",
    "title": "הרב",
    "firstName": "שלמה",
    "lastName": "קליין",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "רב ביהכנ\"ס אור חיים",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Detroit St",
        "houseNumber": "169",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 934-1813",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3158",
    "title": "מר",
    "firstName": "",
    "lastName": "בנארוך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Benarroch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "בת עם בעיות",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Guthrie drive",
        "houseNumber": "2209",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90034-1029",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3159",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "זדה",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N A",
    "lastNameEnglish": "Zadeh",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wellworth Avenue",
        "houseNumber": "10722",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90024-5024",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3160",
    "title": "הרה\"ח ר'",
    "firstName": "זאב",
    "lastName": "הערץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Hertz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bagley Avenue",
        "houseNumber": "1721",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-4109",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3161",
    "title": "הרה\"ח ר'",
    "firstName": "דניאל",
    "lastName": "גרמא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Grama",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Oakhurst drive",
        "houseNumber": "1515",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-3214",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3163",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "קאהן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Kohan",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3164",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "סטריקס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Striks",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bluebell Avenue",
        "houseNumber": "5510",
        "apartment": "",
        "city": "Valley Village",
        "state": "",
        "zip": "91607-1910",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3166",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "שפיגל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Spiegel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bluebell Avenue",
        "houseNumber": "5019",
        "apartment": "",
        "city": "North Hollywood, CA",
        "state": "",
        "zip": "91607-2909",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3167",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "סטריקס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "L",
    "lastNameEnglish": "Striks",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Alcove Avenue",
        "houseNumber": "5501",
        "apartment": "",
        "city": "Valley Village",
        "state": "",
        "zip": "91607-1923",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3168",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "בוטח",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Botach",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-07T21:00:00.000Z",
    "notes": "הכתובת שמופיעה היא של העבודה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "W Pico Blvd",
        "houseNumber": "5011",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90019-4127",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3169",
    "title": "הרה\"ח ר'",
    "firstName": "אדם",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Beeman Avenue",
        "houseNumber": "5247",
        "apartment": "",
        "city": "Valley Village, CA",
        "state": "",
        "zip": "91607-2307",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3170",
    "title": "הרה\"ח ר'",
    "firstName": "יונה",
    "lastName": "סלומון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Soloman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bellaire avenue",
        "houseNumber": "5345",
        "apartment": "",
        "city": "Valley Village, CA",
        "state": "",
        "zip": "91607-2329",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3171",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "קפנשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Kapenstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Formosa Avenue",
        "houseNumber": "357",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3172",
    "title": "הרה\"ח ר'",
    "firstName": "זאב",
    "lastName": "וולמארק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Wolmark",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Formosa Avenue",
        "houseNumber": "425",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2524",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3173",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "גראס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A T",
    "lastNameEnglish": "Gros",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Detroit St",
        "houseNumber": "169",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2915",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3174",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "בארזיוואנד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Barzivand",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Poinsettia Place",
        "houseNumber": "121",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2803",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 424-4841",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3175",
    "title": "הרה\"ח ר'",
    "firstName": "הרצל",
    "lastName": "פארזאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "F",
    "lastNameEnglish": "Farzan",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "פותח בימי שני בין 12 ל-1 בצהריים",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Canasta Street",
        "houseNumber": "18814",
        "apartment": "",
        "city": "Tarzana, CA",
        "state": "",
        "zip": "91356-4009",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Mr. & Mrs. Faramarz Farzan",
        "street": "18814 Canasta Street",
        "houseNumber": "",
        "apartment": "",
        "city": "Tarzana, CA",
        "state": "",
        "zip": "91356-4009",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3176",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "לונגר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Lunger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ventura Blvd",
        "houseNumber": "13347",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3177",
    "title": "הרה\"ח ר'",
    "firstName": "סם",
    "lastName": "מארק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Mark",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "KirkSide Road",
        "houseNumber": "9355",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-4126",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "310 213-9353",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3178",
    "title": "מר",
    "firstName": "אליאס",
    "lastName": "נאגהי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Mayapple Way",
        "houseNumber": "34",
        "apartment": "",
        "city": "Irvine, CA",
        "state": "",
        "zip": "92612-2714",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "WPD",
        "street": "5201 S Downey Road",
        "houseNumber": "",
        "apartment": "",
        "city": "Vernon, CA",
        "state": "",
        "zip": "90058-3703",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 864-1677",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "email",
        "value": "enaghi@wpd-corp.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3179",
    "title": "הרה\"ח ר'",
    "firstName": "יונתן",
    "lastName": "לעווין",
    "suffix": "הי\"ו",
    "titleEnglish": "Dr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Levin",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Camden Dr",
        "houseNumber": "1205",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-1111",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3180",
    "title": "הרב",
    "firstName": "ברוך",
    "lastName": "גריידון",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Gradon",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Detroit Street",
        "houseNumber": "312",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2531",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3181",
    "title": "מר",
    "firstName": "",
    "lastName": "קשאני",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Kashany",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "הכתובת של העבודה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E Washington Blvd",
        "houseNumber": "775",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90021",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3182",
    "title": "הרה\"ח ר'",
    "firstName": "גרשון",
    "lastName": "שליסעל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "G",
    "lastNameEnglish": "Schlussel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Formosa Ave",
        "houseNumber": "123",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2817",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 937-9273",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3183",
    "title": "הרה\"ח ר'",
    "firstName": "אבישי",
    "lastName": "שרגא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Shraga",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "נשלח בווטסאפ",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3184",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "מיללער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Miller",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Orange Drive",
        "houseNumber": "267",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-3010",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3185",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "רביבו",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Rbibo",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "לבדוק האם זה Tahitian??",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wilshire Blvd",
        "houseNumber": "600",
        "apartment": "Ste 1280",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90017-3265",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3186",
    "title": "הרה\"ח ר'",
    "firstName": "יונתן",
    "lastName": "איסטרין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Istrin",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bluebell Avenue",
        "houseNumber": "5537",
        "apartment": "",
        "city": "Valley Village, CA",
        "state": "",
        "zip": "91607-1909",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3187",
    "title": "הרה\"ח ר'",
    "firstName": "אלי",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "לפני או אחרי השיעור בשערי תפילה בין 10 ל-11:30 בבוקר",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Detroit St",
        "houseNumber": "221",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-3033",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Ecysm Foundation Inc.",
        "street": "221 S Detroit St",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-3033",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3188",
    "title": "הרב",
    "firstName": "רונן",
    "lastName": "בעק",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Beck",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Poinsettia Place",
        "houseNumber": "539",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-1928",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3189",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף מרדכי",
    "lastName": "הערצאג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J M",
    "lastNameEnglish": "Herzog",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "OJC Acc. No. 7177",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Fuller Ave",
        "houseNumber": "344",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2523",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Jh-Rh Joseph Charity Account",
        "street": "344 N Fuller Ave",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2523",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3190",
    "title": "הרה\"ח ר'",
    "firstName": "אלי",
    "lastName": "סלומון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Soloman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "Cong. Khilos yakov לבדוק האם זה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3191",
    "title": "הרה\"ח ר'",
    "firstName": "ראובן",
    "lastName": "גריידון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Gradon",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "מתפלל בעץ חיים (אחרי שחרית)",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Mansfield Ave",
        "houseNumber": "119",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-3020",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 828-8435",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "email",
        "value": "gradoncharity@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3192",
    "title": "מר",
    "firstName": "",
    "lastName": "רובינשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Rubinstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "ידיד של דוב מאיר",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Coldwater Canyon Ave",
        "houseNumber": "6442",
        "apartment": "Ste 216",
        "city": "Valley Glen, CA",
        "state": "",
        "zip": "91606-1137",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Prestige Sourcing Group Llc",
        "street": "6442 Coldwater Canyon Ave, Ste 216",
        "houseNumber": "",
        "apartment": "",
        "city": "Valley Glen, CA",
        "state": "",
        "zip": "91606-1137",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3193",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "ווינטנער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Wintner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "כתובת המשרד",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Whilshire Blvd",
        "houseNumber": "6300",
        "apartment": "Ste 1800",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90048",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Charitable Account Jacob Wintner",
        "street": "6300 Whilshire Blvd, Ste 1800",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90048",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 651-1808",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "323 651-2222",
        "label": "פקס",
        "isPrimary": false
      },
      {
        "type": "email",
        "value": "jake@thearbagroup.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3194",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "סמעדרא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "I",
    "lastNameEnglish": "Smedra",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N June Street",
        "houseNumber": "401",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004-1001",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 243-3888",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3195",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן דוב",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A D",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "מנחה 1:40 בכולל הליטאי, צ'ק ע\"ש San Gabriel Conv center",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Mccaddeen Pl",
        "houseNumber": "401",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90020-4819",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "שטיבלך",
        "description": "San Gabriel Convcenter (מס' שטיבלך: 10)",
        "street": "4032 Wilshire Blvd, Ste 600",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90010-3405",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 936-7592",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3196",
    "title": "הרב",
    "firstName": "שמואל",
    "lastName": "איינהורן",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Einhorn",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "1463",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Hudson Ave",
        "houseNumber": "127",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004-1031",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "שטיבלך",
        "description": "Chinuch Charedi of Califrnia Inc (מס' שטיבלך: 9)",
        "street": "P.O.B. 48497",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90048",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 937-7387",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "323 301-9115",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3197",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "ריבייר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "F J",
    "lastNameEnglish": "Revere",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Orange Drive",
        "houseNumber": "103",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-3014",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Frank J Revere",
        "street": "5042 Wilshire Blvd, Ste 720",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-4305",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3199",
    "title": "הרב",
    "firstName": "יונתן",
    "lastName": "",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "J",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "ביהכ\"נ 'שערי צדק'",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Chandler Blvd",
        "houseNumber": "12800",
        "apartment": "",
        "city": "Valley Village, CA",
        "state": "",
        "zip": "91607-1931",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3200",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "ריטשהיימר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Richeimer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "KirkSide Road",
        "houseNumber": "9430",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-4129",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3201",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "טרייטל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Treitel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Formosa Ave",
        "houseNumber": "143",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 937-8826",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3202",
    "title": "הרה\"ח ר'",
    "firstName": "שלום",
    "lastName": "אשר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Asher",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-09T21:00:00.000Z",
    "notes": "כתובת העסק",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Boyle Ave",
        "houseNumber": "950",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90023-1269",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Shalom B Llc.",
        "street": "950 S Boyle Ave",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90023",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3203",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "צבי",
    "lastName": "בלושטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Bluestein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "חתן ר' מ ז שיינגארטען",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Soncino Place",
        "houseNumber": "10",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-2083",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7323706809",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7323706809",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7323706809",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3205",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "גלוקשטט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Gluckstadt",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "181",
    "fatherInLawLegacyId": "1542",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "37th Street",
        "houseNumber": "1226",
        "apartment": "#E2",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186330977",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186330977",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186330977",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3206",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שאול",
    "lastName": "הכט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Hecht",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "חתן ר' הערשל שטיינבערג",
    "fatherLegacyId": "236",
    "fatherInLawLegacyId": "3178",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "61st Street",
        "houseNumber": "1960",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183312405",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183312405",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183312405",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3207",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יהושע",
    "lastName": "הכט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Hecht",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "236",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 23rd Street",
        "houseNumber": "877",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184355722",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184355722",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184355722",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3208",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שמואל אליעזר",
    "lastName": "טויב",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Taub",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "חתן ר' ל גוטמן",
    "fatherLegacyId": "667",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Dahill Road",
        "houseNumber": "983",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183318282",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7183318282",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7183318282",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3210",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יעקב ברוך",
    "lastName": "לוי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J B",
    "lastNameEnglish": "Lowy",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "2694",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Webster Avenue",
        "houseNumber": "75",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188532184",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188532184",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188532184",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3211",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "לפה",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Lappe",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Drysdale Street",
        "houseNumber": "42",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3214",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "משה שמואל",
    "lastName": "סאורימפער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M S",
    "lastNameEnglish": "Saurymper",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "565",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Twin Oaks Drive",
        "houseNumber": "1103",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7327302266",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7327302266",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7327302266",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3216",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ברוך",
    "lastName": "פעלדמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Feldman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "חתן ר' צבי לפה",
    "fatherLegacyId": "124",
    "fatherInLawLegacyId": "1167",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 5th Street",
        "houseNumber": "312",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3217",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "פעלדמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Feldman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "חתן ר' אלימלך ניימאן",
    "fatherLegacyId": "124",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "McDonald Street",
        "houseNumber": "34",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "10314-1516",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184943194",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184943194",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184943194",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3219",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "פרידע",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Fryde",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "2823",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Broadway Avenue",
        "houseNumber": "38",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-5470",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3220",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שרגא",
    "lastName": "פערלבערגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Perelberger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "460",
    "fatherInLawLegacyId": "1940",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "46th Street",
        "houseNumber": "1630",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3221",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "קאוולער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Kowler",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "חתן ר' עקיבא אורזל",
    "fatherLegacyId": "328",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51st Street",
        "houseNumber": "1351",
        "apartment": "2nd Floor",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7189728273",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7189728273",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7189728273",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3222",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "קראוס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Kraus",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "חתן ר' עקיבא אורזל",
    "fatherLegacyId": "335",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "56th Street",
        "houseNumber": "1441",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184356051",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7184356051",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7184356051",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3223",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "ראנד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Rand",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "500",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "55th Street",
        "houseNumber": "1531",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188710007",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7188710007",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7188710007",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3224",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "שמחה בונם",
    "lastName": "שעכטער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Schachter",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-12T21:00:00.000Z",
    "notes": "בן ר' שלום חיים, חתן ר' חיים מאיר מרגלית",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Dorothy Street",
        "houseNumber": "29",
        "apartment": "",
        "city": "Staten Island, NY",
        "state": "",
        "zip": "1314-2057",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186981001",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186981001",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186981001",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3225",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "יעקב יוסף",
    "lastName": "יונג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Jung",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-15T21:00:00.000Z",
    "notes": "לברר פרטים אצל א ד יונג",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3226",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "יעקובוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Jacobovitch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Imperial Ct",
        "houseNumber": "212",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-2140",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3227",
    "title": "הרה\"ח ר'",
    "firstName": "יונתן",
    "lastName": "מאיר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Mayer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3228",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "לובינסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Lubinski",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3229",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "ראזענפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Rosenfeid",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "6 Shemen Court",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3230",
    "title": "הרה\"ח ר'",
    "firstName": "שמעון",
    "lastName": "הילדסהיים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Hildesheim",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3232",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם אליעזר",
    "lastName": "אורבאך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A A",
    "lastNameEnglish": "Urbach",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3233",
    "title": "הרה\"ח ר'",
    "firstName": "בנימין",
    "lastName": "קופולוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Kopolovits",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "251 Elm street",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3237",
    "title": "הרה\"ח ר'",
    "firstName": "ברוך",
    "lastName": "ז'לוטי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Zlati",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "8 Denmark Lane",
        "houseNumber": "",
        "apartment": "",
        "city": "Jackson, NJ",
        "state": "",
        "zip": "08527",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3238",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "געשטעטנער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Gestadtner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "1 Denmark Lane",
        "houseNumber": "",
        "apartment": "",
        "city": "Jackson, NJ",
        "state": "",
        "zip": "08527",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3239",
    "title": "הרה\"ח ר'",
    "firstName": "שרגא",
    "lastName": "יעקובוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Sh",
    "lastNameEnglish": "Jacobovitch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "131 Arlington Ave",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3241",
    "title": "הרה\"ח ר'",
    "firstName": "דוב",
    "lastName": "סוכוצ'בסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Suchochevsky",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "2 Denmark Lane",
        "houseNumber": "",
        "apartment": "",
        "city": "Jackson, NJ",
        "state": "",
        "zip": "08527",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3242",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "המר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Hammer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "40 Clearstream Rd",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3243",
    "title": "הרה\"ח ר'",
    "firstName": "נפתלי",
    "lastName": "קונסטלינגר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Constlinger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-21T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "212 2nd St Ste 304",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-3463",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3245",
    "title": "הרה\"ח ר'",
    "firstName": "שמעון",
    "lastName": "קוטנר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Sh",
    "lastNameEnglish": "Kutner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-22T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3247",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "זיידלו",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Zeidlo",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-22T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3248",
    "title": "הרה\"ח ר'",
    "firstName": "פישל",
    "lastName": "פריד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Fried",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-22T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3249",
    "title": "הרה\"ח ר'",
    "firstName": "נפתלי",
    "lastName": "גוטסמן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Gottesman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-22T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3251",
    "title": "הרה\"ח ר'",
    "firstName": "געציל",
    "lastName": "טישלר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "G",
    "lastNameEnglish": "Tischler",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3252",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "ביאליסטוצקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Ch",
    "lastNameEnglish": "Bialistotzki",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3254",
    "title": "הרה\"ח ר'",
    "firstName": "יואל",
    "lastName": "ווערצבערגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Wertzberger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3255",
    "title": "הרב",
    "firstName": "אריה",
    "lastName": "אדלר",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Adler",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Goldcrest Dr",
        "houseNumber": "8",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-4944",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "abingo@juno.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3256",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל",
    "lastName": "גראסמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Grossman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "1211 Monmouth avenue",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3257",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "האלבערשטאם",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Halberstam",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3259",
    "title": "הרה\"ח ר'",
    "firstName": "ל ד",
    "lastName": "קלעצקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Klatskyi",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3261",
    "title": "הרה\"ח ר'",
    "firstName": "ברוך יחיאל",
    "lastName": "שרייבער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B Y",
    "lastNameEnglish": "Schreiber",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "408 Third Street",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3264",
    "title": "הרה\"ח ר'",
    "firstName": "איטשע",
    "lastName": "רוזנבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "I",
    "lastNameEnglish": "Rosenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3270",
    "title": "הרה\"ח ר'",
    "firstName": "עקיבא בנימין",
    "lastName": "מיטלמן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Mittelman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-08-30T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "55th Street",
        "houseNumber": "",
        "apartment": "1458",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "akivamittelman@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3271",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "פיללער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Piller",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-09-05T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "2753",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Park Ave",
        "houseNumber": "754",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7325698156",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3272",
    "title": "הרה\"ח ר'",
    "firstName": "מנחם זאב",
    "lastName": "סגל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M Z",
    "lastNameEnglish": "Segal",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-09-05T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3273",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה אריה",
    "lastName": "סגל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y A",
    "lastNameEnglish": "Segal",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-09-05T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3274",
    "title": "הרה\"ח ר'",
    "firstName": "חיים גד",
    "lastName": "יאלאס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Ch G",
    "lastNameEnglish": "Jalas",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-09-10T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "22 Webster Ave",
        "houseNumber": "apt 1",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3275",
    "title": "תלמידנו הרה\"ח ר'",
    "firstName": "אליהו גרשון",
    "lastName": "פרייליך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E G",
    "lastNameEnglish": "Freilich",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-09-10T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "140",
    "fatherInLawLegacyId": "2720",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "44th Street",
        "houseNumber": "1254",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3277",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "ברודז'ק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Brodjik",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2023-10-15T21:00:00.000Z",
    "notes": "משרד איחוד - 001-718-435-8989",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "56th Street",
        "houseNumber": "1619",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1830",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "718 259-1013",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "917 239-0405",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3317",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "עקשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Eckstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-01T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": "2735",
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "19th Avenue",
        "houseNumber": "4801",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "ecksteinb962@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3318",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "עג'מי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Adjmi",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "7th Ave, 4th fl",
        "houseNumber": "463",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "10018",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "The Jack Adjmi Family Foundation #5",
        "street": "463 7th Ave, 4th fl",
        "houseNumber": "",
        "apartment": "",
        "city": "New York, NY",
        "state": "",
        "zip": "10018",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "212 629-9600#612",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3319",
    "title": "הרה\"ח ר'",
    "firstName": "ריצ'רד",
    "lastName": "רוז",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Roz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-02T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3320",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "געלבטוך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Gelbtuch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-04T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "59th Street",
        "houseNumber": "2115",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-2503",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3321",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-04T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "62nd Street",
        "houseNumber": "1866",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3323",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל ישכר דוב",
    "lastName": "קארפונקל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Karfunkel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Martin Ln",
        "houseNumber": "41",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3324",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "דייץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y & M",
    "lastNameEnglish": "Deitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ocean Park Way",
        "houseNumber": "1486",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-6453",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Jeanette Graus Wilamowsky Trust",
        "street": "1486 Ocean ParkWay",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-6453",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7186276120",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186276120",
        "label": "טלפון נוסף",
        "isPrimary": false
      },
      {
        "type": "phone",
        "value": "7186276120",
        "label": "פקס",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3325",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק מאיר",
    "lastName": "שמידט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Schmidt",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-05T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Almont Rd",
        "houseNumber": "711",
        "apartment": "",
        "city": "Far Rockaway, NY",
        "state": "",
        "zip": "11691",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3326",
    "title": "הרה\"ח ר'",
    "firstName": "קלמן מאיר",
    "lastName": "לאנדא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "K L",
    "lastNameEnglish": "Landau",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "KL Cooling and Heating",
        "street": "5308 13th Ave, Suite 314",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3327",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "מוזסון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Moseson",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-06T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "14th Street",
        "houseNumber": "201",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7329010095",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3328",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "טייטלבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Teitelbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-07T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Whispering Pines Ln",
        "houseNumber": "77",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7329619291",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3329",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם יחזקאל",
    "lastName": "מאירוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A Y",
    "lastNameEnglish": "Mairovits",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-07T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Glen Ave S",
        "houseNumber": "157",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7329016415",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3330",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "כהן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Cohen",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "The Brothers Ashkenazi Foundation Inc",
        "street": "1299 Main St",
        "houseNumber": "",
        "apartment": "",
        "city": "Rahwy, NJ",
        "state": "",
        "zip": "07065-0901",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3331",
    "title": "הרה\"ח ר'",
    "firstName": "יששכר",
    "lastName": "שטיינהארטער",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Steinharter",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Pine St",
        "houseNumber": "185",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Gutman Family Foundation",
        "street": "3605 Menlo Dr",
        "houseNumber": "",
        "apartment": "",
        "city": "Baltimore, MD",
        "state": "",
        "zip": "21215-3617",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3332",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "פישער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Fisher",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Blue Jay Way",
        "houseNumber": "13",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Sterling Property and Casualty",
        "street": "20 4th St, Suite 211",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3333",
    "title": "הרה\"ח ר'",
    "firstName": "טובי'",
    "lastName": "רוזנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "T",
    "lastNameEnglish": "Rosenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-08T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3334",
    "title": "הרה\"ח ר'",
    "firstName": "העשי",
    "lastName": "פארהאנד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Vorhand",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-08T22:00:00.000Z",
    "notes": "Superior Promotional Bags",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Arosa Hl",
        "houseNumber": "41",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "087017-2133",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7323705736",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "email",
        "value": "alex@vorhand.com",
        "label": "אימייל בבית",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3335",
    "title": "הרה\"ח ר'",
    "firstName": "בנימין",
    "lastName": "פערל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Perl",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-11T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Avenue R",
        "houseNumber": "2621",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11229",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3336",
    "title": "הרה\"ח ר'",
    "firstName": "גבריאל",
    "lastName": "שוואב",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "G",
    "lastNameEnglish": "Schwab",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-11T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "26th St",
        "houseNumber": "1459",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210-5232",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3337",
    "title": "הרב",
    "firstName": "יהושע",
    "lastName": "פרוינדליך",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Freundlich",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-11T22:00:00.000Z",
    "notes": "כתובת בית הכנסת",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Broadway",
        "houseNumber": "390",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Congregation Beth Sholom",
        "street": "390 Broadway",
        "houseNumber": "",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3338",
    "title": "הרה\"ח ר'",
    "firstName": "דוב",
    "lastName": "פרקל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Perkal",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-11T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bernard Ave",
        "houseNumber": "633",
        "apartment": "",
        "city": "Woodmere, NY",
        "state": "",
        "zip": "11598",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3339",
    "title": "הרה\"ח ר'",
    "firstName": "זאב אהרן",
    "lastName": "סלמון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z A",
    "lastNameEnglish": "Salomon",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Rugby Road",
        "houseNumber": "370",
        "apartment": "",
        "city": "Cedarhurst, NY",
        "state": "",
        "zip": "11516",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3340",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "ריעדער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Rieder",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "48th St",
        "houseNumber": "1677",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "2011 ER IRR TRUST",
        "street": "1677 48th St",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "112014",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3341",
    "title": "הרה\"ח ר'",
    "firstName": "נחום",
    "lastName": "צאנזער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Szanzer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-12T22:00:00.000Z",
    "notes": "President Shul - ב-5:30 אחה\"צ",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ford Ave",
        "houseNumber": "25",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-5660",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "szanzer@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3342",
    "title": "הרה\"ח ר'",
    "firstName": "הלל",
    "lastName": "מערמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "H",
    "lastNameEnglish": "Moerman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Juniper Cir E",
        "houseNumber": "240",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "hillel.moerman@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3345",
    "title": "הרה\"ח ר'",
    "firstName": "חייים צבי",
    "lastName": "ווערצבערגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "C Z",
    "lastNameEnglish": "Wertzberger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "1081",
        "apartment": "",
        "city": "",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "abbyntzvi@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3346",
    "title": "הרה\"ח ר'",
    "firstName": "זאב",
    "lastName": "רעטעק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Retek",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-12T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1684",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7184381402",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3347",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "ליבערמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Liberman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-13T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3348",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "שרייבער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Schreiber",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-13T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 10th St",
        "houseNumber": "1239",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3349",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "ראקאבסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Rokowsky",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-13T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brick, NJ",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Yitzchok Rokowsky Family Fund",
        "street": "Po Box 1030",
        "houseNumber": "",
        "apartment": "",
        "city": "Brick, NJ",
        "state": "",
        "zip": "08723",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3350",
    "title": "הרה\"ח ר'",
    "firstName": "בנימין",
    "lastName": "פשרופער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Pashrofer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-14T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "53rd Street",
        "houseNumber": "1928",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204-1743",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3351",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "אייזנשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "I",
    "lastNameEnglish": "Eisenstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-14T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "40th Street",
        "houseNumber": "1418",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11218",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3352",
    "title": "הרה\"ח ר'",
    "firstName": "שרגא",
    "lastName": "לוי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Levy",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-14T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3353",
    "title": "הרה\"ח ר'",
    "firstName": "חנוך העניך",
    "lastName": "קורניק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "H",
    "lastNameEnglish": "Kurnik",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-14T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "61st Street",
        "houseNumber": "1851",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7188371013",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "7186374155",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3354",
    "title": "הרה\"ח ר'",
    "firstName": "חיים צבי",
    "lastName": "פינקוס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "H C",
    "lastNameEnglish": "Pincus",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-14T22:00:00.000Z",
    "notes": "בחדר הפנימי בחנות יודאיקה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Coney Island Avenue",
        "houseNumber": "1664",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3355",
    "title": "הרה\"ח ר'",
    "firstName": "שמעון צבי",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Dr.",
    "firstNameEnglish": "S H",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-14T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 27th Street",
        "houseNumber": "1382",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210-5307",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Dr. Simon H. Friedman",
        "street": "1636 E 14th Streeet",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11229-1100",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183392300",
        "label": "טלפון נוסף",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3356",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "כץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M M",
    "lastNameEnglish": "Katz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-14T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "52nd Street",
        "houseNumber": "1972",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3357",
    "title": "הרה\"ח ר'",
    "firstName": "יואל",
    "lastName": "פליישער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Fleischer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-15T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Claver Rd",
        "houseNumber": "2554",
        "apartment": "",
        "city": "University Heights, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3358",
    "title": "הרה\"ח ר'",
    "firstName": "עצמון",
    "lastName": "רוזן",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Rozen",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-15T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Blanche Ave",
        "houseNumber": "3426",
        "apartment": "",
        "city": "Cleveland Hts, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3359",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "מלצמכר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Malcmacher",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-15T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "University Parkway",
        "houseNumber": "4451",
        "apartment": "",
        "city": "Cleveland, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3360",
    "title": "הרה\"ח ר'",
    "firstName": "מנחם",
    "lastName": "שפירא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Schapira",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-18T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3361",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "זילברברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Zilberberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-18T22:00:00.000Z",
    "notes": "אח של אברהם בנימין מחיפה, אחיין של ש. גלוזמן",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ave J",
        "houseNumber": "2716",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "7183382290",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3363",
    "title": "הרה\"ח ר'",
    "firstName": "גבריאל",
    "lastName": "ספטון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "G",
    "lastNameEnglish": "Septon",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-18T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "University Parkway",
        "houseNumber": "4420",
        "apartment": "",
        "city": "University Heights, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "2162624700",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3365",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב זעליג",
    "lastName": "ניסנבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Nisenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-18T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bainbridge Rd",
        "houseNumber": "3662",
        "apartment": "",
        "city": "Cleveland Hts, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3366",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב יהודה",
    "lastName": "גלאטצער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Glatzer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-18T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Milton Rd",
        "houseNumber": "2584",
        "apartment": "",
        "city": "Cleveland, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3367",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "קויפמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Koyfman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-18T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Beachwood Blvd",
        "houseNumber": "2424",
        "apartment": "",
        "city": "Beachwood, OH",
        "state": "",
        "zip": "44122-1547",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3368",
    "title": "הרה\"ח ר'",
    "firstName": "מיכאל",
    "lastName": "קוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M J",
    "lastNameEnglish": "Covitch",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-18T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Greenlawn Ave",
        "houseNumber": "23103",
        "apartment": "",
        "city": "Beachwood, OH",
        "state": "",
        "zip": "44122",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "michael j covitch trust 12-2016",
        "street": "23103 Greenlawn Ave",
        "houseNumber": "",
        "apartment": "",
        "city": "Beachwood, OH",
        "state": "",
        "zip": "44122",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3369",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "שבת",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A E",
    "lastNameEnglish": "Schabes",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-18T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Brentwood Rd",
        "houseNumber": "2459",
        "apartment": "",
        "city": "Beachwood, OH",
        "state": "",
        "zip": "44122",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3370",
    "title": "הרה\"ח ר'",
    "firstName": "מנחם",
    "lastName": "טעננבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M2435",
    "lastNameEnglish": "Tenenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-18T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Elmdale Rd",
        "houseNumber": "2435",
        "apartment": "",
        "city": "University Heights, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3371",
    "title": "הרה\"ח ר'",
    "firstName": "מרדכי",
    "lastName": "ליפטון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M F",
    "lastNameEnglish": "Lipton",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-19T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "University Parkway",
        "houseNumber": "4431",
        "apartment": "",
        "city": "Cleveland Hts, OH",
        "state": "",
        "zip": "44118-3926",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3372",
    "title": "הרה\"ח ר'",
    "firstName": "שמעון",
    "lastName": "וויינער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Weiner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-19T22:00:00.000Z",
    "notes": "כתובת העסק",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Mercantile Rd",
        "houseNumber": "23945",
        "apartment": "",
        "city": "Beachwood, OH",
        "state": "",
        "zip": "44122-5924",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Basic, Swift & Determined Inc.",
        "street": "23945 Mercantile Rd, Unit H",
        "houseNumber": "",
        "apartment": "",
        "city": "Beachwood, OH",
        "state": "",
        "zip": "44122-5924",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "simon@medcareproducts.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3373",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "ברקוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Berkowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-19T22:00:00.000Z",
    "notes": "כתובת העסק",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Taylor Rd",
        "houseNumber": "1850",
        "apartment": "",
        "city": "Cleveland Hts, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Davis Caterers, Inc.",
        "street": "1850 Taylor Rd",
        "houseNumber": "",
        "apartment": "",
        "city": "Cleveland Hts, OH",
        "state": "",
        "zip": "44118",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3374",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "שווארטץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Schwartz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-19T22:00:00.000Z",
    "notes": "כתובת העסק",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Mayfield Rd",
        "houseNumber": "5109",
        "apartment": "",
        "city": "Cleveland, OH",
        "state": "",
        "zip": "44124",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Schwartz Furs Inc.",
        "street": "5109 Mayfield Rd",
        "houseNumber": "",
        "apartment": "",
        "city": "Cleveland, OH",
        "state": "",
        "zip": "44124",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "2166919090",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3376",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "יוזפא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Jospeh",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Nutwood Ln",
        "houseNumber": "28570",
        "apartment": "",
        "city": "Wickliffe,OH",
        "state": "",
        "zip": "44092",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "andrew@getyrlaw.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3377",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם שמאי",
    "lastName": "מייסטל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A S",
    "lastNameEnglish": "Meystel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-20T22:00:00.000Z",
    "notes": "מתפלל בבוקר (7:00) בזכרון אשר זעליג",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Milton Rd",
        "houseNumber": "2346",
        "apartment": "",
        "city": "University Heights, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "asmeystel@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3378",
    "title": "הרב",
    "firstName": "שמואל נפתלי",
    "lastName": "בורשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "S N",
    "lastNameEnglish": "Burnstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-20T22:00:00.000Z",
    "notes": "כתובת ביהכנ\"ס",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Green Rd",
        "houseNumber": "2463",
        "apartment": "",
        "city": "Beachwood, OH",
        "state": "",
        "zip": "44122",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Young Israel of Greater Cleveland",
        "street": "2463 S Green Rd",
        "houseNumber": "",
        "apartment": "",
        "city": "Beachwood, OH",
        "state": "",
        "zip": "44122",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3379",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "זאנענשיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Sonnenschein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Claver Rd",
        "houseNumber": "2525",
        "apartment": "",
        "city": "University Heights, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3380",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "לויטנסקי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Levitansky",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Shannon Rd",
        "houseNumber": "3576",
        "apartment": "",
        "city": "Cleveland Hts, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3381",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "פולאק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Pollak",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-20T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Shannon Rd",
        "houseNumber": "3673",
        "apartment": "",
        "city": "Cleveland Hts, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3382",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "אליאס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Elias",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "University Parkway",
        "houseNumber": "4381",
        "apartment": "",
        "city": "University Heights, OH",
        "state": "",
        "zip": "44118-3924",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3383",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "פולאק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Pollak",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Brentwood Rd",
        "houseNumber": "2467",
        "apartment": "",
        "city": "Beachwood, OH",
        "state": "",
        "zip": "44122",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3384",
    "title": "הרה\"ח ר'",
    "firstName": "מתתיהו",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Claver Rd",
        "houseNumber": "2519",
        "apartment": "",
        "city": "University Heights, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3385",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "מרגליות",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Margulies",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Claver Rd",
        "houseNumber": "2548",
        "apartment": "",
        "city": "University Heights, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3386",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "פרידמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Friedman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Shannon Rd",
        "houseNumber": "3708",
        "apartment": "",
        "city": "Cleveland Hts, OH",
        "state": "",
        "zip": "44118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3387",
    "title": "הרה\"ח ר'",
    "firstName": "סקוט",
    "lastName": "פיטרס",
    "suffix": "הי\"ו",
    "titleEnglish": "Dr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Peters",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-21T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Campus Rd",
        "houseNumber": "2201",
        "apartment": "",
        "city": "Beachwood, OH",
        "state": "",
        "zip": "44122",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3388",
    "title": "הרה\"ח ר'",
    "firstName": "בערל",
    "lastName": "הכט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Perri",
    "lastNameEnglish": "Hecht",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-21T22:00:00.000Z",
    "notes": "לוודא שהכתובת נכונה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 21st St",
        "houseNumber": "995",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3389",
    "title": "הרה\"ח ר'",
    "firstName": "יהושע",
    "lastName": "נוסבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Nussbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-23T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Avenue J",
        "houseNumber": "202",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230-1112",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "GO FORWARD SERVICES LLC",
        "street": "1259 51st St",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "3474613656",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3390",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "וויינשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Weinstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-26T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Washburn St",
        "houseNumber": "741",
        "apartment": "",
        "city": "Teaneck, NJ",
        "state": "",
        "zip": "07666-2244",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3391",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "שייוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Shayowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-26T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Regent St",
        "houseNumber": "20",
        "apartment": "",
        "city": "Bergenfield, NJ",
        "state": "",
        "zip": "07621",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3392",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "גוטמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Yankel",
    "lastNameEnglish": "Gutman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-27T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "51th St",
        "houseNumber": "1833",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11204",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "3474951299",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3394",
    "title": "הרב",
    "firstName": "מיכאל",
    "lastName": "טאובס",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "Michael",
    "lastNameEnglish": "Taubes",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-01-27T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Jefferson St",
        "houseNumber": "1477",
        "apartment": "",
        "city": "Teaneck, NJ",
        "state": "",
        "zip": "07666-2951",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Congregation zichron Mordechai Inc",
        "street": "268 W Englewood Ave",
        "houseNumber": "",
        "apartment": "",
        "city": "Teaneck, NJ",
        "state": "",
        "zip": "07666",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "2018377696",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3395",
    "title": "הרה\"ח ר'",
    "firstName": "דוב",
    "lastName": "ג'ייקובס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Jacobs",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-03T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "1550",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Highland Ave",
        "houseNumber": "113",
        "apartment": "",
        "city": "",
        "state": "",
        "zip": "90036-3028",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 935-3585",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3396",
    "title": "הרה\"ח ר'",
    "firstName": "אבישי",
    "lastName": "סבג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Sabag",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Sepulveda Blvd",
        "houseNumber": "3415",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90034-6060",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "310 922-4204",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3397",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "שפיגל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Spiegel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bluebell Avenue",
        "houseNumber": "5049",
        "apartment": "",
        "city": "Valley Village, CA",
        "state": "",
        "zip": "91607-2937",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3399",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "בלינדער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "R",
    "lastNameEnglish": "Blinder",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Linnet St",
        "houseNumber": "18612",
        "apartment": "",
        "city": "Tarzana, CA",
        "state": "",
        "zip": "91356-4118",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "blinder6@sbcglobal.net",
        "label": "אימייל בבית",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3400",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "בלאנדער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Blonder",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-07T21:00:00.000Z",
    "notes": "ידיד של אברהם גולדקנופף",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Mansfield Ave",
        "houseNumber": "429",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2621",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 934-2890",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "213 923-1194",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3401",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "בוטניק",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Botnick",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Detroit St",
        "houseNumber": "342",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2531",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3402",
    "title": "הרב",
    "firstName": "",
    "lastName": "גבאי",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "",
    "lastNameEnglish": "Gabbai",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-07T21:00:00.000Z",
    "notes": "כתובת ביהכנ\"ס, צריך לתאם מגבית",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Sylvan Street",
        "houseNumber": "12405",
        "apartment": "",
        "city": "North Hollywood, CA",
        "state": "",
        "zip": "91606-3110",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3403",
    "title": "הר\"ר",
    "firstName": "",
    "lastName": "גפט",
    "suffix": "הי\"ו",
    "titleEnglish": "Dr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Geft",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bedford Dr",
        "houseNumber": "1240",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-1015",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3404",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "לאזאר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Lazar",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-14T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "P.o.b. 48709",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90048",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3405",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "גאטעסמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Gottesman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-14T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Mansfield",
        "houseNumber": "423",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3406",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "שאדוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Shadovitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-14T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Fuller Ave",
        "houseNumber": "626",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3407",
    "title": "הרה\"ח ר'",
    "firstName": "צבי",
    "lastName": "ברענער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Brenner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-14T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N June St",
        "houseNumber": "424",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004-1002",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3408",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "שטערן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Stern",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-14T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Congregation Etz Chaim of Hancock Park",
        "street": "303 S Highland Ave",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3409",
    "title": "הרה\"ח ר'",
    "firstName": "חנוך",
    "lastName": "קימעלמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Kimmelman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-14T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Fuller Ave",
        "houseNumber": "439",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3410",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "מאנעש",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Manesh",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-14T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Brighton Way",
        "houseNumber": "9612",
        "apartment": "",
        "city": "Beverly Hills, CA",
        "state": "",
        "zip": "90210",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Manesh Inc",
        "street": "9612 Brighton Way",
        "houseNumber": "",
        "apartment": "",
        "city": "Beverly Hills, CA",
        "state": "",
        "zip": "90210",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "310 550-0504",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3411",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "פיירסטון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Firestone",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-15T21:00:00.000Z",
    "notes": "כתובת משרד, קומה 7 חדר 740, מזכירה ליאה ווטרסון",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Beverly Drive",
        "houseNumber": "1180",
        "apartment": "Ste 740",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90035-1153",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3412",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב ישראל",
    "lastName": "פעלדמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Feldman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-15T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Mansfield Ave",
        "houseNumber": "122",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-3019",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3413",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "יאריס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "G",
    "lastNameEnglish": "Yaris",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-15T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3414",
    "title": "הרה\"ח ר'",
    "firstName": "דניאל",
    "lastName": "קרוימבאך",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Krombach",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-15T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "Pico",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3415",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "רוטנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Rottenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-15T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3416",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "ארלאף",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Orloff",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-15T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Detroit St",
        "houseNumber": "317",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3417",
    "title": "הרב",
    "firstName": "נפתלי",
    "lastName": "רובין",
    "suffix": "שליט\"א",
    "titleEnglish": "Rabbi & Mrs.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Rubin",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-15T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Orange Dr",
        "houseNumber": "354",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3418",
    "title": "הרה\"ח ר'",
    "firstName": "אלישע",
    "lastName": "ווייזנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Wiesenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Rhodes Ave",
        "houseNumber": "5839",
        "apartment": "",
        "city": "North Hollywood, CA",
        "state": "",
        "zip": "91607",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "efratwiesenberg@gmail.com",
        "label": "אימייל בבית",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3419",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק",
    "lastName": "וויינשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "I",
    "lastNameEnglish": "Weinstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-18T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Raymer St",
        "houseNumber": "15102",
        "apartment": "",
        "city": "Van Nuys, CA",
        "state": "",
        "zip": "91405",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Mr. Itzcik Weinstein",
        "street": "15102 Raymer St",
        "houseNumber": "",
        "apartment": "",
        "city": "Van Nuys, CA",
        "state": "",
        "zip": "91405",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3420",
    "title": "הרה\"ח ר'",
    "firstName": "יהושע",
    "lastName": "קלעוואן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Klavan",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-18T21:00:00.000Z",
    "notes": "בביהכנ\"ס אחרי שחרית",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Hudson Ave",
        "houseNumber": "144",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 937-1557",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3421",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "מאלער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Maller",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-18T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Citrus Ave",
        "houseNumber": "307",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 931-9420",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3422",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה יהודה",
    "lastName": "רעכניץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S Y",
    "lastNameEnglish": "Rechnitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-18T21:00:00.000Z",
    "notes": "לדבר עם ר' בעריש גאלדענבערג אחרי הנץ בשערי תפילה",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Beverly Blvd",
        "houseNumber": "7223",
        "apartment": "Ste 205",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Shlomo & Tamar Rechnitz",
        "street": "5478 Wilshire Blvd, Ste 304",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3423",
    "title": "הרה\"ח ר'",
    "firstName": "דניאל מאיר",
    "lastName": "היימן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Heyman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-20T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Highland Ave",
        "houseNumber": "815",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 413-2713",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3424",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "גולדנר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Goldner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-20T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N June St",
        "houseNumber": "312",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90004-1042",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Goldner Family Foundation Inc.",
        "street": "5455 Wilshire Blvd, Ste 800",
        "houseNumber": "",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 939-6391",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "phone",
        "value": "323 620-4000",
        "label": "נייד",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3425",
    "title": "הרה\"ח ר'",
    "firstName": "נפתלי",
    "lastName": "בורשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Burnstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-24T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Citrus Ave",
        "houseNumber": "300",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 822-6600",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3426",
    "title": "הרה\"ח ר'",
    "firstName": "מאיר",
    "lastName": "מאי",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "M H",
    "lastNameEnglish": "May",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-24T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Highland Ave",
        "houseNumber": "353",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-3024",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 934-1282",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3427",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "האגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Hager",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-25T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Citrus Ave",
        "houseNumber": "147",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3428",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "שדוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Shadovitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-25T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Fuller Ave",
        "houseNumber": "626",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3429",
    "title": "הרה\"ח ר'",
    "firstName": "צבי",
    "lastName": "ריטבא",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z D",
    "lastNameEnglish": "Ritvo",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-26T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Formosa Ave",
        "houseNumber": "209",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "323 938-9817",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3430",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "הורוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi & Mrs.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Horowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-26T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Wells Dr",
        "houseNumber": "18415",
        "apartment": "",
        "city": "Tarzana, CA",
        "state": "",
        "zip": "91356",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "818 793-3805",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3431",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "סעדה",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Saada",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-26T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Highland Ave",
        "houseNumber": "325",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "abrahamsaada@yahoo.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3432",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "סטול",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D M",
    "lastNameEnglish": "Stoll",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-26T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Las Palmas Ave",
        "houseNumber": "422",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90020",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Dr. and David m Stoll",
        "street": "93759375 Wilshire Blvd, Ste 418",
        "houseNumber": "",
        "apartment": "",
        "city": "Beverly Hills, CA",
        "state": "",
        "zip": "90212",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3433",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "מנלו",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "F",
    "lastNameEnglish": "Menlo",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-26T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Mccaddeen Pl",
        "houseNumber": "427",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90020",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3434",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם חיים",
    "lastName": "מאיר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Mayer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-05-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "1659",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Mansfield Ave",
        "houseNumber": "121",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036",
        "zip2": "",
        "neighborhood": "La Brea",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3435",
    "title": "הרה\"ח ר'",
    "firstName": "אפרים",
    "lastName": "קליין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "3436",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Woodland Pl",
        "houseNumber": "11",
        "apartment": "",
        "city": "Airmont, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "845 667-9077",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3436",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "קליין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-07T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Locust Hollow Dr",
        "houseNumber": "4",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-2407",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "917 573-7123",
        "label": "נייד",
        "isPrimary": true
      },
      {
        "type": "email",
        "value": "mechelksd@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3437",
    "title": "הרה\"ח ר'",
    "firstName": "בעריש",
    "lastName": "חסקלסון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Chaskelson",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-08T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Laura Dr",
        "houseNumber": "58",
        "apartment": "",
        "city": "Airmont, NY",
        "state": "",
        "zip": "10952-3822",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "347 678-0175",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3438",
    "title": "הרב",
    "firstName": "עמיחי",
    "lastName": "טופורוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi & Mrs.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Toporovitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-08T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Dover Ct",
        "houseNumber": "42",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "845 422-7424",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3439",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק מאיר",
    "lastName": "אדלר",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi & Mrs.",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Adler",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-08T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": "3255",
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "W Maple Ave",
        "houseNumber": "98",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-2429",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Congregation Casdei Bracha Inc.",
        "street": "P.O.B. 476",
        "houseNumber": "",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-0318",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "845 596-3284",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3440",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "הורוויץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Horowicz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Overhill Rd",
        "houseNumber": "14",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-2529",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "917 842-5462",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3441",
    "title": "הרה\"ח ר'",
    "firstName": "פנחס",
    "lastName": "רובינפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "P",
    "lastNameEnglish": "Rubinfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Glenmere Ct",
        "houseNumber": "12",
        "apartment": "",
        "city": "Airmont, NY",
        "state": "",
        "zip": "10952-3401",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "347 228-8992",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3442",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף צבי",
    "lastName": "רובינפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Rubinfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Laura Dr",
        "houseNumber": "23",
        "apartment": "",
        "city": "Airmont, NY",
        "state": "",
        "zip": "10952-3403",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "347 337-2123",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3443",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל דוב",
    "lastName": "הארטמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y D",
    "lastNameEnglish": "Hartman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Hilltop Pl",
        "houseNumber": "26",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-2810",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3444",
    "title": "",
    "firstName": "אדמו\"ר",
    "lastName": "סקווער",
    "suffix": "שליט\"א",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-09T21:00:00.000Z",
    "notes": "ר' בעריש אייזנברג 845-596-8888",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Jefferson Ave",
        "houseNumber": "10",
        "apartment": "",
        "city": "Spring Valley, NY",
        "state": "",
        "zip": "10977",
        "zip2": "",
        "neighborhood": "New Square",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "845 354-6176",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3445",
    "title": "הרה\"ח ר'",
    "firstName": "בנימין",
    "lastName": "רובינפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "B",
    "lastNameEnglish": "Rubinfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Hilltop Pl",
        "houseNumber": "31",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3446",
    "title": "הרה\"ח ר'",
    "firstName": "אייזיק",
    "lastName": "מאיער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "I",
    "lastNameEnglish": "Mayer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-09T21:00:00.000Z",
    "notes": "ידיד של ר' סיני דייטש, מחותן של הרב רובין מל.א",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cortland Rd",
        "houseNumber": "8",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-1623",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "917 589-1623",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3447",
    "title": "מר",
    "firstName": "",
    "lastName": "טאבורחי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Taborachi",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Beverly Drive",
        "houseNumber": "324",
        "apartment": "",
        "city": "Beverly Hills, CA",
        "state": "",
        "zip": "90212",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Vineland View LLC",
        "street": "324 S Beverly Drive, #1426",
        "houseNumber": "",
        "apartment": "",
        "city": "Beverly Hills, CA",
        "state": "",
        "zip": "90212",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3448",
    "title": "הרה\"ח ר'",
    "firstName": "שלום זאב",
    "lastName": "כץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "S Z",
    "lastNameEnglish": "Katz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Fuller Ave",
        "houseNumber": "107",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2809",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3449",
    "title": "הרה\"ח ר'",
    "firstName": "שמחה בונם",
    "lastName": "הרשברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "S B",
    "lastNameEnglish": "Herszberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-09T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Hilda Ln",
        "houseNumber": "6",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-2917",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "914 450-5978",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3450",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל דוד",
    "lastName": "שלעזינגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "Y D",
    "lastNameEnglish": "Schlezinger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-06-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Nelson Rd",
        "houseNumber": "7",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Kahal Shaarei Tefillah",
        "street": "6 Nelson Rd",
        "houseNumber": "",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3451",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "ליינער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Leiner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "14th Avenue",
        "houseNumber": "5516",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3453",
    "title": "הרה\"ח ר'",
    "firstName": "שלמה",
    "lastName": "קליין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Lakeview Dr",
        "houseNumber": "761",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3455",
    "title": "הרה\"ח ר'",
    "firstName": "שרגא",
    "lastName": "שור",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Schorr",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Walden Ave",
        "houseNumber": "1460",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1547",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3456",
    "title": "הרה\"ח ר'",
    "firstName": "שמואל",
    "lastName": "פאגעל",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Fogel",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cabinfield Cir",
        "houseNumber": "20",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "732 415-8199",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "email",
        "value": "sfogel@mfandco.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3458",
    "title": "הרה\"ח ר'",
    "firstName": "חיים",
    "lastName": "לאקס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "C",
    "lastNameEnglish": "Lax",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3459",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "דיער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Dear",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Sealy Drive",
        "houseNumber": "7",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Dear Drugs Inc.",
        "street": "490 Ave P",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11223",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "718 998-8000",
        "label": "טלפון נוסף",
        "isPrimary": false
      }
    ]
  },
  {
    "legacyId": "3460",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "ליכטנשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi & Mrs.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Lichtenstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cabinfield Cir",
        "houseNumber": "64",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "908 363-9005",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3461",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "רוזנפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Rosenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3462",
    "title": "הרה\"ח ר'",
    "firstName": "יהושע",
    "lastName": "בערנאט",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi & Mrs.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Bernat",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Valencia Dr",
        "houseNumber": "2",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3463",
    "title": "הרה\"ח ר'",
    "firstName": "ישעי' אשר",
    "lastName": "בערנאט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "S U",
    "lastNameEnglish": "Bernat",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "נמצא בימי חמישי במונסי",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S 5th St",
        "houseNumber": "408",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11211",
        "zip2": "",
        "neighborhood": "Williamsburg",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3465",
    "title": "הרה\"ח ר'",
    "firstName": "יחיאל מיכל",
    "lastName": "שווארטץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y M",
    "lastNameEnglish": "Schwartz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Crestview Ter",
        "houseNumber": "14",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3466",
    "title": "הרה\"ח ר'",
    "firstName": "ארי' לייב",
    "lastName": "וואסנער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "L",
    "lastNameEnglish": "Wassner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "אחרי שחרית בביהכ\"נ 'אמרי צבי', Ave P 2402",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Ave K",
        "houseNumber": "622",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3467",
    "title": "הרה\"ח ר'",
    "firstName": "מנדל",
    "lastName": "פאמעראנץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Pomerantz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 3rd St",
        "houseNumber": "1335",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Mark Pomerantz",
        "street": "1335 E 3rd St",
        "houseNumber": "",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3468",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף",
    "lastName": "קופערוואסער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y D",
    "lastNameEnglish": "Kuperwassery",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-20T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Gefen Dr",
        "houseNumber": "16",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3469",
    "title": "הרה\"ח ר'",
    "firstName": "זאב דוב",
    "lastName": "זאודרער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Z D",
    "lastNameEnglish": "Zauderer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-20T21:00:00.000Z",
    "notes": "לבדוק כתובת: 765 Elvira Ave Far Rockaway, NY 11691-5406",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Crest Pl",
        "houseNumber": "158",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "stevenz@bcircleusa.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3470",
    "title": "הרה\"ח ר'",
    "firstName": "צבי",
    "lastName": "קסירר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Z",
    "lastNameEnglish": "Kasirer",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-21T21:00:00.000Z",
    "notes": "אבא של שמואל",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Bennington Ln",
        "houseNumber": "531",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "917 642-7992",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3471",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "היינמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Heinemann",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-22T21:00:00.000Z",
    "notes": "במשרד במרכז יום לקשישים של אגו\"י",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 28th St",
        "houseNumber": "1165",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3472",
    "title": "הרה\"ח ר'",
    "firstName": "ישראל יעקב",
    "lastName": "דארפמאן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y Y",
    "lastNameEnglish": "Dorfman",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-22T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Laguna Lane",
        "houseNumber": "1520",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3473",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "ווייס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Weiss",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-22T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Gefen Dr",
        "houseNumber": "14",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3474",
    "title": "הרה\"ח ר'",
    "firstName": "ישעי'",
    "lastName": "גאלדבערג",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi & Mrs.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Goldberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-23T21:00:00.000Z",
    "notes": "בן דוד של משפ' אלעווסקי ושל אליעזר לעוו",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Princeton Ave",
        "houseNumber": "1380",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1973",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3475",
    "title": "הרה\"ח ר'",
    "firstName": "שאול",
    "lastName": "מזרחי",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Mizrahi",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-23T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Sienna Way",
        "houseNumber": "3",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-2121",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3476",
    "title": "הרה\"ח ר'",
    "firstName": "שמעון",
    "lastName": "מנדלוביץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Mendlowitz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-24T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Hilltop Pl",
        "houseNumber": "27",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3477",
    "title": "מרת",
    "firstName": "",
    "lastName": "אשכנזי",
    "suffix": "תחי'",
    "titleEnglish": "Mrs.",
    "firstNameEnglish": "S F",
    "lastNameEnglish": "Aschkenazi",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-24T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "S Grandview Ave",
        "houseNumber": "301",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952-2956",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3478",
    "title": "הרה\"ח ר'",
    "firstName": "אריאל",
    "lastName": "וואלגעמוט",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Walgemut",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-24T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Village Green",
        "houseNumber": "7",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3480",
    "title": "הרה\"ח ר'",
    "firstName": "יואל",
    "lastName": "עפשטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Epstein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-24T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Frankfurt Rd 103",
        "houseNumber": "8",
        "apartment": "",
        "city": "Kiryas Joel, NY",
        "state": "",
        "zip": "10950",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3481",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "בראון",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Brown",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-24T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Briarcliff Dr",
        "houseNumber": "38",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3482",
    "title": "הרה\"ח ר'",
    "firstName": "נפתלי",
    "lastName": "איינהורן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "N",
    "lastNameEnglish": "Einhorn",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-26T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Virginia Ave",
        "houseNumber": "41",
        "apartment": "",
        "city": "Clifton, NJ",
        "state": "",
        "zip": "07012-1222",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3484",
    "title": "הרה\"ח ר'",
    "firstName": "משה",
    "lastName": "שווארטץ",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Schwartz",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-26T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "31st St",
        "houseNumber": "1159",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210-4732",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3487",
    "title": "הרה\"ח ר'",
    "firstName": "אהרן",
    "lastName": "שטערן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Stern",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-27T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Medison Ave",
        "houseNumber": "1700",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3488",
    "title": "",
    "firstName": "דוב",
    "lastName": "טראטנער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Tratner",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "",
        "houseNumber": "",
        "apartment": "",
        "city": "",
        "state": "",
        "zip": "",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Tratner and Associates Pllc",
        "street": "80-02 Kew Gardens Rd Ste 605",
        "houseNumber": "",
        "apartment": "",
        "city": "Kew Gardens",
        "state": "",
        "zip": "11415",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3489",
    "title": "הרה\"ח ר'",
    "firstName": "יעקב",
    "lastName": "זאנטו",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "J",
    "lastNameEnglish": "Szanto",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-28T21:00:00.000Z",
    "notes": "הילדים למדו בגור, קשור לרבי",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "58th St",
        "houseNumber": "1230",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11219",
        "zip2": "",
        "neighborhood": "Boro Park",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3490",
    "title": "הרה\"ח ר'",
    "firstName": "דוד",
    "lastName": "האגער",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "D",
    "lastNameEnglish": "Hager",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 27th Street",
        "houseNumber": "1148",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210-4621",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "email",
        "value": "dhagerlaw@gmail.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3491",
    "title": "הרה\"ח ר'",
    "firstName": "יהודה",
    "lastName": "לוינגר",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y",
    "lastNameEnglish": "Loevinger",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-28T21:00:00.000Z",
    "notes": "מחותן של אביגדור מורדוביץ",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Clear Stream Rd",
        "houseNumber": "66",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "L. CHARITY ACCOUNT",
        "street": "66 Clear Stream Rd",
        "houseNumber": "",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3492",
    "title": "הרה\"ח ר'",
    "firstName": "יהושע",
    "lastName": "וויינפעלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Weinfeld",
    "lastNameEnglish": "S",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Gudz Rd",
        "houseNumber": "54",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3493",
    "title": "הרה\"ח ר'",
    "firstName": "שלום",
    "lastName": "שטיין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Stein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Albert Ave",
        "houseNumber": "760",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "908 910-6910",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3494",
    "title": "הרה\"ח ר'",
    "firstName": "יצחק אייזיק",
    "lastName": "קליין",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "Y I",
    "lastNameEnglish": "Klein",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 28th St",
        "houseNumber": "1644",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11229-2508",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3495",
    "title": "הרה\"ח ר'",
    "firstName": "שמעון",
    "lastName": "שטערן",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "S",
    "lastNameEnglish": "Stern",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cranberry Ct",
        "houseNumber": "5",
        "apartment": "",
        "city": "Jackson, NJ",
        "state": "",
        "zip": "08527",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3497",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "שיינפלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Schonfeld",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "E 27th St",
        "houseNumber": "1146",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11210",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3498",
    "title": "הרה\"ח ר'",
    "firstName": "אליהו",
    "lastName": "מנדלבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "E",
    "lastNameEnglish": "Mandelbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-31T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Harberview W",
        "houseNumber": "94",
        "apartment": "",
        "city": "Lawrence, NY",
        "state": "",
        "zip": "11559-1913",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "516 239-1451",
        "label": "טלפון",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3499",
    "title": "הרה\"ח ר'",
    "firstName": "אביגדור",
    "lastName": "ווייס",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Weiss",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-07-31T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Albert Dr",
        "houseNumber": "8",
        "apartment": "",
        "city": "Monsey, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "845 205-9303#1",
        "label": "טלפון",
        "isPrimary": true
      },
      {
        "type": "email",
        "value": "victor@herbstweiss.com",
        "label": "אימייל",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3500",
    "title": "הרה\"ח ר'",
    "firstName": "מנדל",
    "lastName": "גאלד",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "M",
    "lastNameEnglish": "Gold",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-08-16T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Carter Ln",
        "houseNumber": "1",
        "apartment": "",
        "city": "Wesley Hills, NY",
        "state": "",
        "zip": "10952",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3501",
    "title": "הרה\"ח ר'",
    "firstName": "",
    "lastName": "פייגנבוים",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr. & Mrs.",
    "firstNameEnglish": "",
    "lastNameEnglish": "Feigenbaum",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-08-17T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Whitestone Expy, Ste 300",
        "houseNumber": "30-50",
        "apartment": "",
        "city": "Flushing, NY",
        "state": "",
        "zip": "11354",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Perry Chemical Corp.",
        "street": "30-50 Whitestone Expy, Ste 300",
        "houseNumber": "",
        "apartment": "",
        "city": "Flushing, NY",
        "state": "",
        "zip": "11354",
        "country": ""
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3502",
    "title": "הרה\"ח ר'",
    "firstName": "יוסף חיים",
    "lastName": "רוטנברג",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "Y C",
    "lastNameEnglish": "Rottenberg",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-09-28T21:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Cedarview Ave",
        "houseNumber": "1432",
        "apartment": "",
        "city": "Lakewood, NJ",
        "state": "",
        "zip": "08701-1719",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      },
      {
        "type": "עבודה",
        "description": "Ceiling Experts Inc",
        "street": "PO Box 1271",
        "houseNumber": "",
        "apartment": "",
        "city": "Jackson, NJ",
        "state": "",
        "zip": "08527-0263",
        "country": ""
      }
    ],
    "contacts": [
      {
        "type": "phone",
        "value": "732 608-4410",
        "label": "נייד",
        "isPrimary": true
      }
    ]
  },
  {
    "legacyId": "3503",
    "title": "הרה\"ח ר'",
    "firstName": "אברהם",
    "lastName": "הירש",
    "suffix": "הי\"ו",
    "titleEnglish": "Mr.",
    "firstNameEnglish": "A",
    "lastNameEnglish": "Hirsh",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-10-26T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "Avenue M",
        "houseNumber": "2122",
        "apartment": "",
        "city": "Brooklyn, NY",
        "state": "",
        "zip": "11230",
        "zip2": "",
        "neighborhood": "Flatbush",
        "country": "USA"
      }
    ],
    "contacts": []
  },
  {
    "legacyId": "3504",
    "title": "הרב",
    "firstName": "",
    "lastName": "נואי",
    "suffix": "הי\"ו",
    "titleEnglish": "Rabbi",
    "firstNameEnglish": "",
    "lastNameEnglish": "Noe",
    "isAnash": false,
    "wantsUpdates": true,
    "createdDate": "2025-10-26T22:00:00.000Z",
    "notes": "",
    "fatherLegacyId": null,
    "fatherInLawLegacyId": null,
    "addresses": [
      {
        "type": "בית",
        "description": "",
        "street": "N Mertal Avenue",
        "houseNumber": "428",
        "apartment": "",
        "city": "Los Angeles, CA",
        "state": "",
        "zip": "90036-2514",
        "zip2": "",
        "neighborhood": "",
        "country": "USA"
      }
    ],
    "contacts": []
  }
]

// Donations data
const DONATIONS_DATA = [
  {
    "donorLegacyId": "2115",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2016-02-28T22:00:00.000Z",
    "campaignName": "1181",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2016-03-01T22:00:00.000Z",
    "campaignName": "1116",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2118",
    "amount": 500,
    "currency": "לירה שטרלינג",
    "donationDate": "2016-03-01T22:00:00.000Z",
    "campaignName": "1185",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2124",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2016-03-03T22:00:00.000Z",
    "campaignName": "1194",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2128",
    "amount": 250,
    "currency": "לירה שטרלינג",
    "donationDate": "2016-03-05T22:00:00.000Z",
    "campaignName": "1199",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2091",
    "amount": 250,
    "currency": "לירה שטרלינג",
    "donationDate": "2016-03-12T22:00:00.000Z",
    "campaignName": "1139",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2124",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2016-03-13T22:00:00.000Z",
    "campaignName": "1194",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "70.5 £ ע\"י רא\"ב בירנהאק",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2016-03-29T21:00:00.000Z",
    "campaignName": "1116",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1535",
    "amount": 500,
    "currency": "לירה שטרלינג",
    "donationDate": "2016-04-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "לרגל נישואי בנו נ\"י",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1837",
    "amount": 500,
    "currency": "לירה שטרלינג",
    "donationDate": "2015-12-24T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1473",
    "amount": 180,
    "currency": "לירה שטרלינג",
    "donationDate": "2015-10-16T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1239",
    "amount": 90,
    "currency": "לירה שטרלינג",
    "donationDate": "2016-01-23T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2128",
    "amount": 35,
    "currency": "לירה שטרלינג",
    "donationDate": "2016-05-21T21:00:00.000Z",
    "campaignName": "1199",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "606",
    "amount": 50,
    "currency": "לירה שטרלינג",
    "donationDate": "2016-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2017-02-19T22:00:00.000Z",
    "campaignName": "1608",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2017-02-25T22:00:00.000Z",
    "campaignName": "1608",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1599",
    "amount": 40,
    "currency": "לירה שטרלינג",
    "donationDate": "2017-02-25T22:00:00.000Z",
    "campaignName": "2218",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1599",
    "amount": 40,
    "currency": "לירה שטרלינג",
    "donationDate": "2017-02-25T22:00:00.000Z",
    "campaignName": "2218",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1432",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2017-06-15T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1311",
    "amount": 360,
    "currency": "לירה שטרלינג",
    "donationDate": "2015-06-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "606",
    "amount": 150,
    "currency": "לירה שטרלינג",
    "donationDate": "2017-07-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "זכות סדר הלכה, ביום כ\"ז טבת, לברכה והצלחה בכל מעשי ידיו",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1463",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2018-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2019-02-13T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2019-03-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2019-07-08T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 200,
    "currency": "שקל חדש",
    "donationDate": "2019-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2021-02-07T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2579",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2021-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1236",
    "amount": 180,
    "currency": "לירה שטרלינג",
    "donationDate": "2021-09-02T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2579",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2022-03-13T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-05-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2672",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2022-06-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2694",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2022-06-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2695",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2022-06-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2838",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1239",
    "amount": 260,
    "currency": "לירה שטרלינג",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "52",
    "amount": 500,
    "currency": "לירה שטרלינג",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "1",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2700",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1303",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1739",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2701",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2702",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2705",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2706",
    "amount": 400,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1486",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2709",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1536",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2650",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-06-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2715",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2022-06-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1547",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-06-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2712",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2022-06-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2718",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-06-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1627",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2022-06-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2719",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-06-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1701",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2022-06-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1738",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-06-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2721",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-06-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2722",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-06-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2728",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2727",
    "amount": 120,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2682",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2730",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2733",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2736",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2737",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2739",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2740",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2741",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2742",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2022-07-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2743",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2745",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2746",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1947",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2748",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2749",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2750",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2751",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2752",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2753",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2754",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2755",
    "amount": 160,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2756",
    "amount": 40,
    "currency": "דולר",
    "donationDate": "2022-07-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2735",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2022-07-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2757",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2022-07-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2758",
    "amount": 20,
    "currency": "דולר",
    "donationDate": "2022-07-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2759",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2760",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1348",
    "amount": 126,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2762",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2124",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2763",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2764",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2765",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2766",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1203",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2767",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2768",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2769",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2770",
    "amount": 75,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2771",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2772",
    "amount": 150,
    "currency": "לירה שטרלינג",
    "donationDate": "2022-07-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2773",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2774",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2775",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2776",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2779",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2780",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2022-07-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2781",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2783",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-07-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2784",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2198",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-07-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2785",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1914",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2128",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2022-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2791",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2792",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2794",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2795",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2022-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2796",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2022-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2797",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2798",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2022-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2799",
    "amount": 350,
    "currency": "דולר",
    "donationDate": "2022-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2807",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2022-07-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2813",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2022-10-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2240",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2022-09-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2824",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-02-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2831",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2023-02-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2847",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-02-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1348",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-02-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2849",
    "amount": 180,
    "currency": "לירה שטרלינג",
    "donationDate": "2023-02-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2818",
    "amount": null,
    "currency": "לירה שטרלינג",
    "donationDate": "2023-02-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2843",
    "amount": 864,
    "currency": "לירה שטרלינג",
    "donationDate": "2023-02-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2762",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2023-02-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2852",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2023-02-05T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2859",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2023-02-05T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2860",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-02-05T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2861",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-02-05T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2862",
    "amount": 20,
    "currency": "דולר",
    "donationDate": "2023-02-06T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2863",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2023-02-06T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2868",
    "amount": 136,
    "currency": "דולר",
    "donationDate": "2023-02-06T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2870",
    "amount": 25,
    "currency": "דולר",
    "donationDate": "2023-02-06T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2871",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2023-02-06T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2876",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-02-08T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2878",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2023-02-08T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2881",
    "amount": 80,
    "currency": "דולר",
    "donationDate": "2023-02-08T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2879",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-02-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2886",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2023-02-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2887",
    "amount": 120,
    "currency": "דולר",
    "donationDate": "2023-02-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2888",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-02-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2897",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-02-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2898",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2023-02-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2899",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-02-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2900",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-02-13T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2901",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-02-13T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2902",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-02-13T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2906",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2023-02-15T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2907",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-02-15T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2910",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2023-02-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2912",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-02-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2914",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-02-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2915",
    "amount": 60,
    "currency": "דולר",
    "donationDate": "2023-02-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2916",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2023-02-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2919",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-02-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1406",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-02-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2935",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2936",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2851",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2937",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2942",
    "amount": 25,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2943",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2949",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2951",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2952",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2953",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2954",
    "amount": 110,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2734",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2956",
    "amount": 138,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2957",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2958",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2959",
    "amount": 75,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2960",
    "amount": 25,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2961",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2962",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2964",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2963",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2966",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2967",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2968",
    "amount": 40,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2969",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2970",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2971",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2972",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2974",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2975",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2976",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2977",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2978",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2979",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2980",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2981",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2982",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2983",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2985",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2986",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2987",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2988",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2990",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2994",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2023-03-20T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1063",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-05-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3105",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2023-05-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3106",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-05-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3107",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-05-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3110",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-05-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1955",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2023-05-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1796",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-05-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3112",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2022-05-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1064",
    "amount": 45,
    "currency": "דולר",
    "donationDate": "2023-06-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3118",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-07-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3119",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-07-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3122",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "דרך שערי חסד",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3123",
    "amount": 26,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3124",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3125",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3126",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3127",
    "amount": 10,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3128",
    "amount": 32,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3112",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3129",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "שערי חסד",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3130",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "שערי חסד",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3131",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "ועד החסד",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3132",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "ועד",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3133",
    "amount": 25,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "צ'ק - Eilat Charitble Foundation",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3134",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3135",
    "amount": 101,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3136",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "שערי חסד",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3140",
    "amount": 20,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3138",
    "amount": 101,
    "currency": "דולר",
    "donationDate": "2023-08-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3142",
    "amount": 80,
    "currency": "דולר",
    "donationDate": "2023-08-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3143",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-05-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3143",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1955",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-08-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3144",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-08-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3146",
    "amount": 84,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3147",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3148",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3110",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1872",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2022-05-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1872",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3150",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3151",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3153",
    "amount": 122,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3154",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3155",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3156",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-08-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1678",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3157",
    "amount": 101,
    "currency": "לירה שטרלינג",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3158",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3159",
    "amount": 52,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3160",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3161",
    "amount": 26,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3163",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3164",
    "amount": 20,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3166",
    "amount": 126,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3167",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3168",
    "amount": 52,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3169",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3170",
    "amount": 60,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3172",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3173",
    "amount": 75,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3174",
    "amount": 52,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3175",
    "amount": 288,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3176",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3177",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3178",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3179",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3180",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3181",
    "amount": 35,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3182",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3183",
    "amount": 52,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3184",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3185",
    "amount": 52,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3186",
    "amount": 75,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3187",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3188",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3189",
    "amount": 52,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3190",
    "amount": 80,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3191",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3192",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3193",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3194",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3195",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3196",
    "amount": 216,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3197",
    "amount": 180,
    "currency": "לירה שטרלינג",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3199",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3200",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3201",
    "amount": 50,
    "currency": "לירה שטרלינג",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "ועד",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3202",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2115",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2022-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2831",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2847",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3226",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2762",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2764",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2024-01-02T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2914",
    "amount": 36,
    "currency": "לירה שטרלינג",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3227",
    "amount": 25,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3228",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3229",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3230",
    "amount": 5,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3232",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3233",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3237",
    "amount": 126,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3238",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2912",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3239",
    "amount": 40,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3241",
    "amount": 20,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3242",
    "amount": 40,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2807",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-08-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2763",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2023-08-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3245",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2023-08-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3247",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-08-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3248",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-08-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3249",
    "amount": 40,
    "currency": "דולר",
    "donationDate": "2023-08-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1348",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-08-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2766",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-08-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3251",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-08-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3252",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-08-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3254",
    "amount": 120,
    "currency": "דולר",
    "donationDate": "2023-08-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3255",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2023-08-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3256",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2023-08-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3257",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2023-08-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3259",
    "amount": 30,
    "currency": "דולר",
    "donationDate": "2023-08-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3261",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-08-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3264",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2023-08-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3271",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3272",
    "amount": 100,
    "currency": "לירה שטרלינג",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1914",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2727",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1239",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2835",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2722",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2743",
    "amount": 60,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1303",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2650",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3273",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1547",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2817",
    "amount": 648,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2700",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1536",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1654",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3220",
    "amount": 500,
    "currency": "לירה שטרלינג",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3222",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2741",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2742",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1742",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2705",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-05T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2721",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2836",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2751",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2745",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1947",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2693",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1738",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2715",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2706",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2740",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2755",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3274",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3275",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-09-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2764",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2024-04-16T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1955",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2024-08-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3255",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2024-09-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1859",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2024-12-18T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3178",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "WPD",
      "address": "5201 S Downey Road",
      "city": "Irvine, CA    92612-2714"
    }
  },
  {
    "donorLegacyId": "3318",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-01-02T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "58",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "The Jack Adjmi Family Foundation",
      "address": "463 7th Ave, 4th fl",
      "city": "New York, NY 10018"
    }
  },
  {
    "donorLegacyId": "2940",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2025-01-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "59",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Irontown Foundation",
      "address": "1350 E 22nd St.",
      "city": "Brooklyn, NY 11210"
    }
  },
  {
    "donorLegacyId": "3320",
    "amount": 125,
    "currency": "דולר",
    "donationDate": "2025-01-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "60",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2863",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-01-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "61",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Zichron Chaim Charity Fund",
      "address": "1282 E 23rd Street",
      "city": "Brooklyn, NY"
    }
  },
  {
    "donorLegacyId": "2971",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2025-01-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2868",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3321",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2954",
    "amount": 30,
    "currency": "דולר",
    "donationDate": "2025-01-04T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3323",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2025-01-05T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "7",
    "accountNumber": "6356",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "7",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3041",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2025-01-05T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "8889",
    "receiptNumber": "62",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3324",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2025-01-05T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "6602",
    "receiptNumber": "63",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Jeanette Graus Wilamowsky Trust",
      "address": "1486 Ocean ParkWay",
      "city": "Brooklyn, NY 11230-6453"
    }
  },
  {
    "donorLegacyId": "2972",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-05T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "2456",
    "receiptNumber": "64",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2860",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-05T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "6602",
    "receiptNumber": "65",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3325",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-05T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "66",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3326",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2024-11-30T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "67",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "KL Cooling and Heating",
      "address": "5308 13th Ave, Suite 314",
      "city": "Brooklyn, NY 11219"
    }
  },
  {
    "donorLegacyId": "2963",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-06T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2987",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-06T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "9532204520",
    "receiptNumber": "68",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Congregation Ohel Avrohom Yosef",
      "address": "210 Chary St",
      "city": "Lakewood, NJ 08701"
    }
  },
  {
    "donorLegacyId": "3327",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-06T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1914",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-01-07T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "262708861",
    "receiptNumber": "69",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Law Office of Maurice I. Rosenberg LLC",
      "address": "930 E County Line Rd, Building B, Ste 101",
      "city": "Lakewood, NJ 08701-2146"
    }
  },
  {
    "donorLegacyId": "3328",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-01-07T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "009463036297",
    "receiptNumber": "70",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3329",
    "amount": 120,
    "currency": "דולר",
    "donationDate": "2025-01-07T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "1010163462749",
    "receiptNumber": "71",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2983",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-01-07T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2936",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-01-07T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2958",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-01-07T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3330",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-08T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "4120010474",
    "receiptNumber": "72",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "The Brothers Ashkenazi Foundation Inc",
      "address": "1299 Main St",
      "city": "Rahwy, NJ 07065-0901"
    }
  },
  {
    "donorLegacyId": "3331",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2025-01-08T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "73",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Gutman Family Foundation",
      "address": "3605 Menlo Dr",
      "city": "Lakewood, NJ 08701"
    }
  },
  {
    "donorLegacyId": "2979",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-08T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "0093220159",
    "receiptNumber": "74",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Park Lane Investments LLC",
      "address": "9 Ilan Ct",
      "city": "Lakewood, NJ 08701-2374"
    }
  },
  {
    "donorLegacyId": "3332",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-08T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Sterling Property and Casualty",
      "address": "20 4th St, Suite 211",
      "city": "Lakewood, NJ 08701"
    }
  },
  {
    "donorLegacyId": "2859",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-08T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "000084213213",
    "receiptNumber": "76",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2949",
    "amount": 85,
    "currency": "דולר",
    "donationDate": "2025-01-08T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "229197097",
    "receiptNumber": "77",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Catering By Michael Schick",
      "address": "9024 Foster Ave",
      "city": "Brooklyn, NY 11236"
    }
  },
  {
    "donorLegacyId": "3334",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-08T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Alex Real LLC",
      "address": "",
      "city": "Lakewood, NJ 087017-2133"
    }
  },
  {
    "donorLegacyId": "3335",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2025-01-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "6884392",
    "receiptNumber": "78",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3042",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-01-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "732592677",
    "receiptNumber": "79",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Nishmat LLC",
      "address": "",
      "city": "New York, NY"
    }
  },
  {
    "donorLegacyId": "3336",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "910587927",
    "receiptNumber": "80",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2876",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2025-01-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "2037555326",
    "receiptNumber": "81",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Lawrence Charitable Fdtn",
      "address": "388 Kenridge Road",
      "city": "Lawrence, NY 11559-1816"
    }
  },
  {
    "donorLegacyId": "3050",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-01-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "7159008643",
    "receiptNumber": "82",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3337",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "21000089",
    "receiptNumber": "83",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Congregation Beth Sholom",
      "address": "390 Broadway",
      "city": "Lawrence, NY 11559"
    }
  },
  {
    "donorLegacyId": "2893",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-01-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "92060100566",
    "receiptNumber": "84",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2896",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2025-01-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "3252",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2879",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2025-01-11T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "85",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3338",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-01-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "86",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3339",
    "amount": 25,
    "currency": "דולר",
    "donationDate": "2025-01-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "87",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3036",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "The Frommer Family Fund",
      "address": "",
      "city": "Lakewood, NJ 08701-1262"
    }
  },
  {
    "donorLegacyId": "3049",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2025-01-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "300105407",
    "receiptNumber": "88",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2855",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "815796722",
    "receiptNumber": "89",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3341",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2025-01-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "477884",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3342",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2023-12-22T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3342",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2025-01-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "4774032",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3345",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3346",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-01-12T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "3905",
    "receiptNumber": "90",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2938",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-13T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "91",
    "notes": "Zelle",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3347",
    "amount": 20,
    "currency": "דולר",
    "donationDate": "2025-01-13T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "92",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3348",
    "amount": 10,
    "currency": "דולר",
    "donationDate": "2025-01-13T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "93",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3350",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-01-14T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "7",
    "accountNumber": "7451",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "7",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2856",
    "amount": 108,
    "currency": "דולר",
    "donationDate": "2025-01-14T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "5267",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Zell & Ettinger",
      "address": "3001 Ave M",
      "city": "Brooklyn, NY 11210"
    }
  },
  {
    "donorLegacyId": "3351",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2025-01-14T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "0910726968",
    "receiptNumber": "94",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3353",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2025-01-14T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "95",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3354",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-14T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3355",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-01-14T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "6881753615",
    "receiptNumber": "96",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3356",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2025-01-14T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "812732568",
    "receiptNumber": "97",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3357",
    "amount": 172,
    "currency": "דולר",
    "donationDate": "2025-01-15T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3359",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-01-15T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "4649906673",
    "receiptNumber": "98",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3205",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-15T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "99",
    "notes": "לתקן תאריך 911",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3205",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-15T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2962",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-15T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "4787254",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Kanarek & Co",
      "address": "20 4th St",
      "city": "Lakewood, NJ 08701"
    }
  },
  {
    "donorLegacyId": "3062",
    "amount": 750,
    "currency": "דולר",
    "donationDate": "2025-01-15T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "4757494",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3051",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2025-01-15T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "8",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "2623936",
    "bankName": "",
    "organizationName": "8",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Orenbuch Family Trust",
      "address": "",
      "city": "West Hempstead, NY 11552"
    }
  },
  {
    "donorLegacyId": "3026",
    "amount": 720,
    "currency": "דולר",
    "donationDate": "2025-01-18T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "906373758",
    "receiptNumber": "100",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3358",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2025-01-18T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "210632345",
    "receiptNumber": "101",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3365",
    "amount": 10,
    "currency": "דולר",
    "donationDate": "2025-01-18T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "609904962702",
    "receiptNumber": "102",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3366",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-01-18T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "036017602924",
    "receiptNumber": "103",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3367",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2025-01-18T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "352132053070",
    "receiptNumber": "104",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3368",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2025-01-18T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "02665152897",
    "receiptNumber": "105",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "michael j covitch trust 12-2016",
      "address": "23103 Greenlawn Ave",
      "city": "Beachwood, OH 44122"
    }
  },
  {
    "donorLegacyId": "3369",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2025-01-18T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "358542040508",
    "receiptNumber": "106",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3370",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2025-01-18T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "996866331",
    "receiptNumber": "107",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3371",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2025-01-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "350682097489",
    "receiptNumber": "108",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3372",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "4224795912",
    "receiptNumber": "109",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Basic, Swift & Determined Inc.",
      "address": "23945 Mercantile Rd, Unit H",
      "city": "Beachwood, OH 44122-5924"
    }
  },
  {
    "donorLegacyId": "3373",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2025-01-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "4228229678",
    "receiptNumber": "110",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Davis Caterers, Inc.",
      "address": "1850 Taylor Rd",
      "city": "Cleveland Hts, OH 44118"
    }
  },
  {
    "donorLegacyId": "3374",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2025-01-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "955803119",
    "receiptNumber": "111",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Schwartz Furs Inc.",
      "address": "5109 Mayfield Rd",
      "city": "Cleveland, OH 44124"
    }
  },
  {
    "donorLegacyId": "3376",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2025-01-20T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "4814388",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3377",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2025-01-20T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "4809646",
    "receiptNumber": "112",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3378",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2025-01-20T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "350681015276",
    "receiptNumber": "113",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Young Israel of Greater Cleveland",
      "address": "2463 S Green Rd",
      "city": "Beachwood, OH 44122"
    }
  },
  {
    "donorLegacyId": "3363",
    "amount": 10,
    "currency": "דולר",
    "donationDate": "2025-01-20T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "02772178093",
    "receiptNumber": "114",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3379",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2025-01-20T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "4502176914",
    "receiptNumber": "115",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3380",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2025-01-20T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "1022019363",
    "receiptNumber": "116",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3381",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2025-01-20T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "02668234410",
    "receiptNumber": "117",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3382",
    "amount": 40,
    "currency": "דולר",
    "donationDate": "2025-01-21T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "4120966625",
    "receiptNumber": "118",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3383",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-01-21T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "168456",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3384",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2025-01-21T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3384",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2025-01-21T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "71724",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3385",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2025-01-21T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "119",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3386",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-21T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3387",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-21T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "7525074642",
    "receiptNumber": "120",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3388",
    "amount": 75,
    "currency": "דולר",
    "donationDate": "2025-01-21T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "121",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3017",
    "amount": 75,
    "currency": "דולר",
    "donationDate": "2025-01-22T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "6183",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3389",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2025-01-24T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "122",
    "notes": "Zelle",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "GO FORWARD SERVICES LLC",
      "address": "1259 51st St",
      "city": "Brooklyn, NY 11230-1112"
    }
  },
  {
    "donorLegacyId": "1406",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-01-25T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "4259",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3390",
    "amount": 75,
    "currency": "דולר",
    "donationDate": "2025-01-26T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "5476044309",
    "receiptNumber": "123",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3391",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2025-01-26T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "381050359145",
    "receiptNumber": "124",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3017",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2023-12-24T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "736125428",
    "receiptNumber": "125",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2751",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-01-26T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "126",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3220",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2025-01-26T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "127",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3392",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-01-27T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "618139999",
    "receiptNumber": "128",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Cong. Bais Yechiel",
      "address": "1471 44th St",
      "city": "Brooklyn, NY 11204"
    }
  },
  {
    "donorLegacyId": "3394",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2025-01-27T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "625403076",
    "receiptNumber": "129",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Congregation zichron Mordechai Inc",
      "address": "268 W Englewood Ave",
      "city": "Teaneck, NJ 07666-2951"
    }
  },
  {
    "donorLegacyId": "52",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-01-27T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "8",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "8",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "WorkBase",
      "address": "WorkCtovet1",
      "city": "Brooklyn, NY 11204-1727"
    }
  },
  {
    "donorLegacyId": "2874",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-02-01T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "3796",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3340",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2025-02-01T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "4417108241",
    "receiptNumber": "130",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "2011 ER IRR TRUST",
      "address": "1677 48th St",
      "city": "Brooklyn, NY 11204"
    }
  },
  {
    "donorLegacyId": "3277",
    "amount": 400,
    "currency": "דולר",
    "donationDate": "2025-04-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "131",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2712",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-04-29T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "3",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "3",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1796",
    "amount": 144,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3189",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "7177",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3125",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3124",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "44333391",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3172",
    "amount": 45,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3399",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3401",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "325079423568",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3173",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "339173838",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1206",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "58401022966",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3151",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Cong. Agudas Achim chrity Petty",
      "address": "",
      "city": "Los Angeles, CA 90046-5303"
    }
  },
  {
    "donorLegacyId": "3143",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "339766160",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "The Mendel Family Trust",
      "address": "",
      "city": "Los Angeles, CA 90036-3010"
    }
  },
  {
    "donorLegacyId": "3197",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3146",
    "amount": 265,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "1894888153",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Complete Garment Inc",
      "address": "",
      "city": "Los Angeles, CA 90058-1616"
    }
  },
  {
    "donorLegacyId": "3202",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Shalom B Llc.",
      "address": "",
      "city": "Los Angeles, CA 90023-1269"
    }
  },
  {
    "donorLegacyId": "3122",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3196",
    "amount": 324,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3192",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Prestige Sourcing Group Llc",
      "address": "6442 Coldwater Canyon Ave, Ste 216",
      "city": "Valley Glen, CA 91606-1137"
    }
  },
  {
    "donorLegacyId": "3171",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1908",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1463",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3134",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Young Israel of Century City",
      "address": "9317 W Pico Blvd",
      "city": "Los Angeles, CA 90035-4020"
    }
  },
  {
    "donorLegacyId": "3195",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "132",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "San Gabriel Convcenter",
      "address": "4032 Wilshire Blvd, Ste 600",
      "city": "Los Angeles, CA 90020-4819"
    }
  },
  {
    "donorLegacyId": "1370",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "58401011722",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3405",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "262926",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3406",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "22453206",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3123",
    "amount": 52,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "5105161805",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3126",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2024-07-16T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "8902026006505",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Ek Charitable Foundation Inc",
      "address": "",
      "city": "Los Angeles, CA 90036-2804"
    }
  },
  {
    "donorLegacyId": "3407",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2024-07-11T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "325195646805",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3408",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2024-07-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "58406016100",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Congregation Etz Chaim of Hancock Park",
      "address": "303 S Highland Ave",
      "city": "Los Angeles, CA"
    }
  },
  {
    "donorLegacyId": "3409",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2024-07-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "403199081",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3410",
    "amount": 101,
    "currency": "דולר",
    "donationDate": "2024-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "1126156",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Manesh Inc",
      "address": "9612 Brighton Way",
      "city": "Beverly Hills, CA 90210"
    }
  },
  {
    "donorLegacyId": "1872",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1872",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2025-05-15T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3151",
    "amount": 275,
    "currency": "דולר",
    "donationDate": "2025-05-15T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "1165047722",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Cong. Agudas Achim chrity Petty",
      "address": "7832 Santa Monica Blvd",
      "city": "Los Angeles, CA 90046-5303"
    }
  },
  {
    "donorLegacyId": "3148",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2024-07-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3120",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2024-07-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Horowitz Management Brokers",
      "address": "1180 S beverly Drive, Ste 740",
      "city": "Los Angeles, CA 90035-1153"
    }
  },
  {
    "donorLegacyId": "3411",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2024-07-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3412",
    "amount": 120,
    "currency": "דולר",
    "donationDate": "2024-07-18T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3413",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2024-07-18T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3414",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2024-07-18T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3121",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2024-07-18T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3415",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2024-07-18T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3200",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2024-07-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3112",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2024-07-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3416",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2024-07-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3417",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2024-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3154",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2024-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3409",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2025-05-15T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "403199081",
    "receiptNumber": "133",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1678",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-05-15T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "8",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "8",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3112",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3405",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-05-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "8000262926",
    "receiptNumber": "134",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3399",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-18T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "135",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3175",
    "amount": 104,
    "currency": "דולר",
    "donationDate": "2024-07-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "429012967",
    "receiptNumber": "137",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3175",
    "amount": 144,
    "currency": "דולר",
    "donationDate": "2025-05-18T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "429012967",
    "receiptNumber": "136",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3419",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-18T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "4920141168",
    "receiptNumber": "138",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3187",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2025-05-18T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "157532213178",
    "receiptNumber": "139",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Ecysm Foundation Inc.",
      "address": "221 S Detroit St",
      "city": "Los Angeles, CA 90036-3033"
    }
  },
  {
    "donorLegacyId": "3318",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2025-05-18T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "610026851",
    "receiptNumber": "140",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "The Jack Adjmi Family Foundation #5",
      "address": "463 7th Ave, 4th fl",
      "city": "New York, NY 10018"
    }
  },
  {
    "donorLegacyId": "3420",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2024-07-13T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1550",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2024-07-13T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3421",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2024-07-14T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3422",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2024-07-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3143",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-05-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "339766160",
    "receiptNumber": "141",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "The Mendell Family Trust",
      "address": "247 S Orange Dr",
      "city": "Los Angeles, CA 90036-3010"
    }
  },
  {
    "donorLegacyId": "3126",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2025-05-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "8902026006505",
    "receiptNumber": "142",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Ek Charitable Foundation Inc",
      "address": "106 S Poinsettia Pl",
      "city": "Los Angeles, CA 90036-2804"
    }
  },
  {
    "donorLegacyId": "1796",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2025-05-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "58401014149",
    "receiptNumber": "143",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3202",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-05-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "1895871158",
    "receiptNumber": "144",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Shalom B Llc.",
      "address": "950 S Boyle Ave",
      "city": "Los Angeles, CA 90023-1269"
    }
  },
  {
    "donorLegacyId": "3146",
    "amount": 270,
    "currency": "דולר",
    "donationDate": "2025-05-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "1894888153",
    "receiptNumber": "145",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Complete Garment Inc",
      "address": "2101 E 38th St",
      "city": "Los Angeles, CA 90058-1616"
    }
  },
  {
    "donorLegacyId": "1206",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "58401022966",
    "receiptNumber": "146",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3182",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-19T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3423",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-05-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3123",
    "amount": 26,
    "currency": "דולר",
    "donationDate": "2025-05-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "1999151267",
    "receiptNumber": "147",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3122",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2025-05-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "213303158",
    "receiptNumber": "148",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "KSA",
      "address": "P.O.B. 35721",
      "city": "Los Angeles, CA 90035-0721"
    }
  },
  {
    "donorLegacyId": "3193",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-05-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "637887368",
    "receiptNumber": "149",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Charitable Account Jacob Wintner",
      "address": "6300 Whilshire Blvd, Ste 1800",
      "city": "Los Angeles, CA 90048"
    }
  },
  {
    "donorLegacyId": "3148",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-05-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3422",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2025-05-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "58401019134",
    "receiptNumber": "150",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3131",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3120",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2025-05-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Horowitz Management Brokers",
      "address": "1180 S beverly Drive, Ste 740",
      "city": "Los Angeles, CA 90035-1153"
    }
  },
  {
    "donorLegacyId": "3411",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2025-05-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3416",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3153",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2024-07-16T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3153",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-05-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1550",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-05-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3118",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3157",
    "amount": 101,
    "currency": "דולר",
    "donationDate": "2025-05-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3178",
    "amount": 101,
    "currency": "דולר",
    "donationDate": "2025-05-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "42042075962",
    "receiptNumber": "151",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "WPD",
      "address": "5201 S Downey Road",
      "city": "Irvine, CA 92612-2714"
    }
  },
  {
    "donorLegacyId": "3160",
    "amount": 65,
    "currency": "דולר",
    "donationDate": "2025-05-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "80003944634",
    "receiptNumber": "152",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3189",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "339772685",
    "receiptNumber": "153",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Jh-Rh Joseph Charity Account",
      "address": "344 N Fuller Ave",
      "city": "Los Angeles, CA 90036-2523"
    }
  },
  {
    "donorLegacyId": "3407",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-05-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "325195646805",
    "receiptNumber": "154",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3155",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2025-05-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3425",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-05-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "155",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3412",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-05-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3426",
    "amount": 118,
    "currency": "דולר",
    "donationDate": "2025-05-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "339501650",
    "receiptNumber": "156",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3130",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-25T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "4230078",
    "receiptNumber": "157",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3420",
    "amount": 720,
    "currency": "דולר",
    "donationDate": "2025-05-25T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3427",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-05-25T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3428",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2024-07-16T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3428",
    "amount": 118,
    "currency": "דולר",
    "donationDate": "2025-05-25T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "10500022453206",
    "receiptNumber": "158",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3196",
    "amount": 540,
    "currency": "דולר",
    "donationDate": "2025-05-25T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "8000069818",
    "receiptNumber": "159",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Chinuch Charedi of Califrnia Inc",
      "address": "P.O.B. 48497",
      "city": "Los Angeles, CA 90004-1031"
    }
  },
  {
    "donorLegacyId": "1659",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-05-25T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "160",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3173",
    "amount": 75,
    "currency": "דולר",
    "donationDate": "2025-05-25T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "339173838",
    "receiptNumber": "161",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3201",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-05-25T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3121",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-05-25T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3429",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2024-07-16T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3429",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2025-05-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3139",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-05-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1724",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3417",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2025-05-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3430",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2024-07-16T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3430",
    "amount": 375,
    "currency": "דולר",
    "donationDate": "2025-05-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "162",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3179",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2025-05-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3431",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2024-07-16T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3432",
    "amount": 36,
    "currency": "דולר",
    "donationDate": "2025-05-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "621881882",
    "receiptNumber": "163",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3433",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "1971",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-05-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3434",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-05-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "5",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "5",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3171",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2025-05-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "8",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "8",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3194",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2025-05-31T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "322271724",
    "receiptNumber": "164",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3195",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2025-06-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "158300201213",
    "receiptNumber": "165",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "San Gabriel Conv center",
      "address": "4032 Wilshire Blvd, Ste 600",
      "city": "Los Angeles, CA 90020-4819"
    }
  },
  {
    "donorLegacyId": "3133",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2025-06-03T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "166",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Eilat Charitable Foundation",
      "address": "4569 W Pico Blvd",
      "city": "Los Angeles, CA 90004"
    }
  },
  {
    "donorLegacyId": "1837",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2025-06-04T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "8",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "8",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3437",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-06-08T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3438",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2025-06-08T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2792",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-06-08T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "167",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2128",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-06-08T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "168",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3435",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2025-06-08T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "5818001",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2794",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "021906934",
    "receiptNumber": "169",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3440",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3441",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3442",
    "amount": 40,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3444",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3445",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "101099859931",
    "receiptNumber": "170",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2849",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "003811108774",
    "receiptNumber": "171",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2791",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "172",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3447",
    "amount": 260,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "796322530",
    "receiptNumber": "173",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Vineland View LLC",
      "address": "324 S Beverly Drive, #1426",
      "city": "Beverly Hills, CA 90212"
    }
  },
  {
    "donorLegacyId": "3448",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "158210702458",
    "receiptNumber": "174",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3446",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "60859751946/7",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3449",
    "amount": 400,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3450",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2025-06-15T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "0050487669",
    "receiptNumber": "175",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Kahal Shaarei Tefillah",
      "address": "6 Nelson Rd",
      "city": "Monsey, NY 10952"
    }
  },
  {
    "donorLegacyId": "3439",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2025-06-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "0050492958",
    "receiptNumber": "176",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Congregation Casdei Bracha Inc.",
      "address": "P.O.B. 476",
      "city": "Monsey, NY 10952-2429"
    }
  },
  {
    "donorLegacyId": "3422",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2025-06-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "58401019134",
    "receiptNumber": "177",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Shlomo & Tamar Rechnitz",
      "address": "5478 Wilshire Blvd, Ste 304",
      "city": "Los Angeles, CA 90036"
    }
  },
  {
    "donorLegacyId": "3424",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "081009428",
    "receiptNumber": "178",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Goldner Family Foundation Inc.",
      "address": "5455 Wilshire Blvd, Ste 800",
      "city": "Los Angeles, CA 90004-1042"
    }
  },
  {
    "donorLegacyId": "3451",
    "amount": 10,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2856",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Zell & Ettinger",
      "address": "3001 Ave M",
      "city": "Brooklyn, NY 11210"
    }
  },
  {
    "donorLegacyId": "2939",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2959",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2943",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3453",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "179",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3455",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "381122786",
    "receiptNumber": "180",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3006",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "381146960",
    "receiptNumber": "181",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Leiman Mortgage Network",
      "address": "8 Engleberg Ter",
      "city": "Lakewood, NJ 08701"
    }
  },
  {
    "donorLegacyId": "3456",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3325",
    "amount": 120,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "191",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2879",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "183",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3459",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "6794038648",
    "receiptNumber": "184",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Dear Drugs Inc.",
      "address": "490 Ave P",
      "city": "Lawrence, NY 11559"
    }
  },
  {
    "donorLegacyId": "3460",
    "amount": 75,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "004240014620",
    "receiptNumber": "185",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2888",
    "amount": 260,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "186",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3462",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3467",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-07-17T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "89189630",
    "receiptNumber": "187",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Mark Pomerantz",
      "address": "1335 E 3rd St",
      "city": "Brooklyn, NY 11230"
    }
  },
  {
    "donorLegacyId": "3468",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "9541643574",
    "receiptNumber": "188",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2952",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2025-07-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "461110736",
    "receiptNumber": "189",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2868",
    "amount": 72,
    "currency": "דולר",
    "donationDate": "2025-07-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2923",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-20T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "4488",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3469",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2025-07-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "192",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3470",
    "amount": 250,
    "currency": "דולר",
    "donationDate": "2025-07-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2936",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-07-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3471",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2025-07-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "4193034800",
    "receiptNumber": "193",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2970",
    "amount": 200,
    "currency": "דולר",
    "donationDate": "2025-07-22T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3474",
    "amount": 400,
    "currency": "דולר",
    "donationDate": "2024-07-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "461121535",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3474",
    "amount": 450,
    "currency": "דולר",
    "donationDate": "2025-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "461121535",
    "receiptNumber": "194",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3332",
    "amount": 75,
    "currency": "דולר",
    "donationDate": "2025-07-23T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Sterling Property and Casualty",
      "address": "20 4th St, Suite 211",
      "city": "Lakewood, NJ 08701"
    }
  },
  {
    "donorLegacyId": "3476",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "9858674543",
    "receiptNumber": "195",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3477",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-07-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "138001060",
    "receiptNumber": "196",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3478",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-07-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "5893",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3480",
    "amount": 252,
    "currency": "דולר",
    "donationDate": "2025-07-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "3268",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3481",
    "amount": 20,
    "currency": "דולר",
    "donationDate": "2025-07-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2962",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Kanarek & Co",
      "address": "20 4th St",
      "city": "Lakewood, NJ 08701"
    }
  },
  {
    "donorLegacyId": "3482",
    "amount": 720,
    "currency": "דולר",
    "donationDate": "2025-07-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3484",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-26T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "07592897",
    "receiptNumber": "197",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3487",
    "amount": 54,
    "currency": "דולר",
    "donationDate": "2025-07-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "198",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3489",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "0334141525",
    "receiptNumber": "199",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3490",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3492",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "200",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3493",
    "amount": 500,
    "currency": "דולר",
    "donationDate": "2025-07-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3494",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2025-07-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3497",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-07-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "מזומן",
    "voucherNumber": "",
    "accountNumber": "",
    "receiptNumber": "201",
    "notes": "",
    "bankName": "",
    "organizationName": "",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3495",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-07-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3034",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-07T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3443",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-06-09T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2978",
    "amount": 300,
    "currency": "דולר",
    "donationDate": "2025-07-31T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "8038230",
    "receiptNumber": "202",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3498",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2024-07-24T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "203",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3498",
    "amount": 360,
    "currency": "דולר",
    "donationDate": "2025-07-31T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3499",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-07-31T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "2490007734",
    "receiptNumber": "204",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2937",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2025-08-06T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "2",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "2",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3014",
    "amount": 240,
    "currency": "דולר",
    "donationDate": "2025-08-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "9",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "9",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3465",
    "amount": 180,
    "currency": "דולר",
    "donationDate": "2025-08-10T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "3",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "3",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3500",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2025-08-16T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "9869233818",
    "receiptNumber": "205",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3491",
    "amount": 150,
    "currency": "דולר",
    "donationDate": "2025-08-25T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "922195950",
    "receiptNumber": "206",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "L. CHARITY ACCOUNT",
      "address": "66 Clear Stream Rd",
      "city": "Lakewood, NJ 08701"
    }
  },
  {
    "donorLegacyId": "3255",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2025-09-21T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "907179885265",
    "receiptNumber": "207",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "2681",
    "amount": null,
    "currency": "דולר",
    "donationDate": "2025-09-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "208",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "K L Cooling & Heating",
      "address": "1377 40th St,",
      "city": "Lakewood, NJ 08701-5684"
    }
  },
  {
    "donorLegacyId": "3226",
    "amount": 100,
    "currency": "דולר",
    "donationDate": "2025-09-27T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "1",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "1",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3502",
    "amount": 215,
    "currency": "דולר",
    "donationDate": "2025-09-28T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "0097078163",
    "receiptNumber": "209",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false,
    "company": {
      "name": "Ceiling Experts Inc",
      "address": "PO Box 1271",
      "city": "Lakewood, NJ 08701-1719"
    }
  },
  {
    "donorLegacyId": "3503",
    "amount": 50,
    "currency": "דולר",
    "donationDate": "2023-03-19T22:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  },
  {
    "donorLegacyId": "3504",
    "amount": 18,
    "currency": "דולר",
    "donationDate": "2023-06-30T21:00:00.000Z",
    "campaignName": "",
    "paymentMethod": "תשלום עמותה",
    "voucherNumber": "0",
    "accountNumber": "",
    "receiptNumber": "",
    "notes": "",
    "bankName": "",
    "organizationName": "0",
    "isExceptional": false,
    "isUrgent": false,
    "receiptIssued": false
  }
]

export async function seedLegacyData() {
  try {
    console.log('Starting legacy data import...')
    console.log(`Importing ${DONORS_DATA.length} donors and ${DONATIONS_DATA.length} donations`)

    // Delete existing data in correct order (foreign key constraints)
    console.log('\nDeleting existing donations...')
    const donationRepo = remult.repo(Donation)
    const existingDonations = await donationRepo.find()
    for (const donation of existingDonations) {
      await donationRepo.delete(donation)
    }
    console.log(`  ✓ Deleted ${existingDonations.length} existing donations`)

    console.log('\nDeleting existing donor contacts...')
    const donorContactRepo = remult.repo(DonorContact)
    const existingContacts = await donorContactRepo.find()
    for (const contact of existingContacts) {
      await donorContactRepo.delete(contact)
    }
    console.log(`  ✓ Deleted ${existingContacts.length} existing donor contacts`)

    console.log('\nDeleting existing donor places...')
    const donorPlaceRepo = remult.repo(DonorPlace)
    const existingPlaces = await donorPlaceRepo.find()
    for (const place of existingPlaces) {
      await donorPlaceRepo.delete(place)
    }
    console.log(`  ✓ Deleted ${existingPlaces.length} existing donor places`)

    console.log('\nDeleting existing places...')
    const placeRepo = remult.repo(Place)
    const existingPlaceRecords = await placeRepo.find()
    for (const place of existingPlaceRecords) {
      await placeRepo.delete(place)
    }
    console.log(`  ✓ Deleted ${existingPlaceRecords.length} existing places`)

    console.log('\nDeleting existing donors...')
    const donorRepo = remult.repo(Donor)
    const existingDonors = await donorRepo.find()
    for (const donor of existingDonors) {
      await donorRepo.delete(donor)
    }
    console.log(`  ✓ Deleted ${existingDonors.length} existing donors`)

    console.log('\nDeleting existing companies...')
    const companyRepo = remult.repo(Company)
    const existingCompanies = await companyRepo.find()
    for (const company of existingCompanies) {
      await companyRepo.delete(company)
    }
    console.log(`  ✓ Deleted ${existingCompanies.length} existing companies`)

    // Get or create address types
    console.log('\nCreating address types...')
    const addressTypeRepo = remult.repo(DonorAddressType)
    const addressTypes = new Map<string, DonorAddressType>()

    for (const typeName of ['בית', 'עבודה', 'שטיבלך']) {
      let addressType = await addressTypeRepo.findFirst({ name: typeName })
      if (!addressType) {
        addressType = addressTypeRepo.create({ name: typeName, isActive: true })
        await addressType.save()
      }
      addressTypes.set(typeName, addressType)
    }
    console.log(`  ✓ Created/found ${addressTypes.size} address types`)

    // Import donors
    console.log('\nImporting donors...')
    const donorMap = new Map<string, Donor>()
    const companyMap = new Map<string, Company>()
    let addressCount = 0
    let contactCount = 0
    let companyCount = 0
    let countryMatchCount = 0

    // Get all countries for matching
    const { Country } = await import('../shared/entity')
    const countryRepo = remult.repo(Country)
    const allCountries = await countryRepo.find()
    console.log(`  ✓ Found ${allCountries.length} countries for matching`)

    for (const donorData of DONORS_DATA) {
      try {
        // Handle empty names
        const firstName = donorData.firstName?.trim() || donorData.lastName || 'לא ידוע'
        const lastName = donorData.lastName?.trim() || donorData.firstName || 'לא ידוע'

        // Create donor
        const donor = donorRepo.create({
          legacyId: donorData.legacyId,
          idNumber: `LEGACY-${donorData.legacyId}`,
          title: donorData.title || '',
          firstName: firstName,
          lastName: lastName,
          suffix: donorData.suffix || '',
          titleEnglish: donorData.titleEnglish || '',
          firstNameEnglish: donorData.firstNameEnglish || '',
          lastNameEnglish: donorData.lastNameEnglish || '',
          isAnash: donorData.isAnash || false,
          wantsUpdates: donorData.wantsUpdates !== false,
          createdDate: new Date(donorData.createdDate),
          notes: donorData.notes || ''
        })
        await donor.save()
        donorMap.set(String(donorData.legacyId), donor)

        // Create addresses (DonorPlace)
        if (donorData.addresses && Array.isArray(donorData.addresses)) {
          for (const addressData of donorData.addresses) {
            if (!addressData.street && !addressData.city && !addressData.country) continue

            const addressType = addressTypes.get(addressData.type)
            if (!addressType) continue

            // Find matching country
            let matchedCountry = null
            if (addressData.country) {
              const countryNameClean = addressData.country.trim().toLowerCase()
              matchedCountry = allCountries.find(country => {
                const countryToMatch = country.name.trim().toLowerCase()
                const countryCodeToMatch = country.code?.trim().toLowerCase() || ''
                const countryEnToMatch = country.nameEn?.trim().toLowerCase() || ''

                // Special handling for USA variations
                const isUSA = countryNameClean === 'usa' || countryNameClean === 'us' ||
                              countryNameClean === 'united states' || countryNameClean === 'united states of america'
                const isCountryUS = countryCodeToMatch === 'us' || countryEnToMatch === 'united states'

                if (isUSA && isCountryUS) {
                  return true
                }

                return countryToMatch === countryNameClean ||
                       countryCodeToMatch === countryNameClean ||
                       countryEnToMatch === countryNameClean ||
                       countryToMatch.includes(countryNameClean) ||
                       countryNameClean.includes(countryToMatch) ||
                       countryEnToMatch.includes(countryNameClean) ||
                       countryNameClean.includes(countryEnToMatch)
              })

              if (matchedCountry) {
                countryMatchCount++
              }
            }

            // Create Place first (simplified version - not using Google Places API)
            const placeRepo = remult.repo(Place)
            const place = placeRepo.create({
              placeId: `LEGACY-${donorData.legacyId}-${addressData.type}`,
              fullAddress: [
                addressData.street,
                addressData.houseNumber,
                addressData.apartment,
                addressData.city,
                addressData.country
              ].filter(x => x).join(', '),
              placeName: addressData.description || '',
              street: addressData.street || '',
              houseNumber: addressData.houseNumber || '',
              apartment: addressData.apartment || '',
              neighborhood: addressData.neighborhood || '',
              city: addressData.city || '',
              state: addressData.state || '',
              postcode: addressData.zip || '',
              countryId: matchedCountry?.id || ''
            })
            await placeRepo.save(place)

            // Create DonorPlace
            const donorPlace = donorPlaceRepo.create({
              donor: donor,
              place: place,
              addressType: addressType,
              description: addressData.description || '',
              isPrimary: addressData.type === 'בית',
              isActive: true
            })
            await donorPlace.save()
            addressCount++
          }
        }

        // Create contacts (DonorContact)
        if (donorData.contacts && Array.isArray(donorData.contacts)) {
          for (const contactData of donorData.contacts) {
            if (!contactData.value) continue

            const contact = donorContactRepo.create({
              donor: donor,
              type: contactData.type,
              phoneNumber: contactData.type === 'phone' ? contactData.value : '',
              email: contactData.type === 'email' ? contactData.value : '',
              description: contactData.label || '',
              isPrimary: contactData.isPrimary || false,
              isActive: true
            })
            await contact.save()
            contactCount++
          }
        }

        // Create company and link to donor
        if (donorData.company && donorData.company.name) {
          const companyData = donorData.company
          const companyKey = `${companyData.name}-${companyData.address}-${companyData.cityAndZip}`

          let company = companyMap.get(companyKey)
          if (!company) {
            company = companyRepo.create({
              name: companyData.name,
              address: companyData.address,
              city: companyData.cityAndZip,
              isActive: true
            })
            await company.save()
            companyMap.set(companyKey, company)
            companyCount++
          }

          // Link company to donor
          if (donor.id && company.id) {
            donor.companyIds = [company.id]
            await donor.save()
          }
        }
      } catch (error: any) {
        console.error(`  ✗ Error importing donor ${donorData.legacyId}:`, error.message || error)
      }
    }
    console.log(`  ✓ Imported ${donorMap.size} donors`)
    console.log(`  ✓ Matched ${countryMatchCount} addresses to countries`)
    console.log(`  ✓ Created ${addressCount} donor addresses`)
    console.log(`  ✓ Created ${contactCount} donor contacts`)
    console.log(`  ✓ Created ${companyCount} unique companies`)

    // Import donations and companies
    console.log('\nImporting donations...')

    // Create or get payment methods
    const donationMethodRepo = remult.repo(DonationMethod)
    const paymentMethods = new Map<string, DonationMethod>()

    const methodNames = ['מזומן', 'תשלום עמותה', 'העברה בנקאית']
    for (const methodName of methodNames) {
      let method = await donationMethodRepo.findFirst({ name: methodName })
      if (!method) {
        method = donationMethodRepo.create({
          name: methodName,
          isActive: true
        })
        await method.save()
      }
      paymentMethods.set(methodName, method)
    }
    console.log(`  ✓ Created/found ${paymentMethods.size} payment methods`)

    // Get all banks for matching
    const { Bank } = await import('../shared/entity')
    const bankRepo = remult.repo(Bank)
    const allBanks = await bankRepo.find()
    console.log(`  ✓ Found ${allBanks.length} banks for matching`)

    // Get all organizations for matching
    const { Organization } = await import('../shared/entity')
    const organizationRepo = remult.repo(Organization)
    const allOrganizations = await organizationRepo.find()
    console.log(`  ✓ Found ${allOrganizations.length} organizations for matching`)

    let donationCount = 0
    let donationCompanyCount = 0
    let bankMatchCount = 0
    let organizationMatchCount = 0

    for (const donationData of DONATIONS_DATA) {
      try {
        const donor = donorMap.get(String(donationData.donorLegacyId))
        if (!donor) {
          console.log(`  ⚠ Skipping donation - donor ${donationData.donorLegacyId} not found`)
          continue
        }

        const paymentMethod = paymentMethods.get(donationData.paymentMethod)
        if (!paymentMethod) {
          console.log(`  ⚠ Skipping donation - payment method '${donationData.paymentMethod}' not found`)
          continue
        }

        // Create company if exists in donation data and link to donor
        if (donationData.company && donationData.company.name && donor.id) {
          const companyData = donationData.company
          const companyKey = `${companyData.name}-${companyData.address}-${companyData.city}`

          let company = companyMap.get(companyKey)
          if (!company) {
            company = companyRepo.create({
              name: companyData.name,
              address: companyData.address,
              city: companyData.city,
              isActive: true
            })
            await company.save()
            companyMap.set(companyKey, company)
            companyCount++
          }

          // Link company to donor if not already linked
          if (company.id && (!donor.companyIds || !donor.companyIds.includes(company.id))) {
            donor.companyIds = [...(donor.companyIds || []), company.id]
            await donor.save()
            donationCompanyCount++
          }
        }

        // Skip if amount is 0 or empty
        if (!donationData.amount || donationData.amount === 0) {
          console.log(`  ⚠ Skipping donation - amount is empty or zero`)
          continue
        }

        // Find matching bank by name (case insensitive, trim, remove "Bank" suffix)
        let matchedBank = null
        const bankNameFromData = (donationData as any).bankName
        if (bankNameFromData) {
          const bankNameClean = bankNameFromData.trim().toLowerCase()
            .replace(/\s+bank\s*$/i, '')
            .replace(/^bank\s+/i, '')
            .trim()

          matchedBank = allBanks.find(bank => {
            const bankNameToMatch = bank.name.trim().toLowerCase()
              .replace(/\s+bank\s*$/i, '')
              .replace(/^bank\s+/i, '')
              .trim()
            return bankNameToMatch === bankNameClean ||
                   bankNameToMatch.includes(bankNameClean) ||
                   bankNameClean.includes(bankNameToMatch)
          })

          if (matchedBank) {
            bankMatchCount++
          }
        }

        // Find matching organization by voucher number or name
        let matchedOrganization = null
        const orgNameFromData = (donationData as any).organizationName
        if (orgNameFromData) {
          const orgNameClean = orgNameFromData.trim().toLowerCase()
          matchedOrganization = allOrganizations.find(org =>
            org.name.trim().toLowerCase() === orgNameClean ||
            org.name.trim().toLowerCase().includes(orgNameClean) ||
            orgNameClean.includes(org.name.trim().toLowerCase())
          )

          if (matchedOrganization) {
            organizationMatchCount++
          }
        }

        const donation = donationRepo.create({
          donor: donor,
          amount: donationData.amount,
          currency: donationData.currency,
          donationDate: new Date(donationData.donationDate),
          donationMethod: paymentMethod,
          accountNumber: donationData.accountNumber || '',
          voucherNumber: donationData.voucherNumber || '',
          notes: donationData.notes || '',
          bankId: matchedBank?.id || '',
          organizationId: matchedOrganization?.id || '',
          isExceptional: donationData.isExceptional || false
        })
        await donation.save()
        donationCount++
      } catch (error: any) {
        console.error(`  ✗ Error importing donation:`, error.message || error)
      }
    }
    console.log(`  ✓ Imported ${donationCount} donations`)
    console.log(`  ✓ Linked ${donationCompanyCount} companies to donors from donations`)
    console.log(`  ✓ Matched ${bankMatchCount} donations to banks`)
    console.log(`  ✓ Matched ${organizationMatchCount} donations to organizations`)

    console.log('\nLegacy data import completed successfully!')
    console.log(`Summary: ${donorMap.size} donors, ${donationCount} donations`)
  } catch (error) {
    console.error('Error importing legacy data:', error)
    throw error
  }
}

// Run if called directly
if (typeof module !== 'undefined' && require.main === module) {
  const dataProvider = createPostgresConnection({
    configuration: 'heroku',
    sslInDev: !(process.env['DEV_MODE'] === 'DEV')
  })

  withRemult(async () => {
    await seedLegacyData()
  }, {
    dataProvider,
    entities
  })
    .then(() => {
      console.log('\nDone!')
      process.exit(0)
    })
    .catch(err => {
      console.error('\nError:', err)
      process.exit(1)
    })
}
