// PLU-spezifische Helper-Funktionen (wiederverwendbar)

import { generateUUID } from '@/lib/utils'
import type { Block } from '@/types/database'
import type { PLUStatus } from '@/types/plu'

// ============================================================
// Gemeinsame Basis-Schnittstelle für PLU-Items
// Erlaubt die Nutzung mit MasterPLUItem UND DisplayItem
// ============================================================
export interface PLUItemBase {
  id: string
  plu: string
  system_name: string
  display_name: string | null
  item_type: 'PIECE' | 'WEIGHT'
  status: string
  old_plu: string | null
  block_id: string | null
}

// ============================================================
// Formatierung
// ============================================================

/** KW-Label formatieren, z.B. formatKWLabel(7, 2026) → "KW07/2026" */
export function formatKWLabel(kw: number, jahr: number): string {
  return `KW${String(kw).padStart(2, '0')}/${jahr}`
}

/** KW kurz formatieren (ohne Jahr), z.B. formatKWShort(7) → "KW07" – für Dropdown-Optionen. */
export function formatKWShort(kw: number): string {
  return `KW${String(kw).padStart(2, '0')}`
}

/** Preis in Euro formatieren (deutsche Darstellung), z.B. 1.5 → "1,50 €" */
export function formatPreisEur(preis: number): string {
  return preis.toFixed(2).replace('.', ',') + ' €'
}

/** Leitet aus Blockname/Text Stück vs. Gewicht ab (z.B. "Gewicht" → WEIGHT, "Stück" → PIECE). */
export function parseBlockNameToItemType(s: string | null): 'PIECE' | 'WEIGHT' | null {
  if (!s || !s.trim()) return null
  const t = s.trim().toLowerCase()
  if (t.includes('gewicht')) return 'WEIGHT'
  if (t.includes('stück') || t.includes('stueck')) return 'PIECE'
  return null
}

/** Prüft, ob ein Item den Suchtext in PLU oder Name enthält (case-insensitive). Für Find-in-Page und Filter. */
export function itemMatchesSearch(
  item: { plu: string; display_name?: string | null; system_name?: string | null },
  searchText: string,
): boolean {
  const q = searchText.trim().toLowerCase()
  if (!q) return false
  const pluMatch = item.plu.toLowerCase().includes(q)
  const name = (item.display_name ?? item.system_name ?? '').toLowerCase()
  const sys = (item.system_name ?? '').toLowerCase()
  return pluMatch || name.includes(q) || sys.includes(q)
}

/** Filtert Items nach Suchtext (PLU oder Anzeigename/Systemname, case-insensitive). Leere Suche = alle Items. */
export function filterItemsBySearch<T extends { plu: string; display_name: string; system_name?: string | null }>(
  items: T[],
  searchText: string,
): T[] {
  const q = searchText.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => itemMatchesSearch(item, searchText))
}

// ============================================================
// Eigene Produkte: PLU oder Preis (Preis-only = Platzhalter in plu)
// ============================================================

/** Präfix für custom_products.plu wenn nur Preis, keine PLU (NOT NULL UNIQUE erfüllt) */
export const PRICE_ONLY_PLU_PREFIX = 'price-'

/** True, wenn plu ein interner Preis-only-Platzhalter ist (price-{uuid}). */
export function isPriceOnlyPlu(plu: string): boolean {
  return plu.startsWith(PRICE_ONLY_PLU_PREFIX)
}

/** Für Anzeige: bei Preis-only-Platzhalter "–", sonst die PLU. */
export function getDisplayPlu(plu: string): string {
  return isPriceOnlyPlu(plu) ? '–' : plu
}

/** Für Anzeige: Mehrfach-Leerzeichen auf eines reduzieren, trimmen; bei Custom zusätzlich ★ entfernen. */
export function getDisplayNameForItem(name: string | null, fallback: string, isCustom?: boolean): string {
  const raw = (name ?? fallback) ?? ''
  const normalized = raw.replace(/\s+/g, ' ').trim()
  if (!isCustom) return normalized || (fallback ?? '')
  return normalized.replace(/\s*★\s*/g, ' ').replace(/\s+/g, ' ').trim() || fallback
}

/** Eindeutigen Platzhalter für custom_products.plu erzeugen (Preis-only-Produkte). */
export function generatePriceOnlyPlu(): string {
  return PRICE_ONLY_PLU_PREFIX + generateUUID()
}

// ============================================================
// Gruppierung & Spalten
// ============================================================

/** Umlaute für Gruppierung auf Basisbuchstaben abbilden: Ä→A, Ö→O, Ü→U (keine eigene Rubrik) */
function normalizeLetterForGrouping(char: string): string {
  const upper = char.toUpperCase()
  if (upper === 'Ä') return 'A'
  if (upper === 'Ö') return 'O'
  if (upper === 'Ü') return 'U'
  return upper
}

/** Gruppiert Items nach Anfangsbuchstabe des display_name (Fallback: system_name). Ä wie A, Ö wie O, Ü wie U. */
export interface LetterGroup<T extends PLUItemBase = PLUItemBase> {
  letter: string
  items: T[]
}

export function groupItemsByLetter<T extends PLUItemBase>(items: T[]): LetterGroup<T>[] {
  const grouped = new Map<string, T[]>()

  for (const item of items) {
    const name = item.display_name ?? item.system_name
    const firstChar = name.charAt(0)
    const letter = normalizeLetterForGrouping(firstChar)
    const existing = grouped.get(letter)
    if (existing) {
      existing.push(item)
    } else {
      grouped.set(letter, [item])
    }
  }

  // Alphabetisch sortiert zurückgeben
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'de'))
    .map(([letter, items]) => ({ letter, items }))
}

/**
 * Verteilt Items auf eine bestimmte Anzahl Spalten.
 * ROW_BY_ROW: Erste Hälfte links, zweite Hälfte rechts.
 */
export function splitIntoColumns<T>(items: T[], columnCount: number = 2): T[][] {
  if (columnCount <= 0) return [items]
  if (items.length === 0) return Array.from({ length: columnCount }, () => [])

  const columns: T[][] = Array.from({ length: columnCount }, () => [])
  const perColumn = Math.ceil(items.length / columnCount)

  for (let i = 0; i < items.length; i++) {
    const colIndex = Math.floor(i / perColumn)
    // Sicherheit: Falls colIndex >= columnCount, letzte Spalte nutzen
    const safeIndex = Math.min(colIndex, columnCount - 1)
    columns[safeIndex].push(items[i])
  }

  return columns
}

/**
 * Verteilt Buchstaben-Gruppen auf 2 Spalten, ohne eine Gruppe zu trennen.
 * Algorithmus: Gruppen nacheinander der Spalte mit weniger Items zuweisen.
 * Rückgabe: [linkeGruppen, rechteGruppen]
 */
export function splitLetterGroupsIntoColumns<T extends PLUItemBase>(
  groups: LetterGroup<T>[]
): [LetterGroup<T>[], LetterGroup<T>[]] {
  if (groups.length === 0) return [[], []]
  if (groups.length === 1) return [groups, []]

  const left: LetterGroup<T>[] = []
  const right: LetterGroup<T>[] = []
  let leftCount = 0
  let rightCount = 0

  for (const group of groups) {
    // Gruppe der Spalte mit weniger Items zuweisen
    if (leftCount <= rightCount) {
      left.push(group)
      leftCount += group.items.length
    } else {
      right.push(group)
      rightCount += group.items.length
    }
  }

  return [left, right]
}

// ============================================================
// Block-Gruppierung (BY_BLOCK-Sortierung)
// ============================================================

/** Gruppe von Items innerhalb eines Blocks */
export interface BlockGroup<T extends PLUItemBase = PLUItemBase> {
  blockId: string | null
  blockName: string
  items: T[]
}

/**
 * Gruppiert Items nach block_id (für BY_BLOCK-Sortierung).
 * Blöcke werden nach order_index sortiert.
 * Items ohne block_id landen in "Ohne Zuordnung" am Ende.
 * Innerhalb jeder Gruppe: alphabetisch nach display_name/system_name.
 */
export function groupItemsByBlock<T extends PLUItemBase>(items: T[], blocks: Block[]): BlockGroup<T>[] {
  const blockMap = new Map<string, Block>()
  for (const block of blocks) {
    blockMap.set(block.id, block)
  }

  // Items nach block_id gruppieren
  const grouped = new Map<string | null, T[]>()
  for (const item of items) {
    const key = item.block_id
    const existing = grouped.get(key)
    if (existing) {
      existing.push(item)
    } else {
      grouped.set(key, [item])
    }
  }

  // Sortierhelfer: display_name mit Fallback auf system_name
  const getName = (item: PLUItemBase) => item.display_name ?? item.system_name

  // Blöcke nach order_index sortiert, dann "Ohne Zuordnung"
  const result: BlockGroup<T>[] = []
  const sortedBlocks = [...blocks].sort((a, b) => a.order_index - b.order_index)

  for (const block of sortedBlocks) {
    const blockItems = grouped.get(block.id)
    if (blockItems && blockItems.length > 0) {
      blockItems.sort((a, b) => getName(a).localeCompare(getName(b), 'de'))
      result.push({
        blockId: block.id,
        blockName: block.name,
        items: blockItems,
      })
    }
  }

  // Ohne Zuordnung
  const unassigned = grouped.get(null)
  if (unassigned && unassigned.length > 0) {
    unassigned.sort((a, b) => getName(a).localeCompare(getName(b), 'de'))
    result.push({
      blockId: null,
      blockName: 'Ohne Zuordnung',
      items: unassigned,
    })
  }

  return result
}

// ============================================================
// Spaltenverteilung: ROW_BY_ROW
// ============================================================

/**
 * ROW_BY_ROW: Items abwechselnd auf links/rechts verteilen.
 * Item 1 → links, Item 2 → rechts, Item 3 → links, ...
 */
export function splitItemsRowByRow<T>(items: T[]): [T[], T[]] {
  const left: T[] = []
  const right: T[] = []
  for (let i = 0; i < items.length; i++) {
    if (i % 2 === 0) {
      left.push(items[i])
    } else {
      right.push(items[i])
    }
  }
  return [left, right]
}

// ============================================================
// Statistiken
// ============================================================

export interface PLUStats {
  total: number
  unchanged: number
  newCount: number
  changedCount: number
  hidden: number
  customCount: number
}

/** Berechnet Statistiken für eine Liste von PLU-Items */
export function calculatePLUStats(items: PLUItemBase[], hidden?: number, customCount?: number): PLUStats {
  let unchanged = 0
  let newCount = 0
  let changedCount = 0

  for (const item of items) {
    switch (item.status as PLUStatus) {
      case 'NEW_PRODUCT_YELLOW':
        newCount++
        break
      case 'PLU_CHANGED_RED':
        changedCount++
        break
      case 'UNCHANGED':
      default:
        unchanged++
        break
    }
  }

  return {
    total: items.length,
    unchanged,
    newCount,
    changedCount,
    hidden: hidden ?? 0,
    customCount: customCount ?? 0,
  }
}

// ============================================================
// Status-Farben (CSS-Klassen)
// ============================================================

/** Gibt die passende CSS-Klasse für den PLU-Status zurück */
export function getStatusColorClass(status: PLUStatus | string): string {
  switch (status) {
    case 'NEW_PRODUCT_YELLOW':
      return 'bg-plu-new-bg text-plu-new-text'
    case 'PLU_CHANGED_RED':
      return 'bg-plu-changed-bg text-plu-changed-text'
    default:
      return ''
  }
}
