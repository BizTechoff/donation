import { Injectable } from '@angular/core'
import { remult } from 'remult'
import {
  UserSettings,
  UserSettingsController,
  UserSettingsKey
} from '../../shared/controllers/user-settings.controller'

/**
 * Client entry point for user.settings (item 33). Every screen saves its own
 * preference through here, never by loading and saving the User row itself -
 * see UserSettingsController for why.
 *
 * After each save the returned settings are cached on remult.user, for the
 * screens that read their preference from there (sidebar mode, map, route
 * planner).
 */
@Injectable({ providedIn: 'root' })
export class UserSettingsService {

  /** Replace one key. null removes it. */
  async set<K extends UserSettingsKey>(key: K, value: UserSettings[K] | null): Promise<UserSettings> {
    return this.cache(await UserSettingsController.set(key, value))
  }

  /** Shallow-merge into one object key. A null field removes that field. */
  async merge<K extends UserSettingsKey>(key: K, partial: Partial<UserSettings[K]> | Record<string, unknown>): Promise<UserSettings> {
    return this.cache(await UserSettingsController.merge(key, partial as Partial<UserSettings[K]>))
  }

  private cache(settings: UserSettings): UserSettings {
    if (remult.user) (remult.user as any).settings = settings
    return settings
  }
}
