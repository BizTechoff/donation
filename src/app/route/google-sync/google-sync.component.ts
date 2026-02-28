import { Component, OnDestroy, OnInit } from '@angular/core'
import { GoogleSyncService } from '../../services/google-sync.service'
import { GoogleAuthStatus, ConflictResolution, SyncProgress } from '../../../shared/type/google-contacts.type'

@Component({
  selector: 'app-google-sync',
  templateUrl: './google-sync.component.html',
  styleUrl: './google-sync.component.scss'
})
export class GoogleSyncComponent implements OnInit, OnDestroy {

  status: GoogleAuthStatus = { isConnected: false }
  syncLogs: any[] = []
  syncProgress: SyncProgress | null = null
  conflictResolution: ConflictResolution = 'platform_wins'

  loading = false
  syncing = false
  errorMessage = ''
  activeLogId = ''

  private pollTimer: any = null

  constructor(private googleSync: GoogleSyncService) { }

  async ngOnInit() {
    const params = new URLSearchParams(window.location.search)
    const syncResult = params.get('google-sync')
    if (syncResult === 'success') {
      window.history.replaceState({}, '', window.location.pathname)
    } else if (syncResult === 'error') {
      this.errorMessage = params.get('reason') || 'OAuth connection failed'
      window.history.replaceState({}, '', window.location.pathname)
    }

    await this.loadStatus()
  }

  ngOnDestroy() {
    this.stopPolling()
  }

  async loadStatus() {
    this.loading = true
    try {
      this.status = await this.googleSync.getStatus()
      if (this.status.isConnected) {
        this.syncLogs = await this.googleSync.getSyncLogs(10)
        // Check if there's an active sync running
        const activeLog = this.syncLogs.find(l => l.status === 'started')
        if (activeLog) {
          this.syncing = true
          this.startPolling(activeLog.id)
        }
      }
    } catch (err: any) {
      this.errorMessage = err.message
    } finally {
      this.loading = false
    }
  }

  async connectGoogle() {
    this.errorMessage = ''
    try {
      const url = await this.googleSync.getAuthUrl()
      window.location.href = url
    } catch (err: any) {
      this.errorMessage = err.message
    }
  }

  async disconnectGoogle() {
    this.errorMessage = ''
    try {
      await this.googleSync.disconnect()
      this.status = { isConnected: false }
      this.syncLogs = []
      this.syncProgress = null
    } catch (err: any) {
      this.errorMessage = err.message
    }
  }

  async triggerSync() {
    this.errorMessage = ''
    this.syncing = true
    this.syncProgress = null
    try {
      const startResult = await this.googleSync.triggerSync({
        conflictResolution: this.conflictResolution
      })
      if (!startResult.started) {
        this.errorMessage = startResult.message
        this.syncing = false
        return
      }
      this.startPolling(startResult.logId)
    } catch (err: any) {
      this.errorMessage = err.message
      this.syncing = false
    }
  }

  async cancelSync() {
    if (!this.activeLogId) return
    try {
      await this.googleSync.cancelSync(this.activeLogId)
      this.stopPolling()
      this.syncing = false
      this.syncProgress = null
      this.activeLogId = ''
      await this.loadStatus()
    } catch (err: any) {
      this.errorMessage = err.message
    }
  }

  private startPolling(logId: string) {
    this.activeLogId = logId
    this.pollTimer = setInterval(async () => {
      try {
        this.syncProgress = await this.googleSync.getSyncProgress(logId)
        if (this.syncProgress.status === 'completed' || this.syncProgress.status === 'failed') {
          this.stopPolling()
          this.syncing = false
          await this.loadStatus()
        }
      } catch {
        this.stopPolling()
        this.syncing = false
      }
    }, 2000)
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }
}
