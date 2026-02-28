export type SyncStatus = 'synced' | 'conflict' | 'error' | 'pending'

export type ConflictResolution = 'platform_wins' | 'google_wins' | 'newest_wins' | 'manual'

export type SyncType = 'manual' | 'scheduled' | 'initial'

export type SyncLogStatus = 'started' | 'completed' | 'failed'

export interface SyncOptions {
  conflictResolution: ConflictResolution
  dryRun?: boolean
}

export interface SyncResult {
  success: boolean
  donorsPushed: number
  contactsPulled: number
  conflicts: number
  errors: number
  errorDetails: string[]
  conflictDetails: SyncConflict[]
  duration: number
}

export interface SyncConflict {
  donorId: string
  donorName: string
  googleResourceName: string
  field: string
  platformValue: string
  googleValue: string
}

export interface GoogleAuthStatus {
  isConnected: boolean
  googleEmail?: string
  lastSyncedAt?: Date
}
