/**
 * Rollenbasierte Hilfen fuer UI und Logik (kein Ersatz fuer RLS).
 */

/** Profile-Rolle aus der DB */
export type AppRole = 'super_admin' | 'admin' | 'user' | 'viewer'

/**
 * Super-Admin: Markt-Listen unter /super-admin/ (Subdomain = Markt), nicht globale Verwaltung.
 */
const SUPER_ADMIN_MARKET_STORE_PATHS = [
  '/super-admin/masterlist',
  '/super-admin/backshop-list',
  '/super-admin/hidden-products',
  '/super-admin/backshop-hidden-products',
  '/super-admin/hidden-items',
  '/super-admin/custom-products',
  '/super-admin/backshop-custom-products',
  '/super-admin/offer-products',
  '/super-admin/backshop-offer-products',
  '/super-admin/renamed-products',
  '/super-admin/backshop-renamed-products',
  '/super-admin/layout',
  '/super-admin/backshop-layout',
  '/super-admin/rules',
  '/super-admin/backshop-rules',
  '/super-admin/block-sort',
  '/super-admin/obst-warengruppen',
  '/super-admin/backshop-block-sort',
] as const

function isSuperAdminMarketStorePath(pathname: string): boolean {
  return SUPER_ADMIN_MARKET_STORE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Ob der Nutzer die marktweite Ausblendliste (hidden_items / backshop_hidden_items)
 * aendern darf. Viewer nie. Super-Admin: User-/Admin-Pfade oder Markt-Listen unter /super-admin/ (nicht z. B. nur Firmen-Dashboard).
 */
export function canManageMarketHiddenItems(role: string | undefined, pathname: string = ''): boolean {
  if (!role || role === 'viewer') return false
  if (role === 'super_admin') {
    if (pathname.startsWith('/user/') || pathname.startsWith('/admin/')) return true
    return isSuperAdminMarketStorePath(pathname)
  }
  return true
}
