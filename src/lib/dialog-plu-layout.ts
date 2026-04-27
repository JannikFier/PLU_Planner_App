/**
 * Layout-Berechnung für Hide-/Rename-Dialoge: gleiche Flusslogik wie PLUTable
 * (ROW_BY_ROW, COLUMN_FIRST Obst-Zeitung, Backshop-Spalten-Split).
 */

import type { DialogItemBase } from '@/lib/plu-helpers'
import {
  groupItemsByLetter,
  splitLetterGroupsIntoColumns,
  type LetterGroup,
  type PLUItemBase,
} from '@/lib/plu-helpers'
import {
  paginateNewspaperColumns,
  computeObstNewspaperHeightsPx,
  newspaperRowsToFlatRows,
  flattenNewspaperPagesToRows,
  type NewspaperPage,
  type NewspaperPaginateHeights,
} from '@/lib/newspaper-column-pages'

/** Schriftgrößen wie PLUTable */
export interface DialogPluFontSizes {
  header: number
  column: number
  product: number
}

export type DialogTableRowPair<T> =
  | { type: 'header'; label: string }
  | { type: 'row'; left?: T; right?: T }

export type DialogFlatRow<T> =
  | { type: 'header'; label: string }
  | { type: 'item'; item: T }

/** Mobile: optional Sektions-Banner (Stück/Gewicht) wie PLUTable-ABSchnitte */
export type DialogMobileRow<T> =
  | { type: 'section'; title: string }
  | { type: 'header'; label: string }
  | { type: 'item'; item: T }

export interface DialogNewspaperSection<T> {
  /** null = MIXED (ein Block ohne großen Sektions-Titel) */
  sectionBanner: string | null
  pages: NewspaperPage<T>[]
  heights: NewspaperPaginateHeights
}

export type DialogPluLayoutResult<T> =
  | {
      mode: 'row_by_row'
      tableRows: DialogTableRowPair<T>[]
      mobileRows: DialogMobileRow<T>[]
    }
  | {
      mode: 'newspaper_obst'
      sections: DialogNewspaperSection<T>[]
      mobileRows: DialogMobileRow<T>[]
    }
  | {
      mode: 'split_columns'
      leftFlat: DialogFlatRow<T>[]
      rightFlat: DialogFlatRow<T>[]
      mobileRows: DialogMobileRow<T>[]
    }

const LABEL_STUECK = '═══ Stück ═══'
const LABEL_GEWICHT = '═══ Gewicht ═══'

function buildRowByRowTableRows<T>(groups: { label: string; items: T[] }[]): DialogTableRowPair<T>[] {
  const rows: DialogTableRowPair<T>[] = []
  for (const group of groups) {
    rows.push({ type: 'header', label: group.label })
    const items = group.items
    for (let i = 0; i < items.length; i += 2) {
      rows.push({ type: 'row', left: items[i], right: items[i + 1] })
    }
  }
  return rows
}

/** Flache Liste für Mobile (Zeilen-Modus): gleiche Reihenfolge wie Gruppen */
function groupsToMobileRows<T>(groups: { label: string; items: T[] }[]): DialogMobileRow<T>[] {
  const out: DialogMobileRow<T>[] = []
  for (const g of groups) {
    out.push({ type: 'header', label: g.label })
    for (const item of g.items) {
      out.push({ type: 'item', item })
    }
  }
  return out
}

function letterGroupsToFlatRows(letterGroups: LetterGroup<PLUItemBase>[]): DialogFlatRow<PLUItemBase>[] {
  const rows: DialogFlatRow<PLUItemBase>[] = []
  for (const g of letterGroups) {
    rows.push({ type: 'header', label: `— ${g.letter} —` })
    for (const item of g.items) {
      rows.push({ type: 'item', item })
    }
  }
  return rows
}

/** Dialog-Gruppen (BY_BLOCK oder alphabetisch) → flache Zeilen ohne leere Marker-Gruppen */
function dialogGroupsToFlatRows<T>(groups: { label: string; items: T[] }[]): DialogFlatRow<T>[] {
  const rows: DialogFlatRow<T>[] = []
  for (const g of groups) {
    if (g.items.length === 0) continue
    rows.push({ type: 'header', label: g.label })
    for (const item of g.items) {
      rows.push({ type: 'item', item })
    }
  }
  return rows
}

interface ParsedSeparatedSection<T> {
  banner: 'piece' | 'weight'
  letterGroups: { label: string; items: T[] }[]
}

/** Zerlegt SEPARATED-Gruppen in Stück-/Gewicht-Abschnitte mit Buchstaben-/Block-Gruppen */
function parseSeparatedGroups<T>(groups: { label: string; items: T[] }[]): ParsedSeparatedSection<T>[] {
  const sections: ParsedSeparatedSection<T>[] = []
  let current: ParsedSeparatedSection<T> | null = null

  for (const g of groups) {
    if (g.label === LABEL_STUECK) {
      current = { banner: 'piece', letterGroups: [] }
      sections.push(current)
      continue
    }
    if (g.label === LABEL_GEWICHT) {
      current = { banner: 'weight', letterGroups: [] }
      sections.push(current)
      continue
    }
    if (!current || g.items.length === 0) continue
    current.letterGroups.push(g)
  }

  return sections
}

function buildMobileFromNewspaperSections<T>(sections: DialogNewspaperSection<T>[]): DialogMobileRow<T>[] {
  const out: DialogMobileRow<T>[] = []
  for (const sec of sections) {
    if (sec.sectionBanner) {
      out.push({ type: 'section', title: sec.sectionBanner })
    }
    const merged = newspaperRowsToFlatRows(flattenNewspaperPagesToRows(sec.pages))
    for (const row of merged) {
      if (row.type === 'header') {
        out.push({ type: 'header', label: row.label })
      } else {
        out.push({ type: 'item', item: row.item })
      }
    }
  }
  return out
}

export interface BuildDialogPluLayoutParams<T extends DialogItemBase> {
  groups: { label: string; items: T[] }[]
  /** Gefilterte Items (Suche); für Backshop-Spalten-Split nötig */
  filteredItems: T[]
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  displayMode: 'MIXED' | 'SEPARATED'
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  listType: 'obst' | 'backshop'
  fontSizes: DialogPluFontSizes
}

/**
 * Baut Tabellen-/Mobile-Struktur passend zu Masterliste (PLUTable).
 */
export function buildDialogPluLayout<T extends DialogItemBase>(
  params: BuildDialogPluLayoutParams<T>,
): DialogPluLayoutResult<T> {
  const { groups, filteredItems, flowDirection, displayMode, sortMode, listType, fontSizes } = params

  // Backshop + Spaltenweise: zwei Spalten wie TwoColumnLayout (ohne Zeitungs-Seiten)
  if (listType === 'backshop' && flowDirection === 'COLUMN_FIRST') {
    if (sortMode === 'ALPHABETICAL') {
      const letterGroups = groupItemsByLetter(filteredItems as unknown as PLUItemBase[])
      const [leftLg, rightLg] = splitLetterGroupsIntoColumns(letterGroups)
      const leftFlat = letterGroupsToFlatRows(leftLg) as DialogFlatRow<T>[]
      const rightFlat = letterGroupsToFlatRows(rightLg) as DialogFlatRow<T>[]
      return {
        mode: 'split_columns',
        leftFlat,
        rightFlat,
        mobileRows: dialogGroupsToFlatRows(groups.filter((g) => g.items.length > 0)),
      }
    }
    const flat = dialogGroupsToFlatRows(groups)
    const mid = Math.ceil(flat.length / 2)
    return {
      mode: 'split_columns',
      leftFlat: flat.slice(0, mid),
      rightFlat: flat.slice(mid),
      mobileRows: dialogGroupsToFlatRows(groups.filter((g) => g.items.length > 0)),
    }
  }

  // Obst + Spaltenweise: Zeitungslayout + Seiten (wie PDF / PLUTable)
  if (listType === 'obst' && flowDirection === 'COLUMN_FIRST') {
    const heights = computeObstNewspaperHeightsPx(fontSizes)

    if (displayMode === 'SEPARATED') {
      const parsed = parseSeparatedGroups(groups)
      const sections: DialogNewspaperSection<T>[] = parsed.map((sec) => ({
        sectionBanner: sec.banner === 'piece' ? 'PLU-Liste Stück' : 'PLU-Liste Gewicht',
        pages: paginateNewspaperColumns(sec.letterGroups, heights),
        heights,
      }))
      return {
        mode: 'newspaper_obst',
        sections,
        mobileRows: buildMobileFromNewspaperSections(sections),
      }
    }

    const paginateInput = groups.filter((g) => g.items.length > 0)
    const pages = paginateNewspaperColumns(paginateInput, heights)
    const sections: DialogNewspaperSection<T>[] = [
      { sectionBanner: null, pages, heights },
    ]
    return {
      mode: 'newspaper_obst',
      sections,
      mobileRows: buildMobileFromNewspaperSections(sections),
    }
  }

  // Zeilenweise (oder Fallback): Paare pro Zeile
  const tableRows = buildRowByRowTableRows(groups)
  return {
    mode: 'row_by_row',
    tableRows,
    mobileRows: groupsToMobileRows(groups),
  }
}
