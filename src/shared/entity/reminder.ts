import {
  IdEntity,
  Entity,
  Validators,
  isBackend,
  Allow,
  Fields,
  BackendMethod,
  Relations,
  remult,
} from 'remult'
import { Donor } from './donor'
import { User } from './user'
import { Donation } from './donation'
import { Roles } from '../enum/roles'
import { ReminderController } from '../controllers/reminder.controller'

@Entity<Reminder>('reminders', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Allow.authenticated,
  allowApiInsert: Allow.authenticated,
  saving: async (reminder) => {
    if (isBackend()) {
      if (reminder._.isNew()) {
        reminder.createdDate = new Date()
      }
      reminder.updatedDate = new Date()

      // Round dueTime to nearest 5-minute interval for cron scheduler sync
      if (reminder.dueTime) {
        const [hours, minutes] = reminder.dueTime.split(':').map(Number)
        const totalMinutes = hours * 60 + minutes
        // Round to nearest 5 minutes
        const roundedMinutes = Math.round(totalMinutes / 5) * 5
        const roundedHours = Math.floor(roundedMinutes / 60) % 24
        const roundedMins = roundedMinutes % 60
        reminder.dueTime = `${String(roundedHours).padStart(2, '0')}:${String(roundedMins).padStart(2, '0')}`
      }

      // Auto-populate Hebrew recurring fields for yearly date-based reminders
      if (reminder.isRecurring &&
          reminder.recurringPattern === 'yearly' &&
          reminder.yearlyRecurringType === 'date' &&
          (!reminder.recurringMonth || !reminder.recurringDayOfMonth)) {
        const { HebrewDateController } = await import('../controllers/hebrew-date.controller');
        const hebrewDate = await HebrewDateController.getHebrewDateComponents(reminder.dueDate);
        reminder.recurringMonth = hebrewDate.month;
        reminder.recurringDayOfMonth = hebrewDate.day;
      }

      // Calculate next reminder date for ALL reminders (recurring and one-time)
      const { ReminderController } = await import('../controllers/reminder.controller');
      reminder.nextReminderDate = await ReminderController.calculateNextReminderDate({
        isRecurring: reminder.isRecurring,
        recurringPattern: reminder.recurringPattern,
        dueDate: reminder.dueDate,
        dueTime: reminder.dueTime,
        recurringWeekDay: reminder.recurringWeekDay,
        recurringDayOfMonth: reminder.recurringDayOfMonth,
        recurringMonth: reminder.recurringMonth,
        yearlyRecurringType: reminder.yearlyRecurringType,
        specialOccasion: reminder.specialOccasion
      });
    }
  },
})
export class Reminder extends IdEntity {
  @Fields.string({
    validate: Validators.required,
    caption: 'כותרת',
  })
  title = ''

  @Fields.string({
    caption: 'תיאור',
  })
  description = ''

  @Fields.string({
    caption: 'סוג תזכורת',
    validate: Validators.required,
  })
  type: 'donation_followup' | 'thank_you' | 'receipt' | 'birthday' | 'holiday' | 'general' | 'meeting' | 'phone_call' | 'memorialDay' | 'memorial' | 'yahrzeit' | 'gift' = 'general'

  @Fields.string({
    caption: 'עדיפות',
    validate: Validators.required,
  })
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'

  @Fields.string({
    caption: 'תדירות',
    validate: Validators.required,
  })
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'

  @Relations.toOne<Reminder, Donor>(() => Donor, {
    caption: 'תורם קשור',
    field: 'donorId'
  })
  donor?: Donor

  @Fields.string({
    caption: 'תורם קשור ID',
    allowNull: true
  })
  donorId?: string

  @Fields.string({
    caption: 'סוג ישות מקור',
    allowNull: true
  })
  sourceEntityType?: 'donation' | 'certificate' | 'donor_gift' | 'donor_event'

  @Fields.string({
    caption: 'מזהה ישות מקור',
    allowNull: true
  })
  sourceEntityId?: string

  @Fields.dateOnly({
    caption: 'תאריך יעד',
    validate: Validators.required,
  })
  dueDate = new Date()

  @Fields.string({
    caption: 'שעת יעד',
    allowNull: true
  })
  dueTime?: string = '10:00'

  @Fields.date({
    caption: 'תאריך התראה',
  })
  alertDate?: Date

  @Fields.string({
    caption: 'הערות השלמה',
  })
  completionNotes = ''

  @Relations.toOne<Reminder, User>(() => User, {
    caption: 'שיוך למשתמש',
    field: 'assignedToId'
  })
  assignedTo?: User

  @Fields.string({
    caption: 'שיוך למשתמש ID',
  })
  assignedToId = ''

  @Fields.boolean({
    caption: 'תזכורת פעילה',
  })
  isActive = true

  @Fields.string({
    caption: 'סטטוס תזכורת',
  })
  status: 'pending' | 'completed' | 'snoozed' = 'pending'

  @Fields.boolean({
    caption: 'שלח התראה',
  })
  sendAlert = true

  @Fields.string({
    caption: 'אמצעי התראה',
  })
  alertMethod: 'email' | 'sms' | 'popup' = 'popup'

  @Fields.boolean({
    caption: 'תזכורת חוזרת',
  })
  isRecurring = false

  @Fields.string({
    caption: 'תדירות חזרה',
  })
  recurringPattern: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'

  @Fields.string({
    caption: 'סוג חזרה שנתית',
  })
  yearlyRecurringType: 'date' | 'occasion' = 'date' // תאריך קבוע או מועד

  @Fields.number({
    caption: 'יום בשבוע (תזכורת שבועית)',
    allowNull: true
  })
  recurringWeekDay?: number // 0=ראשון, 1=שני, 2=שלישי, 3=רביעי, 4=חמישי, 5=שישי, 6=שבת

  @Fields.number({
    caption: 'יום בחודש (תזכורת חודשית)',
    allowNull: true
  })
  recurringDayOfMonth?: number // 1-31

  @Fields.number({
    caption: 'חודש בשנה (תזכורת שנתית)',
    allowNull: true
  })
  recurringMonth?: number // 1-12

  @Fields.string({
    caption: 'זמן מיוחד (חג/אירוע)',
  })
  specialOccasion = '' // Holiday or special occasion name

  @Fields.date({
    caption: 'נשלחה התראה',
    allowApiUpdate: false,
    allowNull: true,
  })
  alertSent?: Date

  @Fields.boolean({
    caption: 'הושלם',
  })
  isCompleted = false

  @Fields.date({
    caption: 'תאריך השלמה',
    allowApiUpdate: false,
  })
  completedDate?: Date

  @Fields.date({
    caption: 'תזכורת הבאה',
  })
  nextReminderDate?: Date

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

  @Relations.toOne<Reminder, User>(() => User, {
    caption: 'נוצר על ידי',
    field: 'createdById'
  })
  createdBy?: User

  @Fields.string({
    caption: 'נוצר על ידי ID',
  })
  createdById = ''

  get typeText(): string {
    switch (this.type) {
      case 'donation_followup': return 'מעקב תרומה'
      case 'thank_you': return 'מכתב תודה'
      case 'receipt': return 'קבלה'
      case 'birthday': return 'יום הולדת'
      case 'holiday': return 'חג'
      case 'general': return 'כללי'
      case 'meeting': return 'פגישה'
      case 'phone_call': return 'שיחת טלפון'
      case 'memorialDay': return 'נציב יום'
      case 'memorial': return 'נציב זכרון'
      case 'yahrzeit': return 'יוארצהייט'
      case 'gift': return 'מתנה'
      default: return this.type
    }
  }

  get priorityText(): string {
    switch (this.priority) {
      case 'low': return 'נמוך'
      case 'normal': return 'רגיל'
      case 'high': return 'גבוה'
      case 'urgent': return 'דחוף'
      default: return this.priority
    }
  }

  get statusText(): string {
    if (this.isCompleted) return 'הושלם'
    if (!this.isActive) return 'לא פעיל'
    if (this.isOverdue) return 'באיחור'
    if (this.isDueToday) return 'לביצוע היום'
    if (this.isDueSoon) return 'בקרוב'
    return 'ממתין'
  }

  get isOverdue(): boolean {
    if (this.isCompleted) return false
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    today.setHours(0, 0, 0, 0)
    return this.dueDate < today
  }

  get isDueToday(): boolean {
    if (this.isCompleted) return false
    const today = new Date()
    const dueDate = new Date(this.dueDate)
    return (
      today.getDate() === dueDate.getDate() &&
      today.getMonth() === dueDate.getMonth() &&
      today.getFullYear() === dueDate.getFullYear()
    )
  }

  get isDueSoon(): boolean {
    if (this.isCompleted || this.isOverdue) return false
    const today = new Date()
    const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000))
    return this.dueDate <= threeDaysFromNow
  }

  get daysToDue(): number {
    if (this.isCompleted) return 0
    const today = new Date()
    const diffTime = this.dueDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  @BackendMethod({ allowed: Allow.authenticated })
  async complete(notes?: string, endRecurring: boolean = false) {
    // For recurring reminders: move to next occurrence (unless endRecurring=true)
    // For one-time reminders: mark as completed
    if (this.isRecurring && !endRecurring) {
      // Calculate next occurrence
      this.nextReminderDate = await ReminderController.calculateNextReminderDate({
        isRecurring: this.isRecurring,
        recurringPattern: this.recurringPattern,
        dueDate: this.dueDate,
        dueTime: this.dueTime,
        recurringWeekDay: this.recurringWeekDay,
        recurringDayOfMonth: this.recurringDayOfMonth,
        recurringMonth: this.recurringMonth,
        yearlyRecurringType: this.yearlyRecurringType,
        specialOccasion: this.specialOccasion
      })
      // Keep the reminder active (don't set isCompleted)
    } else {
      // One-time reminder OR recurring with endRecurring=true: mark as completed
      this.isCompleted = true
      this.completedDate = new Date()
      if (notes) {
        this.completionNotes = notes
      }
    }

    await this.save()
  }

  @BackendMethod({ allowed: Allow.authenticated })
  async reopen() {
    this.isCompleted = false
    this.completedDate = undefined
    this.completionNotes = ''
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async activate() {
    this.isActive = true
    await this.save()
  }

  @BackendMethod({ allowed: [Roles.admin] })
  async deactivate() {
    this.isActive = false
    await this.save()
  }

  @BackendMethod({ allowed: Allow.authenticated })
  async snooze(hours: number) {
    const snoozeDate = new Date()
    snoozeDate.setHours(snoozeDate.getHours() + hours)
    this.dueDate = snoozeDate
    
    if (this.alertDate && this.alertDate < snoozeDate) {
      this.alertDate = new Date(snoozeDate.getTime() - (60 * 60 * 1000)) // 1 hour before
    }
    
    await this.save()
  }

  @BackendMethod({ allowed: Allow.authenticated })
  async createRecurringReminder() {
    if (!this.isRecurring || !this.nextReminderDate) return null

    const nextReminder = remult.repo(Reminder).create({
      title: this.title,
      description: this.description,
      type: this.type,
      priority: this.priority,
      donorId: this.donorId,
      dueDate: this.nextReminderDate,
      assignedToId: this.assignedToId,
      sendAlert: this.sendAlert,
      alertMethod: this.alertMethod,
      isRecurring: this.isRecurring,
      recurringPattern: this.recurringPattern,
      createdById: this.createdById
    })

    await nextReminder.save()
    return nextReminder
  }

  /**
   * Send alert notification for this reminder (email/popup)
   * Called by scheduler when reminder is due
   * Returns success status
   */
  @BackendMethod({ allowed: Allow.authenticated })
  async sendAlertNotification(): Promise<{ success: boolean; error?: string }> {
    // Check if alert should be sent
    if (!this.sendAlert || this.isCompleted || !this.isActive) {
      return { success: false, error: 'Alert not needed' }
    }
    // For non-recurring reminders, check if alert was already sent
    if (!this.isRecurring && this.alertSent) {
      return { success: false, error: 'Alert already sent' }
    }

    const alertMethod = this.alertMethod || 'popup'
    let emailSent = false

    // Handle email alerts
    if (alertMethod === 'email') {
      // Need to load assignedTo if not loaded
      const user = this.assignedTo || (this.assignedToId ? await remult.repo(User).findId(this.assignedToId) : null)

      if (!user?.email?.trim()) {
        return { success: false, error: 'No email address for assigned user' }
      }

      // Parse emails (separated by ; or ,)
      const emails = user.email.split(/[;,]/).map(e => e.trim()).filter(e => e.length > 0)

      if (emails.length === 0) {
        return { success: false, error: 'No valid email addresses' }
      }

      // Load donor if needed for email content
      const donor = this.donor || (this.donorId ? await remult.repo(Donor).findId(this.donorId) : null)

      // Build HTML email
      const subject = `תזכורת: ${this.title}`
      const html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
          <h2 style="color: #2c3e50; text-align: center;">תזכורת</h2>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">${this.title}</h3>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #7f8c8d; width: 100px;">סוג:</td>
                <td style="padding: 8px 0; color: #2c3e50;">${this.typeText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #7f8c8d;">עדיפות:</td>
                <td style="padding: 8px 0; color: #2c3e50;">${this.priorityText}</td>
              </tr>
              ${this.description ? `
              <tr>
                <td style="padding: 8px 0; color: #7f8c8d;">תיאור:</td>
                <td style="padding: 8px 0; color: #2c3e50;">${this.description}</td>
              </tr>
              ` : ''}
              ${donor ? `
              <tr>
                <td style="padding: 8px 0; color: #7f8c8d;">תורם:</td>
                <td style="padding: 8px 0; color: #2c3e50;">${donor.fullName}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #7f8c8d;">תאריך יעד:</td>
                <td style="padding: 8px 0; color: #2c3e50;">${this.dueDate.toLocaleDateString('he-IL')}</td>
              </tr>
              ${this.dueTime ? `
              <tr>
                <td style="padding: 8px 0; color: #7f8c8d;">שעה:</td>
                <td style="padding: 8px 0; color: #2c3e50;">${this.dueTime}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

          <p style="font-size: 12px; color: #95a5a6; text-align: center;">
            הודעה זו נשלחה אוטומטית מפלטפורמת ניהול התרומות
          </p>
        </div>
      `

      try {
        const { EmailController } = await import('../controllers/email.controller')
        const response = await EmailController.sendCustomEmail({ emails, subject, html })

        if (response?.success) {
          emailSent = true
        } else {
          return { success: false, error: response?.errorText || 'Email sending failed' }
        }
      } catch (error) {
        return { success: false, error: `Email error: ${error}` }
      }
    }

    // Mark alert as sent (keeps history of last alert for recurring)
    this.alertSent = new Date()

    // For recurring reminders, calculate next date
    if (this.isRecurring) {
      this.nextReminderDate = await ReminderController.calculateNextReminderDate({
        isRecurring: this.isRecurring,
        recurringPattern: this.recurringPattern,
        dueDate: this.dueDate,
        dueTime: this.dueTime,
        recurringWeekDay: this.recurringWeekDay,
        recurringDayOfMonth: this.recurringDayOfMonth,
        recurringMonth: this.recurringMonth,
        yearlyRecurringType: this.yearlyRecurringType,
        specialOccasion: this.specialOccasion
      })
    }

    await this.save()

    return { success: true }
  }

}