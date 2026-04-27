// Backshop: Master-Zeilen + marktspezifisches Carryover wie buildBackshopDisplayList / Layout-Engine.
// Siehe layout-engine.ts: carryoverOnly wenn PLU im Roh-Master nicht vorkommt.

import { carryoverBackshopRowToMasterItem } from '@/lib/carryover-master-snapshot'
import type { BackshopMasterPLUItem, StoreListCarryover } from '@/types/database'

/**
 * Merged die zentralen Backshop-Master-Zeilen mit Carryover-Zeilen für die Anzeige/Auflösung.
 * Entspricht der ersten Merge-Stufe in `buildBackshopDisplayList` (ohne Hidden/Gruppenfilter).
 *
 * @param masterItemsRaw – `backshop_master_plu_items` der aktiven Version (alle Quellen)
 * @param carryoverRows – `store_list_carryover` für `list_type === 'backshop'` und passende `for_version_id`
 * @param activeVersionId – aktive Backshop-Version (für synthetische `version_id` der Carryover-Items)
 * @param options.marketIncludeOnly – default true: nur Zeilen mit `market_include` (wie BackshopMasterList)
 */
export function mergeBackshopMasterItemsWithCarryoverForDisplay(
  masterItemsRaw: BackshopMasterPLUItem[],
  carryoverRows: StoreListCarryover[],
  activeVersionId: string,
  options?: { marketIncludeOnly?: boolean },
): BackshopMasterPLUItem[] {
  const marketIncludeOnly = options?.marketIncludeOnly ?? true
  const backshopRows = carryoverRows.filter((r) => r.list_type === 'backshop')
  const eligible = marketIncludeOnly ? backshopRows.filter((r) => r.market_include) : backshopRows

  const masterPluSet = new Set(masterItemsRaw.map((i) => i.plu))
  const carryoverOnly = eligible
    .filter((row) => !masterPluSet.has(row.plu))
    .map((row) => carryoverBackshopRowToMasterItem(row, activeVersionId))

  return [...masterItemsRaw, ...carryoverOnly]
}

/** Schlüssel für Multi-Source-Zeilen (konsistent mit useBackshopProductGroups / layout-engine). */
export function backshopMasterLineKey(item: Pick<BackshopMasterPLUItem, 'plu' | 'source'>): string {
  return `${item.plu}|${item.source ?? 'edeka'}`
}

/**
 * Map plu|source → Item aus der merged Liste (letzter Eintrag gewinnt bei Duplikat-Keys, sollte nicht vorkommen).
 */
export function buildBackshopMasterItemByKeyMap(items: BackshopMasterPLUItem[]): Map<string, BackshopMasterPLUItem> {
  const m = new Map<string, BackshopMasterPLUItem>()
  for (const it of items) {
    m.set(backshopMasterLineKey(it), it)
  }
  return m
}
