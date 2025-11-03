import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Convert Excel files to seed-data.ts
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
 * - TarichRishum -> createdDate (תאריך יצירה)
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
 * - Notes -> notes (הערות)
 * - Sort_Code -> bankName -> matched to bankId (שם בנק)
 * - Voucher_Co -> organizationName -> matched to organizationId (ארגון)
 * - Payment method: Voucher_Co = תשלום עמותה, AccountNo = העברה בנקאית, אחרת = מזומן (ברירת מחדל)
 */

interface DonorRow {
  [key: string]: any
}

interface DonationRow {
  [key: string]: any
}

function readExcelFile(filePath: string): any[] {
  try {
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' })
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return []
  }
}

/**
 * Clean email address - take only the first part before '#'
 * Example: "abingo@juno.com#mailto:abingo@juno.com#" -> "abingo@juno.com"
 */
function cleanEmail(email: string): string {
  if (!email) return ''
  return email.split('#')[0].trim()
}

/**
 * Convert Excel serial date to JavaScript Date
 * Excel stores dates as numbers (days since 1900-01-01)
 */
function excelDateToJSDate(excelDate: any): Date | null {
  // If already a valid date string, parse it
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  }

  // If it's a number (Excel serial date)
  if (typeof excelDate === 'number') {
    // Excel date starts from 1900-01-01, but Excel incorrectly treats 1900 as a leap year
    // So dates after Feb 28, 1900 need adjustment
    const excelEpoch = new Date(1899, 11, 30) // December 30, 1899
    const jsDate = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000)
    return jsDate
  }

  return null
}

function processDonors(rows: DonorRow[]): any[] {
  return rows.map((row, index) => {
    try {
      const donor: any = {
        legacyId: row['IdName'] || index + 1,
        // Hebrew names
        title: row['ToarHeb'] || '',
        firstName: row['FirstNameHeb'] || '',
        lastName: row['LastNameHeb'] || '',
        suffix: row['Siomet'] || '',
        // English names
        titleEnglish: row['ToarEng'] || '',
        firstNameEnglish: row['FirstNameEng'] || '',
        lastNameEnglish: row['LastNameEng'] || '',
        // Flags
        isAnash: row['Anash'] === true || row['Anash'] === 'true' || row['Anash'] === 1,
        wantsUpdates: true,
        createdDate: row['TarichRishum'] ? (excelDateToJSDate(row['TarichRishum']) || new Date()).toISOString() : new Date().toISOString(),
        notes: row['Notes'] || '',
        // Relationships
        fatherLegacyId: row['KodAv'] || null,
        fatherInLawLegacyId: row['KodChoten'] || null
      }

      // Addresses array
      donor.addresses = []

      // Home address (בית)
      if (row['Address'] || row['City'] || row['Country']) {
        donor.addresses.push({
          type: 'בית',
          description: row['NameHome'] || '',
          street: row['Address'] || '',
          houseNumber: row['Home'] || '',
          apartment: row['Dira'] || '',
          city: row['City'] || '',
          state: row['State'] || '',
          zip: row['Zip'] || '',
          zip2: row['Zip2'] || '',
          neighborhood: row['Shchona'] || '',
          country: row['Country'] || ''
        })
      }

      // Work address (עבודה) or Shtibl (שטיבלך)
      if (row['AddressWork'] || row['CityWork']) {
        const msShtibl = row['MsShtibl'] || 0
        const addressType = msShtibl > 0 ? 'שטיבלך' : 'עבודה'
        const description = row['Work'] || ''
        const fullDescription = msShtibl > 0 ? `${description} (מס' שטיבלך: ${msShtibl})` : description

        donor.addresses.push({
          type: addressType,
          description: fullDescription,
          street: row['AddressWork'] || '',
          houseNumber: row['HomeWork'] || '',
          apartment: row['DiraWork'] || '',
          city: row['CityWork'] || '',
          state: row['StateWork'] || '',
          zip: row['ZipWork'] || '',
          country: ''
        })
      }

      // Contacts array
      donor.contacts = []

      // Phone contacts
      if (row['Tel']) {
        donor.contacts.push({ type: 'phone', value: row['Tel'], label: 'טלפון', isPrimary: true })
      }
      if (row['Pel']) {
        donor.contacts.push({ type: 'phone', value: row['Pel'], label: 'נייד', isPrimary: !row['Tel'] })
      }
      if (row['TelNosaf']) {
        donor.contacts.push({ type: 'phone', value: row['TelNosaf'], label: 'טלפון נוסף', isPrimary: false })
      }
      if (row['Fax']) {
        donor.contacts.push({ type: 'phone', value: row['Fax'], label: 'פקס', isPrimary: false })
      }

      // Email contacts
      if (row['Email']) {
        const cleanedEmail = cleanEmail(row['Email'])
        if (cleanedEmail) {
          donor.contacts.push({ type: 'email', value: cleanedEmail, label: 'אימייל', isPrimary: true })
        }
      }
      if (row['EmailHome']) {
        const cleanedEmailHome = cleanEmail(row['EmailHome'])
        if (cleanedEmailHome) {
          donor.contacts.push({ type: 'email', value: cleanedEmailHome, label: 'אימייל בבית', isPrimary: !row['Email'] })
        }
      }

      // Company information
      if (row['Tro_Work']) {
        donor.company = {
          name: row['Tro_Work'] || '',
          address: row['Tro_AddressWork'] || '',
          cityAndZip: row['Tro_FullCity'] || ''
        }
      }

      return donor
    } catch (error) {
      console.error(`Error processing donor row ${index}:`, error)
      return null
    }
  }).filter(d => d !== null)
}

function processDonations(rows: DonationRow[]): any[] {
  let skippedNoDonor = 0
  let skippedNoAmount = 0
  const result = rows.map((row, index) => {
    try {
      // Get amount from Scom, if amount is 0 or empty, use ScomChiyuv
      let amount = row['Scom'] || 0
      if (amount === 0) {
        amount = row['ScomChiyuv'] || 0
      }

      // Skip if no valid donor ID
      if (!row['IdName'] || row['IdName'] === 0) {
        skippedNoDonor++
        return null
      }

      // Skip if no valid amount (both Scom and ScomChiyuv are 0 or empty)
      if (!amount || amount === 0) {
        skippedNoAmount++
        return null
      }

      // Determine payment method based on Excel fields
      let paymentMethod = 'מזומן' // ברירת מחדל
      if (row['Voucher_Co']) {
        paymentMethod = 'תשלום עמותה'
      } else if (row['AccountNo']) {
        paymentMethod = 'העברה בנקאית'
      }

      const donation: any = {
        donorLegacyId: row['IdName'],
        amount: Number(amount),
        currency: row['matbea'] || 'USD',
        donationDate: row['Tarich'] ? (excelDateToJSDate(row['Tarich']) || new Date()).toISOString() : new Date().toISOString(),
        campaignName: row['IdDiner'] || '',
        paymentMethod: paymentMethod,
        voucherNumber: row['Voucher_Co'] || '',
        accountNumber: row['AccountNo'] || '',
        receiptNumber: row['Kabala'] || '',
        notes: row['Notes'] || '',
        bankName: row['Sort_Code'] || '',
        organizationName: row['Voucher_Co'] ? (row['Voucher_Co']) : '',
        isExceptional: row['Hachragtit'] === true || row['Hachragtit'] === 1,
        isUrgent: row['Dachuf'] === true || row['Dachuf'] === 1,
        receiptIssued: row['KabalaMatsa'] === true || row['KabalaMatsa'] === 1
      }

      // Company information from donation record
      // Only if Tro_Work is a company name (not a personal title like Mr/Mrs/Rabbi)
      if (row['Tro_Work']) {
        const troWork = String(row['Tro_Work']).trim()
        const personalTitles = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Rabbi', 'Reb', 'הרב', 'הרה"ח', 'ר\'', 'מר', 'גב\'', 'גברת']
        const isPersonalTitle = personalTitles.some(title =>
          troWork.startsWith(title + ' ') ||
          troWork.startsWith(title + '.') ||
          troWork === title
        )

        if (!isPersonalTitle) {
          donation.company = {
            name: troWork,
            address: row['Tro_AddressWork'] || '',
            city: row['Tro_FullCity'] || row['Tro_FullCityWork'] || ''
          }
        }
      }

      return donation
    } catch (error) {
      console.error(`Error processing donation row ${index}:`, error)
      return null
    }
  }).filter(d => d !== null)

  if (skippedNoDonor > 0) {
    console.log(`  ℹ Skipped ${skippedNoDonor} donations without valid donor ID`)
  }
  if (skippedNoAmount > 0) {
    console.log(`  ℹ Skipped ${skippedNoAmount} donations without valid amount (both Scom and ScomChiyuv empty)`)
  }

  return result
}

async function convertExcelToSeed() {
  console.log('Converting Excel files to seed-data.ts...\n')

  const donorsFile = path.join(__dirname, '../assets/excels/טבלת שמות ופרטים.xlsx')
  const donationsFile = path.join(__dirname, '../assets/excels/טבלת תרומות.xlsx')

  // Read Excel files
  console.log('Reading donors file...')
  const donorRows = readExcelFile(donorsFile)
  console.log(`Found ${donorRows.length} donor rows`)

  console.log('\nReading donations file...')
  const donationRows = readExcelFile(donationsFile)
  console.log(`Found ${donationRows.length} donation rows`)

  // Process data
  console.log('\nProcessing donors...')
  const donors = processDonors(donorRows)
  console.log(`Processed ${donors.length} donors`)

  console.log('\nProcessing donations...')
  const donations = processDonations(donationRows)
  console.log(`Processed ${donations.length} donations`)

  // Generate seed-data.ts content
  const output = `import { remult, withRemult } from 'remult'
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
 * Generated on: ${new Date().toISOString()}
 * Total donors: ${donors.length}
 * Total donations: ${donations.length}
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
const DONORS_DATA = ${JSON.stringify(donors, null, 2)}

// Donations data
const DONATIONS_DATA = ${JSON.stringify(donations, null, 2)}

export async function seedLegacyData() {
  try {
    console.log('Starting legacy data import...')
    console.log(\`Importing \${DONORS_DATA.length} donors and \${DONATIONS_DATA.length} donations\`)

    // Delete existing data in correct order (foreign key constraints)
    console.log('\\nDeleting existing donations...')
    const donationRepo = remult.repo(Donation)
    const existingDonations = await donationRepo.find()
    for (const donation of existingDonations) {
      await donationRepo.delete(donation)
    }
    console.log(\`  ✓ Deleted \${existingDonations.length} existing donations\`)

    console.log('\\nDeleting existing donor contacts...')
    const donorContactRepo = remult.repo(DonorContact)
    const existingContacts = await donorContactRepo.find()
    for (const contact of existingContacts) {
      await donorContactRepo.delete(contact)
    }
    console.log(\`  ✓ Deleted \${existingContacts.length} existing donor contacts\`)

    console.log('\\nDeleting existing donor places...')
    const donorPlaceRepo = remult.repo(DonorPlace)
    const existingPlaces = await donorPlaceRepo.find()
    for (const place of existingPlaces) {
      await donorPlaceRepo.delete(place)
    }
    console.log(\`  ✓ Deleted \${existingPlaces.length} existing donor places\`)

    console.log('\\nDeleting existing places...')
    const placeRepo = remult.repo(Place)
    const existingPlaceRecords = await placeRepo.find()
    for (const place of existingPlaceRecords) {
      await placeRepo.delete(place)
    }
    console.log(\`  ✓ Deleted \${existingPlaceRecords.length} existing places\`)

    console.log('\\nDeleting existing donors...')
    const donorRepo = remult.repo(Donor)
    const existingDonors = await donorRepo.find()
    for (const donor of existingDonors) {
      await donorRepo.delete(donor)
    }
    console.log(\`  ✓ Deleted \${existingDonors.length} existing donors\`)

    console.log('\\nDeleting existing companies...')
    const companyRepo = remult.repo(Company)
    const existingCompanies = await companyRepo.find()
    for (const company of existingCompanies) {
      await companyRepo.delete(company)
    }
    console.log(\`  ✓ Deleted \${existingCompanies.length} existing companies\`)

    // Get or create address types
    console.log('\\nCreating address types...')
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
    console.log(\`  ✓ Created/found \${addressTypes.size} address types\`)

    // Import donors
    console.log('\\nImporting donors...')
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
    console.log(\`  ✓ Found \${allCountries.length} countries for matching\`)

    for (const donorData of DONORS_DATA) {
      try {
        // Handle empty names
        const firstName = donorData.firstName?.trim() || donorData.lastName || 'לא ידוע'
        const lastName = donorData.lastName?.trim() || donorData.firstName || 'לא ידוע'

        // Create donor
        const donor = donorRepo.create({
          legacyId: donorData.legacyId,
          idNumber: \`LEGACY-\${donorData.legacyId}\`,
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
              placeId: \`LEGACY-\${donorData.legacyId}-\${addressData.type}\`,
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
          const companyKey = \`\${companyData.name}-\${companyData.address}-\${companyData.cityAndZip}\`

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
        console.error(\`  ✗ Error importing donor \${donorData.legacyId}:\`, error.message || error)
      }
    }
    console.log(\`  ✓ Imported \${donorMap.size} donors\`)
    console.log(\`  ✓ Matched \${countryMatchCount} addresses to countries\`)
    console.log(\`  ✓ Created \${addressCount} donor addresses\`)
    console.log(\`  ✓ Created \${contactCount} donor contacts\`)
    console.log(\`  ✓ Created \${companyCount} unique companies\`)

    // Import donations and companies
    console.log('\\nImporting donations...')

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
    console.log(\`  ✓ Created/found \${paymentMethods.size} payment methods\`)

    // Get all banks for matching
    const { Bank } = await import('../shared/entity')
    const bankRepo = remult.repo(Bank)
    const allBanks = await bankRepo.find()
    console.log(\`  ✓ Found \${allBanks.length} banks for matching\`)

    // Get all organizations for matching
    const { Organization } = await import('../shared/entity')
    const organizationRepo = remult.repo(Organization)
    const allOrganizations = await organizationRepo.find()
    console.log(\`  ✓ Found \${allOrganizations.length} organizations for matching\`)

    let donationCount = 0
    let donationCompanyCount = 0
    let bankMatchCount = 0
    let organizationMatchCount = 0

    for (const donationData of DONATIONS_DATA) {
      try {
        const donor = donorMap.get(String(donationData.donorLegacyId))
        if (!donor) {
          console.log(\`  ⚠ Skipping donation - donor \${donationData.donorLegacyId} not found\`)
          continue
        }

        const paymentMethod = paymentMethods.get(donationData.paymentMethod)
        if (!paymentMethod) {
          console.log(\`  ⚠ Skipping donation - payment method '\${donationData.paymentMethod}' not found\`)
          continue
        }

        // Create company if exists in donation data and link to donor
        if (donationData.company && donationData.company.name && donor.id) {
          const companyData = donationData.company
          const companyKey = \`\${companyData.name}-\${companyData.address}-\${companyData.city}\`

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
          console.log(\`  ⚠ Skipping donation - amount is empty or zero\`)
          continue
        }

        // Find matching bank by name (case insensitive, trim, remove "Bank" suffix)
        let matchedBank = null
        if (donationData.bankName) {
          const bankNameClean = donationData.bankName.trim().toLowerCase()
            .replace(/\\s+bank\\s*$/i, '')
            .replace(/^bank\\s+/i, '')
            .trim()

          matchedBank = allBanks.find(bank => {
            const bankNameToMatch = bank.name.trim().toLowerCase()
              .replace(/\\s+bank\\s*$/i, '')
              .replace(/^bank\\s+/i, '')
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
        if (donationData.organizationName) {
          const orgNameClean = donationData.organizationName.trim().toLowerCase()
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
          receiptNumber: donationData.receiptNumber || '',
          accountNumber: donationData.accountNumber || '',
          voucherNumber: donationData.voucherNumber || '',
          notes: donationData.notes || '',
          bankId: matchedBank?.id || '',
          organizationId: matchedOrganization?.id || '',
          isExceptional: donationData.isExceptional || false,
          isUrgent: donationData.isUrgent || false,
          receiptIssued: donationData.receiptIssued || false
        })
        await donation.save()
        donationCount++
      } catch (error: any) {
        console.error(\`  ✗ Error importing donation:\`, error.message || error)
      }
    }
    console.log(\`  ✓ Imported \${donationCount} donations\`)
    console.log(\`  ✓ Linked \${donationCompanyCount} companies to donors from donations\`)
    console.log(\`  ✓ Matched \${bankMatchCount} donations to banks\`)
    console.log(\`  ✓ Matched \${organizationMatchCount} donations to organizations\`)

    console.log('\\nLegacy data import completed successfully!')
    console.log(\`Summary: \${donorMap.size} donors, \${donationCount} donations\`)
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
      console.log('\\nDone!')
      process.exit(0)
    })
    .catch(err => {
      console.error('\\nError:', err)
      process.exit(1)
    })
}
`

  // Write to file
  const outputFile = path.join(__dirname, 'seed-data.ts')
  fs.writeFileSync(outputFile, output, 'utf-8')

  console.log(`\n✅ Successfully generated ${outputFile}`)
  console.log(`\nStatistics:`)
  console.log(`- ${donors.length} donors`)
  console.log(`- ${donations.length} donations`)
}

// Run conversion
if (require.main === module) {
  convertExcelToSeed()
    .then(() => {
      console.log('\n✅ Conversion completed!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Conversion failed:', error)
      process.exit(1)
    })
}
