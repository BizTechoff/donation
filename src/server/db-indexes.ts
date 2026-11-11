import { remult, SqlDatabase } from 'remult'

/**
 * אינדקסים במסד - במקום אחד.
 *
 * רימלט 3 לא מצהיר על אינדקסים ביישות, ועד היום לא היה במסד אף אינדקס מלבד
 * המפתחות הראשיים. כל שליפת תצוגה (WHERE "donorId" IN (...), תת-השאילתות של
 * sqlExpression, getProgress, הייצוא) הייתה סריקה מלאה של הטבלה.
 *
 * רץ בעליית השרת, ברקע. IF NOT EXISTS - בטוח להרצה חוזרת; אינדקס חדש מתווסף
 * כאן בלבד. כשל באחד (למשל JSON לא תקין ב-partnerIds) נרשם ללוג ולא עוצר אחרים.
 */
const INDEXES: { name: string, on: string }[] = [
  // פרטי קשר וכתובת של התורם - בכל רשימה, ייצוא ו-sqlExpression
  { name: 'ix_donor_contacts_donor', on: `"donor_contacts" ("donorId", "type", "isActive")` },
  { name: 'ix_donor_places_donor', on: `"donor_places" ("donorId", "isActive", "isPrimary")` },
  // תרומות לפי תורם (תרומה אחרונה, חלון התרומות), התחייבות (שולם מתוך) וקמפיין
  { name: 'ix_donations_donor_date', on: `"donations" ("donorId", "donationDate" DESC)` },
  { name: 'ix_donations_commitment', on: `"donations" ("commitmentId")` },
  { name: 'ix_donations_campaign', on: `"donations" ("campaignId")` },
  // שותפים לתרומה - "partnerIds"::jsonb ? id (Donation.partneredWith, תרומה אחרונה)
  { name: 'ix_donations_partners', on: `"donations" USING gin (("partnerIds"::jsonb))` },
  // תשלומים לתרומה (הו"ק)
  { name: 'ix_payments_donation', on: `"payments" ("donationId")` },
  // רשומות-בן של התורם
  { name: 'ix_reminders_donor', on: `"reminders" ("donorId")` },
  { name: 'ix_reminders_due', on: `"reminders" ("isActive", "nextReminderDate")` },
  { name: 'ix_donor_gifts_donor', on: `"donor_gifts" ("donorId")` },
  { name: 'ix_donor_events_donor', on: `"donor_events" ("donorId")` },
  { name: 'ix_donor_notes_donor', on: `"donor_notes" ("donorId")` },
  { name: 'ix_donor_relations_donor1', on: `"donor_relations" ("donor1Id")` },
  { name: 'ix_donor_relations_donor2', on: `"donor_relations" ("donor2Id")` },
  { name: 'ix_certificates_donor', on: `"certificates" ("donorId")` },
  // קבצים לפי בעלים (תרומה, תעודה, תבנית מכתב)
  { name: 'ix_files_donation', on: `"files" ("donationId")` },
  { name: 'ix_files_certificate', on: `"files" ("certificateId")` },
  { name: 'ix_files_letter', on: `"files" ("letterId", "isActive")` },
]

export async function ensureDbIndexes(): Promise<void> {
  const db = remult.dataProvider as SqlDatabase
  let created = 0
  for (const index of INDEXES) {
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS "${index.name}" ON ${index.on}`)
      created++
    } catch (err) {
      console.error(`[db-indexes] ${index.name} failed:`, (err as any)?.message || err)
    }
  }
  console.info(`[db-indexes] ${created}/${INDEXES.length} indexes ensured.`)
}
