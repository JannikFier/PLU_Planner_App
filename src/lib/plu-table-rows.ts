// Reine Tabellen-Geometrie für PLUTable (flache Zeilen, ROW_BY_ROW-Paare)

import type { DisplayItem } from '@/types/plu'
import type { LetterGroup, BlockGroup } from '@/lib/plu-helpers'
import { itemMatchesSearch } from '@/lib/plu-helpers'

/** Einzelne Zeile in der flachen Liste (Item oder Header) */
export interface FlatRow {
  type: 'header' | 'item'
  label?: string
  item?: DisplayItem
}

/** Zeile für ROW_BY_ROW Rendering */
export interface TableRow {
  type: 'fullHeader' | 'itemPair'
  label?: string
  left?: DisplayItem
  right?: DisplayItem
}

/** Baut flache Liste aus Buchstaben-Gruppen */
export function buildFlatRowsFromLetterGroups(groups: LetterGroup<DisplayItem>[]): FlatRow[] {
  const rows: FlatRow[] = []
  for (const group of groups) {
    rows.push({ type: 'header', label: `— ${group.letter} —` })
    for (const item of group.items) {
      rows.push({ type: 'item', item })
    }
  }
  return rows
}

/** Baut flache Liste aus Block-Gruppen */
export function buildFlatRowsFromBlockGroups(groups: BlockGroup<DisplayItem>[]): FlatRow[] {
  const rows: FlatRow[] = []
  for (const group of groups) {
    rows.push({ type: 'header', label: group.blockName })
    for (const item of group.items) {
      rows.push({ type: 'item', item })
    }
  }
  return rows
}

/** Gruppen in ROW_BY_ROW TableRows umwandeln: Header full-width, Items paarweise */
export function buildRowByRowTable(groups: (LetterGroup<DisplayItem> | BlockGroup<DisplayItem>)[]): TableRow[] {
  const rows: TableRow[] = []
  for (const group of groups) {
    const label = 'letter' in group ? `— ${group.letter} —` : group.blockName
    rows.push({ type: 'fullHeader', label })

    const items = group.items
    for (let i = 0; i < items.length; i += 2) {
      rows.push({
        type: 'itemPair',
        left: items[i],
        right: items[i + 1] ?? undefined,
      })
    }
  }
  return rows
}

/** Suchbare Zeilen: nur FlatRow – gleiche Reihenfolge wie mobile Liste und allFlatRows (Scroll-Treffer). */
export function isFlatRowMatch(row: FlatRow, searchText: string): boolean {
  const q = searchText.trim().toLowerCase()
  if (!q) return false
  if (row.type === 'header') return false
  return row.item != null && itemMatchesSearch(row.item, searchText)
}
