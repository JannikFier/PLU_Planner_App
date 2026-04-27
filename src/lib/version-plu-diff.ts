// Diff: PLUs in der Vorversion, die in der Zielversion nicht mehr vorkommen („rausgefallen“).

import type { BackshopMasterPLUItem, MasterPLUItem } from '@/types/database'

function pluSet<T extends { plu: string }>(items: T[]): Set<string> {
  return new Set(items.map((i) => i.plu))
}

/** Master-PLUs, die in `previousItems` vorkommen, aber nicht in `nextItems`. */
export function masterPluItemsRemovedBetweenVersions(
  previousItems: MasterPLUItem[],
  nextItems: MasterPLUItem[],
): MasterPLUItem[] {
  const nextPlu = pluSet(nextItems)
  return previousItems.filter((p) => !nextPlu.has(p.plu))
}

/** Backshop: PLUs aus Vorversion, die in der Zielversion fehlen. */
export function backshopMasterPluItemsRemovedBetweenVersions(
  previousItems: BackshopMasterPLUItem[],
  nextItems: BackshopMasterPLUItem[],
): BackshopMasterPLUItem[] {
  const nextPlu = pluSet(nextItems)
  return previousItems.filter((p) => !nextPlu.has(p.plu))
}

/** Index der aktiven Version in einer absteigend sortierten Liste; Vorgänger = nächster Eintrag. */
export function getPreviousVersionId(sortedDescIds: { id: string }[], activeId: string | undefined): string | null {
  if (!activeId || sortedDescIds.length < 2) return null
  const idx = sortedDescIds.findIndex((v) => v.id === activeId)
  if (idx < 0 || idx >= sortedDescIds.length - 1) return null
  return sortedDescIds[idx + 1]?.id ?? null
}
