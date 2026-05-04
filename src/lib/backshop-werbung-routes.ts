/** Rollen-Basis-Pfad für Backshop-Navigation (Liste, Konfiguration, Werbung). */
export type BackshopNavPrefix = '/super-admin' | '/admin' | '/viewer' | '/user'

/**
 * Rollen-Präfix aus der aktuellen URL (Priorität: super-admin → admin → viewer → user).
 */
export function getBackshopNavPrefix(pathname: string): BackshopNavPrefix {
  if (pathname.startsWith('/super-admin')) return '/super-admin'
  if (pathname.startsWith('/admin')) return '/admin'
  if (pathname.startsWith('/viewer')) return '/viewer'
  return '/user'
}

/**
 * Rollen-Präfix für Backshop-Werbungs-Routen (/user, /viewer, /admin, /super-admin).
 */
export function getBackshopWerbungRolePrefix(pathname: string): string {
  return getBackshopNavPrefix(pathname)
}
