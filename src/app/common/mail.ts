/**
 * mail.ts
 *
 * C3 - "בלחיצה יחידה על אימייל יפתח אימייל חדש לשליחה, בחשבון גוגל שהוגדר מראש".
 *
 * Deliberately Gmail's compose URL and NOT a mailto: link. mailto: hands the
 * address to whatever desktop mail client the machine happens to have
 * registered - often none, in which case the click does nothing at all, which
 * is exactly the kind of silent no-op the client would report as broken.
 * The compose URL opens in the browser under whichever Google account is in
 * focus, and Google itself shows an account picker when more than one is signed
 * in (Zoom א׳ 42:03-47:36 - agreed, Yaakov accepted the picker).
 *
 * One function, used by every email cell in the platform, so the behaviour
 * cannot drift between screens.
 */
const GMAIL_COMPOSE = 'https://mail.google.com/mail/?view=cm&fs=1&to='

/** True when the string is worth turning into a clickable address. */
export function isMailable(email: string | null | undefined): boolean {
  const value = (email || '').trim()
  // '-' is what the lists render for "no email", so it must not become a link.
  return value.length > 0 && value !== '-' && value.includes('@')
}

/**
 * Opens a new Gmail compose window addressed to `email`.
 * Does nothing for an empty or placeholder value, so callers can bind it
 * unconditionally.
 *
 * noopener/noreferrer: the new tab must not get a handle back to this window.
 */
export function openGmailCompose(email: string | null | undefined): void {
  if (!isMailable(email)) return
  window.open(GMAIL_COMPOSE + encodeURIComponent(email!.trim()), '_blank', 'noopener,noreferrer')
}
