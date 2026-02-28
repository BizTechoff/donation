import { Component, OnInit } from '@angular/core'
import { GoogleSyncService } from '../../services/google-sync.service'
import { GoogleAuthStatus, ConflictResolution, SyncResult } from '../../../shared/type/google-contacts.type'

@Component({
  selector: 'app-google-sync',
  templateUrl: './google-sync.component.html',
  styleUrl: './google-sync.component.scss'
})
export class GoogleSyncComponent implements OnInit {

  status: GoogleAuthStatus = { isConnected: false }
  syncLogs: any[] = []
  lastSyncResult: SyncResult | null = null
  conflictResolution: ConflictResolution = 'platform_wins'

  loading = false
  syncing = false
  errorMessage = ''

  constructor(private googleSync: GoogleSyncService) { }

  async ngOnInit() {
    // Check for OAuth callback result
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

  async loadStatus() {
    this.loading = true
    try {
      this.status = await this.googleSync.getStatus()
      if (this.status.isConnected) {
        this.syncLogs = await this.googleSync.getSyncLogs(10)
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
      this.lastSyncResult = null
    } catch (err: any) {
      this.errorMessage = err.message
    }
  }

  async triggerSync() {
    this.errorMessage = ''
    this.syncing = true
    this.lastSyncResult = null
    try {
      this.lastSyncResult = await this.googleSync.triggerSync({
        conflictResolution: this.conflictResolution
      })
      await this.loadStatus()
    } catch (err: any) {
      this.errorMessage = err.message
    } finally {
      this.syncing = false
    }
  }
}
