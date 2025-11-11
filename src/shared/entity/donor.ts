import {
  Allow,
  BackendMethod,
  Entity,
  Field,
  Fields,
  IdEntity,
  Relations,
  Validators,
  isBackend
} from 'remult'
import { Roles } from '../enum/roles'
import { User } from './user'
import { Place } from './place'
import { Country } from './country'

@Entity<Donor>('donors', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (donor) => {
    if (isBackend()) {
      if (donor._.isNew()) {
        donor.createdDate = new Date()
      }
      donor.updatedDate = new Date()
    }
  },
})
export class Donor extends IdEntity {
  @Fields.string({
    caption: 'תואר',
    allowNull: true,
    includeInApi: true,
    valueList: [
      // Hebrew titles
      '', 'גב\'', 'הבחור המופלג בתויר"ש כמר', 'הגאון החסיד ר\'', 'הגאון הרב', 'הגאון רבי',
      'הגה"ח ר\'', 'החתן המופלג בתויר"ש כמר', 'המשגיח הרה"ח ר\'', 'הנגיד הרה"ח ר\'', 'הר"ר',
      'הרב', 'הרבנית', 'הרה"ג ר\'', 'הרה"ח ר\'', 'הרה"צ ר\'', 'כ"ק אדמו"ר רבי', 'כ"ק מרן',
      'כמר', 'מג"ש בישיבתנו הרב', 'מוהרה"ח ר\'', 'מורינו הרה"ח ר\'', 'מר', 'מרן', 'מרת',
      'משפחת', 'ראש הישיבה', 'תלמידנו הרה"ח ר\'',
      // English titles
      'Family', 'Mr.', 'Mrs.', 'Mr. & Mrs.', 'Rabbi', 'Rabbi & Mrs.', 'Dr.', 'Dr. & Mrs.'
    ]
  })
  title = ''

  @Fields.string({
    validate: Validators.required,
    caption: 'שם פרטי',
  })
  firstName = ''

  @Fields.string({
    validate: Validators.required,
    caption: 'שם משפחה',
  })
  lastName = ''

  @Fields.string({
    caption: 'סיומת',
  })
  suffix = ''

  @Fields.string({
    caption: 'כינוי',
  })
  nickname = ''

  @Fields.string({
    caption: 'שם האשה',
  })
  wifeName = ''

  @Fields.string({
    caption: 'תואר האשה',
  })
  wifeTitle = 'גב\''

  @Fields.string({
    caption: 'תואר באנגלית בן/בת זוג',
  })
  wifeTitleEnglish = 'Mrs.'

  @Fields.string({
    caption: 'שם באנגלית בן/בת זוג',
  })
  wifeNameEnglish = ''

  @Fields.string({
    caption: 'תואר באנגלית',
    allowNull: true,
    includeInApi: true,
    valueList: [
      '', 'Family', 'Mr.', 'Mrs.', 'Mr. & Mrs.', 'Rabbi', 'Rabbi & Mrs.', 'Dr.', 'Dr. & Mrs.'
    ]
  })
  titleEnglish = ''

  @Fields.string({
    caption: 'שם פרטי באנגלית',
  })
  firstNameEnglish = ''

  @Fields.string({
    caption: 'שם משפחה באנגלית',
  })
  lastNameEnglish = ''

  @Fields.string({
    caption: 'סיומת באנגלית',
  })
  suffixEnglish = ''

  @Fields.string({
    caption: 'תעודת זהות',
    validate: [Validators.uniqueOnBackend],
  })
  idNumber = ''

  @Fields.string({
    caption: 'הערות',
  })
  notes = ''

  @Fields.boolean({
    caption: 'מעוניין בעדכונים',
  })
  wantsUpdates = true

  @Fields.boolean({
    caption: 'מעוניין בקבלות מס',
  })
  wantsTaxReceipts = true

  @Fields.string({
    caption: 'שפה מועדפת',
  })
  preferredLanguage: 'he' | 'en' | 'yi' | '' = 'he'

  @Fields.string({
    caption: 'שפה מועדפת',
  })
  donorType: 'אחר' | 'קבוע' | 'זמני' = 'אחר'

  // Additional personal fields
  @Fields.string({
    caption: 'מצב משפחתי',
  })
  maritalStatus: 'married' | 'single' | 'widowed' | 'divorced' = 'married'

  @Fields.string({
    caption: 'מגדר',
  })
  gender: 'male' | 'female' | '' = 'male'

  @Fields.string({
    caption: 'יוחסין',
  })
  lineage: 'cohen' | 'levi' | 'israel' = 'israel'

  // Categories and levels
  @Fields.string({
    caption: 'רמה',
  })
  level: 'quarter' | 'half' | 'full' | 'bronze_lords' | 'silver_stones' | 'gold_pillars' | 'sapphire_diamond' | 'platinum' | 'patron' | 'torah_holder' | 'supreme_level_1' | 'supreme_level_2' | '' = ''

  @Fields.json({
    caption: 'חוגים',
    includeInApi: true
  })
  circleIds?: string[] // Array of Circle IDs

  // Donor characterization fields
  @Fields.boolean({
    caption: 'אנ"ש',
  })
  isAnash = false

  @Fields.boolean({
    caption: 'תלמידנו',
  })
  isAlumni = false

  @Fields.boolean({
    caption: 'קשר אחר',
  })
  isOtherConnection = false

  // Availability days
  @Fields.boolean({
    caption: 'זמין ביום ראשון',
  })
  sundayAvailable = false

  @Fields.boolean({
    caption: 'זמין ביום שני',
  })
  mondayAvailable = false

  @Fields.boolean({
    caption: 'זמין ביום שלישי',
  })
  tuesdayAvailable = false

  @Fields.boolean({
    caption: 'זמין ביום רביעי',
  })
  wednesdayAvailable = false

  @Fields.boolean({
    caption: 'זמין ביום חמישי',
  })
  thursdayAvailable = false

  @Fields.boolean({
    caption: 'זמין ביום שישי',
  })
  fridayAvailable = false

  @Fields.boolean({
    caption: 'זמין בשבת',
  })
  saturdayAvailable = false

  // Contact method preferences
  @Fields.boolean({
    caption: 'מעדיף טלפון',
  })
  preferPhone = false

  @Fields.boolean({
    caption: 'מעדיף אימייל',
  })
  preferEmail = false

  @Fields.boolean({
    caption: 'מעדיף SMS',
  })
  preferSMS = false

  @Fields.boolean({
    caption: 'מעדיף ביקור בבית',
  })
  preferHomeVisit = false

  @Fields.boolean({
    caption: 'מעדיף פגישה במשרד',
  })
  preferOfficeVisit = false

  @Fields.boolean({
    caption: 'בתיאום טלפוני',
  })
  requirePhoneCoordination = false

  @Fields.boolean({
    caption: 'בזמנים מיוחדים: פסח/סוכות',
  })
  preferSpecialTimes = false

  @Fields.boolean({
    caption: 'בקבלת קהל',
  })
  preferPublicReception = false

  @Fields.boolean({
    caption: 'שליחת מכתבים באימייל בלבד',
  })
  emailOnlyCorrespondence = false

  @Fields.boolean({
    caption: 'הוספה אוטומטית לאירועים (לפי מיקום)',
  })
  autoAddToLocationEvents = false

  // Company IDs - for new company selection system
  @Fields.json({
    caption: 'מזהי חברות'
  })
  companyIds: string[] = []

  @Fields.boolean({
    caption: 'תורם פעיל',
  })
  isActive = true

  @Relations.toOne<Donor, User>(() => User, {
    caption: 'מתרים',
    field: 'fundraiserId'
  })
  fundraiser?: User

  @Fields.string({
    caption: 'מתרים ID',
  })
  fundraiserId = ''

  @Fields.date({
    allowApiUpdate: false,
    caption: 'תאריך יצירה',
  })
  createdDate = new Date()

  @Fields.date({
    allowApiUpdate: false,
    caption: 'תאריך עדכון',
  })
  updatedDate = new Date()

  @Relations.toOne<Donor, User>(() => User, {
    caption: 'נוצר על ידי',
    field: 'createdById'
  })
  createdBy?: User

  @Fields.string({
    caption: 'נוצר על ידי ID',
  })
  createdById = ''

  @Field(() => String, {
    caption: 'שם מלא',
    serverExpression: async (donor: Donor) => {
      const parts = []
      if (donor.title) parts.push(donor.title)
      if (donor.firstName) parts.push(donor.firstName)
      if (donor.lastName) parts.push(donor.lastName)
      if (donor.suffix) parts.push(donor.suffix)
      return parts.join(' ').trim()
    }
  })
  fullName?: string

  @Field(() => String, {
    caption: 'שם תצוגה',
    serverExpression: async (donor: Donor) => {
      const parts = []
      if (donor.title) parts.push(donor.title)
      if (donor.firstName) parts.push(donor.firstName)
      if (donor.lastName) parts.push(donor.lastName)
      if (donor.suffix) parts.push(donor.suffix)
      const fullName = parts.join(' ').trim()
      return fullName || 'לא ידוע'
    }
  })
  displayName?: string

  @Fields.number({ caption: 'ממוצע תרומות', allowNull: true })
  ns?: number

  get fullNameGetter() {
    const parts = []
    if (this.title) parts.push(this.title)
    if (this.firstName) parts.push(this.firstName)
    if (this.lastName) parts.push(this.lastName)
    if (this.suffix) parts.push(this.suffix)
    return parts.join(' ').trim()
  }

  get fullNameEnglish() {
    return `${this.firstNameEnglish} ${this.lastNameEnglish}`.trim()
  }

  get displayNameGetter() {
    return this.fullName || 'לא ידוע'
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async deactivate() {
    this.isActive = false
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async activate() {
    this.isActive = true
    await this.save()
  }

  @BackendMethod({ allowed: Allow.authenticated })
  async syncDonorEventReminders() {
    if (!isBackend()) return;

    const { remult } = await import('remult');
    const { DonorEvent } = await import('./donor-event');
    const { Reminder } = await import('./reminder');
    const { ReminderController } = await import('../controllers/reminder.controller');

    // Get all donor events for this donor
    const donorEvents = await remult.repo(DonorEvent).find({
      where: { donorId: this.id, isActive: true }
    });

    // Get all reminders linked to these donor events via sourceEntityType/sourceEntityId
    const donorEventIds = donorEvents.map(de => de.id);
    const existingReminders = donorEventIds.length > 0
      ? await remult.repo(Reminder).find({
          where: {
            sourceEntityType: 'donor_event',
            sourceEntityId: { $in: donorEventIds }
          }
        })
      : [];

    const existingReminderMap = new Map(existingReminders.map(r => [r.sourceEntityId, r]));

    for (const donorEvent of donorEvents) {
      if (!donorEvent.date || !donorEvent.event) continue;

      const existingReminder = existingReminderMap.get(donorEvent.id);

      if (!existingReminder) {
        // Create new reminder for this donor event
        const newReminder = remult.repo(Reminder).create();
        newReminder.title = `${donorEvent.event.description} - ${this.displayName}`;
        newReminder.type = 'general';
        newReminder.priority = 'normal';
        newReminder.donorId = this.id;
        newReminder.dueDate = donorEvent.date;
        newReminder.dueTime = '10:00';
        newReminder.assignedToId = remult.user!.id;
        newReminder.isActive = true;
        newReminder.status = 'pending';
        newReminder.sendAlert = true;
        newReminder.alertMethod = 'popup';
        newReminder.sourceEntityType = 'donor_event';
        newReminder.sourceEntityId = donorEvent.id;

        // Donor events are typically recurring yearly (birthdays, memorials, etc.)
        newReminder.isRecurring = true;
        newReminder.recurringPattern = 'yearly';
        newReminder.yearlyRecurringType = 'date';

        // Extract Hebrew month and day from the date
        const { HebrewDateController } = await import('../controllers/hebrew-date.controller');
        const hebrewDate = await HebrewDateController.getHebrewDateComponents(donorEvent.date);
        newReminder.recurringMonth = hebrewDate.month;
        newReminder.recurringDayOfMonth = hebrewDate.day;

        await newReminder.save();
        // No need to link back - sourceEntityId/Type already set in reminder
      } else {
        // Update existing reminder if date changed
        if (existingReminder.dueDate.getTime() !== donorEvent.date.getTime()) {
          existingReminder.dueDate = donorEvent.date;
          await remult.repo(Reminder).save(existingReminder);
        }
      }
    }

    // Clean up: Find reminders that were deleted (donor events removed)
    const currentDonorEventIds = new Set(donorEvents.map(de => de.id));
    const orphanedReminders = existingReminders.filter(
      r => r.sourceEntityId && !currentDonorEventIds.has(r.sourceEntityId)
    );

    for (const orphanedReminder of orphanedReminders) {
      await remult.repo(Reminder).delete(orphanedReminder);
    }
  }
}