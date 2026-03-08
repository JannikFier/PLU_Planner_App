// Vorauswahl Warengruppen für neue Backshop-Produkte beim Upload (Schlagwort-Regeln + Block-Name-Matching)

import { nameContains } from '@/lib/apply-backshop-block-rules'
import type { BackshopCompareItem } from '@/types/plu'
import type { BackshopBlock, BackshopBlockRule } from '@/types/database'

/**
 * Schlägt für neue Backshop-Produkte (status NEW_PRODUCT_YELLOW) eine block_id vor.
 * 1. NAME_CONTAINS-Regeln anwenden (first match wins, sortiert nach created_at).
 * 2. Fallback: Wenn Produktname den Warengruppen-Namen enthält, diese Gruppe zuweisen.
 * @returns Map plu → block_id (nur Einträge mit Vorschlag)
 */
export function suggestBlockIdsForNewItems(
  items: BackshopCompareItem[],
  blocks: BackshopBlock[],
  rules: BackshopBlockRule[],
): Map<string, string> {
  const result = new Map<string, string>()
  const newItems = items.filter((i) => i.status === 'NEW_PRODUCT_YELLOW')
  if (newItems.length === 0) return result

  const nameContainsRules = rules
    .filter((r) => r.rule_type === 'NAME_CONTAINS')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  for (const item of newItems) {
    const searchName = (item.display_name ?? item.system_name ?? '').trim()
    if (!searchName) continue

    let assigned = false

    for (const rule of nameContainsRules) {
      if (nameContains(searchName, rule.value, rule.case_sensitive)) {
        result.set(item.plu, rule.block_id)
        assigned = true
        break
      }
    }

    if (assigned) continue

    const nameNorm = searchName.toLowerCase().replace(/\s+/g, ' ')
    for (const block of blocks) {
      const blockNameNorm = block.name.trim().toLowerCase().replace(/\s+/g, ' ')
      if (!blockNameNorm) continue
      if (nameNorm.includes(blockNameNorm) || blockNameNorm.includes(nameNorm)) {
        result.set(item.plu, block.id)
        break
      }
    }
  }

  return result
}
