/**
 * Sichtbarkeits-Regeln fuer die Glocke (UnifiedNotificationBell) im AppHeader.
 *
 * Bug 3 Fix (PR 2.7): Vorher war die Glocke fuer alle nicht-Viewer/Super-Admin
 * unconditional sichtbar - auch auf Routen, auf denen sie keine Listen-/Versions-
 * Notifications zeigen kann (z. B. Admin-Konfig-Hubs, User-Management,
 * Marken-Auswahl, Backshop-Upload-Wizard, Layout-/Rules-/Gruppenregeln-Seiten).
 *
 * Sichtbar bleibt sie auf:
 *  - Dashboards (Rollen-Hub: /user, /admin, /viewer und gespiegelte SA-Pfade)
 *  - Obst-Masterliste und Unterseiten (eigene Produkte, Ausgeblendete, Werbung,
 *    Renamed)
 *  - Backshop-Liste und Unterseiten (custom, hidden, offer, renamed)
 *
 * Bewusst ausgeschlossen: alle Konfigurations-, Verwaltungs- und Wizard-Routen.
 */

export type EffectiveRole = 'super_admin' | 'admin' | 'user' | 'viewer'

/** Whitelist: Pfade, auf denen die Glocke sichtbar sein soll. */
const VISIBLE_PATH_PATTERNS: RegExp[] = [
  // Rollen-Dashboards (mit/ohne Trailing-Slash)
  /^\/user\/?$/,
  /^\/admin\/?$/,
  /^\/viewer\/?$/,
  // Super-Admin-Vorschau auf Rolle: /super-admin/preview/<role>
  /^\/super-admin\/preview\/(user|admin|viewer)\/?$/,
  // Obst-Masterliste + Unterseiten
  /\/masterlist(\/|$)/,
  /\/custom-products(\/|$)/,
  /\/hidden-products(\/|$)/,
  /\/offer-products(\/|$)/,
  /\/renamed-products(\/|$)/,
  // Backshop
  /\/backshop-list(\/|$)/,
  /\/backshop-custom-products(\/|$)/,
  /\/backshop-hidden-products(\/|$)/,
  /\/backshop-offer-products(\/|$)/,
  /\/backshop-renamed-products(\/|$)/,
]

/**
 * Entscheidet, ob die Glocke fuer (Rolle, Pfad) angezeigt werden soll.
 * - Viewer und Super-Admin: nie (bestehende Regel beibehalten).
 * - Andernfalls: nur auf Whitelist-Pfaden.
 *
 * `role` wird locker als string angenommen, da `useEffectiveRouteRole` einen
 * string zurueckliefert (beinhaltet aber nur die o. g. EffectiveRole-Werte).
 */
export function shouldShowNotificationBell(role: string | null | undefined, pathname: string | null | undefined): boolean {
  if (!role) return false
  if (role === 'viewer' || role === 'super_admin') return false
  if (!pathname) return false
  return VISIBLE_PATH_PATTERNS.some((re) => re.test(pathname))
}
