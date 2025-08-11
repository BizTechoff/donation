import { remult } from 'remult'
import { createPostgresConnection } from 'remult/postgres'
import { User, Donor, Donation, Campaign, DonationMethod, StandingOrder, Reminder, Certificate } from '../shared/entity'

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
      }
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

    // Create donations
    const donations = [
      {
        amount: 5000,
        currency: 'ILS',
        donationDate: new Date('2024-01-15'),
        status: 'completed' as const,
        receiptIssued: true,
        receiptNumber: 'R2024001',
        notes: 'תרומה לבניין בית המדרש'
      },
      {
        amount: 2500,
        currency: 'ILS',
        donationDate: new Date('2024-01-20'),
        status: 'completed' as const,
        receiptIssued: true,
        receiptNumber: 'R2024002',
        notes: 'תרומה למלגות תלמידים'
      },
      {
        amount: 1000,
        currency: 'ILS',
        donationDate: new Date('2024-02-01'),
        status: 'pending' as const,
        receiptIssued: false,
        notes: 'תרומה לעזרה לנזקקים'
      },
      {
        amount: 7500,
        currency: 'ILS',
        donationDate: new Date('2024-02-10'),
        status: 'completed' as const,
        receiptIssued: true,
        receiptNumber: 'R2024003',
        notes: 'תרומה כללית'
      },
      {
        amount: 3000,
        currency: 'ILS',
        donationDate: new Date('2024-02-15'),
        status: 'completed' as const,
        receiptIssued: false,
        notes: 'תרומה לבניין'
      },
      {
        amount: 1500,
        currency: 'ILS',
        donationDate: new Date('2024-02-20'),
        status: 'pending' as const,
        receiptIssued: false,
        notes: 'תרומה חודשית'
      },
      {
        amount: 10000,
        currency: 'ILS',
        donationDate: new Date('2024-03-01'),
        status: 'completed' as const,
        receiptIssued: true,
        receiptNumber: 'R2024004',
        notes: 'תרומה גדולה לבניין'
      },
      {
        amount: 500,
        currency: 'ILS',
        donationDate: new Date('2024-03-05'),
        status: 'cancelled' as const,
        receiptIssued: false,
        notes: 'תרומה שבוטלה'
      }
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

    console.log('Database seeding completed successfully!')
    console.log(`Created:`)
    console.log(`- ${createdMethods.length} donation methods`)
    console.log(`- ${createdCampaigns.length} campaigns`)
    console.log(`- ${createdDonors.length} donors`)
    console.log(`- ${donations.length} donations`)
    console.log(`- ${standingOrders.length} standing orders`)
    console.log(`- ${reminders.length} reminders`)
    console.log(`- ${createdCertificates.length} certificates`)

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