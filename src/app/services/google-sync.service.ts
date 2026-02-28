import { Injectable } from '@angular/core'
import { GoogleContactsController } from '../../shared/controllers/google-contacts.controller'
import { GoogleAuthStatus, SyncOptions, SyncResult } from '../../shared/type/google-contacts.type'

@Injectable({
  providedIn: 'root'
})
export class GoogleSyncService {

  async getAuthUrl(): Promise<string> {
    return GoogleContactsController.getAuthUrl()
  }

  async triggerSync(options?: Partial<SyncOptions>): Promise<SyncResult> {
    return GoogleContactsController.triggerSync({
      conflictResolution: options?.conflictResolution || 'platform_wins',
      dryRun: options?.dryRun
    })
  }

  async getStatus(): Promise<GoogleAuthStatus> {
    return GoogleContactsController.getStatus()
  }

  async disconnect(): Promise<void> {
    return GoogleContactsController.disconnect()
  }

  async getSyncLogs(limit: number = 20): Promise<any[]> {
    return GoogleContactsController.getSyncLogs(limit)
  }
}
