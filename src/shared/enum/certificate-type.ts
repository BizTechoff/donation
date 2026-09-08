/**
 * certificate-type.ts
 *
 * Certificate type labels, shared by the screen and the database - the same
 * arrangement as reminder-type.ts, and for the same reason: the column shows
 * Hebrew while the row stores an English code, so ordering by the stored column
 * produced an order that matched nothing on screen.
 *
 * Certificates also carry a stored `typeText`, filled when the certificate was
 * created. Where it has a value it wins, because that is what the screen shows;
 * the map below is the fallback for rows created without it.
 */
export const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  donation: 'תעודת תרומה',
  memorial: 'תעודת הנצחה',
  memorialDay: 'יום זיכרון',
  appreciation: 'תעודת הוקרה'
}
