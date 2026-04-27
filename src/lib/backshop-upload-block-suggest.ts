// Vorauswahl Warengruppen für neue Backshop-Produkte beim Upload (Schlagwort-Regeln + Block-Name-Matching)

import { nameContains } from '@/lib/apply-backshop-block-rules'
import type { BackshopCompareItem } from '@/types/plu'
import type { BackshopBlock, BackshopBlockRule } from '@/types/database'

/**
 * Schlägt für Backshop-Produkte eine block_id vor.
 * 1. NAME_CONTAINS-Regeln anwenden (first match wins, sortiert nach created_at).
 * 2. Fallback: Wenn Produktname den Warengruppen-Namen enthält, diese Gruppe zuweisen.
 * @param items zu prüfende Items (z. B. alle neuen oder alle ohne block_id)
 * @returns Map plu → block_id (nur Einträge mit Vorschlag)
 */
function buildSuggestions(
  items: BackshopCompareItem[],
  blocks: BackshopBlock[],
  rules: BackshopBlockRule[],
): Map<string, string> {
  const result = new Map<string, string>()
  if (items.length === 0) return result

  const nameContainsRules = rules
    .filter((r) => r.rule_type === 'NAME_CONTAINS')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  for (const item of items) {
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

/**
 * Schlägt für neue Backshop-Produkte (status NEW_PRODUCT_YELLOW) eine block_id vor.
 */
export function suggestBlockIdsForNewItems(
  items: BackshopCompareItem[],
  blocks: BackshopBlock[],
  rules: BackshopBlockRule[],
): Map<string, string> {
  return buildSuggestions(items.filter((i) => i.status === 'NEW_PRODUCT_YELLOW'), blocks, rules)
}

/**
 * Schlägt für alle Items ohne bestehende block_id eine Warengruppe vor
 * (unabhängig vom Status). Wird beim Upload genutzt, damit auch „unveränderte"
 * Produkte ohne Zuordnung aus dem aktiven Master automatisch eingruppiert werden.
 */
export function suggestBlockIdsForUnassignedItems(
  items: BackshopCompareItem[],
  blocks: BackshopBlock[],
  rules: BackshopBlockRule[],
): Map<string, string> {
  return buildSuggestions(
    items.filter((i) => i.block_id == null || i.block_id === ''),
    blocks,
    rules,
  )
}
