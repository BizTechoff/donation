import { remult } from 'remult'
import { createPostgresConnection } from 'remult/postgres'
import { User, Donor, Donation, Campaign, DonationMethod, StandingOrder, Reminder, Certificate, Event, DonorEvent } from '../shared/entity'

// Initialize Remult with database connection
async function initRemult() {
  const dataProvider = createPostgresConnection({
    configuration: 'heroku',
    sslInDev: !(process.env['DEV_MODE'] === 'DEV')
  })
  
  remult.dataProvider = await dataProvider
}

export async function seedDatabase() {
  console.log('Starting database seeding...')

  try {
    // Create admin user
    let admin = await remult.repo(User).findFirst({ name: 'admin' })
    if (!admin) {
      admin = remult.repo(User).create({
        name: 'admin',
        admin: true,
        disabled: false
      })
      await admin.hashAndSetPassword('123456')
      await admin.save()
      console.log('Admin user created')
    }
    
    // Create admin user
    let anonimi = await remult.repo(User).findFirst({ name: 'anonimi' })
    if (!anonimi) {
      admin = remult.repo(User).create({
        name: 'anonimi',
        donator: true,
        disabled: false
      })
      await admin.hashAndSetPassword('123456')
      await admin.save()
      console.log('Anonimi user created')
    }

    // Create donation methods
    const methods = [
      { name: 'מזומן', type: 'cash' as const, description: 'תשלום במזומן', feePercentage: 0, fixedFee: 0 },
      { name: 'צק', type: 'check' as const, description: 'תשלום בצק', feePercentage: 0, fixedFee: 5 },
      { name: 'כרטיס אשראי', type: 'credit_card' as const, description: 'תשלום בכרטיס אשראי', feePercentage: 2.5, fixedFee: 0 },
      { name: 'העברה בנקאית', type: 'bank_transfer' as const, description: 'העברה בנקאית', feePercentage: 0, fixedFee: 2 },
      { name: 'PayPal', type: 'paypal' as const, description: 'תשלום דרך PayPal', feePercentage: 3.4, fixedFee: 1.2 },
    ]

    const createdMethods = []
    for (const methodData of methods) {
      const existing = await remult.repo(DonationMethod).findFirst({ name: methodData.name })
      if (!existing) {
        const method = remult.repo(DonationMethod).create(methodData)
        await method.save()
        createdMethods.push(method)
        console.log(`Donation method '${methodData.name}' created`)
      } else {
        createdMethods.push(existing)
      }
    }

    // Create campaigns
    const campaigns = [
      {
        name: 'בניין בית המדרש החדש',
        description: 'קמפיין לבניית בית מדרש חדש ומודרני לקהילה',
        targetAmount: 500000,
        raisedAmount: 125000,
        status: 'active' as const,
        category: 'building',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      },
      {
        name: 'מלגות לתלמידי ישיבה',
        description: 'מתן מלגות לתלמידי ישיבה מצטיינים',
        targetAmount: 200000,
        raisedAmount: 85000,
        status: 'active' as const,
        category: 'education',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-08-31')
      },
      {
        name: 'עזרה לנזקקים',
        description: 'חלוקת מזון וסיוע למשפחות נזקקות',
        targetAmount: 100000,
        raisedAmount: 67000,
        status: 'active' as const,
        category: 'charity',
        startDate: new Date('2024-01-01')
      }
    ]

    const createdCampaigns = []
    for (const campaignData of campaigns) {
      const existing = await remult.repo(Campaign).findFirst({ name: campaignData.name })
      if (!existing) {
        const campaign = remult.repo(Campaign).create(campaignData)
        await campaign.save()
        createdCampaigns.push(campaign)
        console.log(`Campaign '${campaignData.name}' created`)
      } else {
        createdCampaigns.push(existing)
      }
    }

    // Create donors
    const donors = [
      {
        firstName: 'אברהם',
        lastName: 'כהן',
        idNumber: '123456789',
        email: 'avraham.cohen@example.com',
        phone: '050-1234567',
        address: 'רחוב הרב קוק 15',
        city: 'תל אביב',
        zipCode: '6423915',
        country: 'ישראל',
        birthDate: new Date('1975-05-15'),
        preferredLanguage: 'he' as const,
        wantsUpdates: true,
        wantsTaxReceipts: true
      },
      {
        firstName: 'שרה',
        lastName: 'לוי',
        idNumber: '987654321',
        email: 'sarah.levi@example.com',
        phone: '052-9876543',
        address: 'רחוב הרצל 25',
        city: 'חיפה',
        zipCode: '3429504',
        country: 'ישראל',
        birthDate: new Date('1980-08-22'),
        preferredLanguage: 'he' as const,
        wantsUpdates: true,
        wantsTaxReceipts: true
      },
      {
        firstName: 'דוד',
        lastName: 'רוזן',
        idNumber: '456789123',
        email: 'david.rosen@example.com',
        phone: '054-4567891',
        address: 'רחוב בן גוריון 12',
        city: 'ירושלים',
        zipCode: '9434015',
        country: 'ישראל',
        birthDate: new Date('1970-12-03'),
        preferredLanguage: 'he' as const,
        wantsUpdates: false,
        wantsTaxReceipts: true
      },
      {
        firstName: 'מרים',
        lastName: 'שמיץ',
        idNumber: '789123456',
        email: 'miriam.schmitz@example.com',
        phone: '053-7891234',
        address: 'רחוב ביאלק 8',
        city: 'בני ברק',
        zipCode: '5120235',
        country: 'ישראל',
        birthDate: new Date('1985-03-18'),
        preferredLanguage: 'he' as const,
        wantsUpdates: true,
        wantsTaxReceipts: false
      },
      {
        firstName: 'יוסף',
        lastName: 'גולדברג',
        idNumber: '321654987',
        email: 'yosef.goldberg@example.com',
        phone: '055-3216549',
        address: 'רחוב רמבם 33',
        city: 'פתח תקווה',
        zipCode: '4927435',
        country: 'ישראל',
        birthDate: new Date('1968-07-11'),
        preferredLanguage: 'he' as const,
        wantsUpdates: true,
        wantsTaxReceipts: true
      },
      // Additional donors for map testing
      { firstName: 'אליעזר', lastName: 'בן דוד', idNumber: '111222333', email: 'eliezer@example.com', phone: '050-1112223', address: 'רחוב המלך ג\'ורג\' 45', city: 'נתניה', zipCode: '4224510', country: 'ישראל', birthDate: new Date('1982-04-20'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'רחל', lastName: 'אברהמי', idNumber: '444555666', email: 'rachel@example.com', phone: '052-4445556', address: 'רחוב וייצמן 78', city: 'רמת גן', zipCode: '5265601', country: 'ישראל', birthDate: new Date('1975-11-15'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'משה', lastName: 'יצחקי', idNumber: '777888999', email: 'moshe@example.com', phone: '054-7778889', address: 'רחוב אחד העם 12', city: 'רחובות', zipCode: '7610001', country: 'ישראל', birthDate: new Date('1971-09-08'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'אסתר', lastName: 'כהן לוי', idNumber: '222333444', email: 'esther@example.com', phone: '053-2223334', address: 'רחוב לילינבלום 56', city: 'הוד השרון', zipCode: '4528208', country: 'ישראל', birthDate: new Date('1988-01-30'), preferredLanguage: 'he' as const, wantsUpdates: false, wantsTaxReceipts: true },
      { firstName: 'יעקב', lastName: 'אשכנזי', idNumber: '555666777', email: 'yaakov@example.com', phone: '055-5556667', address: 'רחוב רוטשילד 89', city: 'ראשון לציון', zipCode: '7546312', country: 'ישראל', birthDate: new Date('1965-06-12'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'זהבה', lastName: 'מזרחי', idNumber: '888999000', email: 'zehava@example.com', phone: '050-8889990', address: 'רחוב בן יהודה 23', city: 'אשדוד', zipCode: '7761223', country: 'ישראל', birthDate: new Date('1979-03-25'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: false },
      { firstName: 'אהרון', lastName: 'ספרדי', idNumber: '000111222', email: 'aharon@example.com', phone: '052-0001112', address: 'רחוב המכבים 67', city: 'באר שבע', zipCode: '8414101', country: 'ישראל', birthDate: new Date('1973-12-18'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'נעמי', lastName: 'קורן', idNumber: '333444555', email: 'naomi@example.com', phone: '054-3334445', address: 'רחוב הנביאים 34', city: 'אילת', zipCode: '8811235', country: 'ישראל', birthDate: new Date('1985-08-07'), preferredLanguage: 'he' as const, wantsUpdates: false, wantsTaxReceipts: true },
      { firstName: 'חיים', lastName: 'בן עמי', idNumber: '666777888', email: 'chaim@example.com', phone: '053-6667778', address: 'רחוב העצמאות 91', city: 'עפולה', zipCode: '1810001', country: 'ישראל', birthDate: new Date('1969-10-14'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'שושנה', lastName: 'דהן', idNumber: '999000111', email: 'shoshana@example.com', phone: '055-9990001', address: 'רחוב הגליל 15', city: 'טבריה', zipCode: '1410001', country: 'ישראל', birthDate: new Date('1977-05-23'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'גדעון', lastName: 'אלמוג', idNumber: '123123123', email: 'gideon@example.com', phone: '050-1231231', address: 'רחוב הכרמל 42', city: 'קרית שמונה', zipCode: '1101101', country: 'ישראל', birthDate: new Date('1983-02-11'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: false },
      { firstName: 'דבורה', lastName: 'חברון', idNumber: '456456456', email: 'deborah@example.com', phone: '052-4564564', address: 'רחוב הזיתים 28', city: 'צפת', zipCode: '1320001', country: 'ישראל', birthDate: new Date('1976-07-19'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'אבינועם', lastName: 'גרוסמן', idNumber: '789789789', email: 'avinoam@example.com', phone: '054-7897897', address: 'רחוב התמר 63', city: 'דימונה', zipCode: '8610001', country: 'ישראל', birthDate: new Date('1981-11-03'), preferredLanguage: 'he' as const, wantsUpdates: false, wantsTaxReceipts: true },
      { firstName: 'טובה', lastName: 'שטרן', idNumber: '147147147', email: 'tova@example.com', phone: '053-1471471', address: 'רחוב הדקל 17', city: 'קרית גת', zipCode: '8210001', country: 'ישראל', birthDate: new Date('1984-09-26'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'אליהו', lastName: 'בן שמואל', idNumber: '258258258', email: 'eliyahu@example.com', phone: '055-2582582', address: 'רחוב האלון 84', city: 'מודיעין', zipCode: '7171633', country: 'ישראל', birthDate: new Date('1972-01-08'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'גילה', lastName: 'כהן צדק', idNumber: '369369369', email: 'gila@example.com', phone: '050-3693693', address: 'רחוב הרימון 51', city: 'אור יהודה', zipCode: '6037000', country: 'ישראל', birthDate: new Date('1978-04-15'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: false },
      { firstName: 'נתן', lastName: 'אלקיים', idNumber: '741741741', email: 'natan@example.com', phone: '052-7417417', address: 'רחוב הורד 29', city: 'כפר סבא', zipCode: '4422529', country: 'ישראל', birthDate: new Date('1966-12-22'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'בת שבע', lastName: 'מלכי', idNumber: '852852852', email: 'batsheva@example.com', phone: '054-8528528', address: 'רחוב הנרקיס 73', city: 'גבעתיים', zipCode: '5311073', country: 'ישראל', birthDate: new Date('1980-06-09'), preferredLanguage: 'he' as const, wantsUpdates: false, wantsTaxReceipts: true },
      { firstName: 'שמואל', lastName: 'בן זכריה', idNumber: '963963963', email: 'shmuel@example.com', phone: '053-9639639', address: 'רחוב הסביון 46', city: 'רעננה', zipCode: '4365046', country: 'ישראל', birthDate: new Date('1974-03-17'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'יהודית', lastName: 'אבו חצירה', idNumber: '159159159', email: 'yehudit@example.com', phone: '055-1591591', address: 'רחוב היסמין 38', city: 'לוד', zipCode: '7112438', country: 'ישראל', birthDate: new Date('1987-08-24'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'עמוס', lastName: 'בן דוד', idNumber: '357357357', email: 'amos@example.com', phone: '050-3573573', address: 'רחוב הליבנה 62', city: 'קרית מוצקין', zipCode: '2616262', country: 'ישראל', birthDate: new Date('1970-11-06'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: false },
      { firstName: 'מלכה', lastName: 'אדרי', idNumber: '468468468', email: 'malka@example.com', phone: '052-4684684', address: 'רחוב הפרג 85', city: 'נהריה', zipCode: '2220085', country: 'ישראל', birthDate: new Date('1982-01-28'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'זבולון', lastName: 'חג\'ג\'', idNumber: '579579579', email: 'zevulun@example.com', phone: '054-5795795', address: 'רחוב הגפן 19', city: 'עכו', zipCode: '2413719', country: 'ישראל', birthDate: new Date('1975-09-13'), preferredLanguage: 'he' as const, wantsUpdates: false, wantsTaxReceipts: true },
      { firstName: 'חנה', lastName: 'בן יוסף', idNumber: '680680680', email: 'hana@example.com', phone: '053-6806806', address: 'רחוב האורן 47', city: 'קרית ביאליק', zipCode: '2710047', country: 'ישראל', birthDate: new Date('1986-05-05'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      { firstName: 'ישראל', lastName: 'בן מלכה', idNumber: '791791791', email: 'israel@example.com', phone: '055-7917917', address: 'רחוב התאנה 71', city: 'יבנה', zipCode: '8122171', country: 'ישראל', birthDate: new Date('1968-07-31'), preferredLanguage: 'he' as const, wantsUpdates: true, wantsTaxReceipts: true },
      // Inactive donors for gray markers
      { firstName: 'משה', lastName: 'הכהן', idNumber: '111000111', email: 'moshe.h@example.com', phone: '050-1110001', address: 'רחוב הגביש 88', city: 'אשקלון', zipCode: '7850088', country: 'ישראל', birthDate: new Date('1955-03-10'), preferredLanguage: 'he' as const, wantsUpdates: false, wantsTaxReceipts: false, isActive: false },
      { firstName: 'רחל', lastName: 'גבע', idNumber: '222000222', email: 'rachel.g@example.com', phone: '052-2220002', address: 'רחוב האגוז 55', city: 'קרית אתא', zipCode: '2817055', country: 'ישראל', birthDate: new Date('1960-11-25'), preferredLanguage: 'he' as const, wantsUpdates: false, wantsTaxReceipts: false, isActive: false },
      { firstName: 'יוסי', lastName: 'דמארי', idNumber: '333000333', email: 'yossi.d@example.com', phone: '054-3330003', address: 'רחוב הבזלת 99', city: 'קרית ים', zipCode: '2916099', country: 'ישראל', birthDate: new Date('1948-08-14'), preferredLanguage: 'he' as const, wantsUpdates: false, wantsTaxReceipts: false, isActive: false },
      { firstName: 'מרים', lastName: 'וולף', idNumber: '444000444', email: 'miriam.w@example.com', phone: '053-4440004', address: 'רחוב הלבנון 77', city: 'קרית חיים', zipCode: '2643077', country: 'ישראל', birthDate: new Date('1952-12-30'), preferredLanguage: 'he' as const, wantsUpdates: false, wantsTaxReceipts: false, isActive: false },
      { firstName: 'אלי', lastName: 'נחמן', idNumber: '555000555', email: 'eli.n@example.com', phone: '055-5550005', address: 'רחוב המטוס 33', city: 'קרית מלאכי', zipCode: '8308033', country: 'ישראל', birthDate: new Date('1945-06-18'), preferredLanguage: 'he' as const, wantsUpdates: false, wantsTaxReceipts: false, isActive: false }
    ]

    const createdDonors = []
    for (const donorData of donors) {
      const existing = await remult.repo(Donor).findFirst({ idNumber: donorData.idNumber })
      if (!existing) {
        const donor = remult.repo(Donor).create(donorData)
        await donor.save()
        createdDonors.push(donor)
        console.log(`Donor '${donorData.firstName} ${donorData.lastName}' created`)
      } else {
        createdDonors.push(existing)
      }
    }

    // Create donations with varied amounts to create different donor statuses
    const donations = [
      // High donor (>10,000) - תורם גדול (כתום)
      { amount: 15000, currency: 'ILS', donationDate: new Date('2024-01-15'), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024001', notes: 'תרומה גדולה לבניין' },
      { amount: 8000, currency: 'ILS', donationDate: new Date('2024-02-15'), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024002', notes: 'תרומה נוספת' },
      
      // Recent donors (תרמו בחודשים האחרונים) - תרם לאחרונה (אדום)
      { amount: 3500, currency: 'ILS', donationDate: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024003', notes: 'תרומה אחרונה' },
      { amount: 2000, currency: 'ILS', donationDate: new Date(Date.now() - (45 * 24 * 60 * 60 * 1000)), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024004', notes: 'תרומה חדשה' },
      { amount: 1800, currency: 'ILS', donationDate: new Date(Date.now() - (60 * 24 * 60 * 60 * 1000)), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024005', notes: 'תרומה עדכנית' },
      
      // Active donors (regular amounts, older dates) - פעילים (ירוק)
      { amount: 2500, currency: 'ILS', donationDate: new Date('2024-01-20'), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024006', notes: 'תרומה רגילה' },
      { amount: 1200, currency: 'ILS', donationDate: new Date('2023-12-10'), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024007', notes: 'תרומה קודמת' },
      { amount: 900, currency: 'ILS', donationDate: new Date('2023-11-15'), status: 'completed' as const, receiptIssued: false, notes: 'תרומה ישנה' },
      
      // More high donors
      { amount: 12000, currency: 'ILS', donationDate: new Date('2024-01-01'), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024008', notes: 'תורם גדול נוסף' },
      { amount: 25000, currency: 'ILS', donationDate: new Date('2023-12-20'), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024009', notes: 'תרומה ענקית' },
      
      // More recent donors
      { amount: 1500, currency: 'ILS', donationDate: new Date(Date.now() - (20 * 24 * 60 * 60 * 1000)), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024010', notes: 'תרומה זמינה' },
      { amount: 800, currency: 'ILS', donationDate: new Date(Date.now() - (35 * 24 * 60 * 60 * 1000)), status: 'completed' as const, receiptIssued: false, notes: 'תרומה קרובה' },
      
      // Regular active donors
      { amount: 600, currency: 'ILS', donationDate: new Date('2023-10-05'), status: 'completed' as const, receiptIssued: false, notes: 'תרומה בסיסית' },
      { amount: 750, currency: 'ILS', donationDate: new Date('2023-09-12'), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024011', notes: 'תרומה קטנה' },
      { amount: 1100, currency: 'ILS', donationDate: new Date('2023-08-20'), status: 'completed' as const, receiptIssued: false, notes: 'תרומה רגילה' },
      
      // Additional high donor
      { amount: 18000, currency: 'ILS', donationDate: new Date('2023-12-01'), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024012', notes: 'תורם VIP' },
      
      // More recent donors for color variety
      { amount: 950, currency: 'ILS', donationDate: new Date(Date.now() - (15 * 24 * 60 * 60 * 1000)), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024013', notes: 'תרומה טריה' },
      { amount: 1300, currency: 'ILS', donationDate: new Date(Date.now() - (25 * 24 * 60 * 60 * 1000)), status: 'completed' as const, receiptIssued: false, notes: 'תרומה חמה' },
      
      // Additional active donors
      { amount: 450, currency: 'ILS', donationDate: new Date('2023-07-10'), status: 'completed' as const, receiptIssued: false, notes: 'תרומה ותיקה' },
      { amount: 850, currency: 'ILS', donationDate: new Date('2023-06-25'), status: 'completed' as const, receiptIssued: true, receiptNumber: 'R2024014', notes: 'תרומה היסטורית' }
    ]

    let donationIndex = 0
    for (const donationData of donations) {
      const donor = createdDonors[donationIndex % createdDonors.length]
      const method = createdMethods[donationIndex % createdMethods.length]
      const campaign = createdCampaigns[donationIndex % createdCampaigns.length]

      const donation = remult.repo(Donation).create({
        ...donationData,
        donor: donor,
        donationMethod: method,
        campaign: campaign,
        donorId: donor.id,
        donationMethodId: method.id,
        campaignId: campaign.id
      })

      await donation.save()
      console.log(`Donation #${donationIndex + 1} created: ₪${donationData.amount} from ${donor.firstName} ${donor.lastName}`)
      
      donationIndex++
    }

    // Create standing orders
    const standingOrders = [
      {
        amount: 1000,
        currency: 'ILS',
        frequency: 'monthly' as const,
        startDate: new Date('2024-01-01'),
        dayOfMonth: 5,
        notes: 'תרומה חודשית לבניין בית המדרש'
      },
      {
        amount: 500,
        currency: 'ILS',
        frequency: 'monthly' as const,
        startDate: new Date('2024-02-01'),
        dayOfMonth: 15,
        notes: 'תרומה חודשית למלגות תלמידים'
      },
      {
        amount: 2500,
        currency: 'ILS',
        frequency: 'quarterly' as const,
        startDate: new Date('2024-01-01'),
        dayOfMonth: 1,
        notes: 'תרומה רבעונית כללית'
      }
    ]

    let orderIndex = 0
    for (const orderData of standingOrders) {
      const donor = createdDonors[orderIndex % createdDonors.length]
      const method = createdMethods[orderIndex % createdMethods.length]
      const campaign = createdCampaigns[orderIndex % createdCampaigns.length]

      const order = remult.repo(StandingOrder).create({
        ...orderData,
        donor: donor,
        donationMethod: method,
        campaign: campaign,
        donorId: donor.id,
        donationMethodId: method.id,
        campaignId: campaign.id
      })

      order.nextExecutionDate = order.calculateNextExecutionDate()
      await order.save()
      console.log(`Standing order #${orderIndex + 1} created: ₪${orderData.amount} ${order.frequencyText} from ${donor.firstName} ${donor.lastName}`)
      
      orderIndex++
    }

    // Create reminders
    const reminders = [
      {
        title: 'צור קשר עם תורם חדש',
        description: 'לקחת פרטים נוספים ולהכיר את התורם',
        type: 'phone_call' as const,
        priority: 'high' as const,
        dueDate: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) // 2 days from now
      },
      {
        title: 'שלח מכתב תודה',
        description: 'שלח מכתב תודה על התרומה הגדולה',
        type: 'thank_you' as const,
        priority: 'normal' as const,
        dueDate: new Date(Date.now() + (1 * 24 * 60 * 60 * 1000)) // 1 day from now
      },
      {
        title: 'עדכון רבעוני לתורמים',
        description: 'שלח עדכון על התקדמות הקמפיינים',
        type: 'general' as const,
        priority: 'normal' as const,
        dueDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 1 week from now
        isRecurring: true,
        recurringPattern: 'monthly' as const
      },
      {
        title: 'יום הולדת תורם VIP',
        description: 'שלח ברכות יום הולדת',
        type: 'birthday' as const,
        priority: 'high' as const,
        dueDate: new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)) // 5 days from now
      },
      {
        title: 'בדיקה שבועית של הוראות קבע',
        description: 'ודא שכל הוראות הקבע פועלות כהלכה',
        type: 'general' as const,
        priority: 'low' as const,
        dueDate: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)), // 3 days from now
        isRecurring: true,
        recurringPattern: 'weekly' as const
      }
    ]

    let reminderIndex = 0
    for (const reminderData of reminders) {
      const donor = createdDonors[reminderIndex % createdDonors.length]
      
      const reminder = remult.repo(Reminder).create({
        ...reminderData,
        relatedDonor: donor,
        relatedDonorId: donor.id
      })

      await reminder.save()
      console.log(`Reminder #${reminderIndex + 1} created: "${reminderData.title}" for ${donor.firstName} ${donor.lastName}`)
      
      reminderIndex++
    }

    // Create certificates
    const certificatesData = [
      {
        type: 'donation' as const,
        typeText: 'תעודת תרומה',
        recipientName: 'קהילת בית המדרש החדש',
        amount: 5000,
        eventName: 'חנוכת בית המדרש',
        eventDate: new Date('2024-03-15'),
        mainTitle: 'תעודת הוקרה על תרומה נדיבה',
        mainText: 'אנו מודים לך על תרומתך הנדיבה לבניית בית המדרש החדש. תרומתך תעזור לקהילה לפתוח מקום לימוד מקודש חדש.',
        specialText: 'תזכה למצוות',
        hebrewDate: 'ט"ו באדר תשפ"ד',
        signature: 'הרב משה כהן - ראש הישיבה',
        template: 'classic' as const,
        paperSize: 'a4' as const,
        orientation: 'portrait' as const,
        status: 'ready' as const,
        statusText: 'מוכן להדפסה'
      },
      {
        type: 'memorial' as const,
        typeText: 'נציב זיכרון',
        recipientName: 'לזכר יצחק בן אברהם ז"ל',
        eventName: 'יום השנה',
        eventDate: new Date('2024-04-10'),
        mainTitle: 'נציב לזכר נפטר',
        mainText: 'לעילוי נשמתו של יצחק בן אברהם ז"ל. תהא נשמתו צרורה בצרור החיים.',
        specialText: 'תנצב"ה',
        hebrewDate: 'כ"ח בניסן תשפ"ד',
        signature: 'המשפחה והקהילה',
        template: 'elegant' as const,
        paperSize: 'a4' as const,
        orientation: 'portrait' as const,
        status: 'draft' as const,
        statusText: 'טיוטה'
      },
      {
        type: 'dedication' as const,
        typeText: 'הקדשה',
        recipientName: 'לכבוד יום הולדת 60 של שרה לוי',
        amount: 2500,
        eventName: 'יום הולדת 60',
        eventDate: new Date('2024-02-25'),
        mainTitle: 'תעודת הקדשה',
        mainText: 'מוקדש לכבוד יום הולדתה ה-60 של שרה לוי. תזכה לשנים רבות נעימות ומבורכות.',
        specialText: 'עד 120 שנה',
        hebrewDate: 'ט"ז באדר א\' תשפ"ד',
        signature: 'בני המשפחה והחברים',
        template: 'modern' as const,
        paperSize: 'a4' as const,
        orientation: 'landscape' as const,
        status: 'printed' as const,
        statusText: 'הודפס'
      },
      {
        type: 'appreciation' as const,
        typeText: 'הוקרה',
        recipientName: 'דוד רוזן - מתנדב השנה',
        eventName: 'טקס הוקרה שנתי',
        eventDate: new Date('2024-01-30'),
        mainTitle: 'תעודת הוקרה',
        mainText: 'בהוקרה על פעילותך המסורה כמתנדב בקהילה. עבודתך ללא לאות מעוררת הערצה והוקרה.',
        specialText: 'יישר כח גדול',
        hebrewDate: 'כ"א בשבט תשפ"ד',
        signature: 'ועד הקהילה',
        template: 'classic' as const,
        paperSize: 'a4' as const,
        orientation: 'portrait' as const,
        status: 'delivered' as const,
        statusText: 'נמסר'
      },
      {
        type: 'donation' as const,
        typeText: 'תעודת תרומה',
        recipientName: 'מלגות לתלמידי ישיבה',
        amount: 10000,
        eventName: 'מלגות תלמידים מצטיינים',
        eventDate: new Date('2024-02-01'),
        mainTitle: 'תעודת הוקרה על תרומה למלגות',
        mainText: 'תודה על תרומתך הנדיבה למלגות תלמידי ישיבה. בזכותך יוכלו תלמידים מצטיינים להמשיך בלימודיהם.',
        specialText: 'זכות הרבים תלויה בך',
        hebrewDate: 'כ"ג בשבט תשפ"ד',
        signature: 'הנהלת הישיבה',
        template: 'modern' as const,
        paperSize: 'a4' as const,
        orientation: 'portrait' as const,
        status: 'ready' as const,
        statusText: 'מוכן להדפסה'
      },
      {
        type: 'dedication' as const,
        typeText: 'הקדשה',
        recipientName: 'לכבוד חתונת יוסף ומרים',
        eventName: 'חתונה',
        eventDate: new Date('2024-03-20'),
        mainTitle: 'תעודת הקדשה לחתונה',
        mainText: 'מוקדש לכבוד חתונתם של יוסף ומרים. מזל טוב! תזכו לבנות בית נאמן בישראל.',
        specialText: 'מזל טוב!',
        hebrewDate: 'י"א באדר תשפ"ד',
        signature: 'החברים והמשפחה',
        template: 'elegant' as const,
        paperSize: 'a3' as const,
        orientation: 'landscape' as const,
        status: 'draft' as const,
        statusText: 'טיוטה'
      }
    ]

    const createdCertificates = []
    let certificateIndex = 0
    
    for (const certificateData of certificatesData) {
      const donor = createdDonors[certificateIndex % createdDonors.length]
      
      const certificate = remult.repo(Certificate).create({
        ...certificateData,
        donor: donor,
        donorId: donor.id,
        createdBy: admin,
        createdById: admin.id
      })

      await certificate.save()
      createdCertificates.push(certificate)
      console.log(`Certificate #${certificateIndex + 1} created: "${certificateData.typeText} - ${certificateData.recipientName}" for ${donor.firstName} ${donor.lastName}`)
      
      certificateIndex++
    }

    // Create basic events
    const events = [
      { description: 'תאריך לידה', type: 'personal', isRequired: true, sortOrder: 1, category: 'אישי' },
      { description: 'יום נישואין', type: 'personal', isRequired: false, sortOrder: 2, category: 'אישי' },
      { description: 'יארצייט אבא', type: 'personal', isRequired: false, sortOrder: 3, category: 'יארצייט' },
      { description: 'יארצייט אמא', type: 'personal', isRequired: false, sortOrder: 4, category: 'יארצייט' },
      { description: 'יארצייט בן/בת זוג', type: 'personal', isRequired: false, sortOrder: 5, category: 'יארצייט' },
      { description: 'בר מצווה', type: 'personal', isRequired: false, sortOrder: 6, category: 'דתי' },
      { description: 'בת מצווה', type: 'personal', isRequired: false, sortOrder: 7, category: 'דתי' },
      { description: 'יום השנה', type: 'personal', isRequired: false, sortOrder: 8, category: 'אישי' },
      { description: 'סיום לימודים', type: 'personal', isRequired: false, sortOrder: 9, category: 'אישי' },
      { description: 'עלייה לתורה', type: 'personal', isRequired: false, sortOrder: 10, category: 'דתי' },
    ]

    const createdEvents = []
    for (const eventData of events) {
      const existing = await remult.repo(Event).findFirst({ description: eventData.description })
      if (!existing) {
        const event = remult.repo(Event).create(eventData)
        await event.save()
        createdEvents.push(event)
        console.log(`Event '${eventData.description}' created`)
      } else {
        createdEvents.push(existing)
      }
    }

    // Create some sample donor events
    const sampleDonorEvents = [
      // Birth dates for some donors
      { donorIndex: 0, eventIndex: 0, hebrewDate: new Date('1975-05-15'), gregorianDate: new Date('1975-05-15'), notes: 'תאריך לידה' },
      { donorIndex: 1, eventIndex: 0, hebrewDate: new Date('1980-08-22'), gregorianDate: new Date('1980-08-22'), notes: 'תאריך לידה' },
      // Some marriage dates
      { donorIndex: 0, eventIndex: 1, hebrewDate: new Date('2000-06-10'), gregorianDate: new Date('2000-06-10'), notes: 'יום נישואין' },
      { donorIndex: 1, eventIndex: 1, hebrewDate: new Date('2005-03-15'), gregorianDate: new Date('2005-03-15'), notes: 'יום נישואין' },
      // Some yahrzeit dates
      { donorIndex: 2, eventIndex: 2, hebrewDate: new Date('2010-01-20'), gregorianDate: new Date('2010-01-20'), notes: 'יארצייט אבא' },
      { donorIndex: 2, eventIndex: 3, hebrewDate: new Date('2015-11-05'), gregorianDate: new Date('2015-11-05'), notes: 'יארצייט אמא' },
    ]

    let donorEventIndex = 0
    for (const donorEventData of sampleDonorEvents) {
      if (donorEventData.donorIndex < createdDonors.length && donorEventData.eventIndex < createdEvents.length) {
        const donor = createdDonors[donorEventData.donorIndex]
        const event = createdEvents[donorEventData.eventIndex]

        const donorEvent = remult.repo(DonorEvent).create({
          donor: donor,
          donorId: donor.id,
          event: event,
          eventId: event.id,
          hebrewDate: donorEventData.hebrewDate,
          gregorianDate: donorEventData.gregorianDate,
          notes: donorEventData.notes
        })

        await donorEvent.save()
        console.log(`DonorEvent #${donorEventIndex + 1} created: "${event.description}" for ${donor.firstName} ${donor.lastName}`)
      }
      
      donorEventIndex++
    }

    console.log('Database seeding completed successfully!')
    console.log(`Created:`)
    console.log(`- ${createdMethods.length} donation methods`)
    console.log(`- ${createdCampaigns.length} campaigns`)
    console.log(`- ${createdDonors.length} donors`)
    console.log(`- ${donations.length} donations`)
    console.log(`- ${standingOrders.length} standing orders`)
    console.log(`- ${reminders.length} reminders`)
    console.log(`- ${createdCertificates.length} certificates`)
    console.log(`- ${createdEvents.length} events`)
    console.log(`- ${sampleDonorEvents.length} donor events`)

  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  initRemult().then(async () => {
    await seedDatabase()
    console.log('Seeding completed!')
    process.exit(0)
  }).catch((error) => {
    console.error('Seeding failed:', error)
    process.exit(1)
  })
}