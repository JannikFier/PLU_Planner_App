/**
 * Reine Hilfen für die Backshop-Seite „Ausgeblendete Produkte“ (ohne React).
 */

/** Platzhalter-Block-ID für Zeilen ohne zugeordnete Warengruppe */
export const UNGEORDNET_BLOCK = '__unbekannt__'

/** URL-Parameterwert: alle Warengruppen in einer flachen Liste */
export const ALL_BLOCKS_PARAM = '__all__'

/** Eindeutige ID für Find-in-Page / data-find-in-scope auf dieser Seite */
export const BACKSHOP_HIDDEN_FIND_SCOPE_ID = 'hidden-products-backshop-page'

export function orderBlockKeys(
  keys: string[],
  storeBlockOrder: { block_id: string; order_index: number }[],
): string[] {
  const o = new Map(storeBlockOrder.map((x) => [x.block_id, x.order_index]))
  return [...keys].sort((a, b) => {
    if (a === UNGEORDNET_BLOCK) return 1
    if (b === UNGEORDNET_BLOCK) return -1
    const oa = o.get(a) ?? 10_000
    const ob = o.get(b) ?? 10_000
    if (oa !== ob) return oa - ob
    return a.localeCompare(b)
  })
}
