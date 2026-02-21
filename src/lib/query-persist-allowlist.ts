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
  'version',
  'versions',
  'plu-items',
  'custom-products',
  'hidden-items',
  'bezeichnungsregeln',
  'all-profiles',
  // Backshop
  'backshop-layout-settings',
  'backshop-blocks',
  'backshop-version',
  'backshop-versions',
  'backshop-plu-items',
  'backshop-custom-products',
  'backshop-hidden-items',
  'backshop-bezeichnungsregeln',
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
