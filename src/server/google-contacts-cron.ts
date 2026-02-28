import cron from 'node-cron'
import { remult } from 'remult'
import { GoogleAuth } from '../shared/entity/google-auth'
import { GoogleContactsController } from '../shared/controllers/google-contacts.controller'

export function scheduleGoogleContactsSync() {
  if (!process.env['GOOGLE_CONTACTS_CLIENT_ID']) {
    console.log('[GoogleContacts] Cron: No client ID configured, skipping scheduled sync.')
    return
  }

  console.log('[GoogleContacts] Setting up scheduled sync (every 6 hours)...')
  cron.schedule('0 */6 * * *', async () => {
    console.log('[GoogleContacts] Cron: Running scheduled sync at:', new Date().toISOString())
    try {
      const activeAuths = await remult.repo(GoogleAuth).find({
        where: { isActive: true }
      })

      for (const auth of activeAuths) {
        try {
          console.log(`[GoogleContacts] Cron: Syncing for user ${auth.userId} (${auth.googleEmail})`)
          await GoogleContactsController.triggerSyncDelegate(
            auth.userId,
            { conflictResolution: 'platform_wins' },
            'scheduled'
          )
        } catch (err: any) {
          console.error(`[GoogleContacts] Cron: Sync failed for user ${auth.userId}:`, err.message)
        }
      }
    } catch (err: any) {
      console.error('[GoogleContacts] Cron: Failed to run scheduled sync:', err.message)
    }
  })
}
