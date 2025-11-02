import { remult } from 'remult'
import { DonationMethod, Event, NoteType, Organization, User, Bank, DonorAddressType, LetterTitle, Country, Place } from '../../shared/entity'

/**
 * Seed letter titles (prefix and suffix lines for letters)
 */
async function seedLetterTitles() {
  console.log('\n--- Creating Letter Titles ---')

  // Prefix lines (שורות פתיחה)
  const prefixLines = [
    'כבוד ידידנו הנדיב הנכבד, אוהב תורה ורודף חסד',
    'לכבוד ידידנו היקר והנעלה',
    'כבוד ידידנו הנכבד והנדיב',
    'לידידנו הנעלה והיקר',
    'כבוד הרב הגאון והחסיד',
    'לכבוד החבר היקר'
  ]

  // Suffix lines (שורות סיום)
  const suffixLines = [
    'א כשר און א פרייליכען פסח',
    'א פרייליכען יום טוב',
    'בברכת גמר חתימה טובה',
    'בברכת הצלחה רבה וכט"ס',
    'בברכת כתיבה וחתימה טובה',
    'ביקרא דאורייתא וכט"ס',
    'בברכה והצלחה',
    'בכבוד רב ובברכה',
    'בברכת הרב',
    'בידידות ובברכה',
    'בכבוד ובהוקרה',
    'בברכת התורה',
    'בברכת חג שמח',
    'בברכת שבת שלום'
  ]

  const createdTitles = []

  // Create prefix lines
  for (let i = 0; i < prefixLines.length; i++) {
    const text = prefixLines[i]
    const existing = await remult.repo(LetterTitle).findFirst({ text, type: 'prefix' })
    if (!existing) {
      const letterTitle = remult.repo(LetterTitle).create({
        text,
        type: 'prefix',
        sortOrder: i,
        active: true
      })
      await remult.repo(LetterTitle).save(letterTitle)
      createdTitles.push(letterTitle)
      console.log(`  ✓ Prefix: ${text}`)
    } else {
      createdTitles.push(existing)
      console.log(`  - Prefix: ${text} (already exists)`)
    }
  }

  // Create suffix lines
  for (let i = 0; i < suffixLines.length; i++) {
    const text = suffixLines[i]
    const existing = await remult.repo(LetterTitle).findFirst({ text, type: 'suffix' })
    if (!existing) {
      const letterTitle = remult.repo(LetterTitle).create({
        text,
        type: 'suffix',
        sortOrder: i,
        active: true
      })
      await remult.repo(LetterTitle).save(letterTitle)
      createdTitles.push(letterTitle)
      console.log(`  ✓ Suffix: ${text}`)
    } else {
      createdTitles.push(existing)
      console.log(`  - Suffix: ${text} (already exists)`)
    }
  }

  return { total: createdTitles.length, prefix: prefixLines.length, suffix: suffixLines.length }
}

/**
 * Seed countries with currency information
 */
async function seedCountries() {
  console.log('\n--- Creating Countries ---')
  const repo = remult.repo(Country)

  // Currency to Symbol mapping
  const currencySymbols: { [key: string]: string } = {
    'ILS': '₪', 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$',
    'NZD': 'NZ$', 'CHF': 'CHF', 'RUB': '₽', 'JPY': '¥', 'CNY': '¥', 'INR': '₹',
    'BRL': 'R$', 'MXN': 'MX$', 'ARS': 'AR$', 'ZAR': 'R', 'DKK': 'kr', 'SEK': 'kr',
    'NOK': 'kr', 'PLN': 'zł', 'HUF': 'Ft', 'CZK': 'Kč', 'RON': 'lei', 'TRY': '₺',
    'SGD': 'S$', 'AED': 'د.إ', 'THB': '฿', 'MYR': 'RM', 'HKD': 'HK$', 'TWD': 'NT$',
    'KRW': '₩', 'VND': '₫', 'PHP': '₱', 'IDR': 'Rp', 'ISK': 'kr', 'BGN': 'лв',
    'SAR': '﷼', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'KWD': 'د.ك', 'OMR': 'ر.ع.', 'JOD': 'د.ا',
    'EGP': 'ج.م', 'MAD': 'د.م.', 'TND': 'د.ت', 'PKR': '₨', 'BDT': '৳'
  }

  const countries = [
    // מדינות עיקריות
    { name: 'ישראל', nameEn: 'Israel', code: 'IL', phonePrefix: '+972', currency: 'ILS' },
    { name: 'ארצות הברית', nameEn: 'United States', code: 'US', phonePrefix: '+1', currency: 'USD' },
    { name: 'בריטניה', nameEn: 'United Kingdom', code: 'GB', phonePrefix: '+44', currency: 'GBP' },
    { name: 'קנדה', nameEn: 'Canada', code: 'CA', phonePrefix: '+1', currency: 'CAD' },
    { name: 'אוסטרליה', nameEn: 'Australia', code: 'AU', phonePrefix: '+61', currency: 'AUD' },
    { name: 'ניו זילנד', nameEn: 'New Zealand', code: 'NZ', phonePrefix: '+64', currency: 'NZD' },

    // אירופה
    { name: 'צרפת', nameEn: 'France', code: 'FR', phonePrefix: '+33', currency: 'EUR' },
    { name: 'גרמניה', nameEn: 'Germany', code: 'DE', phonePrefix: '+49', currency: 'EUR' },
    { name: 'איטליה', nameEn: 'Italy', code: 'IT', phonePrefix: '+39', currency: 'EUR' },
    { name: 'ספרד', nameEn: 'Spain', code: 'ES', phonePrefix: '+34', currency: 'EUR' },
    { name: 'הולנד', nameEn: 'Netherlands', code: 'NL', phonePrefix: '+31', currency: 'EUR' },
    { name: 'בלגיה', nameEn: 'Belgium', code: 'BE', phonePrefix: '+32', currency: 'EUR' },
    { name: 'שוויץ', nameEn: 'Switzerland', code: 'CH', phonePrefix: '+41', currency: 'CHF' },
    { name: 'אוסטריה', nameEn: 'Austria', code: 'AT', phonePrefix: '+43', currency: 'EUR' },
    { name: 'פולין', nameEn: 'Poland', code: 'PL', phonePrefix: '+48', currency: 'PLN' },
    { name: 'רוסיה', nameEn: 'Russia', code: 'RU', phonePrefix: '+7', currency: 'RUB' },

    // אסיה
    { name: 'סין', nameEn: 'China', code: 'CN', phonePrefix: '+86', currency: 'CNY' },
    { name: 'יפן', nameEn: 'Japan', code: 'JP', phonePrefix: '+81', currency: 'JPY' },
    { name: 'הודו', nameEn: 'India', code: 'IN', phonePrefix: '+91', currency: 'INR' },
    { name: 'דרום קוריאה', nameEn: 'South Korea', code: 'KR', phonePrefix: '+82', currency: 'KRW' },
    { name: 'תאילנד', nameEn: 'Thailand', code: 'TH', phonePrefix: '+66', currency: 'THB' },
    { name: 'סינגפור', nameEn: 'Singapore', code: 'SG', phonePrefix: '+65', currency: 'SGD' },

    // אמריקה הלטינית
    { name: 'ברזיל', nameEn: 'Brazil', code: 'BR', phonePrefix: '+55', currency: 'BRL' },
    { name: 'מקסיקו', nameEn: 'Mexico', code: 'MX', phonePrefix: '+52', currency: 'MXN' },
    { name: 'ארגנטינה', nameEn: 'Argentina', code: 'AR', phonePrefix: '+54', currency: 'ARS' },

    // המזרח התיכון
    { name: 'טורקיה', nameEn: 'Turkey', code: 'TR', phonePrefix: '+90', currency: 'TRY' },
    { name: 'איחוד האמירויות', nameEn: 'United Arab Emirates', code: 'AE', phonePrefix: '+971', currency: 'AED' },
    { name: 'ערב הסעודית', nameEn: 'Saudi Arabia', code: 'SA', phonePrefix: '+966', currency: 'SAR' },

    // אפריקה
    { name: 'דרום אפריקה', nameEn: 'South Africa', code: 'ZA', phonePrefix: '+27', currency: 'ZAR' },
    { name: 'מצרים', nameEn: 'Egypt', code: 'EG', phonePrefix: '+20', currency: 'EGP' },
    { name: 'מרוקו', nameEn: 'Morocco', code: 'MA', phonePrefix: '+212', currency: 'MAD' }
  ]

  let created = 0
  let updated = 0

  for (const countryData of countries) {
    try {
      const existing = await repo.findFirst({ name: countryData.name })

      if (!existing) {
        const country = repo.create()
        country.name = countryData.name
        country.nameEn = countryData.nameEn
        country.code = countryData.code
        country.phonePrefix = countryData.phonePrefix
        country.currency = countryData.currency
        country.currencySymbol = currencySymbols[countryData.currency] || countryData.currency
        country.isActive = true
        await country.save()
        created++
        console.log(`  ✓ ${countryData.name} (${country.currencySymbol})`)
      } else {
        // עדכון מדינה קיימת אם חסרים נתונים
        let needsUpdate = false
        if (!existing.currencySymbol && countryData.currency) {
          existing.currencySymbol = currencySymbols[countryData.currency] || countryData.currency
          needsUpdate = true
        }
        if (needsUpdate) {
          await existing.save()
          updated++
          console.log(`  - ${countryData.name} (updated)`)
        } else {
          console.log(`  - ${countryData.name} (already exists)`)
        }
      }
    } catch (error) {
      console.error(`  ✗ Error processing country ${countryData.name}:`, error)
    }
  }

  return { created, updated, total: countries.length }
}

/**
 * Seed infrastructure data
 * This script creates all the basic infrastructure data needed for the donation system
 */
export async function seedInfrastructure() {
  console.log('Starting infrastructure seeding...')

  try {
    // Create donation methods
    console.log('\n--- Creating Donation Methods ---')
    const methods = [
      { name: 'מזומן', type: 'cash' as const, description: 'תשלום במזומן', feePercentage: 0, fixedFee: 0 },
      { name: 'צק', type: 'check' as const, description: 'תשלום בצק', feePercentage: 0, fixedFee: 5 },
      { name: 'כרטיס אשראי', type: 'credit_card' as const, description: 'תשלום בכרטיס אשראי', feePercentage: 2.5, fixedFee: 0 },
      { name: 'העברה בנקאית', type: 'bank_transfer' as const, description: 'העברה בנקאית', feePercentage: 0, fixedFee: 2 },
      { name: 'הו"ק', type: 'standing_order' as const, description: 'הוראת קבע', feePercentage: 0, fixedFee: 0 },
      { name: 'עמותה', type: 'association' as const, description: 'עמותה', feePercentage: 0, fixedFee: 0 }
    ]

    const createdMethods = []
    for (const methodData of methods) {
      const existing = await remult.repo(DonationMethod).findFirst({ name: methodData.name })
      if (!existing) {
        const method = remult.repo(DonationMethod).create(methodData)
        await method.save()
        createdMethods.push(method)
        console.log(`✓ Donation method '${methodData.name}' created`)
      } else {
        createdMethods.push(existing)
        console.log(`- Donation method '${methodData.name}' already exists`)
      }
    }

    // Create donor address types
    console.log('\n--- Creating Donor Address Types ---')
    const addressTypesData = [
      { name: 'בית', description: 'כתובת מגורים ראשית' },
      { name: 'שטיבלך', description: 'בית כנסת או מקום תפילה' },
      { name: 'עבודה', description: 'מקום עבודה' },
      { name: 'נופש', description: 'כתובת נופש או משנית' }
    ]
    const createdAddressTypes = []

    for (const typeData of addressTypesData) {
      const existing = await remult.repo(DonorAddressType).findFirst({ name: typeData.name })
      if (!existing) {
        const addressType = remult.repo(DonorAddressType).create({
          name: typeData.name,
          description: typeData.description,
          isActive: true
        })
        await remult.repo(DonorAddressType).save(addressType)
        createdAddressTypes.push(addressType)
        console.log(`✓ Address type '${typeData.name}' created`)
      } else {
        createdAddressTypes.push(existing)
        console.log(`- Address type '${typeData.name}' already exists`)
      }
    }

    // Create basic events
    console.log('\n--- Creating Events ---')
    const events = [
      { description: 'יום הולדת', type: 'personal', isRequired: false, sortOrder: 0, category: 'אישי' },
      { description: 'יום נישואין', type: 'personal', isRequired: false, sortOrder: 1, category: 'אישי' },
      { description: 'יארצייט אבא', type: 'personal', isRequired: false, sortOrder: 2, category: 'יארצייט' },
      { description: 'יארצייט אמא', type: 'personal', isRequired: false, sortOrder: 3, category: 'יארצייט' },
      { description: 'יארצייט בן/בת זוג', type: 'personal', isRequired: false, sortOrder: 4, category: 'יארצייט' },
      { description: 'בר מצווה', type: 'personal', isRequired: false, sortOrder: 5, category: 'דתי' },
      { description: 'בת מצווה', type: 'personal', isRequired: false, sortOrder: 6, category: 'דתי' },
      { description: 'יום השנה', type: 'personal', isRequired: false, sortOrder: 7, category: 'אישי' },
      { description: 'סיום לימודים', type: 'personal', isRequired: false, sortOrder: 8, category: 'אישי' },
      { description: 'עלייה לתורה', type: 'personal', isRequired: false, sortOrder: 9, category: 'דתי' },
    ]

    const createdEvents = []
    for (const eventData of events) {
      const existing = await remult.repo(Event).findFirst({ description: eventData.description })
      if (!existing) {
        const event = remult.repo(Event).create(eventData)
        await event.save()
        createdEvents.push(event)
        console.log(`✓ Event '${eventData.description}' created`)
      } else {
        createdEvents.push(existing)
        console.log(`- Event '${eventData.description}' already exists`)
      }
    }

    // Create note types
    console.log('\n--- Creating Note Types ---')
    const noteTypeNames = [
      'הערות',
      'הקשר לישיבה',
      'זיהוי אישי',
      'מקורבים',
      'סדרי עדיפויות',
      'פרוייקט חיים',
      'קטגורית תורן',
      'ריגושים',
      'שייכות מגזרית',
      'תחביבים אישיים'
    ]

    const createdNoteTypes = []
    for (let i = 0; i < noteTypeNames.length; i++) {
      const name = noteTypeNames[i]
      const existing = await remult.repo(NoteType).findFirst({ name })
      if (!existing) {
        const noteType = remult.repo(NoteType).create({
          name,
          sortOrder: i,
          isActive: true
        })
        await remult.repo(NoteType).save(noteType)
        createdNoteTypes.push(noteType)
        console.log(`✓ Note type '${name}' created`)
      } else {
        createdNoteTypes.push(existing)
        console.log(`- Note type '${name}' already exists`)
      }
    }

    // Create organizations with places
    // Note: placeId is temporary and should be updated with real Google Place IDs later
    console.log('\n--- Creating Organizations ---')
    const organizationsData = [
      {
        name: 'Donors',
        address: 'New York',
        city: 'New York',
        state: 'New York',
        stateCode: 'NY',
        countryCode: 'US'
      },
      {
        name: 'Ojc',
        address: '40 Wall Street, 36th Floor, Suite 3602, New York, NY 10005',
        city: 'New York',
        state: 'New York',
        stateCode: 'NY',
        postcode: '10005',
        countryCode: 'US'
      },
      {
        name: 'Pledger',
        address: 'San Francisco, CA',
        city: 'San Francisco',
        state: 'California',
        stateCode: 'CA',
        countryCode: 'US'
      },
      {
        name: 'Friends Of Mosdot Goor',
        address: '1310 48th Street, Brooklyn, NY',
        city: 'Brooklyn',
        state: 'New York',
        stateCode: 'NY',
        countryCode: 'US'
      },
      {
        name: 'West Coast Vaad HaChesed',
        address: '7220 Beverly Blvd, Suite 208, Los Angeles, CA 90036',
        city: 'Los Angeles',
        state: 'California',
        stateCode: 'CA',
        postcode: '90036',
        countryCode: 'US'
      },
      {
        name: 'Schwab Charitable',
        address: '211 Main Street, San Francisco, CA 94105',
        city: 'San Francisco',
        state: 'California',
        stateCode: 'CA',
        postcode: '94105',
        countryCode: 'US'
      },
      {
        name: 'Nadven',
        address: 'New York',
        city: 'New York',
        state: 'New York',
        stateCode: 'NY',
        countryCode: 'US'
      },
      {
        name: 'Fidelity',
        address: '67 West Street, Unit 2, Medfield, MA 02052',
        city: 'Medfield',
        state: 'Massachusetts',
        stateCode: 'MA',
        postcode: '02052',
        countryCode: 'US'
      },
      {
        name: 'DAF giving 360',
        address: '211 Main Street, San Francisco, CA 94105',
        city: 'San Francisco',
        state: 'California',
        stateCode: 'CA',
        postcode: '94105',
        countryCode: 'US'
      }
    ]

    const createdOrganizations = []
    for (const orgData of organizationsData) {
      const existing = await remult.repo(Organization).findFirst({ name: orgData.name })
      if (!existing) {
        // Find the country
        const country = await remult.repo(Country).findFirst({ code: orgData.countryCode })

        // Create place for organization
        // Using temporary placeId - should be replaced with real Google Place ID
        const tempPlaceId = `temp-org-${orgData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`

        // Check if place already exists by checking fullAddress to avoid duplicates
        let place = await remult.repo(Place).findFirst({
          fullAddress: orgData.address,
          city: orgData.city
        })

        if (!place) {
          place = remult.repo(Place).create({
            placeId: tempPlaceId,
            fullAddress: orgData.address,
            city: orgData.city,
            state: orgData.state,
            postcode: orgData.postcode,
            countryId: country?.id
          })
          await remult.repo(Place).save(place)
        }

        // Create organization and link to place.id (UUID, not Google placeId)
        const organization = remult.repo(Organization).create({
          name: orgData.name,
          placeId: place.id,  // This is the UUID (place.id), not the Google placeId
          currency: country?.currency || 'USD',
          isActive: true
        })
        await organization.save()
        createdOrganizations.push(organization)
        console.log(`✓ ${orgData.name} (${orgData.city}, ${orgData.stateCode})`)
      } else {
        createdOrganizations.push(existing)
        console.log(`- ${orgData.name} (already exists)`)
      }
    }

    // Create users
    console.log('\n--- Creating Users ---')
    const userData = [
      { name: 'אדמין', admin: true, commission: 0, password: '123456' },
      { name: 'ראש ישיבה', donator: true, commission: 0, password: '123456' },
      { name: 'משה ראובן', donator: true, commission: 5, password: '123456' },
      { name: 'יוסף חיים', donator: true, commission: 0, password: '123456' },
      { name: 'אברהם פסח', donator: true, commission: 0, password: '123456' },
      { name: 'שלמה', donator: true, commission: 0, password: '123456' },
      { name: 'יעקב', admin: true, commission: 0, password: '123456' }
    ]

    let admin: User | undefined
    for (const userInfo of userData) {
      let user = await remult.repo(User).findFirst({ name: userInfo.name })
      if (!user) {
        user = remult.repo(User).create({
          name: userInfo.name,
          admin: userInfo.admin || false,
          donator: userInfo.donator || false,
          commission: userInfo.commission,
          disabled: false
        })
        await user.hashAndSetPassword(userInfo.password)
        await user.save()
        console.log(`✓ User '${userInfo.name}' created with commission ${userInfo.commission}%`)
      } else {
        // Update existing user with commission
        user.commission = userInfo.commission
        if (userInfo.admin) user.admin = true
        if (userInfo.donator) user.donator = true
        await user.save()
        console.log(`- User '${userInfo.name}' updated with commission ${userInfo.commission}%`)
      }

      // Keep reference to admin user
      if (userInfo.name === 'אדמין') {
        admin = user
      }
    }

    // Create banks with places
    // Note: placeId is temporary and should be updated with real Google Place IDs later
    console.log('\n--- Creating Banks ---')
    const banksData = [
      { name: 'AmeriCU Credit Union', state: 'New York', stateHe: 'ניו יורק', countryCode: 'US' },
      { name: 'Andrews FCU', state: 'Maryland', stateHe: 'מרילנד', countryCode: 'US' },
      { name: 'Armed Forces Bank', state: 'Kansas', stateHe: 'קנזס', countryCode: 'US' },
      { name: 'Banco Popular', state: 'Puerto Rico/New York', stateHe: 'פוארטו ריקו/ניו יורק', countryCode: 'US' },
      { name: 'Bank of America', state: 'North Carolina', stateHe: 'צפון קרוליינה', countryCode: 'US' },
      { name: 'Bank of Guam', state: 'Guam', stateHe: 'גואם', countryCode: 'US' },
      { name: 'Bank of Hawaii', state: 'Hawaii', stateHe: 'הוואי', countryCode: 'US' },
      { name: 'Bank of Pensacola', state: 'Florida', stateHe: 'פלורידה', countryCode: 'US' },
      { name: 'Barksdale FCU', state: 'Louisiana', stateHe: 'לואיזיאנה', countryCode: 'US' },
      { name: 'Blue FCU', state: 'Colorado/Wyoming', stateHe: 'קולורדו/ויומינג', countryCode: 'US' },
      { name: 'Border FCU', state: 'Texas', stateHe: 'טקסס', countryCode: 'US' },
      { name: 'Broadway Bank', state: 'Texas', stateHe: 'טקסס', countryCode: 'US' },
      { name: 'CBC FCU', state: 'Texas', stateHe: 'טקסס', countryCode: 'US' },
      { name: 'Cedar Point FCU', state: 'Maryland', stateHe: 'מרילנד', countryCode: 'US' },
      { name: 'Central Coast FCU', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'Central National Bank & Trust', state: 'Oklahoma', stateHe: 'אוקלהומה', countryCode: 'US' },
      { name: 'Citizens National Bank', state: 'Massachusetts', stateHe: 'מסצ\'וסטס', countryCode: 'US' },
      { name: 'City National Bank', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'Congressional FCU', state: 'Virginia/D.C.', stateHe: 'וירג\'יניה/וושינגטון די.סי.', countryCode: 'US' },
      { name: 'CPM FCU', state: 'South Carolina', stateHe: 'דרום קרוליינה', countryCode: 'US' },
      { name: 'Eagle Bank', state: 'Maryland', stateHe: 'מרילנד', countryCode: 'US' },
      { name: 'Eglin FCU', state: 'Florida', stateHe: 'פלורידה', countryCode: 'US' },
      { name: 'ENT CU', state: 'Colorado', stateHe: 'קולורדו', countryCode: 'US' },
      { name: 'Fifth Third Bank', state: 'Ohio', stateHe: 'אוהיו', countryCode: 'US' },
      { name: 'First Arkansas Bank & Trust', state: 'Arkansas', stateHe: 'ארקנסו', countryCode: 'US' },
      { name: 'First Citizens Bank & Trust Co.', state: 'North Carolina', stateHe: 'צפון קרוליינה', countryCode: 'US' },
      { name: 'First Hawaiian Bank', state: 'Hawaii', stateHe: 'הוואי', countryCode: 'US' },
      { name: 'First National Bank Alaska', state: 'Alaska', stateHe: 'אלסקה', countryCode: 'US' },
      { name: 'First National Bank of Fort Smith', state: 'Arkansas', stateHe: 'ארקנסו', countryCode: 'US' },
      { name: 'First Savings Bank', state: 'South Dakota', stateHe: 'דרום דקוטה', countryCode: 'US' },
      { name: 'First Tennessee Bank', state: 'Tennessee', stateHe: 'טנסי', countryCode: 'US' },
      { name: 'FNB Community Bank', state: 'Multiple Locations', stateHe: 'מוסדות רבים', countryCode: 'US' },
      { name: 'FNBT.Com Bank', state: 'Florida', stateHe: 'פלורידה', countryCode: 'US' },
      { name: 'Foothills Credit Union', state: 'Colorado', stateHe: 'קולורדו', countryCode: 'US' },
      { name: 'Fort Hood NB', state: 'Texas', stateHe: 'טקסס', countryCode: 'US' },
      { name: 'Fort Sill NB', state: 'Oklahoma', stateHe: 'אוקלהומה', countryCode: 'US' },
      { name: 'Freestar Financial CU', state: 'Michigan', stateHe: 'מישיגן', countryCode: 'US' },
      { name: 'Frontwave CU', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'Great Western Bank', state: 'South Dakota', stateHe: 'דרום דקוטה', countryCode: 'US' },
      { name: 'Hancock Bank', state: 'Mississippi', stateHe: 'מיסיסיפי', countryCode: 'US' },
      { name: 'Hanscom FCU', state: 'Massachusetts', stateHe: 'מסצ\'וסטס', countryCode: 'US' },
      { name: 'Intrust Bank', state: 'Kansas', stateHe: 'קנזס', countryCode: 'US' },
      { name: 'J.P. Morgan Chase Bank', state: 'New York', stateHe: 'ניו יורק', countryCode: 'US' },
      { name: 'Kitsap Credit Union', state: 'Washington', stateHe: 'וושינגטון', countryCode: 'US' },
      { name: 'Lakehurst Naval FCU', state: 'New Jersey', stateHe: 'ניו ג\'רזי', countryCode: 'US' },
      { name: 'Langley FCU', state: 'Virginia', stateHe: 'וירג\'יניה', countryCode: 'US' },
      { name: 'Magnolia FCU', state: 'Mississippi', stateHe: 'מיסיסיפי', countryCode: 'US' },
      { name: 'Marine Federal CU', state: 'North Carolina', stateHe: 'צפון קרוליינה', countryCode: 'US' },
      { name: 'National Institutes of Health FCU', state: 'Maryland', stateHe: 'מרילנד', countryCode: 'US' },
      { name: 'Navy FCU', state: 'Virginia', stateHe: 'וירג\'יניה', countryCode: 'US' },
      { name: 'NBC Oklahoma', state: 'Oklahoma', stateHe: 'אוקלהומה', countryCode: 'US' },
      { name: 'New Mexico Bank & Trust', state: 'New Mexico', stateHe: 'ניו מקסיקו', countryCode: 'US' },
      { name: 'North Star CCU', state: 'North Dakota', stateHe: 'צפון דקוטה', countryCode: 'US' },
      { name: 'Nymeo FCU', state: 'Maryland', stateHe: 'מרילנד', countryCode: 'US' },
      { name: 'Otero FCU', state: 'New Mexico', stateHe: 'ניו מקסיקו', countryCode: 'US' },
      { name: 'Pen Air FCU', state: 'Florida', stateHe: 'פלורידה', countryCode: 'US' },
      { name: 'Pentagon Federal Credit Union', state: 'Virginia', stateHe: 'וירג\'יניה', countryCode: 'US' },
      { name: 'Regions Bank', state: 'Alabama', stateHe: 'אלבמה', countryCode: 'US' },
      { name: 'RIA FCU', state: 'Iowa', stateHe: 'איווה', countryCode: 'US' },
      { name: 'Robins Financial Credit Union', state: 'Georgia', stateHe: 'ג\'ורג\'יה', countryCode: 'US' },
      { name: 'Royal Bank of Canada', state: 'Canada', stateHe: 'קנדה', countryCode: 'CA' },
      { name: 'Sabine State Bank & Trust', state: 'Louisiana', stateHe: 'לואיזיאנה', countryCode: 'US' },
      { name: 'SAC Federal Credit Union', state: 'Nebraska', stateHe: 'נברסקה', countryCode: 'US' },
      { name: 'Safe Credit Union', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'Service CU', state: 'New Hampshire', stateHe: 'ניו המפשייר', countryCode: 'US' },
      { name: 'Sierra Central CU', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'Sioux Empire FCU', state: 'South Dakota', stateHe: 'דרום דקוטה', countryCode: 'US' },
      { name: 'State Bank of Southern Utah', state: 'Utah', stateHe: 'יוטה', countryCode: 'US' },
      { name: 'Suntrust Bank', state: 'Georgia', stateHe: 'ג\'ורג\'יה', countryCode: 'US' },
      { name: 'Synovus Bank', state: 'Georgia', stateHe: 'ג\'ורג\'יה', countryCode: 'US' },
      { name: 'TD Bank', state: 'New Jersey', stateHe: 'ניו ג\'רזי', countryCode: 'US' },
      { name: 'The Heritage Bank', state: 'Georgia', stateHe: 'ג\'ורג\'יה', countryCode: 'US' },
      { name: 'The Peoples Bank', state: 'Multiple Locations', stateHe: 'מוסדות רבים', countryCode: 'US' },
      { name: 'Trustmark National Bank', state: 'Mississippi', stateHe: 'מיסיסיפי', countryCode: 'US' },
      { name: 'Tyndall FCU', state: 'Florida', stateHe: 'פלורידה', countryCode: 'US' },
      { name: 'UMB Bank', state: 'Missouri', stateHe: 'מיזורי', countryCode: 'US' },
      { name: 'United Bank', state: 'West Virginia', stateHe: 'וירג\'יניה המערבית', countryCode: 'US' },
      { name: 'US Bank', state: 'Minnesota', stateHe: 'מינסוטה', countryCode: 'US' },
      { name: 'Washington Federal', state: 'Washington', stateHe: 'וושינגטון', countryCode: 'US' },
      { name: 'Wells Fargo', state: 'California', stateHe: 'קליפורניה', countryCode: 'US' },
      { name: 'White Sands FCU', state: 'New Mexico', stateHe: 'ניו מקסיקו', countryCode: 'US' }
    ]

    const createdBanks = []
    for (const bankData of banksData) {
      const existing = await remult.repo(Bank).findFirst({ name: bankData.name })
      if (!existing) {
        // Find the country
        const country = await remult.repo(Country).findFirst({ code: bankData.countryCode })

        // Create place for bank
        // Using temporary placeId - should be replaced with real Google Place ID
        const tempPlaceId = `temp-bank-${bankData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
        const fullAddress = `${bankData.state}, ${country?.nameEn || bankData.countryCode}`

        // Check if place already exists by checking fullAddress and city to avoid duplicates
        let place = await remult.repo(Place).findFirst({
          fullAddress: fullAddress,
          city: bankData.state
        })

        if (!place) {
          place = remult.repo(Place).create({
            placeId: tempPlaceId,
            fullAddress: fullAddress,
            city: bankData.state,
            state: bankData.state,
            countryId: country?.id
          })
          await remult.repo(Place).save(place)
        }

        // Create bank and link to place.id (UUID, not Google placeId)
        const bank = remult.repo(Bank).create({
          name: bankData.name,
          placeId: place.id,  // This is the UUID (place.id), not the Google placeId
          currency: country?.currency || 'USD',
          isActive: true
        })
        await bank.save()
        createdBanks.push(bank)
        console.log(`✓ ${bankData.name} (${bankData.stateHe})`)
      } else {
        createdBanks.push(existing)
        console.log(`- ${bankData.name} (already exists)`)
      }
    }

    // Create letter titles
    const letterTitlesResult = await seedLetterTitles()

    // Create countries
    const countriesResult = await seedCountries()

    console.log('\n=== Infrastructure Seeding Completed Successfully! ===')
    console.log(`Created:`)
    console.log(`- ${createdMethods.length} donation methods`)
    console.log(`- ${createdAddressTypes.length} donor address types`)
    console.log(`- ${createdEvents.length} events`)
    console.log(`- ${createdNoteTypes.length} note types`)
    console.log(`- ${createdOrganizations.length} organizations`)
    console.log(`- ${userData.length} users`)
    console.log(`- ${createdBanks.length} banks`)
    console.log(`- ${letterTitlesResult.total} letter titles (${letterTitlesResult.prefix} prefix, ${letterTitlesResult.suffix} suffix)`)
    console.log(`- ${countriesResult.total} countries (${countriesResult.created} created, ${countriesResult.updated} updated)`)

  } catch (error) {
    console.error('Error seeding infrastructure:', error)
    throw error
  }
}

// אם רצים את הקובץ ישירות - רק בסביבת Node.js
if (typeof module !== 'undefined' && require.main === module) {
  seedInfrastructure()
    .then(() => {
      console.log('Done!')
      process.exit(0)
    })
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}
