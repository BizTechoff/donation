import { Allow, BackendMethod, remult } from 'remult'
import { User } from '../entity/user'

export type UserSettings = NonNullable<User['settings']>
export type UserSettingsKey = keyof UserSettings

/**
 * UserSettingsController - the ONLY writer of user.settings (item 33).
 *
 * user.settings is one JSON column shared by many screens: global filters,
 * per-list sort, sidebar, map, reports, global search, route planner. Each
 * screen used to load the user, change its own key and save the WHOLE object.
 * Whoever saved last won - and a screen holding an old copy wrote the others'
 * old values back. That is how a cleared global filter came back after a
 * column sort (TableState kept the copy it loaded when the list opened), and
 * the list showed "20 מתוך 20" with an empty filter bar.
 *
 * Here the server reads the row fresh and touches exactly one key:
 *   set(key, value)        - replace the key (null/undefined removes it)
 *   merge(key, partial)    - shallow-merge into an object key; a null field
 *                            in `partial` removes that field
 * Both return the full, current settings, for callers that cache them on
 * remult.user.
 */
export class UserSettingsController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async set<K extends UserSettingsKey>(key: K, value: UserSettings[K] | null): Promise<UserSettings> {
    return UserSettingsController.patch(remult.user!.id, key, 'set', value)
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async merge<K extends UserSettingsKey>(key: K, partial: Partial<UserSettings[K]>): Promise<UserSettings> {
    return UserSettingsController.patch(remult.user!.id, key, 'merge', partial)
  }

  /**
   * Backend only - shared by the two methods above and by the tab-close
   * beacon in server/index.ts, so there is one read-modify-write in the app.
   */
  static async patch(userId: string, key: UserSettingsKey, mode: 'set' | 'merge', value: any): Promise<UserSettings> {
    const repo = remult.repo(User)
    const user = await repo.findId(userId, { useCache: false })
    if (!user) throw new Error('User not found')

    const settings: any = { ...(user.settings || UserSettingsController.defaults()) }

    if (mode === 'set') {
      if (value === null || value === undefined) delete settings[key]
      else settings[key] = value
    } else {
      const current = settings[key] && typeof settings[key] === 'object' ? settings[key] : {}
      const next: any = { ...current }
      for (const [k, v] of Object.entries(value || {})) {
        if (v === null) delete next[k]
        else next[k] = v
      }
      settings[key] = next
    }

    user.settings = settings
    await repo.save(user)
    return user.settings as UserSettings
  }

  /** Used only when the row has no settings yet - same values the screens used. */
  private static defaults(): UserSettings {
    return {
      openModal: 'dialog',
      calendar_heb_holidays_jews_enabled: false,
      calendar_open_heb_and_eng_parallel: false
    } as UserSettings
  }
}
