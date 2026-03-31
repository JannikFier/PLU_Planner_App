/**
 * Persist-Allowlist für den TanStack-Query-Cache (sessionStorage).
 *
 * Nur Queries mit diesen Key-Präfixen (erstes Element von queryKey) werden
 * persistiert → schnellerer Restore nach Reload, weniger Speicher.
 *
 * Regel: Neue Queries, die nach Reload sofort verfügbar sein sollen, hier
 * in PERSIST_QUERY_KEY_PREFIXES eintragen. Siehe auch .cursor/rules/reload-performance.mdc
 * und docs/RELOAD_UND_LAADEVERHALTEN.md.
 */

import type { Query } from '@tanstack/query-core'

/** Erste Elemente von queryKey, die persistiert werden (Obst + Backshop + Admin). */
export const PERSIST_QUERY_KEY_PREFIXES: readonly string[] = [
  // Obst
  'layout-settings',
  'blocks',
  'block-rules',
  'version',
  'versions',
  'plu-items',
  'custom-products',
  'hidden-items',
  'renamed-items',
  'offer-items',
  'obst-offer-campaign',
  'obst-offer-store-disabled',
  'backshop-offer-campaign',
  'backshop-offer-store-disabled',
  'bezeichnungsregeln',
  'store-obst-block-order',
  'store-obst-name-block-override',
  'store-backshop-block-order',
  'store-backshop-name-block-override',
  'active-version-change-count',
  'notification-count',
  'version-notification',
  'unread-notifications',
  'new-products',
  'changed-products',
  'all-profiles',
  'profiles-hidden-by',
  'company-profiles',
  // Multi-Tenancy
  'companies',
  'stores',
  'store-access',
  'store-list-visibility',
  'user-list-visibility',
  'store-user-profiles',
  'home-store-id',
  'first-active-store',
  // Backshop
  'backshop-layout-settings',
  'backshop-blocks',
  'backshop-block-rules',
  'backshop-version',
  'backshop-versions',
  'backshop-plu-items',
  'backshop-custom-products',
  'backshop-hidden-items',
  'backshop-renamed-items',
  'backshop-offer-items',
  'backshop-bezeichnungsregeln',
  'backshop-active-version-change-count',
  'backshop-notification-count',
  'backshop-version-notification',
  'backshop-new-products',
  'backshop-changed-products',
] as const

const ALLOWED_SET = new Set<string>(PERSIST_QUERY_KEY_PREFIXES)

/**
 * Prüft, ob eine Query in den Persist-Cache (sessionStorage) geschrieben werden soll.
 * Für use in dehydrateOptions.shouldDehydrateQuery.
 */
export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== 'success') return false
  const first = query.queryKey[0]
  return typeof first === 'string' && ALLOWED_SET.has(first)
}
