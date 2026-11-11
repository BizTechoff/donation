/**
 * reminder-type.ts
 *
 * The reminder TYPE and SOURCE labels, in one place, shared by the screen and
 * by the database.
 *
 * Why this file exists: both lists used to live inside reminders.component.ts,
 * as a Record the template read through getTypeText()/getSourceText(). So the
 * screen displayed Hebrew while the column stored an English code - and sorting
 * that column ordered by the CODE ('birthday', 'general', 'receipt'...) while
 * the user was looking at Hebrew. The rows came back in an order that matched
 * nothing on screen.
 *
 * A label the DB has to order by cannot live only in a component. Keeping the
 * list here lets the entity build a CASE expression FROM THE SAME MAP, so the
 * value Postgres sorts is character-for-character the value displayed, and a
 * new type is added in exactly one place.
 */

/**
 * שלב ג׳ 7.4 - 12 סוגי המערכת: הקוד והשם ההתחלתי. משמש רק לטעינה הראשונה
 * ליישות ReminderType (server/reminder-types.ts). מאותו רגע השם נקרא
 * מהיישות בלבד, ומשם המשתמש יכול לתקן אותו.
 *
 * השמות כאן הם בדיוק מה שהוצג עד היום ברשימה (terms.he), כדי שהמעבר לא
 * ישנה שום דבר בתצוגה. הסדר כאן קובע את sortOrder ההתחלתי.
 */
export const SYSTEM_REMINDER_TYPES: Record<string, string> = {
  donation_followup: 'מעקב תרומה',
  thank_you: 'מכתב תודה',
  receipt: 'קבלה',
  birthday: 'יום הולדת',
  holiday: 'חג',
  general: 'כללי',
  meeting: 'פגישה',
  phone_call: 'שיחת טלפון',
  gift: 'מתנה',
  memorialDay: 'נציב יום',
  memorial: 'נציב זכרון',
  yahrzeit: 'יוארצהייט'
}

/** Stored sourceEntityType -> the Hebrew shown in the list. */
export const REMINDER_SOURCE_LABELS: Record<string, string> = {
  donation: 'תרומה',
  certificate: 'תעודה',
  donor_gift: 'מתנה',
  donor_event: 'אירוע'
}

/** A reminder with no source entity was created by hand. */
export const REMINDER_SOURCE_MANUAL = 'ידנית'
