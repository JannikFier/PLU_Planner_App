// Gegenüberstellung Master-Zeilen vs. Anzeige-Engine (Gruppenregeln / manuelles Ausblenden)

import type { BackshopMasterPLUItem, BackshopSource } from '@/types/database'
import type { DisplayItem } from '@/types/plu'
import { buildBackshopDisplayList, type BackshopDisplayListInput } from '@/lib/layout-engine'

function visibleNonCustomMasterKeys(items: DisplayItem[]): Set<string> {
  const s = new Set<string>()
  for (const it of items) {
    if (it.is_custom || it.backshop_is_multi_source_placeholder) continue
    if (it.plu === '—' || !it.plu.trim()) continue
    const src = (it.backshop_source ?? 'edeka') as BackshopSource
    s.add(`${it.plu}|${src}`)
  }
  return s
}

/** Wie in `buildBackshopDisplayList`: Master + Carryover-Duplikate entfernen. */
export function mergeBackshopMasterAndCarryover(
  masterItems: BackshopMasterPLUItem[],
  carryoverMasterItems: BackshopMasterPLUItem[] | undefined,
): BackshopMasterPLUItem[] {
  const pluSet = new Set(masterItems.map((i) => i.plu))
  const carry = (carryoverMasterItems ?? []).filter((c) => !pluSet.has(c.plu))
  return [...masterItems, ...carry]
}

/**
 * Master-Zeilen, die in der Backshop-Liste (gleiche Engine-Parameter) **nicht** vorkommen,
 * obwohl die PLU **nicht** in `manualHiddenPluSet` liegt (d. h. nicht bewusst in der Ausblendliste).
 */
export function getBackshopRuleFilteredMasterRows(
  listInput: BackshopDisplayListInput,
  manualHiddenPluSet: Set<string>,
): { visiblePluSourceKeys: Set<string>; ruleFilteredRows: BackshopMasterPLUItem[] } {
  const result = buildBackshopDisplayList(listInput)
  const visible = visibleNonCustomMasterKeys(result.items)
  const all = mergeBackshopMasterAndCarryover(
    listInput.masterItems,
    listInput.carryoverMasterItems,
  )
  const ruleFiltered: BackshopMasterPLUItem[] = []
  for (const m of all) {
    if (manualHiddenPluSet.has(m.plu)) continue
    const src = (m.source ?? 'edeka') as BackshopSource
    if (!visible.has(`${m.plu}|${src}`)) ruleFiltered.push(m)
  }
  return { visiblePluSourceKeys: visible, ruleFilteredRows: ruleFiltered }
}
