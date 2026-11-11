/**
 * התאמת שמות לכלי המיגרציה - המקום האחד ("Chase Bank" = "Chase",
 * "Citi Bank" = "CitiBank"). מנרמלים ואז משווים; אין התאמה חלקית מעבר לזה,
 * כדי לא לקשר לבנק או לעמותה הלא נכונים בשקט.
 */

/** אותיות וספרות בלבד, אותיות קטנות, בלי "bank" בתחילה או בסוף ("CitiBank" = "Citi Bank"). */
export function normalizeName(name: string | null | undefined): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff]/g, '')
    .replace(/^bank|bank$/g, '')
}

/** הרשומה ששמה זהה אחרי נרמול, או undefined. */
export function findByName<T>(items: T[], name: string, nameOf: (t: T) => string): T | undefined {
  const key = normalizeName(name)
  if (!key) return undefined
  return items.find(t => normalizeName(nameOf(t)) === key)
}
