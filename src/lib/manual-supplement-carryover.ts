import type { MasterPLUItem, BackshopMasterPLUItem } from '@/types/database'
import { normalizeSupplementNameKey } from '@/lib/manual-supplement-name'

/** Supplemente aus Vorgänger-KW, die in der aktiven Version weder per PLU noch Bezeichnung vorkommen. */
export function filterPendingObstCarryover(
  supplements: MasterPLUItem[],
  activeItems: MasterPLUItem[],
): MasterPLUItem[] {
  const plu = new Set(activeItems.map((i) => i.plu))
  const names = new Set(activeItems.map((i) => normalizeSupplementNameKey(i.system_name)))
  return supplements.filter(
    (s) =>
      s.is_manual_supplement &&
      !plu.has(s.plu) &&
      !names.has(normalizeSupplementNameKey(s.system_name)),
  )
}

export function filterPendingBackshopCarryover(
  supplements: BackshopMasterPLUItem[],
  activeItems: BackshopMasterPLUItem[],
): BackshopMasterPLUItem[] {
  const plu = new Set(activeItems.map((i) => i.plu))
  const names = new Set(activeItems.map((i) => normalizeSupplementNameKey(i.system_name)))
  return supplements.filter(
    (s) =>
      s.is_manual_supplement &&
      (s.source ?? 'edeka') === 'manual' &&
      !plu.has(s.plu) &&
      !names.has(normalizeSupplementNameKey(s.system_name)),
  )
}
