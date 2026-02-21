// Logik: Backshop-Block-Regeln (NAME_CONTAINS) auf Master-Items anwenden
// Gibt zurück, welche Items welcher block_id zugeordnet werden sollen (nur Änderungen).

import type { BackshopBlockRule, BackshopMasterPLUItem } from '@/types/database'

function nameContains(
  name: string,
  keyword: string,
  caseSensitive: boolean,
): boolean {
  if (!keyword) return false
  const n = caseSensitive ? name : name.toLowerCase()
  const k = caseSensitive ? keyword : keyword.toLowerCase()
  return n.includes(k)
}

/**
 * Wendet NAME_CONTAINS-Regeln auf Items an. First match wins (Reihenfolge der Regeln).
 * @param items Alle Backshop-Master-Items der aktiven Version
 * @param rules Nur NAME_CONTAINS, sortiert nach created_at (oder Block-Reihenfolge)
 * @param onlyUnassigned Wenn true, werden nur Items mit block_id == null befüllt
 * @returns Map itemId → block_id (nur Einträge wo sich etwas ändert)
 */
export function applyBackshopBlockRules(
  items: BackshopMasterPLUItem[],
  rules: BackshopBlockRule[],
  onlyUnassigned: boolean,
): Map<string, string> {
  const nameContainsRules = rules
    .filter((r) => r.rule_type === 'NAME_CONTAINS')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const result = new Map<string, string>()

  for (const item of items) {
    if (onlyUnassigned && item.block_id != null) continue

    const searchName = item.display_name ?? item.system_name ?? ''
    for (const rule of nameContainsRules) {
      if (nameContains(searchName, rule.value, rule.case_sensitive)) {
        result.set(item.id, rule.block_id)
        break
      }
    }
  }

  return result
}
