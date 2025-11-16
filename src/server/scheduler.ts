import { remult } from 'remult'
import { ReminderController } from '../shared/controllers/reminder.controller'
import { Reminder } from '../shared/entity/reminder'

/**
 * Scheduler for checking and sending reminder notifications
 * This function should be called periodically (e.g., every 5 minutes)
 */
export async function checkAndSendReminders() {
  try {
    console.log('[Scheduler] Checking for due reminders...')

    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of day for comparison

    // Find all reminders that are due (nextReminderDate <= today) and not completed
    // Order by priority (urgent, high, normal, low) and then by nextReminderDate
    const dueReminders = await remult.repo(Reminder).find({
      where: {
        nextReminderDate: { $lte: today },
        isCompleted: false,
        isActive: true//,
        // sendAlert: true
      },
      include: {
        assignedTo: true,
        donor: true
      },
      orderBy: {
        priority: 'asc',
        nextReminderDate: 'asc'
      }
    })

    console.log(`[Scheduler] Found ${dueReminders.length} due reminders`)

    // Process each reminder
    for (const reminder of dueReminders) {
      try {
        await sendReminderNotification(reminder)
      } catch (error) {
        console.error(`[Scheduler] Error sending notification for reminder ${reminder.id}:`, error)
      }
    }

    console.log('[Scheduler] Finished checking reminders')
  } catch (error) {
    console.error('[Scheduler] Error in checkAndSendReminders:', error)
  }
}

/**
 * Send notification for a specific reminder based on the alert method
 */
async function sendReminderNotification(reminder: Reminder) {
  console.log(`[Scheduler] Processing reminder: ${reminder.title} (ID: ${reminder.id})`)

  const alertMethod = reminder.alertMethod || 'popup'

  switch (alertMethod) {
    case 'email':
      // if(!reminder.ale)
      await sendEmailNotification(reminder)
      break

    case 'popup':
      // For popup notifications, we just log them
      // The actual popup will be shown in the UI via LiveQuery
      console.log(`[Scheduler] Popup notification will be shown for: ${reminder.title}`)
      break

    case 'sms':
      // SMS is disabled for now
      console.log(`[Scheduler] SMS notification is disabled for: ${reminder.title}`)
      break

    default:
      console.log(`[Scheduler] Unknown alert method '${alertMethod}' for reminder: ${reminder.title}`)
  }

  // Update the reminder to mark that notification was sent
  // For recurring: move to next occurrence
  // For one-time: mark as completed
  if (reminder.isRecurring) {
    const nextDate = await ReminderController.calculateNextReminderDate({
      isRecurring: reminder.isRecurring,
      recurringPattern: reminder.recurringPattern,
      dueDate: reminder.dueDate,
      dueTime: reminder.dueTime,
      recurringWeekDay: reminder.recurringWeekDay,
      recurringDayOfMonth: reminder.recurringDayOfMonth,
      recurringMonth: reminder.recurringMonth,
      yearlyRecurringType: reminder.yearlyRecurringType,
      specialOccasion: reminder.specialOccasion
    })
    if (nextDate) {
      reminder.nextReminderDate = nextDate
      await reminder.save()
      console.log(`[Scheduler] Updated next reminder date to: ${nextDate}`)
    }
  } else {
    // For non-recurring reminders, mark alert as sent
    reminder.alertSent = new Date()
    await reminder.save()
    console.log(`[Scheduler] Marked alert as sent for non-recurring reminder`)
  }
}

/**
 * Send email notification for a reminder
 */
async function sendEmailNotification(reminder: Reminder) {
  try {
    // Get the user
    const user = reminder.assignedTo
    if (!user) {
      console.warn(`[Scheduler] No user assigned to reminder: ${reminder.title}`)
      return
    }

    // TODO: Add email field to User entity or get email from user contacts
    // For now, just log that we would send an email
    console.log(`[Scheduler] Would send email to user ${user.name} for reminder: ${reminder.title}`)

    // Prepare email content
    const subject = `תזכורת: ${reminder.title}`

    let body = `שלום ${user.name},\n\n`
    body += `יש לך תזכורת:\n\n`
    body += `כותרת: ${reminder.title}\n`
    body += `סוג: ${reminder.typeText}\n`
    body += `עדיפות: ${reminder.priorityText}\n`

    if (reminder.description) {
      body += `תיאור: ${reminder.description}\n`
    }

    if (reminder.donor) {
      body += `תורם קשור: ${reminder.donor.fullName}\n`
    }

    body += `תאריך יעד: ${reminder.dueDate.toLocaleDateString('he-IL')}\n`

    if (reminder.dueTime) {
      body += `שעת יעד: ${reminder.dueTime}\n`
    }

    body += `\n\nבברכה,\n`
    body += `מערכת ניהול תרומות`

    // TODO: Replace with actual email sending service
    // For now, just log the email content
    console.log('[Scheduler] Email notification:')
    console.log(`  To: ${user.name}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Body: ${body}`)

    // When implementing actual email sending, use a service like:
    // - nodemailer
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // etc.

    /*
    Example with nodemailer:

    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: subject,
      text: body
    });
    */

  } catch (error) {
    console.error(`[Scheduler] Error sending email for reminder ${reminder.id}:`, error)
  }
}

/**
 * Get count of active reminders for the current user
 * This will be used by the notification bell in the UI
 */
export async function getActiveRemindersCount(userId: string): Promise<number> {
  try {
    const today = new Date()

    const count = await remult.repo(Reminder).count({
      nextReminderDate: { $lte: today },
      isCompleted: false,
      isActive: true,
      assignedToId: userId
    })

    return count
  } catch (error) {
    console.error('[Scheduler] Error getting active reminders count:', error)
    return 0
  }
}
