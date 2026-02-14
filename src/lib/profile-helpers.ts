/**
 * Helper für die Anzeige von Profil-Daten in der Benutzerverwaltung.
 * Interne Platzhalter (z.B. @plu-planner.local, email-{uuid}) werden ausgeblendet.
 */

/** E-Mail-Platzhalter wenn nur Personalnummer angegeben wurde */
const EMAIL_PLACEHOLDER_SUFFIX = '@plu-planner.local'

/** Personalnummer-Platzhalter wenn nur E-Mail angegeben wurde */
const PERSONALNR_PLACEHOLDER_PREFIX = 'email-'

/**
 * Prüft ob die E-Mail ein interner Platzhalter ist.
 */
export function isPlaceholderEmail(email: string): boolean {
  return typeof email === 'string' && email.endsWith(EMAIL_PLACEHOLDER_SUFFIX)
}

/**
 * Prüft ob die Personalnummer ein interner Platzhalter ist.
 */
export function isPlaceholderPersonalnummer(personalnummer: string): boolean {
  return typeof personalnummer === 'string' && personalnummer.startsWith(PERSONALNR_PLACEHOLDER_PREFIX)
}

/**
 * Gibt die anzuzeigende E-Mail zurück – Platzhalter werden als "–" ausgeblendet.
 */
export function formatProfileDisplayEmail(email: string | null | undefined): string {
  if (!email) return '–'
  return isPlaceholderEmail(email) ? '–' : email
}

/**
 * Gibt die anzuzeigende Personalnummer zurück – Platzhalter werden als "–" ausgeblendet.
 */
export function formatProfileDisplayPersonalnummer(personalnummer: string | null | undefined): string {
  if (!personalnummer) return '–'
  return isPlaceholderPersonalnummer(personalnummer) ? '–' : personalnummer
}
