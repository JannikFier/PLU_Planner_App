// Hilfsfunktion für Warengruppen-DnD: neue Block-Reihenfolge nach Drop auf einen Gruppenkopf

import type { Block } from '@/types/database'

/**
 * Berechnet die neue Reihenfolge der Block-IDs, wenn eine Warengruppe auf
 * `targetDropId` (drop-block-*) mit Kante vor/nach dem Ziel-Kopf losgelassen wird.
 * @returns null bei ungültigem Ziel oder wenn sich nichts ändert
 */
export function computeBlockOrderAfterDrop(
  sortedBlocks: Block[],
  fromBlockId: string,
  targetDropId: string,
  edge: 'before' | 'after',
): string[] | null {
  const ids = sortedBlocks.map((b) => b.id)
  const fromIndex = ids.indexOf(fromBlockId)
  if (fromIndex === -1) return null

  const raw = targetDropId.replace('drop-block-', '')
  const [moved] = ids.splice(fromIndex, 1)

  let insertPos: number
  if (raw === 'unassigned') {
    insertPos = ids.length
  } else {
    const ti = ids.indexOf(raw)
    if (ti === -1) return null
    insertPos = edge === 'before' ? ti : ti + 1
  }

  ids.splice(insertPos, 0, moved)

  const before = sortedBlocks.map((b) => b.id).join('|')
  const after = ids.join('|')
  if (before === after) return null

  return ids
}
