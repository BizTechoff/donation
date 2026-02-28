import { Allow, BackendMethod, remult } from 'remult'
import { Roles } from '../enum/roles'
import { GoogleAuthStatus, SyncOptions, SyncProgress, SyncResult, SyncStartResult, SyncType } from '../type/google-contacts.type'

export class GoogleContactsController {

  // Delegates - registered by server/google-contacts.ts
  static getAuthUrlDelegate: (userId: string) => Promise<string>
  static handleCallbackDelegate: (userId: string, code: string, state: string) => Promise<boolean>
  static triggerSyncDelegate: (userId: string, options: SyncOptions, syncType: SyncType) => Promise<SyncStartResult>
  static getStatusDelegate: (userId: string) => Promise<GoogleAuthStatus>
  static disconnectDelegate: (userId: string) => Promise<void>
  static getSyncLogsDelegate: (userId: string, limit: number) => Promise<any[]>
  static getSyncProgressDelegate: (logId: string, userId: string) => Promise<SyncProgress>
  static cancelSyncDelegate: (logId: string, userId: string) => Promise<void>

  @BackendMethod({ allowed: Allow.authenticated })
  static async getAuthUrl(): Promise<string> {
    return GoogleContactsController.getAuthUrlDelegate(remult.user!.id)
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async triggerSync(options: SyncOptions): Promise<SyncStartResult> {
    return GoogleContactsController.triggerSyncDelegate(remult.user!.id, options, 'manual')
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getSyncProgress(logId: string): Promise<SyncProgress> {
    return GoogleContactsController.getSyncProgressDelegate(logId, remult.user!.id)
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async cancelSync(logId: string): Promise<void> {
    return GoogleContactsController.cancelSyncDelegate(logId, remult.user!.id)
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getStatus(): Promise<GoogleAuthStatus> {
    return GoogleContactsController.getStatusDelegate(remult.user!.id)
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async disconnect(): Promise<void> {
    return GoogleContactsController.disconnectDelegate(remult.user!.id)
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getSyncLogs(limit: number = 20): Promise<any[]> {
    return GoogleContactsController.getSyncLogsDelegate(remult.user!.id, limit)
  }
}
