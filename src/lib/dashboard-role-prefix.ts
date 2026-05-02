/**
 * Rollen-Pfadpräfix aus der aktuellen Route (Dashboard unter Super-Admin / Admin / Viewer / User).
 */
export function dashboardRolePrefixFromPathname(pathname: string): string {
  if (pathname.startsWith('/super-admin')) return '/super-admin'
  if (pathname.startsWith('/admin')) return '/admin'
  if (pathname.startsWith('/viewer')) return '/viewer'
  return '/user'
}
