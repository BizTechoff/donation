import {
  Allow,
  BackendMethod,
  Entity,
  Fields,
  IdEntity,
  Relations,
  Validators,
  isBackend,
  remult
} from 'remult'
import { Roles } from '../enum/roles'
import { Donation } from './donation'
import { User } from './user'
import { ContactPerson } from './contact-person'

@Entity<Donor>('donors', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: [Roles.admin, Roles.secretary],
  allowApiInsert: Allow.authenticated,
  // W7 - "עריכת קהל יעד: הצגת שמות לפי א-ב שם משפחה". Donor had no
  // defaultOrderBy at all (Donation and User both do), so every query that did
  // not name an order got whatever order Postgres felt like - which is what the
  // target-audience editor showed. Setting it here fixes the whole class in one
  // place instead of adding an orderBy to each call site; a query that passes
  // its own orderBy still overrides this.
  defaultOrderBy: { lastName: 'asc', firstName: 'asc' },
  // saving: async (donor) => {
  //   if (isBackend()) {
  //     if (donor._.isNew()) {
  //       donor.createdDate = new Date()
  //     }
  //     donor.updatedDate = new Date()
  //   }
  // },
  deleting: async (donor, cycle) => {
    if (isBackend()) {
      const donationsCount = await remult.repo(Donation).count({ donor: donor })
      if (donationsCount) {
        throw new Error(`לתורם זה ישנם תרומות - יש למחוק את התרומות שלו ואז אותו`)
      }
    }
  }
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
    // validate: Validators.required,
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

  // Computed field for fullName - so it's available when loaded from server
  @Fields.string<Donor>({
    caption: 'שם מלא',
    serverExpression: (donor) => {
      const parts = []
      if (donor.title) parts.push(donor.title)
      if (donor.firstName) parts.push(donor.firstName)
      if (donor.lastName) parts.push(donor.lastName)
      if (donor.suffix) parts.push(donor.suffix)
      return parts.join(' ').trim()
    }
  })
  fullName!: string

  // Computed field for fullNameEnglish - so it's available when loaded from server
  @Fields.string<Donor>({
    caption: 'שם מלא באנגלית',
    serverExpression: (donor) => {
      const parts = []
      if (donor.titleEnglish) parts.push(donor.titleEnglish)
      if (donor.firstNameEnglish) parts.push(donor.firstNameEnglish)
      if (donor.lastNameEnglish) parts.push(donor.lastNameEnglish)
      if (donor.suffixEnglish) parts.push(donor.suffixEnglish)
      return parts.join(' ').trim()
    }
  })
  fullNameEnglish!: string

  // Computed field for fullName - so it's available when loaded from server
  @Fields.string<Donor>({
    caption: 'שם מלא',
    serverExpression: (donor) => {
      const parts = []
      if (donor.lastName) parts.push(donor.lastName)
      if (donor.firstName) parts.push(donor.firstName)
      return parts.join(' ').trim()
    }
  })
  lastAndFirstName!: string

  // ── Sortable related-value fields (sqlExpression) ──────────────────────
  // One definition per value, computed by the DB inside the SAME query that
  // loads the donors - so lists ORDER BY them with LIMIT applied in SQL, and
  // the sort can never disagree with the value that was loaded.
  // They pick the PRIMARY stored contact/place (isPrimary first, then oldest),
  // i.e. the stored value - display-format unification is priced item B4.
  // allowNull so an empty value sorts LAST in ascending order (pg default).
  @Fields.string<Donor>({
    caption: 'טלפון ראשי',
    allowNull: true,
    sqlExpression: () => `(
      select dc."phoneNumber" from "donor_contacts" dc
      where dc."donorId" = "donors"."id" and dc."type" = 'phone' and dc."isActive" = true
      order by dc."isPrimary" desc, dc."createdDate" limit 1)`
  })
  primaryPhone?: string

  @Fields.string<Donor>({
    caption: 'אימייל ראשי',
    allowNull: true,
    sqlExpression: () => `(
      select dc."email" from "donor_contacts" dc
      where dc."donorId" = "donors"."id" and dc."type" = 'email' and dc."isActive" = true
      order by dc."isPrimary" desc, dc."createdDate" limit 1)`
  })
  primaryEmail?: string

  // City then street of the primary place ('בית' preferred, matching the
  // list display query in donor-map.controller) - the value address-sorting
  // actually means to the user.
  @Fields.string<Donor>({
    caption: 'עיר ורחוב',
    allowNull: true,
    sqlExpression: () => `(
      select trim(coalesce(p."city",'') || ' ' || coalesce(p."street",''))
      from "donor_places" dp
      join "places" p on p."id" = dp."placeId"
      left join "donor_address_types" dat on dat."id" = dp."addressTypeId"
      where dp."donorId" = "donors"."id" and dp."isActive" = true
      order by dp."isPrimary" desc, case when dat."name" = 'בית' then 0 else 1 end
      limit 1)`
  })
  primaryCityStreet?: string

  // Latest donation date - matching exactly what the list displays
  // (donor-map.controller): commitments are EXCLUDED, donations where this
  // donor is a partner are INCLUDED ("partnerIds" is a json column, cast to
  // jsonb - same as the existing partner query). Empty is coalesced to the
  // minimum date so "never donated" sorts last on desc (recent first) and
  // first on asc (stalest first) - both the orders the user actually wants.
  // Z15 - the donations list drops the address column and shows the father's
  // name under the donor's name INSTEAD, but only where it is actually needed:
  // the address was there to tell two donors with the same name apart (Zoom ב׳
  // ~0:49-0:55), so the sub-line appears only when the name really is shared.
  //
  // Nothing new is stored. The father already exists in donor_relations, from
  // the family-relations work (W13), in either direction:
  //   - this donor is donor1 and the other side is labelled 'אבא'
  //   - this donor is donor2 labelled 'בן'/'בת', so donor1 is the parent -
  //     and the father specifically when that parent is male
  // A donor with no family relation recorded simply has no sub-line, which is
  // the honest answer rather than an empty field on every row.
  @Fields.string<Donor>({
    caption: 'שם האב',
    allowNull: true,
    sqlExpression: () => `(
      select trim(coalesce(f."firstName",'') || ' ' || coalesce(f."lastName",''))
      from "donor_relations" r
      join "donors" f on f."id" = case
        when r."donor1Id" = "donors"."id" then r."donor2Id" else r."donor1Id" end
      where (
              (r."donor1Id" = "donors"."id" and r."relationshipType1" = 'אבא')
           or (r."donor2Id" = "donors"."id" and r."relationshipType1" in ('בן','בת')
               and f."gender" = 'male')
            )
      limit 1)`
  })
  fatherName?: string

  // True when another donor carries the same first+last name - the condition
  // under which the father's name is worth showing at all.
  @Fields.boolean<Donor>({
    caption: 'שם כפול',
    sqlExpression: () => `exists(
      select 1 from "donors" d2
      where d2."id" <> "donors"."id"
        and d2."lastName" = "donors"."lastName"
        and coalesce(d2."firstName",'') = coalesce("donors"."firstName",''))`
  })
  hasDuplicateName?: boolean

  @Fields.dateOnly<Donor>({
    caption: 'תרומה אחרונה',
    sqlExpression: () => `coalesce(greatest(
      (select max(d1."donationDate") from "donations" d1
       where d1."donorId" = "donors"."id" and d1."donationType" <> 'commitment'),
      (select max(d2."donationDate") from "donations" d2
       where d2."partnerIds"::jsonb ? "donors"."id" and d2."donationType" <> 'commitment')
      ), date '0001-01-01')`
  })
  lastDonationDate?: Date

  // Computed field for fullNameEnglish - so it's available when loaded from server
  @Fields.string<Donor>({
    caption: 'שם מלא באנגלית',
    serverExpression: (donor) => {
      const parts = []
      if (donor.lastNameEnglish) parts.push(donor.lastNameEnglish)
      if (donor.firstNameEnglish) parts.push(donor.firstNameEnglish)
      return parts.join(' ').trim()
    }
  })
  lastAndFirstNameEnglish!: string

  @Fields.string({
    caption: 'תעודת זהות'//,
    // validate: [Validators.unique],
  })
  idNumber = ''

  @Fields.string({ caption: 'מזהה תורם מאקסל', allowNull: true })
  excelDonorId = ''

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

  @Relations.toOne<Donor, ContactPerson>(() => ContactPerson, {
    caption: 'איש קשר',
    field: 'contactPersonId'
  })
  contactPerson?: ContactPerson

  @Fields.string({
    caption: 'איש קשר ID',
  })
  contactPersonId = ''

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

  // @Field(() => String, {
  //   caption: 'שם מלא',
  //   serverExpression: async (donor: Donor) => {
  //     const parts = []
  //     if (donor.title) parts.push(donor.title)
  //     if (donor.firstName) parts.push(donor.firstName)
  //     if (donor.lastName) parts.push(donor.lastName)
  //     if (donor.suffix) parts.push(donor.suffix)
  //     return parts.join(' ').trim()
  //   }
  // })
  // fullName?: string

  // @Field(() => String, {
  //   caption: 'שם מלא',
  //   serverExpression: async (donor: Donor) => {
  //     const parts = []
  //     if (donor.titleEnglish) parts.push(donor.titleEnglish)
  //     if (donor.firstNameEnglish) parts.push(donor.firstNameEnglish)
  //     if (donor.lastNameEnglish) parts.push(donor.lastNameEnglish)
  //     if (donor.suffixEnglish) parts.push(donor.suffixEnglish)
  //     return parts.join(' ').trim()
  //   }
  // })
  // fullNameEnglish?: string

  // @Field(() => String, {
  //   caption: 'שם תצוגה',
  //   serverExpression: async (donor: Donor) => {
  //     const parts = []
  //     if (donor.title) parts.push(donor.title)
  //     if (donor.firstName) parts.push(donor.firstName)
  //     if (donor.lastName) parts.push(donor.lastName)
  //     if (donor.suffix) parts.push(donor.suffix)
  //     const fullName = parts.join(' ').trim()
  //     return fullName || 'לא ידוע'
  //   }
  // })
  // displayName?: string

  @Fields.number({ caption: 'ממוצע תרומות', allowNull: true })
  ns?: number

  // get fullNameGetter() {
  //   const parts = []
  //   if (this.title) parts.push(this.title)
  //   if (this.firstName) parts.push(this.firstName)
  //   if (this.lastName) parts.push(this.lastName)
  //   if (this.suffix) parts.push(this.suffix)
  //   return parts.join(' ').trim()
  // }

  // get fullNameEnglish() {

  //     const parts = []
  //     if (this.titleEnglish) parts.push(this.titleEnglish)
  //     if (this.firstNameEnglish) parts.push(this.firstNameEnglish)
  //     if (this.lastNameEnglish) parts.push(this.lastNameEnglish)
  //     if (this.suffixEnglish) parts.push(this.suffixEnglish)
  //     const fullName = parts.join(' ').trim()
  //     return fullName || 'UnKnown'
  // }

  // get displayNameGetter() {
  //   return this.fullName || 'לא ידוע'
  // }

  /**
   * שם תורם באנגלית למכתב/מדבקה - כולל לוגיקת Mr & Mrs
   * fallback לשם עברי אם אין אנגלית
   */
  getNameForLetter(): string {
    if (this.firstNameEnglish || this.lastNameEnglish) {
      const title = this.titleEnglish || '';
      const mrsMrs = this.maritalStatus === 'married' && !title.includes('Mrs.') ? '& Mrs.' : '';
      const first = this.firstNameEnglish || '';
      const last = this.lastNameEnglish || '';
      const suffix = this.suffixEnglish || '';
      return [title, mrsMrs, first, last, suffix].filter(p => p).join(' ').trim();
    }
    return this.fullName || '';
  }

  /**
   * שם תורם באנגלית לתגית סריקה - זהה ל-getNameForLetter אך ללא suffix
   * משמש ב-scan-api.ts כשורה העליונה בתגית שנצרבת על קובץ הסריקה.
   * fallback לשם עברי אם אין אנגלית.
   */
  getNameForTag(): string {
    if (this.firstNameEnglish || this.lastNameEnglish) {
      const title = this.titleEnglish || '';
      const mrsMrs = this.maritalStatus === 'married' && !title.includes('Mrs.') ? '& Mrs.' : '';
      const first = this.firstNameEnglish || '';
      const last = this.lastNameEnglish || '';
      return [title, mrsMrs, first, last].filter(p => p).join(' ').trim();
    }
    return this.fullName || '';
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
        newReminder.title = `${donorEvent.event.description} - ${this.fullName}`;
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