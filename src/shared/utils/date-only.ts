/**
 * תאריך בלבד (Fields.dateOnly) - היום, לפי השעון המקומי, בחצות.
 *
 * למה: רימלט ממיר dateOnly ל-JSON לפי השעה. ערך בחצות - לפי התאריך המקומי;
 * ערך עם שעה - לפי UTC (toISOString). לכן new Date() ב-22:00 בארה"ב נשמר
 * כתאריך של מחר (UTC כבר אחרי חצות), ובלונדון בשעון קיץ ב-00:30 - כתאריך של
 * אתמול (יעקב, 17.11.2026). ערך בחצות מקומית תמיד נשמר כתאריך שהמשתמש רואה.
 */
export function todayDateOnly(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
