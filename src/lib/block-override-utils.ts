/**
 * Markt-spezifische Warengruppen: Schlüssel = normalisierter Artikelname (trim + lower),
 * siehe store_*_name_block_override.system_name_normalized.
 */

/** Einheitlich mit DB/Migration: lower(trim(name)) */
export function normalizeSystemNameForBlockOverride(name: string): string {
  return name.trim().toLowerCase()
}

export function buildNameBlockOverrideMap(
  rows: { system_name_normalized: string; block_id: string }[],
): Map<string, string> {
  return new Map(rows.map((r) => [r.system_name_normalized, r.block_id]))
}

/** Effektive Warengruppe: Markt-Override nach Name, sonst Master-block_id. */
export function effectiveBlockIdForStoreOverride(
  systemName: string,
  masterBlockId: string | null,
  nameBlockOverrides: Map<string, string> | undefined,
): string | null {
  if (!nameBlockOverrides?.size) return masterBlockId
  const key = normalizeSystemNameForBlockOverride(systemName)
  const o = nameBlockOverrides.get(key)
  return o !== undefined ? o : masterBlockId
}

export type StoreBlockOrderRow = { block_id: string; order_index: number }

/** Globale order_index als Fallback, wenn für einen Block keine Markt-Zeile existiert. */
export function sortBlocksWithStoreOrder<B extends { id: string; order_index: number }>(
  blocks: B[],
  storeOrder: StoreBlockOrderRow[],
): B[] {
  const override = new Map(storeOrder.map((r) => [r.block_id, r.order_index]))
  return [...blocks].sort((a, b) => {
    const oa = override.get(a.id) ?? a.order_index
    const ob = override.get(b.id) ?? b.order_index
    if (oa !== ob) return oa - ob
    return a.id.localeCompare(b.id)
  })
}

/** Position in der sortierten Block-Liste (für BY_BLOCK-Sortierung). */
export function blockOrderPositionMapFromSorted<B extends { id: string }>(
  sortedBlocks: B[],
): Map<string, number> {
  return new Map(sortedBlocks.map((b, i) => [b.id, i]))
}
