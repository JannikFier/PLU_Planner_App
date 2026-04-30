/**
 * Rollen-Präfix für Backshop-Werbungs-Routen (/user, /viewer, /admin, /super-admin).
 */
export function getBackshopWerbungRolePrefix(pathname: string): string {
  if (pathname.startsWith('/super-admin')) return '/super-admin'
  if (pathname.startsWith('/admin')) return '/admin'
  if (pathname.startsWith('/viewer')) return '/viewer'
  return '/user'
}
