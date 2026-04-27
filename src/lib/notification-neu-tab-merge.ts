// Tab „Neu“ in der Glocke: Merge aus DB-Status + manuelle UNCHANGED ohne Carryover-Duplikat

import type { BackshopMasterPLUItem, MasterPLUItem } from '@/types/database'
import type { PLUStatus } from '@/types/plu'

/**
 * Anzeige-Status für Masterliste/PDF: wie Tab „Neu“ — direkte manuelle Nachbesserungen
 * (`UNCHANGED`) gelten als gelb, Carryover (PLU war in Vorversion schon manuell) nicht.
 * `prevManualPluSet`: `null` = keine Vorversion → alle manuellen UNCHANGED wie neu;
 * `undefined` = Overlay noch nicht laden / nicht übergeben → nur DB-Status.
 */
export function obstMasterDisplayStatus(
  item: Pick<MasterPLUItem, 'status' | 'is_manual_supplement' | 'plu'>,
  prevManualPluSet: Set<string> | null | undefined,
): PLUStatus {
  const s = item.status as PLUStatus
  if (s === 'PLU_CHANGED_RED') return s
  if (s === 'NEW_PRODUCT_YELLOW') return s
  if (prevManualPluSet === undefined) return s
  if (item.is_manual_supplement && s === 'UNCHANGED') {
    if (prevManualPluSet === null) return 'NEW_PRODUCT_YELLOW'
    if (!prevManualPluSet.has(item.plu)) return 'NEW_PRODUCT_YELLOW'
  }
  return s
}

/** Analog Obst: Backshop `source === 'manual'` + UNCHANGED, ohne Carryover-PLU aus Vorversion. */
export function backshopMasterDisplayStatus(
  item: Pick<BackshopMasterPLUItem, 'status' | 'source' | 'plu'>,
  prevManualPluSet: Set<string> | null | undefined,
): PLUStatus {
  const s = item.status as PLUStatus
  if (s === 'PLU_CHANGED_RED') return s
  if (s === 'NEW_PRODUCT_YELLOW') return s
  if (prevManualPluSet === undefined) return s
  const src = item.source ?? 'edeka'
  if (src === 'manual' && s === 'UNCHANGED') {
    if (prevManualPluSet === null) return 'NEW_PRODUCT_YELLOW'
    if (!prevManualPluSet.has(item.plu)) return 'NEW_PRODUCT_YELLOW'
  }
  return s
}

/** Vorversion: PLUs der manuellen Nachbesserungen (Carryover-Quelle). */
export function filterDirectManualObstSupplements(
  manualUnchanged: MasterPLUItem[],
  prevManualPluSet: Set<string> | null,
): MasterPLUItem[] {
  if (!prevManualPluSet) return manualUnchanged
  return manualUnchanged.filter((r) => !prevManualPluSet.has(r.plu))
}

export function filterDirectManualBackshopSupplements(
  manualUnchanged: BackshopMasterPLUItem[],
  prevManualPluSet: Set<string> | null,
): BackshopMasterPLUItem[] {
  if (!prevManualPluSet) return manualUnchanged
  return manualUnchanged.filter((r) => !prevManualPluSet.has(r.plu))
}

export function mergeObstNotificationNeuRows(
  yellow: MasterPLUItem[],
  directManual: MasterPLUItem[],
): MasterPLUItem[] {
  const byId = new Map<string, MasterPLUItem>()
  for (const r of yellow) byId.set(r.id, r)
  for (const r of directManual) byId.set(r.id, r)
  return [...byId.values()].sort((a, b) =>
    a.system_name.localeCompare(b.system_name, 'de', { sensitivity: 'base' }),
  )
}

export function mergeBackshopNotificationNeuRows(
  yellow: BackshopMasterPLUItem[],
  directManual: BackshopMasterPLUItem[],
): BackshopMasterPLUItem[] {
  const byId = new Map<string, BackshopMasterPLUItem>()
  for (const r of yellow) byId.set(r.id, r)
  for (const r of directManual) byId.set(r.id, r)
  return [...byId.values()].sort((a, b) =>
    a.system_name.localeCompare(b.system_name, 'de', { sensitivity: 'base' }),
  )
}
