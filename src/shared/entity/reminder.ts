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
import { Contact } from './contact'
import { Roles } from '../enum/roles'

@Entity<Reminder>('reminders', {
  allowApiCrud: Allow.authenticated,
  allowApiRead: Allow.authenticated,
  allowApiUpdate: [Roles.admin],
  allowApiDelete: [Roles.admin],
  allowApiInsert: Allow.authenticated,
  saving: async (reminder) => {
    if (isBackend()) {
      if (reminder._.isNew()) {
        reminder.createdDate = new Date()
      }
      reminder.updatedDate = new Date()
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
  type: 'donation_followup' | 'thank_you' | 'receipt' | 'birthday' | 'holiday' | 'general' | 'meeting' | 'phone_call' | 'dedication' | 'memorial' = 'general'

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
    field: 'relatedDonorId'
  })
  relatedDonor?: Donor

  @Fields.string({
    caption: 'תורם קשור ID',
  })
  relatedDonorId = ''

  @Relations.toOne<Reminder, Donation>(() => Donation, {
    caption: 'תרומה קשורה',
    field: 'relatedDonationId'
  })
  relatedDonation?: Donation

  @Fields.string({
    caption: 'תרומה קשורה ID',
  })
  relatedDonationId = ''

  @Relations.toOne<Reminder, Contact>(() => Contact, {
    caption: 'איש קשר קשור',
    field: 'relatedContactId'
  })
  relatedContact?: Contact

  @Fields.string({
    caption: 'איש קשר קשור ID',
  })
  relatedContactId = ''

  @Fields.date({
    caption: 'תאריך יעד',
    validate: Validators.required,
  })
  dueDate = new Date()

  @Fields.string({
    caption: 'שעת יעד',
    allowNull: true
  })
  dueTime?: string

  @Fields.date({
    caption: 'תאריך התראה',
  })
  alertDate?: Date

  @Fields.boolean({
    caption: 'הושלם',
  })
  isCompleted = false

  @Fields.date({
    caption: 'תאריך השלמה',
    allowApiUpdate: false,
  })
  completedDate?: Date

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
  alertMethod: 'email' | 'sms' | 'popup' | 'none' = 'popup'

  @Fields.boolean({
    caption: 'תזכורת חוזרת',
  })
  isRecurring = false

  @Fields.string({
    caption: 'תדירות חזרה',
  })
  recurringPattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none' = 'none'

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
      case 'dedication': return 'נציב יום'
      case 'memorial': return 'נציב זכרון'
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

  calculateNextReminderDate(): Date | undefined {
    if (!this.isRecurring || this.recurringPattern === 'none') return undefined

    const baseDate = this.completedDate || this.dueDate
    const nextDate = new Date(baseDate)

    switch (this.recurringPattern) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1)
        break
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7)
        // If specific weekday is set, adjust to that day
        if (this.recurringWeekDay !== undefined) {
          const currentDay = nextDate.getDay()
          const targetDay = this.recurringWeekDay
          const daysToAdd = (targetDay - currentDay + 7) % 7
          if (daysToAdd === 0 && currentDay === targetDay) {
            // If it's the same day, move to next week
            nextDate.setDate(nextDate.getDate() + 7)
          } else {
            nextDate.setDate(nextDate.getDate() + daysToAdd)
          }
        }
        break
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        // If specific day of month is set, adjust to that day
        if (this.recurringDayOfMonth !== undefined) {
          nextDate.setDate(this.recurringDayOfMonth)
          // Handle edge case where the day doesn't exist in the month (e.g., Feb 31)
          if (nextDate.getDate() !== this.recurringDayOfMonth) {
            nextDate.setDate(0) // Go to last day of previous month
          }
        }
        break
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        // If specific month is set, adjust to that month
        if (this.recurringMonth !== undefined) {
          nextDate.setMonth(this.recurringMonth - 1) // Month is 0-based
          if (this.recurringDayOfMonth !== undefined) {
            nextDate.setDate(this.recurringDayOfMonth)
            // Handle edge case for Feb 29 in non-leap years
            if (nextDate.getDate() !== this.recurringDayOfMonth) {
              nextDate.setDate(0) // Go to last day of previous month
            }
          }
        }
        break
      default:
        return undefined
    }

    return nextDate
  }

  @BackendMethod({ allowed: Allow.authenticated })
  async complete(notes?: string) {
    this.isCompleted = true
    this.completedDate = new Date()
    if (notes) {
      this.completionNotes = notes
    }
    
    // Create next reminder if recurring
    if (this.isRecurring) {
      this.nextReminderDate = this.calculateNextReminderDate()
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
      relatedDonorId: this.relatedDonorId,
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
}