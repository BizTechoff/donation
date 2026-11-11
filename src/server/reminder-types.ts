import { remult } from 'remult'
import { ReminderType } from '../shared/entity/reminder-type'
import { SYSTEM_REMINDER_TYPES } from '../shared/enum/reminder-type'

/**
 * שלב ג׳ 7.4 - מוודא ש-12 סוגי המערכת קיימים ביישות ReminderType.
 * מוסיף רק קוד חסר - לא נוגע בשם שהמשתמש כבר שינה. רץ בעליית השרת.
 */
export async function ensureSystemReminderTypes(): Promise<void> {
  const repo = remult.repo(ReminderType)
  const existing = new Set((await repo.find()).map(t => t.code))
  let sortOrder = 0
  let added = 0
  for (const [code, name] of Object.entries(SYSTEM_REMINDER_TYPES)) {
    sortOrder++
    if (existing.has(code)) continue
    await repo.insert({ code, name, sortOrder, isSystem: true, isActive: true })
    added++
  }
  if (added) console.info(`[reminder-types] ${added} system types added.`)
}
