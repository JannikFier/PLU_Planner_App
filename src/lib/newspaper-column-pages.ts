/**
 * Zeitungs-Spaltenlayout: pro Seite zuerst linke Spalte oben→unten, dann rechte Spalte oben→unten.
 * Gruppen-Header werden bei Fortsetzung in der nächsten Spalte/Seite wiederholt.
 */

import {
  computeRowHeightMm,
  computeHeaderHeightMm,
  computeColumnHeaderHeightMm,
} from '@/lib/pdf-layout-utils'

/** Eine sichtbare Zeile (Gruppe oder Artikel) */
export type NewspaperRow<T> =
  | { type: 'group'; label: string }
  | { type: 'item'; item: T }

/** Eine „Seite“ mit zwei unabhängigen Spaltenlisten */
export interface NewspaperPage<T> {
  left: NewspaperRow<T>[]
  right: NewspaperRow<T>[]
}

export interface NewspaperPaginateHeights {
  itemRow: number
  groupHeader: number
  /** Verfügbare Höhe pro Spalte auf der ersten Seite (nach Kopf/Legende) */
  columnHeightFirstPage: number
  /** Verfügbare Höhe pro Spalte auf Folgeseiten (nach Spaltenköpfen) */
  columnHeightContinuationPage: number
}

/** A4 + Rand/Fuß wie im Obst-PDF (siehe pdf-generator renderSection) */
const PAGE_MM = {
  height: 297,
  marginTop: 10,
  marginBottom: 15,
  footerHeight: 8,
}

/**
 * Platz am Seitenende für Obst-Legende (PDF) – von maxY abziehen, muss zu pdf-generator passen.
 * @see OBST_PDF_LEGEND_BOTTOM_RESERVED_MM
 */
/** Eine Zeile Legende + Abstand; muss zu drawObstOfferLegendBottom in pdf-generator passen */
export const OBST_PDF_LEGEND_BOTTOM_RESERVED_MM = 9.2

/**
 * Schriftgrößen in pt (wie nach pxToPt im PDF) → Zeilenhöhen und nutzbare Spaltenhöhen in mm.
 * Spalten-Zeitung: Buchstaben-Header = gleiche Zeilenhöhe und gleiche Schriftgröße wie Produktzeilen.
 */
export function computeObstNewspaperHeightsMm(fontsPt: {
  header: number
  column: number
  product: number
  group: number
}): {
  heights: NewspaperPaginateHeights
  /** Nur für Debugging / Web-Skalierung */
  firstPageContentTopMm: number
  continuationContentTopMm: number
} {
  const rowH = computeRowHeightMm(fontsPt.product)
  const headerH = computeHeaderHeightMm(fontsPt.header)
  const colHeadH = computeColumnHeaderHeightMm(fontsPt.column)

  const maxY =
    PAGE_MM.height -
    PAGE_MM.marginBottom -
    PAGE_MM.footerHeight -
    OBST_PDF_LEGEND_BOTTOM_RESERVED_MM

  const firstPageContentTop = PAGE_MM.marginTop + headerH + 2 + colHeadH + 1
  const continuationContentTop = PAGE_MM.marginTop + colHeadH + 1

  const heights: NewspaperPaginateHeights = {
    itemRow: rowH,
    /** Spaltenweise: identisch zur Produktzeile (Ausrichtung, Paginierung) */
    groupHeader: rowH,
    columnHeightFirstPage: Math.max(20, maxY - firstPageContentTop),
    columnHeightContinuationPage: Math.max(25, maxY - continuationContentTop),
  }

  return {
    heights,
    firstPageContentTopMm: firstPageContentTop,
    continuationContentTopMm: continuationContentTop,
  }
}

/** mm → CSS-Pixel (96dpi) */
export function mmToPx(mm: number): number {
  return (mm * 96) / 25.4
}

/**
 * Gleiche Zerlegung wie PDF für die Web-Ansicht: Höhen aus px-Schriftgrößen abgeleitet (analog pdf-layout-utils).
 */
export function computeObstNewspaperHeightsPx(fontsPx: {
  header: number
  column: number
  product: number
}): NewspaperPaginateHeights {
  const pxToPt = (px: number) => Math.max(5, Math.min(36, Math.round(px * 0.75)))
  const pt = {
    header: pxToPt(fontsPx.header),
    column: pxToPt(fontsPx.column),
    product: pxToPt(fontsPx.product),
    group: pxToPt(fontsPx.column),
  }
  const mm = computeObstNewspaperHeightsMm(pt)
  return {
    itemRow: mmToPx(mm.heights.itemRow),
    groupHeader: mmToPx(mm.heights.groupHeader),
    columnHeightFirstPage: mmToPx(mm.heights.columnHeightFirstPage),
    columnHeightContinuationPage: mmToPx(mm.heights.columnHeightContinuationPage),
  }
}

/**
 * Füllt linke Spalte, dann rechte Spalte, dann neue Seite – mit Gruppen-Header-Wiederholung.
 */
export function paginateNewspaperColumns<T>(
  groups: { label: string; items: T[] }[],
  heights: NewspaperPaginateHeights,
): NewspaperPage<T>[] {
  const pages: NewspaperPage<T>[] = []
  let cur: NewspaperPage<T> = { left: [], right: [] }
  let side: 'left' | 'right' = 'left'
  let pageIndex = 0

  const columnBudget = (p: number) =>
    p === 0 ? heights.columnHeightFirstPage : heights.columnHeightContinuationPage

  function usedHeight(rows: NewspaperRow<T>[]): number {
    let s = 0
    for (const r of rows) {
      s += r.type === 'group' ? heights.groupHeader : heights.itemRow
    }
    return s
  }

  function remaining(): number {
    const colRows = side === 'left' ? cur.left : cur.right
    return columnBudget(pageIndex) - usedHeight(colRows)
  }

  function advanceColumn(): void {
    if (side === 'left') {
      side = 'right'
    } else {
      pages.push(cur)
      cur = { left: [], right: [] }
      pageIndex += 1
      side = 'left'
    }
  }

  function pushRow(row: NewspaperRow<T>): void {
    const arr = side === 'left' ? cur.left : cur.right
    arr.push(row)
  }

  for (const g of groups) {
    // Leere Warengruppen: trotzdem Gruppenkopf ausgeben (Live-Masterliste „Nach Warengruppen“;
    // PDF baut Zeilen ohne leere Gruppen via groupItemsByBlock ohne includeEmptyBlocks.)
    if (g.items.length === 0) {
      while (remaining() < heights.groupHeader) {
        advanceColumn()
      }
      pushRow({ type: 'group', label: g.label })
      continue
    }

    let i = 0
    while (i < g.items.length) {
      while (remaining() < heights.groupHeader + heights.itemRow) {
        advanceColumn()
      }

      pushRow({ type: 'group', label: g.label })

      while (i < g.items.length) {
        if (heights.itemRow > remaining()) {
          break
        }
        pushRow({ type: 'item', item: g.items[i] })
        i++
      }
    }
  }

  if (cur.left.length > 0 || cur.right.length > 0) {
    pages.push(cur)
  }

  return pages
}

/** Lineare Reihenfolge wie in der Zeitungsansicht: Seite für Seite, links dann rechts (für Suche / data-row-index). */
export function flattenNewspaperPagesToRows<T>(pages: NewspaperPage<T>[]): NewspaperRow<T>[] {
  const out: NewspaperRow<T>[] = []
  for (const p of pages) {
    out.push(...p.left, ...p.right)
  }
  return out
}

/** Für PLUTable (FlatRow: header/item) */
export function newspaperRowsToFlatRows<T>(
  rows: NewspaperRow<T>[],
): Array<{ type: 'header'; label: string } | { type: 'item'; item: T }> {
  return rows.map((r) =>
    r.type === 'group' ? { type: 'header' as const, label: r.label } : { type: 'item' as const, item: r.item },
  )
}
