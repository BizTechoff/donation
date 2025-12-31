import { remult } from 'remult'
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
 * Send notification for a specific reminder using the entity method
 */
async function sendReminderNotification(reminder: Reminder) {
  console.log(`[Scheduler] Processing reminder: ${reminder.title} (ID: ${reminder.id})`)

  const alertMethod = reminder.alertMethod || 'popup'

  switch (alertMethod) {
    case 'email':
      // Use the entity method which handles all the logic:
      // - Checks sendAlert, isCompleted, isActive
      // - For non-recurring: checks alertSent
      // - Sends email
      // - Updates alertSent
      // - For recurring: calculates next date
      const result = await reminder.sendAlertNotification()
      if (result.success) {
        console.log(`[Scheduler] Alert sent successfully for: ${reminder.title}`)
      } else {
        console.log(`[Scheduler] Alert not sent: ${result.error}`)
      }
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
