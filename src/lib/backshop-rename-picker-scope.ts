import type { BackshopMasterPLUItem } from '@/types/database'
import type { DisplayItem } from '@/types/plu'

/** Index aller Master- und Carryover-Zeilen nach Datenbank- bzw. Carryover-`id`. */
export function buildBackshopMasterByIdMap(
  masterScopeItems: BackshopMasterPLUItem[],
  carryoverMasterScoped: BackshopMasterPLUItem[],
): Map<string, BackshopMasterPLUItem> {
  const m = new Map<string, BackshopMasterPLUItem>()
  for (const item of masterScopeItems) m.set(item.id, item)
  for (const c of carryoverMasterScoped) {
    if (!m.has(c.id)) m.set(c.id, c)
  }
  return m
}

/**
 * „Meine Liste“: dieselben Master-/Carryover-Zeilen wie in der PLU-Tabelle (Reihenfolge der Anzeige).
 * Match über `DisplayItem.id` — wichtig bei gleicher PLU für mehrere Quellen (Edeka/Harry/…).
 */
export function backshopRenamePickerMastersFromDisplayOrder(
  displayItems: DisplayItem[],
  masterScopeItems: BackshopMasterPLUItem[],
  carryoverMasterScoped: BackshopMasterPLUItem[],
): BackshopMasterPLUItem[] {
  const masterById = buildBackshopMasterByIdMap(masterScopeItems, carryoverMasterScoped)
  const seen = new Set<string>()
  const out: BackshopMasterPLUItem[] = []
  for (const d of displayItems) {
    if (d.is_custom) continue
    if (d.backshop_is_multi_source_placeholder) continue
    const row = masterById.get(d.id)
    if (!row) continue
    if (seen.has(d.id)) continue
    seen.add(d.id)
    out.push(row)
  }
  return out
}
